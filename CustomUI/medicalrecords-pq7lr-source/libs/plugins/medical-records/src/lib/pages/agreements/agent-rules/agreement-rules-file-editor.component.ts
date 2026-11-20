import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AgentRulesListItem, AgentRulesSectionViewModel } from '../../../form-widgets/agent-rules-widget/agent-rules-widget.model';
import { getListKeyForItem, getTariffModifierLabel, getTariffModifierTone, mapToViewModel } from '../../../form-widgets/agent-rules-widget/agent-rules.mapper';
import { AssistantDraftRequest } from '../assistant/rule-assistant.model';
import { addUniqueValue } from '../checklist/documentation-checklist.util';
import { AgreementFileStatusComponent } from '../shared/agreement-file-status.component';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';
import {
    AGENT_RULES_LIST,
    AGREEMENT_FILE_CONSUMERS,
    AgreementFileIssue,
    AgreementFileKind,
    cloneJson,
    JsonObject,
    parseJsonObject,
    stampAgreementFile,
    validateAgreementFile,
} from '../store/agreement-store.util';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

type EditMode = 'form' | 'json';

/** A new row of each agent rules file, in the shape the Agent Mesh variables use. */
const NEW_ROWS: Partial<Record<AgreementFileKind, (id: string) => JsonObject>> = {
    tariffAgreement: (id) => ({
        serviceCode: id,
        procedureCode: id,
        description: '',
        expectedAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        allowedVariancePercentage: 10,
        requiresAuthorization: false,
        requiredDocuments: [],
    }),
    payerCompliancePolicy: (id) => ({ policyRuleId: id, type: '', description: '', requiredDocuments: [], riskLevelIfViolated: 'MEDIUM' }),
    payerCodingPolicy: (id) => ({ policyRuleId: id, type: '', procedureCode: '', description: '', requiredDocuments: [], riskLevelIfViolated: 'MEDIUM' }),
    codingRules: (id) => ({ ruleId: id, type: '', procedureCode: '', description: '', allowedDiagnosisCodes: [], riskLevelIfViolated: 'MEDIUM' }),
};

const ID_PREFIX: Partial<Record<AgreementFileKind, string>> = {
    tariffAgreement: 'SVC',
    payerCompliancePolicy: 'COMP',
    payerCodingPolicy: 'PCP',
    codingRules: 'CR',
};

/**
 * One agent rules file of an agreement (tariffs, compliance policy, coding policy or coding rules):
 * structured editor built on the agent rules widget mapper (`mapToViewModel`), plus the advanced
 * JSON with validation. Saved on its own, with a version bump.
 */
@Component({
    selector: 'medical-records-agreement-rules-file-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AgreementFileStatusComponent],
    templateUrl: './agreement-rules-file-editor.component.html',
    styleUrls: ['../agreements-page.component.scss', './agreement-rules-file-editor.component.scss'],
})
export class AgreementRulesFileEditorComponent implements OnChanges {
    private readonly repository = inject(AgreementRepositoryService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    @Input() agreementId = '';
    @Input({ required: true }) kind!: AgreementFileKind;
    @Input() file: AgreementFileLoadResult | null = null;
    /** A row proposed by the rules assistant, added to the draft and highlighted. */
    @Input() assistantDraft: AssistantDraftRequest | null = null;
    @Output() saved = new EventEmitter<void>();

    readonly i18n = I18N;

    section: AgentRulesSectionViewModel | null = null;
    /** Editor copy; null when viewing. */
    draft: JsonObject | null = null;
    mode: EditMode = 'form';
    jsonText = '';
    jsonInvalid = false;
    issues: AgreementFileIssue[] = [];
    saveAttempted = false;
    saving = false;
    saveError = false;
    savedVersion: string | null = null;
    expanded = new Set<number>();
    /** Rows added by the assistant in the current draft (highlighted). */
    assistantRows = new Set<number>();

    get consumer(): { agent: string; variable: string | null } {
        return AGREEMENT_FILE_CONSUMERS[this.kind];
    }

    get isTariff(): boolean {
        return this.kind === 'tariffAgreement';
    }

    get idKey(): string {
        return AGENT_RULES_LIST[this.kind]?.idKeys[0] ?? 'ruleId';
    }

    get canCreate(): boolean {
        return !!this.file && this.file.source !== 'appdata' && !this.saving && !this.draft;
    }

    get rowIssueCount(): number {
        return this.issues.length;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['file'] && !this.draft) {
            this.rebuild(this.file?.content ?? null);
        }
        if (changes['assistantDraft'] && this.assistantDraft?.proposal.kind === this.kind) {
            this.addProposedRow(this.assistantDraft.proposal.row);
        }
    }

