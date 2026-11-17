import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { extractBatchContext } from '../../../dashboard/mappers/attention-batch-context';
import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { PatientCaseGroup } from '../utils/case-grouping.util';
import { CaseTabTarget } from '../utils/case-navigation.util';
import { countByState, deriveValidationMap, ValidationStep } from '../utils/case-validation-map.util';
import { buildCaseAccountView, CaseInvoiceOption } from '../utils/case-invoice.util';
import {
    AccountValidationStepView,
    aggregateAccountValidations,
    derivePatientValidations,
    matchingInvoiceKeys,
    PatientValidationRow,
    resolveAccountReference,
} from '../utils/case-account-validation.util';
import { AccountSummary } from '../../../dashboard/utils/dashboard-provider-group.util';
import { parseBatchState } from '../batch-state-case-detail.provider';

const STEP_LABEL_KEYS: Record<ValidationStep['key'], string> = {
    documents: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.DOCUMENTS',
    rules: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.RULES',
    coding: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.CODING',
    compliance: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.COMPLIANCE_ALERTS',
    financial: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.FINANCIAL',
};

/** One recognizable icon per validation; the state is shown by color and a small badge. */
const STEP_ICONS: Record<ValidationStep['key'], string> = {
    documents: 'folder_open',
    rules: 'rule',
    coding: 'medical_services',
    compliance: 'policy',
    financial: 'payments',
};

/** Patient entries written by Automate in accountSummary (v3), if any. */
function readSummaryPatients(raw: unknown): NonNullable<AccountSummary['patients']> {
    let value: unknown = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch {
            return [];
        }
    }
    const patients = (value as AccountSummary | null)?.patients;
    return Array.isArray(patients) ? patients : [];
}

/**
 * One patient case in the open-tasks list. The whole row and each validation button open the
 * case detail; the host performs the navigation. Scores are placeholders until their
 * definition is validated; nothing here writes to Automate.
 */
@Component({
    selector: 'medical-records-patient-case-row',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './patient-case-row.component.html',
    styleUrls: ['./patient-case-row.component.scss'],
})
export class PatientCaseRowComponent {
    @Input({ required: true }) set group(value: PatientCaseGroup) {
        this._group = value;
        const primary = value.primary;
        const context = extractBatchContext(primary.processVariables['batchState']);
        // The row identifies the ACCOUNT: with several customer invoices it shows the provider and
        // how many invoices it brings, not just the first patient.
        const account = buildCaseAccountView(parseBatchState(primary.processVariables['batchState']));
        this.invoiceCount = account.account.invoiceCount;
        this.patientName =
            this.invoiceCount > 1
                ? account.account.provider ?? primary.title
                : account.invoices[0]?.patientName ?? context.patientName ?? primary.title;
        this.reviewRequired = value.items.some((task) => extractBatchContext(task.processVariables['batchState']).reviewRequired);
        this.steps = deriveValidationMap({ taskType: value.stage, variables: primary.processVariables });
        this.counts = countByState(this.steps);
        // Account view: validations per patient (customer invoice) and per account.
        this.invoices = account.invoices;
        this.provider = account.account.provider;
        this.accountRef = resolveAccountReference(primary.processVariables, account.invoices, primary.nativeReference?.rootProcessInstanceId ?? primary.nativeReference?.processInstanceId);
        this.patientRows = derivePatientValidations(this.steps, account.invoices, readSummaryPatients(primary.processVariables['accountSummary']));
        this.accountSteps = aggregateAccountValidations(this.steps, this.patientRows);
        this.openStepKey = null;
        this.applySearch();
    }
    get group(): PatientCaseGroup {
        return this._group;
    }
    /** `table`: one compact line aligned with the list's column header; `card`: the stacked card. */
    @Input() layout: 'table' | 'card' = 'card';
    @Input() selectable = false;
    @Input() selectedIds: ReadonlySet<string> = new Set();
    @Output() openCase = new EventEmitter<CaseTabTarget | undefined>();
    @Output() openTask = new EventEmitter<ProcessAttentionItem>();
    @Output() taskToggle = new EventEmitter<{ item: ProcessAttentionItem; event: Event }>();
    /** Table layout: select or clear every open task of the case at once. */
    @Output() caseToggle = new EventEmitter<{ items: ProcessAttentionItem[]; selected: boolean }>();

