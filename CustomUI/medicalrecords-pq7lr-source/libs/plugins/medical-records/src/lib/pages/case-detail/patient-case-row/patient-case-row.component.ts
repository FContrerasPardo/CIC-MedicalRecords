import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { extractBatchContext } from '../../../dashboard/mappers/attention-batch-context';
import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { PatientCaseGroup } from '../utils/case-grouping.util';
import { CaseTabTarget, patientChipTarget } from '../utils/case-navigation.util';
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
import { accountStageLabelKey } from '../../../dashboard/utils/dashboard-audit-fields.util';
import { mapBatchStateToIntakeForDocuments } from '../../../form-widgets/intake-account-widget/batch-state.mapper';
import { ACCOUNT_STAGE_ICONS, buildCaseStepper, CaseProgress, CaseStep, CaseStepper, inferCaseStage, tabOfPhase } from '../utils/case-progress.util';
import { PatientFindingSignal, patientFindingSignals, patientIntakeWarningCount } from '../utils/case-patient-signal.util';
import { emptyAuditRecord, parseAuditState } from '../invoice-workspace/audit-findings.util';
import { INVOICE_AUDIT_STATE_VARIABLE } from '../invoice-workspace/invoice-audit-store.service';
import { CaseProgressRepositoryService } from '../invoice-workspace/case-progress-repository.service';

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
        this.buildAccountStage(primary.processVariables, account.invoices);
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
    private readonly progressRepository = inject(CaseProgressRepositoryService);
    private stageToken = 0;

    /**
     * Stages of the ACCOUNT, the same the account stepper shows (Control Center `accountStage`
     * plus the analyst progress in case-progress.json when it can be read). Shown only in the account
     * row; the patient sub-cards show the patient's findings instead (no repeated stages).
     */
    stageStepper: CaseStepper = buildCaseStepper(null, null);
    /** Findings identified per patient (invoice key), with the highest severity. */
    patientSignals: Record<string, PatientFindingSignal> = {};

    private buildAccountStage(variables: Record<string, unknown>, invoices: CaseInvoiceOption[]): void {
        const inferred = inferCaseStage(variables);
        this.stageStepper = buildCaseStepper(null, inferred);
        this.buildSignals(variables, invoices, null);
        const processInstanceId = this._group.primary.nativeReference?.rootProcessInstanceId ?? this._group.primary.nativeReference?.processInstanceId ?? null;
        const token = ++this.stageToken;
        void this.progressRepository.peekProgress(variables, variables['batchState'], processInstanceId).then((progress) => {
            if (progress && token === this.stageToken) {
                this.stageStepper = buildCaseStepper(progress, inferred);
                // The analyst's registrations (case-progress.json) are findings of the patient too.
                this.buildSignals(variables, invoices, progress);
            }
        });
    }

    /** Findings (registered) and warnings (observed) per patient; see patientFindingSignals. */
    private buildSignals(variables: Record<string, unknown>, invoices: CaseInvoiceOption[], progress: CaseProgress | null): void {
        const batchState = parseBatchState(variables['batchState']);
        const services = new Map(
            invoices.map((option) => [option.key, batchState && option.documentIds.length ? mapBatchStateToIntakeForDocuments(batchState, option.documentIds).services : []])
        );
        const audit = parseAuditState(variables[INVOICE_AUDIT_STATE_VARIABLE]);
        const signals = patientFindingSignals(invoices, variables, audit, (invoice) => services.get(invoice.key) ?? [], {
            registrations: progress?.registrations ?? [],
            // Reviewed or remediated services do not count as warnings (same rule as the invoice workspace).
            warningsOf: (invoice) => patientIntakeWarningCount(invoice.key, services.get(invoice.key) ?? [], audit.invoices[invoice.key] ?? emptyAuditRecord(), progress),
        });
        this.patientSignals = Object.fromEntries(signals.map((signal) => [signal.key, signal]));
    }

    /**
     * Patient chip: opens the account on THAT patient, in the audit once the account reached it,
     * else in the intake with the Findings panel in view.
     */
    openPatientSignal(invoiceKey: string, event: Event): void {
        event.stopPropagation();
        this.openStepKey = null;
        this.openCase.emit(patientChipTarget(this.stageStepper.current, invoiceKey));
    }

    stageIcon(step: CaseStep): string {
        return ACCOUNT_STAGE_ICONS[step.stage];
    }

    /** Row state classes reused for the stages: completed, current (in progress), pending, error. */
    stageState(step: CaseStep): string {
        return step.status === 'completed' ? 'executed' : step.status === 'error' ? 'blocking' : step.status === 'in_progress' ? 'current' : 'pending';
    }

    stageStatusKey(step: CaseStep): string {
        return 'MEDICAL_RECORDS.INVOICE_WORKSPACE.PROGRESS.STATUS.' + step.status.toUpperCase();
    }

    stageBadgeIcon(step: CaseStep): string {
        return step.status === 'completed' ? 'check' : step.status === 'error' ? 'priority_high' : step.status === 'in_progress' ? 'autorenew' : 'more_horiz';
    }

    /** A stage opens its workspace phase; stages owned by the process or not reached yet do not. */
    openStage(step: CaseStep, event: Event): void {
        event.stopPropagation();
        if (step.phase && step.availability !== 'locked') {
            this.openCase.emit({ tab: tabOfPhase(step.phase) });
        }
    }

    signalOf(key: string): PatientFindingSignal | null {
        return this.patientSignals[key] ?? null;
    }

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

    /** Current stage of the ACCOUNT, the same as the account stepper (not the open task type). */
    get stageKey(): string {
        return accountStageLabelKey(this.stageStepper.current);
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
