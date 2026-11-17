import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
    AuditAssistantContext,
    AuditFinding,
    composeKnowledgeDiscoveryPrompt,
    hasAuditContext,
    KD_I18N,
    KnowledgeDiscoveryState,
    PromptLabels,
    providerCommentList,
    suggestedQuestions,
    SuggestedQuestion,
    usableFindings,
} from './audit-assistant.util';
import { KnowledgeDiscoveryConfigService } from './knowledge-discovery-config.service';

export type AssistantStatus = 'loading' | 'configured' | 'not-configured' | 'invalid' | 'error';

/** Emitted each time the auditor sends a question to Knowledge Discovery. */
export interface AuditAssistantQuestionEvent {
    question: string;
    /** Question plus the context block, as copied for KD. */
    prompt: string;
    sentAt: Date;
}

interface ConversationEntry {
    id: number;
    question: string;
    prompt: string;
    sentAt: Date;
    /** The prompt reached the clipboard; otherwise it is shown for manual copy. */
    copied: boolean;
}

/** Same window features CIC-Fin uses to open Discovery from the underwriting workbench. */
const KD_WINDOW_FEATURES = 'popup=yes,width=1280,height=800,noopener,noreferrer';

/**
 * Knowledge Discovery assistant for the ARS auditor (#148).
 *
 * Standalone panel meant for the "Audit & glosas" tab (#147). It reuses CIC-Fin's KD connection
 * (a KD agent URL in Appdata `config.json`) and adds the audit context: the auditor picks a
 * suggested question or types one, the panel copies question + context and opens the KD agent,
 * where the answer is produced in real time. The panel never generates or simulates answers.
 */
@Component({
    selector: 'medical-records-audit-assistant',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './audit-assistant.component.html',
    styleUrls: ['./audit-assistant.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditAssistantComponent implements OnInit, AfterViewInit {
    private readonly config = inject(KnowledgeDiscoveryConfigService);
    private readonly translate = inject(TranslateService);
    private readonly cdr = inject(ChangeDetectorRef);

    @Input() radicationId: string | null = null;
    @Input() invoiceNumber: string | null = null;
    /** Patient reference (record number). Do not pass names or other PHI. */
    @Input() patientRef: string | null = null;
    @Input() providerName: string | null = null;
    @Input() agreementName: string | null = null;
    /** Findings the auditor selected in the Audit & glosas tab. */
    @Input() findings: readonly AuditFinding[] | null = null;
    /** Provider comments / appeal text (e.g. the `providerFindingComments` variable). */
    @Input() providerComments: readonly string[] | string | null = null;
    /** Shows a close button and closes on Escape; the host decides how to hide the panel. */
    @Input() closable = false;
    /** Moves focus to the panel heading when it appears (dialog / side panel usage). */
    @Input() autoFocus = true;

    @Output() readonly questionSent = new EventEmitter<AuditAssistantQuestionEvent>();
    @Output() readonly closed = new EventEmitter<void>();

    @ViewChild('heading') private heading?: ElementRef<HTMLElement>;
    @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;

    readonly i18n = KD_I18N;
    readonly headingId = `mr-audit-assistant-${Math.random().toString(36).slice(2, 9)}`;
    status: AssistantStatus = 'loading';
    draft = '';
    conversation: ConversationEntry[] = [];
    announcement = '';
    private url = '';
    private nextId = 1;
    private request = 0;

    get context(): AuditAssistantContext {
        return {
            radicationId: this.radicationId,
            invoiceNumber: this.invoiceNumber,
            patientRef: this.patientRef,
            providerName: this.providerName,
            agreementName: this.agreementName,
            findings: this.findings,
            providerComments: this.providerComments,
        };
    }

    get hasContext(): boolean {
        return hasAuditContext(this.context);
    }

    get selectedFindings(): AuditFinding[] {
        return usableFindings(this.findings);
    }

    get comments(): string[] {
        return providerCommentList(this.providerComments);
    }

    get suggestions(): SuggestedQuestion[] {
        return suggestedQuestions(this.context);
    }

    get ready(): boolean {
        return this.status === 'configured';
    }

    get canSend(): boolean {
        return this.ready && this.draft.trim().length > 0;
    }

    ngOnInit(): void {
        void this.reload();
    }

    ngAfterViewInit(): void {
        if (this.autoFocus) {
            queueMicrotask(() => this.heading?.nativeElement.focus());
        }
    }

    async reload(): Promise<void> {
        const request = ++this.request;
        this.status = 'loading';
        this.url = '';
        this.cdr.markForCheck();
        let state: KnowledgeDiscoveryState | null = null;
        try {
            state = await this.config.load();
        } catch {
            state = null;
        }
        if (request !== this.request) {
            return;
        }
        if (!state) {
            this.status = 'error';
        } else if (state.status === 'configured') {
            this.status = 'configured';
            this.url = state.url;
        } else {
            this.status = state.status;
        }
        this.cdr.markForCheck();
    }

    askSuggested(suggestion: SuggestedQuestion): void {
        void this.ask(this.translate.instant(`${KD_I18N}.QUESTIONS.${suggestion.key}`, suggestion.params));
    }

    useSuggested(suggestion: SuggestedQuestion): void {
        this.draft = this.translate.instant(`${KD_I18N}.QUESTIONS.${suggestion.key}`, suggestion.params);
        this.composer?.nativeElement.focus();
    }

    sendDraft(): void {
        if (!this.canSend) {
            return;
        }
        const question = this.draft.trim();
        this.draft = '';
        void this.ask(question);
        this.composer?.nativeElement.focus();
    }

    onComposerKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.sendDraft();
        }
    }

    @HostListener('keydown.escape', ['$event'])
    onEscape(event: Event): void {
        if (this.closable) {
            event.stopPropagation();
            this.close();
        }
    }

    close(): void {
        this.closed.emit();
    }

    trackEntry(_index: number, entry: ConversationEntry): number {
        return entry.id;
    }

    trackSuggestion(_index: number, suggestion: SuggestedQuestion): string {
        return suggestion.id;
    }

    /**
     * Copies question + context and opens the KD agent. Clipboard is requested before the popup
     * steals focus; the popup is opened synchronously within the click to avoid popup blockers.
     */
    private async ask(question: string): Promise<void> {
        if (!this.ready || !question.trim()) {
            return;
        }
        const prompt = composeKnowledgeDiscoveryPrompt(question, this.context, this.promptLabels());
        const copy = this.copyToClipboard(prompt);
        window.open(this.url, '_blank', KD_WINDOW_FEATURES);
        const copied = await copy;
        const sentAt = new Date();
        this.conversation = [...this.conversation, { id: this.nextId++, question: question.trim(), prompt, sentAt, copied }];
        this.announcement = this.translate.instant(`${KD_I18N}.${copied ? 'SENT_COPIED' : 'SENT_NOT_COPIED'}`);
        this.questionSent.emit({ question: question.trim(), prompt, sentAt });
        this.cdr.markForCheck();
    }

    private async copyToClipboard(text: string): Promise<boolean> {
        try {
            if (!navigator.clipboard?.writeText) {
                return false;
            }
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    private promptLabels(): PromptLabels {
        const label = (key: string) => this.translate.instant(`${KD_I18N}.PROMPT.${key}`);
        return {
            context: label('CONTEXT'),
            radication: label('RADICATION'),
            invoice: label('INVOICE'),
            patient: label('PATIENT'),
            provider: label('PROVIDER'),
            agreement: label('AGREEMENT'),
            findings: label('FINDINGS'),
            providerComments: label('PROVIDER_COMMENTS'),
            question: label('QUESTION'),
        };
    }
}
