import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AgreementRulesFileEditorComponent } from './agent-rules/agreement-rules-file-editor.component';
import { AgreementAiSettingsPanelComponent } from './ai-rules/agreement-ai-settings-panel.component';
import { fileSavedEvent } from './ai-rules/agreement-ai-settings.util';
import { agreementDocumentsPlaceId, KnowledgeDiscoveryLink } from '../../components/knowledge-discovery/knowledge-discovery-place.util';
import { RuleAssistantPanelComponent } from './assistant/rule-assistant-panel.component';
import { ASSISTANT_TARGETS, AssistantDraftRequest, RuleProposal } from './assistant/rule-assistant.model';
import { AgreementChecklistEditorComponent } from './checklist/agreement-checklist-editor.component';
import { checklistDocumentCatalogue, parseDocumentationChecklist } from './checklist/documentation-checklist.util';
import { AgreementDocumentsPanelComponent } from './documents/agreement-documents-panel.component';
import { agreementKnowledgeDiscovery } from './documents/agreement-knowledge-discovery.util';
import { AgreementGeneralPanelComponent } from './general/agreement-general-panel.component';
import { AgreementHelpCoachComponent, AgreementHelpTopic } from './shared/agreement-help-coach.component';
import { AGREEMENT_CONTENT_LANGUAGES, AgreementContentLanguage, resolveContentLanguage } from './store/agreement-locale.util';
import { PreanalysisPolicyEditorComponent } from './policy/preanalysis-policy-editor.component';
import { AgreementFiles, AgreementRepositoryService, AgreementsIndexLoadResult, AgreementSummary } from './store/agreement-repository.service';
import {
    AGENT_RULES_LIST,
    AGREEMENT_FILE_KINDS,
    AGREEMENT_FILE_NAMES,
    agreementFileVersion,
    AgreementFileKind,
    AgreementIndexEntry,
    agreementPayer,
    isValidAgreementId,
    slugAgreementId,
} from './store/agreement-store.util';
import { hasAgreementTemplate } from './store/agreement-templates';

type AgreementTab = 'general' | 'checklist' | 'policy' | 'agentRules' | 'documents';
type AgentRulesTab = 'financial' | 'compliance' | 'coding' | 'ai';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/** Sub-tabs of «Agent rules»: each Agent Mesh agent and the files it reads. */
const AGENT_RULES_TABS: Array<{ key: AgentRulesTab; icon: string; kinds: AgreementFileKind[]; help: AgreementHelpTopic }> = [
    { key: 'financial', icon: 'payments', kinds: ['tariffAgreement'], help: 'AGENT_FINANCIAL' },
    { key: 'compliance', icon: 'gpp_maybe', kinds: ['payerCompliancePolicy'], help: 'AGENT_COMPLIANCE' },
    // `data_object` exists in the Material Icons font (`code_blocks` is a Material Symbols name and rendered as text).
    { key: 'coding', icon: 'data_object', kinds: ['payerCodingPolicy', 'codingRules'], help: 'AGENT_CODING' },
    // Cross-agent settings of this agreement (switches, thresholds, change history): `ai-settings.json`.
    { key: 'ai', icon: 'psychology', kinds: ['aiSettings'], help: 'AI_RULES' },
];

/** Rule files whose saves are also logged in the AI rules history (`ai-settings.json` logs its own changes). */
const AI_HISTORY_LOGGED_KINDS: readonly AgreementFileKind[] = ['documentationChecklist', 'preanalysisPolicy', 'tariffAgreement', 'payerCompliancePolicy', 'payerCodingPolicy', 'codingRules'];

/**
 * Agreements (convenios) manager: a sidebar with the agreements of the Appdata index and, for the
 * selected one, its rule documents (`/MedRec/Appdata/Agreements/<agreementId>/*.json`) in tabs:
 * General, documentary checklist, pre-analysis policy, agent rules and documents. Each file shows
 * its origin and is saved on its own.
 */
@Component({
    selector: 'medical-records-agreements-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AgreementGeneralPanelComponent,
        AgreementChecklistEditorComponent,
        PreanalysisPolicyEditorComponent,
        AgreementRulesFileEditorComponent,
        AgreementDocumentsPanelComponent,
        AgreementHelpCoachComponent,
        AgreementAiSettingsPanelComponent,
        RuleAssistantPanelComponent,
    ],
    templateUrl: './agreements-page.component.html',
    styleUrls: ['./agreements-page.component.scss'],
})
export class AgreementsPageComponent implements OnInit {
    private readonly repository = inject(AgreementRepositoryService);
    private readonly translate = inject(TranslateService);
    private readonly destroyRef = inject(DestroyRef);

