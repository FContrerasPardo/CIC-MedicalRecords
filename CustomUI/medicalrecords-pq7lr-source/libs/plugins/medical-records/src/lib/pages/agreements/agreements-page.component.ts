import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AgreementRulesFileEditorComponent } from './agent-rules/agreement-rules-file-editor.component';
import { AgreementChecklistEditorComponent } from './checklist/agreement-checklist-editor.component';
import { checklistDocumentCatalogue, parseDocumentationChecklist } from './checklist/documentation-checklist.util';
import { AgreementGeneralPanelComponent } from './general/agreement-general-panel.component';
import { PreanalysisPolicyEditorComponent } from './policy/preanalysis-policy-editor.component';
import { AgreementFiles, AgreementRepositoryService, AgreementsIndexLoadResult } from './store/agreement-repository.service';
import {
    AGENT_RULES_LIST,
    AGREEMENT_FILE_CONSUMERS,
    AGREEMENT_FILE_KINDS,
    AgreementFileKind,
    AgreementIndexEntry,
    agreementFileVersion,
    isValidAgreementId,
    slugAgreementId,
} from './store/agreement-store.util';
import { hasAgreementTemplate } from './store/agreement-templates';

type AgreementTab = 'general' | 'checklist' | 'policy' | 'agentRules' | 'documents';
type AgentRulesTab = 'financial' | 'compliance' | 'coding';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/** Sub-tabs of «Agent rules»: each Agent Mesh agent and the files it reads. */
const AGENT_RULES_TABS: Array<{ key: AgentRulesTab; icon: string; kinds: AgreementFileKind[] }> = [
    { key: 'financial', icon: 'payments', kinds: ['tariffAgreement'] },
    { key: 'compliance', icon: 'gpp_maybe', kinds: ['payerCompliancePolicy'] },
    { key: 'coding', icon: 'code_blocks', kinds: ['payerCodingPolicy', 'codingRules'] },
];

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
    ],
    templateUrl: './agreements-page.component.html',
    styleUrls: ['./agreements-page.component.scss'],
})
export class AgreementsPageComponent implements OnInit {
    private readonly repository = inject(AgreementRepositoryService);

    readonly i18n = I18N;
    readonly tabs: Array<{ key: AgreementTab; icon: string }> = [
        { key: 'general', icon: 'handshake' },
        { key: 'checklist', icon: 'fact_check' },
        { key: 'policy', icon: 'policy' },
        { key: 'agentRules', icon: 'smart_toy' },
        { key: 'documents', icon: 'folder_open' },
    ];
    readonly agentTabs = AGENT_RULES_TABS;
    readonly fileKinds = AGREEMENT_FILE_KINDS;
    readonly consumers = AGREEMENT_FILE_CONSUMERS;

    loadingIndex = true;
    indexResult: AgreementsIndexLoadResult | null = null;
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

    get selected(): AgreementIndexEntry | null {
        return this.indexResult?.index.agreements.find((entry) => entry.agreementId === this.selectedId) ?? null;
    }

    get pendingFiles(): AgreementFileKind[] {
        return this.files ? AGREEMENT_FILE_KINDS.filter((kind) => this.files?.[kind].source !== 'appdata') : [];
    }

    get general(): Record<string, unknown> {
        return (this.files?.agreement.content['general'] as Record<string, unknown>) ?? {};
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
        const entries = this.indexResult?.index.agreements ?? [];
        const next = selectId ?? (entries.some((entry) => entry.agreementId === this.selectedId) ? this.selectedId : entries[0]?.agreementId);
        if (next) {
            await this.select(next, true);
        }
    }

    async select(agreementId: string, force = false): Promise<void> {
        if (agreementId === this.selectedId && !force && this.files) {
            return;
        }
        this.selectedId = agreementId;
        this.actionError = null;
        this.actionDone = null;
        this.duplicateOpen = false;
        await this.loadFiles();
    }

    async loadFiles(): Promise<void> {
        if (!this.selectedId) {
            return;
        }
        this.loadingFiles = true;
        try {
            this.files = await this.repository.loadAgreement(this.selectedId);
        } catch {
            this.files = null;
        }
        this.loadingFiles = false;
        this.derive();
    }

    /** One file was saved by its editor: reload it (and the index, for the general data). */
    async onSaved(kind: AgreementFileKind): Promise<void> {
        if (!this.files) {
            return;
        }
        const agreementId = this.selectedId;
        const file = await this.repository.loadFile(agreementId, kind);
        if (agreementId !== this.selectedId || !this.files) {
            return;
        }
        this.files = { ...this.files, [kind]: file };
        this.derive();
        if (kind === 'agreement' && this.indexResult) {
            try {
                await this.repository.syncIndexEntry(agreementId, file.content, this.indexResult);
                this.indexResult = await this.repository.loadIndex();
                this.filter();
            } catch {
                this.actionError = 'INDEX_ERROR';
            }
        }
    }

    /** Writes every file of the selected agreement that is not yet in Appdata, from the bundled template, and registers it in the index. */
    async createFromTemplate(): Promise<void> {
        if (!this.files || !this.indexResult || this.working) {
            return;
        }
        await this.run('CREATED', async () => {
            if (this.files && this.indexResult) {
                await this.repository.createFromTemplate(this.selectedId, this.files, this.indexResult);
            }
            await this.loadIndex(this.selectedId);
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

    fileVersion(kind: AgreementFileKind): string {
        return this.files ? agreementFileVersion(kind, this.files[kind].content) : '';
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
            ? entries.filter((entry) => [entry.providerName, entry.payer, entry.agreementId].join(' ').toLowerCase().includes(term))
            : entries;
    }

    private derive(): void {
        const checklist = this.files ? parseDocumentationChecklist(this.files.documentationChecklist.content) : null;
        this.checklistRuleIds = checklist ? checklist.rules.map((rule) => rule.ruleId) : null;
        this.catalogueNames = checklist ? checklistDocumentCatalogue(checklist) : [];
        this.profileKeys = Object.keys((this.files?.preanalysisPolicy.content['profiles'] as Record<string, unknown>) ?? {});
        this.summary = [
            { labelKey: 'SUMMARY.CHECKLIST_RULES', value: this.fileRows('documentationChecklist') ?? 0 },
            { labelKey: 'SUMMARY.POLICY_PROFILES', value: this.fileRows('preanalysisPolicy') ?? 0 },
            { labelKey: 'SUMMARY.TARIFFS', value: this.fileRows('tariffAgreement') ?? 0 },
            { labelKey: 'SUMMARY.COMPLIANCE_RULES', value: this.fileRows('payerCompliancePolicy') ?? 0 },
            { labelKey: 'SUMMARY.CODING_RULES', value: (this.fileRows('payerCodingPolicy') ?? 0) + (this.fileRows('codingRules') ?? 0) },
        ];
    }
}
