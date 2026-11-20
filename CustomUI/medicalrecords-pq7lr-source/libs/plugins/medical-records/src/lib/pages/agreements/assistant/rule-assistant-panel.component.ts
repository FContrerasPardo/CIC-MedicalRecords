import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { knowledgeDiscoveryThemeTokens, openKnowledgeDiscoveryConfig } from '../../../components/knowledge-discovery/knowledge-discovery-launcher.component';
import { KnowledgeDiscoveryPlaceService, KnowledgeDiscoveryPlaceState } from '../../../components/knowledge-discovery/knowledge-discovery-place.service';
import {
    isValidKnowledgeDiscoveryPlaceId,
    KnowledgeDiscoveryLink,
    KnowledgeDiscoveryLinkSource,
    resolveKnowledgeDiscoveryLink,
} from '../../../components/knowledge-discovery/knowledge-discovery-place.util';
import { checklistDocumentCatalogue, parseDocumentationChecklist } from '../checklist/documentation-checklist.util';
import { AgreementFiles } from '../store/agreement-repository.service';
import { AGENT_RULES_LIST } from '../store/agreement-store.util';
import { ASSISTANT_TARGET_KINDS, ASSISTANT_TARGETS, AssistantTargetKind, RULE_ASSISTANT_ENGINE, RuleAssistantEngine, RuleProposal } from './rule-assistant.model';
import { SimulatedRuleAssistantService } from './simulated-rule-assistant.service';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS.ASSISTANT';
const KD_I18N = 'MEDICAL_RECORDS.AGREEMENTS.KD';
const KD_ROOT_I18N = 'MEDICAL_RECORDS.KNOWLEDGE_DISCOVERY';
const MAX_FILE_BYTES = 512 * 1024;
/** The Knowledge Discovery invitation hides on its own after this time (it never blocks). */
const INVITE_MS = 12000;

/** `rules`: rules assistant (General, Checklist, Policy, Agent rules); `knowledgeDiscovery`: onboarding chat towards KD (Documents). */
export type AgreementAssistantMode = 'rules' | 'knowledgeDiscovery';

interface AssistantMessage {
    id: number;
    from: 'user' | 'assistant';
    /** Literal text (what the user typed) or an i18n key (assistant). */
    text: string;
    params?: Record<string, unknown>;
    proposals?: RuleProposal[];
    unrecognized?: string[];
}

/**
 * Floating agent of the Agreements page, present in every tab, with a gear that always configures
 * the Knowledge Discovery link of `kdPlaceId` (`agreements.<agreementId>.documents`).
 * - `rules` mode, «AI assistant»: the user writes a rule in plain language or imports a rules file;
 *   the engine proposes where it goes (file, tab, section) and the row; «Create draft» hands it to
 *   the page, which opens the tab, adds the row to the editor draft and highlights it. Nothing is
 *   saved until the user saves the file. The engine is `RULE_ASSISTANT_ENGINE` (default: the keyword engine).
 * - `knowledgeDiscovery` mode (Documents): a short chat that offers to dig into the contract and its
 *   annexes with Knowledge Discovery: «Yes» opens the configured link in a new tab (or the
 *   configuration dialog when there is none), «Not now» closes it. The first time an agreement's
 *   Documents tab is shown, a brief invitation bubble appears above the button (polite live region,
 *   never focused; it hides on its own, on Escape or with its close button).
 * The rules conversation is kept while the mode changes.
 */
@Component({
    selector: 'medical-records-rule-assistant-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './rule-assistant-panel.component.html',
    styleUrls: ['./rule-assistant-panel.component.scss'],
})
export class RuleAssistantPanelComponent implements OnChanges {
    private readonly translate = inject(TranslateService);
    private readonly engine: RuleAssistantEngine = inject(RULE_ASSISTANT_ENGINE, { optional: true }) ?? inject(SimulatedRuleAssistantService);
    private readonly kdService = inject(KnowledgeDiscoveryPlaceService);
    private readonly dialog = inject(MatDialog);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    @Input() agreementId = '';
    @Input() files: AgreementFiles | null = null;
    @Input() mode: AgreementAssistantMode = 'rules';
    /** Knowledge Discovery place of the agreement's documents (`agreements.<agreementId>.documents`). */
    @Input() kdPlaceId = '';
    /** Older link of the agreement (`agreement.json` → `knowledgeDiscovery`), used while the place has no file. */
    @Input() kdFallback: Partial<KnowledgeDiscoveryLink> | null = null;
    /** The page added the proposal to a draft. */
    @Output() readonly apply = new EventEmitter<RuleProposal>();