    readonly i18n = I18N;
    readonly tabs: Array<{ key: AgreementTab; icon: string }> = [
        { key: 'general', icon: 'handshake' },
        { key: 'checklist', icon: 'fact_check' },
        { key: 'policy', icon: 'policy' },
        { key: 'agentRules', icon: 'smart_toy' },
        { key: 'documents', icon: 'folder_open' },
    ];
    readonly agentTabs = AGENT_RULES_TABS;
    readonly contentLanguages = AGREEMENT_CONTENT_LANGUAGES;

    /** Language of the agreement texts: the UI language (es, en, pt; others fall back to en). */
    language: AgreementContentLanguage = resolveContentLanguage(this.translate.currentLang || this.translate.defaultLang);
    /** Row proposed by the rules assistant, handed to the editor of its file. */
    assistantDraft: AssistantDraftRequest | null = null;
    private assistantNonce = 0;

    loadingIndex = true;
    indexResult: AgreementsIndexLoadResult | null = null;
    /** What each agreement's `agreement.json` says (payer), loaded after the index; the index is the fallback. */
    summaries: Record<string, AgreementSummary> = {};
    search = '';
    visibleEntries: AgreementIndexEntry[] = [];

    selectedId = '';
    loadingFiles = false;
    files: AgreementFiles | null = null;
    tab: AgreementTab = 'general';
    agentTab: AgentRulesTab = 'financial';

    working = false;
    actionError: string | null = null;
    actionDone: string | null = null;

    duplicateOpen = false;
    duplicateName = '';
    duplicateId = '';
    duplicateIdTouched = false;

    /** Derived from the selected agreement's files. */
    checklistRuleIds: string[] | null = null;
    catalogueNames: string[] = [];
    profileKeys: string[] = [];
    summary: Array<{ labelKey: string; value: number }> = [];
    /** Knowledge Discovery place of the agreement's documents (gear and Documents chat of the floating agent). */
    kdPlaceId = '';
    /** Older link of `agreement.json` → `knowledgeDiscovery`, used while the place has no file of its own. */
    kdFallback: Partial<KnowledgeDiscoveryLink> | null = null;

    get selected(): AgreementIndexEntry | null {
        return this.indexResult?.index.agreements.find((entry) => entry.agreementId === this.selectedId) ?? null;
    }

    /** Files without their base in Appdata, or without the version of the UI language. */
    get pendingFiles(): AgreementFileKind[] {
        return this.files ? AGREEMENT_FILE_KINDS.filter((kind) => !this.files?.[kind].baseInAppdata || !this.files?.[kind].localized) : [];
    }

    /** Value shown on the right of the header: the base value (capitation), else the annual budget. */
    get headerValue(): { labelKey: string; amount: number; suffix: string } {
        const base = Number(this.general['capitationBase'] ?? 0);
        if (base > 0) {
            return { labelKey: 'GENERAL.FIELD_BASE_VALUE', amount: base, suffix: String(this.general['capitationPeriod'] ?? '') };
        }
        return { labelKey: 'GENERAL.FIELD_BUDGET', amount: Number(this.general['budgetTotal'] ?? 0), suffix: '' };
    }

    get general(): Record<string, unknown> {
        return (this.files?.agreement.content['general'] as Record<string, unknown>) ?? {};
    }

    /**
     * The selected agreement (or the index) holds values of an older demo template: they are shown
     * updated and «Update the agreement files» saves them.
     */
    get demoMigrationPending(): boolean {
        return (
            !!this.indexResult?.demoMigrated ||
            (!!this.files && AGREEMENT_FILE_KINDS.some((kind) => this.files?.[kind].demoMigrated)) ||
            !!this.summaries[this.selectedId]?.demoMigrated
        );
    }

    get hasTemplate(): boolean {
        return hasAgreementTemplate(this.selectedId);
    }

    get duplicateValid(): boolean {
        const id = this.duplicateId.trim();
        return (
            !!this.duplicateName.trim() &&
            isValidAgreementId(id) &&
            !(this.indexResult?.index.agreements ?? []).some((entry) => entry.agreementId.toLowerCase() === id.toLowerCase())
        );
    }