    /** Rules assistant: opens the editor (when closed), appends the proposed row, expands and highlights it. */
    addProposedRow(row: JsonObject): void {
        const config = AGENT_RULES_LIST[this.kind];
        if (!this.draft) {
            this.startEdit();
        }
        if (!this.draft || !config) {
            return;
        }
        if (this.mode === 'json') {
            this.mode = 'form';
        }
        const rows = this.rows();
        this.draft[config.listKey] = [...rows, cloneJson(row)];
        this.expanded.add(rows.length);
        this.assistantRows.add(rows.length);
        this.syncFromDraft();
        setTimeout(() => this.host.nativeElement.querySelector('.assistant-new')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }

    /** Tariff status chip: authorization required, or active. */
    tariffStatus(row: number): 'AUTH' | 'ACTIVE' {
        return this.rowValueOf(row, 'requiresAuthorization') ? 'AUTH' : 'ACTIVE';
    }

    startEdit(): void {
        if (!this.file) {
            return;
        }
        this.draft = cloneJson(this.file.content);
        this.mode = 'form';
        this.saveAttempted = false;
        this.saveError = false;
        this.savedVersion = null;
        this.syncFromDraft();
    }

    cancelEdit(): void {
        this.draft = null;
        this.assistantRows.clear();
        this.issues = [];
        this.jsonInvalid = false;
        this.rebuild(this.file?.content ?? null);
    }

    setMode(mode: EditMode): void {
        if (mode === this.mode || !this.draft) {
            return;
        }
        if (mode === 'form' && this.jsonInvalid) {
            return;
        }
        this.mode = mode;
        if (mode === 'json') {
            this.jsonText = JSON.stringify(this.draft, null, 2);
        }
    }

    onJsonChange(value: string): void {
        this.jsonText = value;
        const parsed = parseJsonObject(value);
        this.jsonInvalid = !parsed;
        if (parsed) {
            this.draft = parsed;
            this.rebuild(parsed);
            this.validate();
        } else {
            this.issues = [{ code: 'JSON_INVALID', row: null }];
        }
    }

    setMeta(key: string, value: string): void {
        if (!this.draft) {
            return;
        }
        const numeric = key === 'defaultAllowedVariancePercentage';
        this.draft[key] = numeric ? Number(value) : value;
        this.syncFromDraft();
    }

    setField(row: number, key: string, value: unknown, type: string): void {
        const target = this.rows()[row];
        if (!target) {
            return;
        }
        if (type === 'number') {
            target[key] = value === '' || value === null ? null : Number(value);
        } else if (type === 'boolean') {
            target[key] = !!value;
        } else {
            target[key] = value;
        }
        if (this.isTariff && key === 'serviceCode' && !target['procedureCode']) {
            target['procedureCode'] = value;
        }
        this.syncFromDraft();
    }

    addChip(row: number, key: string, input: HTMLInputElement, event?: Event): void {
        event?.preventDefault();
        const target = this.rows()[row];
        if (target) {
            const current = Array.isArray(target[key]) ? (target[key] as unknown[]).map(String) : [];
            target[key] = addUniqueValue(current, input.value);
            input.value = '';
            this.syncFromDraft();
        }
    }

    removeChip(row: number, key: string, index: number): void {
        const target = this.rows()[row];
        if (target && Array.isArray(target[key])) {
            target[key] = (target[key] as unknown[]).filter((_value, position) => position !== index);
            this.syncFromDraft();
        }
    }

    addRow(): void {
        const build = NEW_ROWS[this.kind];
        const config = AGENT_RULES_LIST[this.kind];
        if (!this.draft || !build || !config) {
            return;
        }
        const rows = this.rows();
        const used = new Set(rows.map((row) => String(row[this.idKey] ?? '').toUpperCase()));
        let next = rows.length + 1;
        let id = `${ID_PREFIX[this.kind]}-${String(next).padStart(3, '0')}`;
        while (used.has(id)) {
            next += 1;
            id = `${ID_PREFIX[this.kind]}-${String(next).padStart(3, '0')}`;
        }
        this.draft[config.listKey] = [...rows, build(id)];
        this.expanded.add(rows.length);
        this.syncFromDraft();
    }

    removeRow(row: number): void {
        const config = AGENT_RULES_LIST[this.kind];
        if (this.draft && config) {
            this.draft[config.listKey] = this.rows().filter((_item, position) => position !== row);
            this.expanded.clear();
            this.assistantRows.clear();
            this.syncFromDraft();
        }
    }

    toggle(row: number): void {
        if (this.expanded.has(row)) {
            this.expanded.delete(row);
        } else {
            this.expanded.add(row);
        }
    }

    issuesFor(row: number | null): AgreementFileIssue[] {
        return this.issues.filter((issue) => issue.row === row);
    }

    /** A value of a row of the draft (editing). */
    rowValue(row: number, key: string): unknown {
        return this.rows()[row]?.[key];
    }

    /** A value of a row of what is shown (draft or file). */
    rowValueOf(row: number, key: string): unknown {
        const config = AGENT_RULES_LIST[this.kind];
        const list = config ? (this.draft ?? this.file?.content)?.[config.listKey] : null;
        return Array.isArray(list) ? (list[row] as JsonObject | undefined)?.[key] : undefined;
    }

    /** A numeric value of a shown row, or null (the number pipe never receives text). */
    amountOf(row: number, key: string): number | null {
        const value = this.rowValueOf(row, key);
        const parsed = typeof value === 'number' ? value : Number(value);
        return value === null || value === undefined || value === '' || !Number.isFinite(parsed) ? null : parsed;
    }

    modifierLabel(item: AgentRulesListItem): string {
        return getTariffModifierLabel(item);
    }

    modifierTone(item: AgentRulesListItem): string {
        return getTariffModifierTone(item);
    }

    async createFromTemplate(): Promise<void> {
        if (this.file && this.canCreate) {
            await this.write(cloneJson(this.file.content));
        }
    }

    async save(): Promise<void> {
        if (!this.draft) {
            return;
        }
        this.saveAttempted = true;
        this.validate();
        if (this.jsonInvalid || this.issues.length) {
            return;
        }
        const content = stampAgreementFile(this.kind, { ...this.draft, agreementId: this.agreementId });
        if (await this.write(content)) {
            this.draft = null;
            this.assistantRows.clear();
            this.issues = [];
        }
    }

    download(): void {
        if (!this.file) {
            return;
        }
        const blob = new Blob([JSON.stringify(this.draft ?? this.file.content, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.file.path.split('/').pop()?.replace('.json', '') ?? this.kind}-${this.agreementId}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    private async write(content: JsonObject): Promise<boolean> {
        if (!this.file) {
            return false;
        }
        this.saving = true;
        this.saveError = false;
        this.savedVersion = null;
        try {
            await this.repository.saveAgreementFile(this.file, content);
            this.savedVersion = String(content['version'] ?? '') || '—';
            this.saved.emit();
            return true;
        } catch {
            this.saveError = true;
            return false;
        } finally {
            this.saving = false;
        }
    }

    private rows(): JsonObject[] {
        const config = AGENT_RULES_LIST[this.kind];
        const list = this.draft && config ? this.draft[config.listKey] : null;
        return Array.isArray(list) ? (list as JsonObject[]) : [];
    }

    private syncFromDraft(): void {
        if (!this.draft) {
            return;
        }
        this.jsonText = JSON.stringify(this.draft, null, 2);
        this.jsonInvalid = false;
        this.rebuild(this.draft);
        this.validate();
    }

    private validate(): void {
        this.issues = this.draft ? validateAgreementFile(this.kind, this.draft) : [];
    }

    /** The agent rules widget view of the file (same labels, fields and chips as the form widget). */
    private rebuild(content: JsonObject | null): void {
        if (!content || !this.kind) {
            this.section = null;
            return;
        }
        const model = mapToViewModel([{ id: this.kind, label: this.kind, agent: this.consumer.agent, group: '', value: content, isEmpty: false }]);
        this.section = model.sections[0] ?? null;
        if (this.section && getListKeyForItem(this.kind) !== AGENT_RULES_LIST[this.kind]?.listKey) {
            this.section = null;
        }
    }
}