    @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;
    @ViewChild('toggleButtonRef') private toggleButton?: ElementRef<HTMLButtonElement>;
    @ViewChild('kdYesRef') private kdYesButton?: ElementRef<HTMLElement>;

    readonly i18n = I18N;
    readonly kdI18n = KD_I18N;
    readonly kdRootI18n = KD_ROOT_I18N;
    readonly targets = ASSISTANT_TARGETS;
    readonly examples = ['EXAMPLE_PRIOR_AUTH', 'EXAMPLE_DOCUMENT', 'EXAMPLE_TARIFF', 'EXAMPLE_INCOMPATIBLE'];
    readonly panelId = `mr-rule-assistant-${Math.random().toString(36).slice(2, 9)}`;

    open = false;
    draft = '';
    busy = false;
    messages: AssistantMessage[] = [{ id: 0, from: 'assistant', text: `${I18N}.WELCOME` }];
    applied = new Set<string>();
    private nextId = 1;

    // Knowledge Discovery ---------------------------------------------------------------------------
    kdStatus: KnowledgeDiscoveryPlaceState['status'] = 'loading';
    kdLink: KnowledgeDiscoveryLink | null = null;
    /** Brief invitation bubble shown the first time an agreement's Documents tab is shown. */
    inviteVisible = false;
    private kdSource: KnowledgeDiscoveryLinkSource = 'none';
    private kdState: KnowledgeDiscoveryPlaceState | null = null;
    private kdSubscription: Subscription | null = null;
    private readonly invited = new Set<string>();
    private inviteTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this.kdSubscription?.unsubscribe();
            this.clearInviteTimer();
        });
    }

    get kdMode(): boolean {
        return this.mode === 'knowledgeDiscovery';
    }

    get kdPlaceValid(): boolean {
        return isValidKnowledgeDiscoveryPlaceId(this.kdPlaceId);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['kdPlaceId']) {
            this.kdSubscription?.unsubscribe();
            this.kdSubscription = null;
            this.kdState = null;
            if (this.kdPlaceValid) {
                this.kdSubscription = this.kdService.watch(this.kdPlaceId).subscribe((state) => {
                    this.kdState = state;
                    this.resolveKd();
                });
            }
        }
        this.resolveKd();
        if (changes['mode'] && !changes['mode'].firstChange && changes['mode'].previousValue !== this.mode) {
            // Each mode has its own content: a panel left open would show the other one.
            this.open = false;
            this.hideInvite();
        }
        if (changes['mode'] || changes['agreementId']) {
            this.maybeInvite();
        }
    }

    toggle(): void {
        this.open = !this.open;
        this.hideInvite();
        if (this.open) {
            if (this.kdMode) {
                // After the panel renders: focus the main answer of the chat.
                setTimeout(() => this.kdYesButton?.nativeElement.focus());
            } else {
                queueMicrotask(() => this.composer?.nativeElement.focus());
            }
        }
    }

    /** Opens the Knowledge Discovery configuration dialog of the agreement's place (the gear, or «Yes» without a link). */
    configureKd(): void {
        if (!this.kdPlaceValid) {
            return;
        }
        this.hideInvite();
        openKnowledgeDiscoveryConfig(this.dialog, { placeId: this.kdPlaceId, link: this.kdLink, source: this.kdSource, theme: knowledgeDiscoveryThemeTokens(this.host.nativeElement) });
    }

    /** «Yes» with a link: the anchor opens it in a new tab and the chat closes. */
    onKdOpened(): void {
        this.open = false;
    }

    dismissInvite(): void {
        this.hideInvite();
    }

    /** The invitation is never focused, so Escape anywhere dismisses it. */
    @HostListener('document:keydown.escape')
    onDocumentEscape(): void {
        this.hideInvite();
    }

    close(): void {
        if (this.open) {
            this.open = false;
            queueMicrotask(() => this.toggleButton?.nativeElement.focus());
        }
    }

    @HostListener('keydown.escape', ['$event'])
    onEscape(event: Event): void {
        if (this.open) {
            event.stopPropagation();
            this.close();
        }
    }

    useExample(key: string): void {
        this.draft = this.translate.instant(`${I18N}.${key}`);
        this.composer?.nativeElement.focus();
    }

    onComposerKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void this.send();
        }
    }

    async send(): Promise<void> {
        const text = this.draft.trim();
        if (!text || this.busy) {
            return;
        }
        this.draft = '';
        this.push({ from: 'user', text });
        await this.run({ text });
    }

    async importFile(input: HTMLInputElement): Promise<void> {
        const file = input.files?.[0];
        input.value = '';
        if (!file || this.busy) {
            return;
        }
        this.push({ from: 'user', text: file.name });
        if (file.size > MAX_FILE_BYTES || !/\.(json|csv|txt)$/i.test(file.name)) {
            this.push({ from: 'assistant', text: `${I18N}.FILE_REJECTED` });
            return;
        }
        let content = '';
        try {
            content = await file.text();
        } catch {
            this.push({ from: 'assistant', text: `${I18N}.FILE_REJECTED` });
            return;
        }
        await this.run({ file: { name: file.name, content } });
    }

    createDraft(proposal: RuleProposal): void {
        this.applied.add(proposal.id);
        this.apply.emit(proposal);
    }

    rowId(proposal: RuleProposal): string {
        const keys = ['ruleId', 'policyRuleId', 'serviceCode'];
        return String(keys.map((key) => proposal.row[key]).find((value) => !!value) ?? '—');
    }

    rowSummary(proposal: RuleProposal): string {
        const row = proposal.row;
        const parts = [row['type'], Array.isArray(row['requiredDocuments']) ? (row['requiredDocuments'] as string[]).join(', ') : '', row['amountThreshold'] ?? row['expectedAmount'] ?? '', row['serviceCategory'] ?? ''];
        return parts.filter((part) => part !== '' && part !== undefined && part !== null).join(' · ');
    }

    trackMessage(_index: number, message: AssistantMessage): number {
        return message.id;
    }

    private async run(request: { text?: string; file?: { name: string; content: string } }): Promise<void> {
        this.busy = true;
        try {
            const result = await this.engine.interpret({ ...request, agreementId: this.agreementId, existingIds: this.existingIds(), documentClasses: this.documentClasses() });
            this.push({
                from: 'assistant',
                text: result.proposals.length ? `${I18N}.PROPOSED` : `${I18N}.NOTHING_FOUND`,
                params: { count: result.proposals.length },
                proposals: result.proposals,
                unrecognized: result.unrecognized,
            });
        } catch {
            this.push({ from: 'assistant', text: `${I18N}.ERROR` });
        } finally {
            this.busy = false;
        }
    }

    private resolveKd(): void {
        this.kdStatus = this.kdPlaceValid ? (this.kdState?.status ?? 'loading') : 'ready';
        // While loading, the fallback is not shown: the place file may clear or replace it.
        const resolved = this.kdStatus !== 'loading' ? resolveKnowledgeDiscoveryLink(this.kdState?.config ?? null, this.kdFallback) : { link: null, source: 'none' as const };
        this.kdLink = resolved.link;
        this.kdSource = resolved.source;
    }

    private maybeInvite(): void {
        if (!this.kdMode || this.open || !this.agreementId || this.invited.has(this.agreementId)) {
            return;
        }
        this.invited.add(this.agreementId);
        this.inviteVisible = true;
        this.clearInviteTimer();
        this.inviteTimer = setTimeout(() => this.hideInvite(), INVITE_MS);
    }

    private hideInvite(): void {
        this.inviteVisible = false;
        this.clearInviteTimer();
    }

    private clearInviteTimer(): void {
        if (this.inviteTimer) {
            clearTimeout(this.inviteTimer);
            this.inviteTimer = null;
        }
    }

    private push(message: Omit<AssistantMessage, 'id'>): void {
        this.messages = [...this.messages, { ...message, id: this.nextId++ }];
    }

    private existingIds(): Partial<Record<AssistantTargetKind, string[]>> {
        const ids: Partial<Record<AssistantTargetKind, string[]>> = {};
        for (const kind of ASSISTANT_TARGET_KINDS) {
            const content = this.files?.[kind]?.content;
            const listKey = ASSISTANT_TARGETS[kind].listKey;
            const list = content?.[listKey];
            const idKeys = kind === 'documentationChecklist' ? ['ruleId'] : (AGENT_RULES_LIST[kind]?.idKeys ?? []);
            ids[kind] = Array.isArray(list) ? list.map((row) => String(idKeys.map((key) => (row as Record<string, unknown>)?.[key]).find((value) => !!value) ?? '')) : [];
        }
        return ids;
    }

    private documentClasses(): string[] {
        const checklist = this.files ? parseDocumentationChecklist(this.files.documentationChecklist.content) : null;
        return checklist ? checklistDocumentCatalogue(checklist) : [];
    }
}