    ngOnInit(): void {
        void this.loadIndex();
        this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
            const language = resolveContentLanguage(event.lang);
            if (language !== this.language) {
                this.language = language;
                void this.loadFiles();
                void this.loadSummaries();
            }
        });
    }

    async loadIndex(selectId?: string): Promise<void> {
        this.loadingIndex = true;
        try {
            this.indexResult = await this.repository.loadIndex();
        } catch {
            this.indexResult = null;
        }
        this.loadingIndex = false;
        this.filter();
        void this.loadSummaries();
        const entries = this.indexResult?.index.agreements ?? [];
        const next = selectId ?? (entries.some((entry) => entry.agreementId === this.selectedId) ? this.selectedId : entries[0]?.agreementId);
        if (next) {
            await this.select(next, true);
        }
    }

    /** Sidebar payer: the agreement's `agreement.json` (the selected one as shown), else the index entry. */
    payerOf(entry: AgreementIndexEntry): string {
        const shown = entry.agreementId === this.selectedId && this.files ? agreementPayer(this.files.agreement.content) : '';
        return shown || this.summaries[entry.agreementId]?.payer || entry.payer;
    }

    async select(agreementId: string, force = false): Promise<void> {
        if (agreementId === this.selectedId && !force && this.files) {
            return;
        }
        this.selectedId = agreementId;
        this.actionError = null;
        this.actionDone = null;
        this.duplicateOpen = false;
        this.assistantDraft = null;
        await this.loadFiles();
    }

    async loadFiles(): Promise<void> {
        if (!this.selectedId) {
            return;
        }
        this.loadingFiles = true;
        try {
            this.files = await this.repository.loadAgreement(this.selectedId, this.language);
        } catch {
            this.files = null;
        }
        this.loadingFiles = false;
        this.derive();
    }

    /**
     * One file was saved by its editor: reload it (and the index, for the general data). A new version
     * of a rules file is also logged in the AI rules history, when that file is already saved.
     */
    async onSaved(kind: AgreementFileKind): Promise<void> {
        if (!this.files) {
            return;
        }
        const agreementId = this.selectedId;
        const before = agreementFileVersion(kind, this.files[kind].content);
        const file = await this.repository.loadLocalizedFile(agreementId, kind, this.language);
        if (agreementId !== this.selectedId || !this.files) {
            return;
        }
        this.files = { ...this.files, [kind]: file };
        this.derive();
        const after = agreementFileVersion(kind, file.content);
        if (AI_HISTORY_LOGGED_KINDS.includes(kind) && after !== before) {
            void this.logRulesFileSave(agreementId, kind, before, after);
        }
        if (kind === 'agreement' && this.indexResult) {
            try {
                await this.repository.syncIndexEntry(agreementId, file.content, this.indexResult);
                this.indexResult = await this.repository.loadIndex();
                this.summaries = { ...this.summaries, [agreementId]: { payer: agreementPayer(file.content), demoMigrated: !!file.demoMigrated } };
                this.filter();
            } catch {
                this.actionError = 'INDEX_ERROR';
            }
        }
    }

    /** Writes every file of the selected agreement that is not yet in Appdata, from the bundled template, and registers it in the index. */
    async createFromTemplate(allLanguages = false): Promise<void> {
        if (!this.files || !this.indexResult || this.working) {
            return;
        }
        const languages = allLanguages ? [...AGREEMENT_CONTENT_LANGUAGES] : [this.language];
        await this.run('CREATED', async () => {
            if (this.files && this.indexResult) {
                await this.repository.createFromTemplate(this.selectedId, this.files, this.indexResult, languages);
            }
            await this.loadIndex(this.selectedId);
        });
    }

    /** «Update the agreement files»: saves the migrated demo values in every file of the selected agreement and in the index. */
    async applyDemoMigration(): Promise<void> {
        if (!this.selectedId || this.working) {
            return;
        }
        const agreementId = this.selectedId;
        await this.run('MIGRATED', async () => {
            await this.repository.applyDemoMigration(agreementId);
            await this.loadIndex(agreementId);
        });
    }

    openDuplicate(): void {
        this.duplicateOpen = !this.duplicateOpen;
        this.duplicateName = '';
        this.duplicateId = '';
        this.duplicateIdTouched = false;
    }

    onDuplicateName(value: string): void {
        this.duplicateName = value;
        if (!this.duplicateIdTouched) {
            this.duplicateId = slugAgreementId(value);
        }
    }

    onDuplicateId(value: string): void {
        this.duplicateId = value;
        this.duplicateIdTouched = true;
    }

    /** New agreement with the rules of the selected one (as shown), as a draft. */
    async duplicate(): Promise<void> {
        if (!this.files || !this.indexResult || !this.duplicateValid || this.working) {
            return;
        }
        const target = { agreementId: this.duplicateId.trim(), providerName: this.duplicateName.trim() };
        await this.run('DUPLICATED', async () => {
            if (this.files && this.indexResult) {
                await this.repository.duplicate(this.files, target, this.indexResult);
            }
            this.duplicateOpen = false;
            this.tab = 'general';
            await this.loadIndex(target.agreementId);
        });
    }

    onSearch(value: string): void {
        this.search = value;
        this.filter();
    }

    /** Rules assistant: opens the tab of the proposal's file; its editor adds the row to the draft and highlights it. */
    applyProposal(proposal: RuleProposal): void {
        const target = ASSISTANT_TARGETS[proposal.kind];
        this.tab = target.tab;
        if (target.agentTab) {
            this.agentTab = target.agentTab;
        }
        this.assistantDraft = { proposal, nonce: ++this.assistantNonce };
    }

    fileRows(kind: AgreementFileKind): number | null {
        const file = this.files?.[kind];
        if (!file) {
            return null;
        }
        if (kind === 'documentationChecklist') {
            return parseDocumentationChecklist(file.content)?.rules.length ?? 0;
        }
        if (kind === 'preanalysisPolicy') {
            return Object.keys((file.content['profiles'] as Record<string, unknown>) ?? {}).length;
        }
        const config = AGENT_RULES_LIST[kind];
        const list = config ? file.content[config.listKey] : null;
        return Array.isArray(list) ? list.length : null;
    }

    agentTabPending(kinds: AgreementFileKind[]): boolean {
        return kinds.some((kind) => this.files?.[kind].source !== 'appdata');
    }

    /** «<file> saved: version a → b» in the AI rules history; a failure here never blocks the save that already happened. */
    private async logRulesFileSave(agreementId: string, kind: AgreementFileKind, before: string, after: string): Promise<void> {
        try {
            const event = fileSavedEvent(AGREEMENT_FILE_NAMES[kind], before, after, this.repository.changeMeta());
            if (!(await this.repository.appendAiHistory(agreementId, [event], this.language))) {
                return;
            }
            const aiSettings = await this.repository.loadLocalizedFile(agreementId, 'aiSettings', this.language);
            if (agreementId === this.selectedId && this.files) {
                this.files = { ...this.files, aiSettings };
            }
        } catch {
            // The history is informative: the rules file is saved anyway.
        }
    }

    private async run(done: string, action: () => Promise<void>): Promise<void> {
        this.working = true;
        this.actionError = null;
        this.actionDone = null;
        try {
            await action();
            this.actionDone = done;
        } catch {
            this.actionError = 'WRITE_ERROR';
        } finally {
            this.working = false;
        }
    }

    private filter(): void {
        const term = this.search.trim().toLowerCase();
        const entries = this.indexResult?.index.agreements ?? [];
        this.visibleEntries = term
            ? entries.filter((entry) => [entry.providerName, this.payerOf(entry), entry.agreementId].join(' ').toLowerCase().includes(term))
            : entries;
    }

    private async loadSummaries(): Promise<void> {
        const ids = (this.indexResult?.index.agreements ?? []).map((entry) => entry.agreementId);
        const language = this.language;
        try {
            const summaries = await this.repository.loadAgreementSummaries(ids, language);
            if (language === this.language) {
                this.summaries = summaries;
                this.filter();
            }
        } catch {
            // The index entries stay as the fallback.
        }
    }

    private derive(): void {
        const checklist = this.files ? parseDocumentationChecklist(this.files.documentationChecklist.content) : null;
        this.checklistRuleIds = checklist ? checklist.rules.map((rule) => rule.ruleId) : null;
        this.catalogueNames = checklist ? checklistDocumentCatalogue(checklist) : [];
        this.profileKeys = Object.keys((this.files?.preanalysisPolicy.content['profiles'] as Record<string, unknown>) ?? {});
        this.kdPlaceId = this.selectedId ? agreementDocumentsPlaceId(this.selectedId) : '';
        this.kdFallback = agreementKnowledgeDiscovery(this.files?.agreement.content ?? {});
        this.summary = [
            { labelKey: 'SUMMARY.CHECKLIST_RULES', value: this.fileRows('documentationChecklist') ?? 0 },
            { labelKey: 'SUMMARY.POLICY_PROFILES', value: this.fileRows('preanalysisPolicy') ?? 0 },
            { labelKey: 'SUMMARY.TARIFFS', value: this.fileRows('tariffAgreement') ?? 0 },
            { labelKey: 'SUMMARY.COMPLIANCE_RULES', value: this.fileRows('payerCompliancePolicy') ?? 0 },
            { labelKey: 'SUMMARY.CODING_RULES', value: (this.fileRows('payerCodingPolicy') ?? 0) + (this.fileRows('codingRules') ?? 0) },
        ];
    }
}