    patientName = '';
    /** Customer invoices (patients) of the account; more than one shows a badge. */
    invoiceCount = 0;
    invoices: CaseInvoiceOption[] = [];
    provider: string | null = null;
    accountRef: { value: string; kind: 'account' | 'invoice' | 'process' } = { value: '—', kind: 'process' };
    patientRows: PatientValidationRow[] = [];
    accountSteps: AccountValidationStepView[] = [];
    /** Account validation whose per-patient status is shown. */
    openStepKey: string | null = null;

    /** Search of the list: the sub-cards show only the matching patients (with a way to see all). */
    @Input() set searchTerm(value: string | null | undefined) {
        this._searchTerm = value ?? '';
        this.showAllPatients = false;
        this.applySearch();
    }
    private _searchTerm = '';
    private matchingKeys: Set<string> | null = null;
    showAllPatients = false;
    visiblePatientRows: PatientValidationRow[] = [];

    get hiddenPatientCount(): number {
        return this.patientRows.length - this.visiblePatientRows.length;
    }

    isMatch(row: PatientValidationRow): boolean {
        return !!this.matchingKeys?.has(row.key);
    }

    toggleAllPatients(event: Event): void {
        event.stopPropagation();
        this.showAllPatients = !this.showAllPatients;
        this.applySearch();
    }

    private applySearch(): void {
        this.matchingKeys = matchingInvoiceKeys(this.invoices, this._searchTerm);
        this.visiblePatientRows =
            this.matchingKeys && !this.showAllPatients ? this.patientRows.filter((row) => this.matchingKeys?.has(row.key)) : this.patientRows;
    }
    reviewRequired = false;
    steps: ValidationStep[] = [];
    counts = { executed: 0, pending: 0, blocking: 0 };

    private _group!: PatientCaseGroup;

    toggleStep(step: AccountValidationStepView, event: Event): void {
        event.stopPropagation();
        this.openStepKey = this.openStepKey === step.key ? null : step.key;
    }

    get openStep(): AccountValidationStepView | null {
        return this.accountSteps.find((step) => step.key === this.openStepKey) ?? null;
    }

    /** Opens one patient (customer invoice) of the account, optionally on a validation's section. */
    openInvoice(invoiceKey: string, step?: ValidationStep, event?: Event): void {
        event?.stopPropagation();
        this.openStepKey = null;
        this.openCase.emit({ ...(step?.target ?? { tab: 'intake' }), invoice: invoiceKey });
    }

    trackRow(_index: number, row: PatientValidationRow): string {
        return row.key;
    }

    stateKey(state: string): string {
        return 'MEDICAL_RECORDS.CASE_DETAIL.ROW.STATE_' + state.toUpperCase();
    }

    stateIcon(state: string): string {
        return state === 'executed' ? 'check' : state === 'blocking' ? 'priority_high' : 'more_horiz';
    }

    stepLabelKey(step: ValidationStep): string {
        return STEP_LABEL_KEYS[step.key];
    }

    stepIcon(step: ValidationStep): string {
        return STEP_ICONS[step.key];
    }

    /** Current stage of the account (most advanced open task). */
    get stageKey(): string {
        return this.taskTypeKey(this._group.primary);
    }

    get caseSelected(): boolean {
        return this._group.items.length > 0 && this._group.items.every((task) => this.selectedIds.has(task.id));
    }

    get casePartiallySelected(): boolean {
        return !this.caseSelected && this._group.items.some((task) => this.selectedIds.has(task.id));
    }

    toggleCase(event: Event): void {
        event.stopPropagation();
        this.caseToggle.emit({ items: this._group.items, selected: (event.target as HTMLInputElement).checked });
    }

    open(target?: CaseTabTarget, event?: Event): void {
        event?.stopPropagation();
        this.openCase.emit(target);
    }

    toggleTask(item: ProcessAttentionItem, event: Event): void {
        event.stopPropagation();
        this.taskToggle.emit({ item, event });
    }

    openNativeTask(item: ProcessAttentionItem, event: Event): void {
        event.stopPropagation();
        this.openTask.emit(item);
    }

    taskTypeKey(item: ProcessAttentionItem): string {
        const keys: Record<string, string> = {
            intake: 'MEDICAL_RECORDS.TASK_TYPES.INTAKE',
            validateRules: 'MEDICAL_RECORDS.TASK_TYPES.VALIDATE_RULES',
            analysis: 'MEDICAL_RECORDS.TASK_TYPES.ANALYSIS',
        };
        return keys[item.taskType] ?? 'MEDICAL_RECORDS.TASK_TYPES.UNKNOWN';
    }
}
