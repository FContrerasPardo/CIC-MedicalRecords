import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { FormFieldModel } from '@alfresco/adf-core';
import { TranslateModule } from '@ngx-translate/core';
import { BatchStateSource } from '../../../form-widgets/intake-account-widget/batch-state.model';
import { mapBatchStateToIntakeForDocuments } from '../../../form-widgets/intake-account-widget/batch-state.mapper';
import { IntakeAccountDocumentItemViewModel, IntakeAccountServiceItemViewModel } from '../../../form-widgets/intake-account-widget/intake-account-view.model';
import { AnalysisTaskWidgetComponent } from '../../../form-widgets/analysis-task-widget/analysis-task-widget.component';
import { resolveAgentSources } from '../../../form-widgets/analysis-task-widget/analysis-payload.resolver';
import { AgentFieldId, AgentResult } from '../../../form-widgets/analysis-task-widget/analysis.mapper';
import { createEmbeddedFormField } from '../../../form-widgets/shared/embedded-form-field';
import { PatientKey } from '../../../idp/idp-account-mapping.util';
import { CaseInvoiceOption } from '../utils/case-invoice.util';
import { INTAKE_FINDINGS_SUB, WORKSPACE_TAB_IDS, WorkspaceTabId } from '../utils/case-navigation.util';
import { intakeWarningsById, resolvedIntakeServiceIds } from '../utils/case-intake.util';
import { AccountStage, accountStageLabelKey } from '../../../dashboard/utils/dashboard-audit-fields.util';
import { DashboardDiagnosticsService } from '../../../dashboard/services/dashboard-diagnostics.service';
import { AccountVariablesRead, AgentMeshVariablesService } from '../../../dashboard/services/agent-mesh-variables.service';
import { agentStageProcessing, agentStageWaitingWithoutResults, mergeProcessVariables, reachedAutomateStage } from '../../../dashboard/utils/agent-mesh-variables.util';
import { RadicationStageArtComponent } from '../../radication/radication-stage-art.component';
import { RadicationStageKey } from '../../radication/utils/radication-progress.util';
import { buildInvoiceDiagnosticTables, summarizeCaseVariables } from '../utils/case-diagnostics.util';
import { CaseFolderResolution } from '../utils/case-folder.util';
import {
    addRegistration,
    autoAdvanceStage,
    autoApproveCleanPatients,
    buildCaseStepper,
    CasePatientPending,
    CasePhase,
    CasePhaseAvailability,
    CaseProgress,
    CaseStep,
    CaseStepper,
    CaseWorkStage,
    continuePatient,
    emptyCaseProgress,
    inferCaseStage,
    intakePendingCount,
    isCleanIntakePatient,
    isServiceReviewed,
    isWorkStage,
    markPatientsReviewed,
    patientStatus,
    phaseOfStage,
    reconcileCaseProgress,
    rememberPosition,
    restoreCaseProgress,
    removeRegistration,
    reopenStage,
    setServicesReviewed,
    stageIndex,
    stageOfPhase,
    syncPatientStage,
    tabOfPhase,
    workPhaseOfStage,
} from '../utils/case-progress.util';
import { CaseProgressRepositoryService } from './case-progress-repository.service';
import { CaseIntakePanelComponent, IntakeFindingDeleteRequest, IntakeFindingDismissRequest, IntakeRegistrationRequest } from './intake-panel/case-intake-panel.component';
import {
    addFinding,
    advanceCommunication,
    AuditFinding,
    availableToObject,
    buildFindingId,
    commentsForInvoice,
    countActiveFindings,
    emptyAuditRecord,
    emptyAuditState,
    FinancialSummary,
    FindingOrigin,
    findingStage,
    FindingStatus,
    fromAgentFinding,
    fromIntakeService,
    fromProviderComment,
    GlosaError,
    intakeFindingStatusById,
    InvoiceAuditRecord,
    InvoiceAuditState,
    parseProviderComments,
    ProposedGlosa,
    ProviderComment,
    proposeGlosa,
    removeIntakeFindings,
    responsesForFinding,
    setFindingStatus,
    sortAuditQueue,
    summarizeFinancials,
    withRecord,
} from './audit-findings.util';
import { AuditPersistenceMode, InvoiceAuditStoreService, PROVIDER_FINDING_COMMENTS_VARIABLE } from './invoice-audit-store.service';
import { AuditAssistantComponent } from '../audit-assistant/audit-assistant.component';
import { AuditFinding as AssistantFinding } from '../audit-assistant/audit-assistant.util';

type AgentOrigin = 'codingIntegrity' | 'complianceAlert' | 'financialVariance';
type WorkspacePhase = CasePhase;

/** `repository`: case-progress.json in the patient folder; `memory`: folder not resolved or not writable. */
export type ProgressPersistence = 'loading' | 'repository' | 'memory';

/** Debounce of the position (tab) save, so browsing tabs does not write on every click. */
const POSITION_SAVE_DELAY_MS = 2000;

/** Light polling of the process variables while Automate works on a stage (like the radication page). */
const AUTOMATE_POLL_MS = 5000;
const AUTOMATE_POLL_LIMIT = 120;

/** Loading scene per phase (RadicationStageArtComponent, reused as is from pages/radication). */
const PHASE_WAIT_ART: Record<CasePhase, RadicationStageKey> = { INTAKE: 'extraction', ANALYSIS: 'analysis', AUDIT: 'intake' };

/** At most intake → agents → audit in one automatic advance. */
const CASE_AUTO_STEPS = 2;

/** Account stage of a workspace phase (every phase is a per-patient work stage). */
function workStageOf(phase: CasePhase): CaseWorkStage {
    return stageOfPhase(phase) as CaseWorkStage;
}

interface AgentTab {
    id: AgentOrigin;
    field: AgentFieldId;
    /** Real agent name (Automate / Agent Builder); not translated. */
    agentName: string;
    icon: string;
    purposeKey: string;
}

interface AgentView {
    tab: AgentTab;
    result: AgentResult | null;
    parseError: boolean;
    findings: AuditFinding[];
    /** Count per severity, only for severities the agent reported. */
    severities: Array<{ level: string; count: number }>;
}

interface WorkspaceTab {
    id: WorkspaceTabId;
    phase: WorkspacePhase;
    labelKey?: string;
    label?: string;
    icon: string;
}

const I18N = 'MEDICAL_RECORDS.INVOICE_WORKSPACE';

const AGENT_TABS: AgentTab[] = [
    { id: 'codingIntegrity', field: 'codingIntegrityResult', agentName: 'Coding Integrity Agent', icon: 'code', purposeKey: `${I18N}.AGENT.PURPOSE.CODING` },
    { id: 'complianceAlert', field: 'complianceAlertResult', agentName: 'Compliance Alert Agent', icon: 'policy', purposeKey: `${I18N}.AGENT.PURPOSE.COMPLIANCE` },
    { id: 'financialVariance', field: 'financialVarianceResult', agentName: 'Financial Variance Agent', icon: 'request_quote', purposeKey: `${I18N}.AGENT.PURPOSE.FINANCIAL` },
];

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

/** Patient data shown in the invoice header, in this order (from the IDP account mapping). */
const PATIENT_FACTS: PatientKey[] = ['identification', 'medicalRecord', 'dateOfBirth', 'age', 'sex', 'affiliateNumber', 'admissionDate', 'dischargeDate', 'diagnosis'];

/**
 * Invoice / patient workspace of the ARS (#147), as a progression of the Control Center stages
 * (stepper persisted per ACCOUNT in case-progress.json of the batch folder; Continue moves between
 * the patients of the account and the stage advances when all are done; a stage Automate has not
 * delivered shows a loading scene and is polled lightly) with three working phases:
 * - Intake: compact intake of this invoice (CaseIntakePanelComponent: Service Explorer with
 *   multi-select registration in the audit, service drawer, Document Control Center);
 * - Analysis: the consolidated analysis widget (score and the three agents), then one tab per agent
 *   where each observation can be sent to the audit;
 * - Audit and glosas: decision per finding, provider responses and the communication to the provider.
 * Agent logic is untouched. Findings, proposed glosas and the communication status persist per
 * invoice (see InvoiceAuditStoreService). The AI proposes; every action here is a human decision.
 */
@Component({
    selector: 'medical-records-invoice-workspace',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, CaseIntakePanelComponent, AnalysisTaskWidgetComponent, AuditAssistantComponent, RadicationStageArtComponent],
    templateUrl: './invoice-workspace.component.html',
    styleUrls: ['./invoice-workspace.component.scss'],
})
export class InvoiceWorkspaceComponent implements OnChanges, OnDestroy {
    private readonly store = inject(InvoiceAuditStoreService);
    private readonly progressRepository = inject(CaseProgressRepositoryService);
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly accountVariables = inject(AgentMeshVariablesService);

    @Input() processInstanceId: string | null = null;
    @Input() variables: Record<string, unknown> = {};
    @Input() batchState: BatchStateSource | null = null;
    @Input() invoice: CaseInvoiceOption | null = null;
    @Input() invoiceCount = 1;
    @Input() provider: string | null = null;
    /** Filing number (MedRecNum) or the short process id. */
    @Input() accountReference: string | null = null;
    /** Tab to open first (from the route); unknown values are ignored. */
    @Input() initialTab: WorkspaceTabId | null = null;
    /** Sub-section to show first (from the route): `findings` brings the Findings panel of the intake into view. */
    @Input() initialSubTab: string | null = null;
    /** Customer invoices (one per patient) of the account, in order: the account advances when all are done. */
    @Input() invoices: CaseInvoiceOption[] = [];

    /** Continue moved to another patient of the account in the same stage (invoice key). */
    @Output() readonly patientRequested = new EventEmitter<string>();

    readonly i18n = I18N;
    readonly tabs: WorkspaceTab[] = [
        { id: 'intake', phase: 'INTAKE', labelKey: `${I18N}.TABS.INTAKE`, icon: 'fact_check' },
        { id: 'analysis', phase: 'ANALYSIS', labelKey: `${I18N}.TABS.ANALYSIS`, icon: 'insights' },
        ...AGENT_TABS.map((tab): WorkspaceTab => ({ id: tab.id, phase: 'ANALYSIS', label: tab.agentName.replace(/ Agent$/, ''), icon: tab.icon })),
        { id: 'audit', phase: 'AUDIT', labelKey: `${I18N}.TABS.AUDIT`, icon: 'gavel' },
    ];
    readonly originFilters: Array<FindingOrigin | 'all'> = ['all', 'intake', 'codingIntegrity', 'complianceAlert', 'financialVariance', 'provider'];
    readonly communicationSteps = ['draft', 'reviewed', 'notified'] as const;

    activeTab: WorkspaceTabId = 'intake';
    originFilter: FindingOrigin | 'all' = 'all';
    selectedFindingId: string | null = null;

    state: InvoiceAuditState = emptyAuditState();
    record: InvoiceAuditRecord = emptyAuditRecord();
    persistence: AuditPersistenceMode = 'process';
    saving = false;

    /** The embedded analysis widget reads this stand-in form field (writes stay in this view). */
    analysisField: FormFieldModel | null = null;

    intakeServices: IntakeAccountServiceItemViewModel[] = [];
    intakeDocuments: IntakeAccountDocumentItemViewModel[] = [];
    /** Audit status of the finding registered for each intake service. */
    intakeFindingStatus: Record<string, FindingStatus> = {};
    /** Labels of support documents requested from the provider in the intake (simulated). */
    readonly requestedDocuments = new Set<string>();

    /** Persistent progress (stepper) of the account: case-progress.json in the patient folder. */
    progress: CaseProgress = emptyCaseProgress(null, null, new Date().toISOString());
    progressPersistence: ProgressPersistence = 'loading';
    inferredStage: AccountStage | null = null;
    stepper: CaseStepper = buildCaseStepper(null, null);
    reviewedIds: ReadonlySet<string> = new Set();
    private progressFolder: CaseFolderResolution | null = null;
    private progressDocumentId: string | null = null;
    private progressLoadToken = 0;
    private positionTimer: ReturnType<typeof setTimeout> | null = null;
    /** Review items per patient and stage, recomputed after any change of progress, decisions or data. */
    private pendingCache: Partial<Record<CaseWorkStage, CasePatientPending>> = {};
    /** Intake services of every invoice of the account, to count review items per patient. */
    private servicesByInvoice = new Map<string, IntakeAccountServiceItemViewModel[]>();
    /**
     * Intake warnings per service of every invoice of the account (cleared with the services, and
     * when the progress or the audit change: reviewed or remediated services drop their warnings).
     */
    private warningsByInvoice = new Map<string, Map<string, unknown[]>>();
    private warningsSource: { progress: CaseProgress; state: InvoiceAuditState; record: InvoiceAuditRecord } | null = null;

    /** Shown when the account advanced on its own (no patient had review items): stage label keys. */
    autoAdvanceNotice: { fromKey: string; toKey: string } | null = null;
    /** Polling of the process while Automate works on a stage; stops on destroy or when the result arrives. */
    pollFailed = false;
    private pollTimer: ReturnType<typeof setTimeout> | null = null;
    private pollSubscription: Subscription | null = null;
    private polls = 0;
    /**
     * AgentMesh child read by the poll: its results reach the root only when the call activity
     * completes, so while it runs (or waits for the analyst) they are read from the child.
     */
    private agentMeshStarted = false;
    agentMeshTaskOpen = false;
    agentMeshTaskName: string | null = null;
    private destroyed = false;
    agents: AgentView[] = [];
    /** Observations of the three agents for this invoice (Findings panel of the intake). */
    analysisFindings: AuditFinding[] = [];
    providerComments: ProviderComment[] = [];
    summary: FinancialSummary = { billed: null, observed: 0, glosado: 0, notObjected: null };
    patientFacts: Array<{ labelKey: string; value: string }> = [];

    /** Inline editors: one justification / glosa form open at a time. */
    dismissing: { findingId: string; candidate: AuditFinding | null; text: string } | null = null;
    glosaDraft: { findingId: string; reason: string; amount: string; comment: string; error: GlosaError | null; available: number | null } | null = null;

    private assistantCache: { finding: AuditFinding | null; value: { findings: AssistantFinding[]; comments: string[] } } = {
        finding: null,
        value: { findings: [], comments: [] },
    };

    get invoiceKey(): string {
        return this.invoice?.key ?? 'invoice';
    }

    get activeCount(): number {
        return countActiveFindings(this.record);
    }

    get activePhase(): WorkspacePhase {
        return this.tabs.find((tab) => tab.id === this.activeTab)?.phase ?? 'INTAKE';
    }

    /** Audit queue: pending decisions first; filtered by origin. */
    get filteredFindings(): AuditFinding[] {
        const list =
            this.originFilter === 'all'
                ? this.record.findings
                : this.record.findings.filter((finding) => finding.origin === this.originFilter || finding.alsoReportedBy.includes(this.originFilter as FindingOrigin));
        return sortAuditQueue(list);
    }

    get selectedFinding(): AuditFinding | null {
        const list = this.filteredFindings;
        return list.find((finding) => finding.id === this.selectedFindingId) ?? list[0] ?? null;
    }

    get selectedResponses(): ProviderComment[] {
        const finding = this.selectedFinding;
        return finding ? responsesForFinding(finding, this.providerComments) : [];
    }

    /** Knowledge Discovery context: the finding under review and the provider responses to it (no patient names). */
    get assistantContext(): { findings: AssistantFinding[]; comments: string[] } {
        const finding = this.selectedFinding;
        const responses = this.selectedResponses;
        if (finding !== this.assistantCache.finding || responses.length !== this.assistantCache.value.comments.length) {
            this.assistantCache = {
                finding,
                value: {
                    findings: finding
                        ? [{ id: finding.id, code: finding.serviceCode, title: finding.description, source: finding.origin, amount: finding.amount }]
                        : [],
                    comments: responses.map((comment) => comment.text),
                },
            };
        }
        return this.assistantCache.value;
    }

    /** Record number of the patient, the only patient reference the assistant may receive. */
    get patientRef(): string | null {
        return this.invoice?.patient?.medicalRecord ?? null;
    }

    get pendingDecisionCount(): number {
        return this.record.findings.filter((finding) => findingStage(finding.status) === 'pending').length;
    }

    /** Detailed tabs of the active phase only; the phases themselves are the stepper. */
    get phaseTabs(): WorkspaceTab[] {
        const phase = this.activePhase;
        return this.tabs.filter((tab) => tab.phase === phase);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['initialTab'] && this.initialTab && WORKSPACE_TAB_IDS.includes(this.initialTab)) {
            this.activeTab = this.initialTab;
        }
        if (!changes['variables'] && !changes['batchState'] && !changes['invoice'] && !changes['processInstanceId']) {
            return;
        }
        const accountChanged = !!(changes['variables'] || changes['batchState'] || changes['processInstanceId']);
        const loaded = this.store.load(this.processInstanceId, this.variables ?? {});
        this.state = loaded.state;
        this.persistence = loaded.mode;
        this.record = this.state.invoices[this.invoiceKey] ?? emptyAuditRecord();
        this.selectedFindingId = null;
        this.dismissing = null;
        this.glosaDraft = null;
        this.requestedDocuments.clear();
        this.buildFields();
        this.buildIntake();
        this.buildAgents();
        this.buildPatientFacts();
        const comments = parseProviderComments(this.variables?.[PROVIDER_FINDING_COMMENTS_VARIABLE]);
        this.providerComments = commentsForInvoice(comments, this.invoiceKey, this.invoice?.invoiceNumber ?? null);
        this.refreshSummary();
        this.refreshIntakeStatus();
        if (accountChanged) {
            this.loadProgress(!(changes['initialTab'] && this.initialTab));
        } else {
            this.refreshStepper();
            // Another patient of the account: remember it right away, so the case reopens on it.
            this.updateProgress(rememberPosition(this.progress, this.activeTab, this.invoiceKey, new Date().toISOString()), 'now');
        }
        this.revealRequestedSection();
        this.recordDiagnostics();
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.stopPolling();
        this.flushProgress();
    }

    /** Writes the debounced position now (leaving the case, or another patient opens). */
    private flushProgress(): void {
        if (this.positionTimer) {
            clearTimeout(this.positionTimer);
            this.positionTimer = null;
            this.persistProgress();
        }
    }

    /** Route sub-section `findings`: once the intake is shown, scroll its Findings panel into view. */
    private revealRequestedSection(): void {
        if (this.initialSubTab !== INTAKE_FINDINGS_SUB || this.activeTab !== 'intake') {
            return;
        }
        setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#ip-findings-title')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }

    selectTab(id: WorkspaceTabId): void {
        this.activeTab = id;
        this.updateProgress(rememberPosition(this.progress, id, this.invoiceKey, new Date().toISOString()), 'position');
    }

    onTabKeydown(event: KeyboardEvent): void {
        const tabs = this.phaseTabs;
        const index = tabs.findIndex((tab) => tab.id === this.activeTab);
        const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
        if (!(event.key in moves) || tabs.length < 2) {
            return;
        }
        event.preventDefault();
        const next = tabs[(moves[event.key] + tabs.length) % tabs.length];
        this.focusTab(next.id);
    }

    // Stepper ----------------------------------------------------------------------------------

    /** A stage step opens its phase (the last tab used in it, else its first tab); a locked stage does not open. */
    openStep(step: CaseStep): void {
        if (!step.phase || step.availability === 'locked') {
            return;
        }
        const last = this.progress.lastTab;
        const inPhase = last && this.tabs.find((tab) => tab.id === last)?.phase === step.phase ? last : tabOfPhase(step.phase);
        this.selectTab(inPhase);
    }

    stepIcon(step: CaseStep): string {
        if (step.availability === 'locked') {
            return 'lock';
        }
        if (step.availability === 'processing' && step.status !== 'error') {
            return 'autorenew';
        }
        switch (step.status) {
            case 'completed':
                return 'check_circle';
            case 'error':
                return 'error';
            case 'in_progress':
                return 'radio_button_checked';
            default:
                return 'radio_button_unchecked';
        }
    }

    /**
     * Continue on a phase: completes THIS patient in the stage. With other patients of the account
     * still pending in the stage, it moves to the next one (same stage); when every patient is done,
     * the account stage is completed and the next phase opens.
     */
    completePhase(phase: WorkspacePhase): void {
        const now = new Date().toISOString();
        const stage = workStageOf(phase);
        const move = continuePatient(this.progress, stage, this.invoiceKey, this.patientOrder, this.pendingByPatient(stage), now);
        this.autoAdvanceNotice = null;
        if (!move.advanced && move.nextInvoiceKey) {
            this.updateProgress(move.progress, 'now');
            this.patientRequested.emit(move.nextInvoiceKey);
            return;
        }
        let next = move.progress;
        const nextPhase: WorkspacePhase | null = phase === 'INTAKE' ? 'ANALYSIS' : phase === 'ANALYSIS' ? 'AUDIT' : null;
        if (nextPhase) {
            this.activeTab = tabOfPhase(nextPhase);
            next = rememberPosition(next, this.activeTab, this.invoiceKey, now);
        }
        this.updateProgress(next, 'now');
        if (nextPhase) {
            this.focusTab(this.activeTab);
        }
    }

    /** Reopens a completed stage of the account (back to work on it; patients reviewed again). */
    reopenPhase(phase: WorkspacePhase): void {
        this.autoAdvanceNotice = null;
        this.updateProgress(reopenStage(this.progress, stageOfPhase(phase), new Date().toISOString()), 'now');
    }

    /** Availability of a phase (Automate gate): `processing` and `locked` never show the content. */
    availabilityOf(phase: WorkspacePhase): CasePhaseAvailability {
        return this.stepper.steps.find((step) => step.stage === stageOfPhase(phase))?.availability ?? 'ready';
    }

    get activeAvailability(): CasePhaseAvailability {
        return this.availabilityOf(this.activePhase);
    }

    /** The content of the active phase is replaced by the loading scene while Automate has not delivered it. */
    get contentHidden(): boolean {
        return this.activeAvailability !== 'ready';
    }

    get waitArt(): RadicationStageKey {
        return PHASE_WAIT_ART[this.activePhase];
    }

    /** Agents that already answered (0-3), for the partial-result note of the analysis. */
    get agentsAnswered(): number {
        return this.agents.filter((agent) => !!agent.result).length;
    }

    /** AgentMesh already waits for the analyst but no agent result could be read yet (discreet notice, no loading). */
    get agentResultsUnavailable(): boolean {
        return agentStageWaitingWithoutResults({ stage: this.inferredStage, agentsAnswered: this.agentsAnswered, agentMeshTaskOpen: this.agentMeshTaskOpen });
    }

    /** Invoice keys of the account in order (a single-invoice account has one). */
    get patientOrder(): string[] {
        const keys = this.invoices.map((invoice) => invoice.key);
        return keys.length ? keys : [this.invoiceKey];
    }

    /** 1-based position of this patient in the account. */
    get patientIndex(): number {
        return Math.max(this.patientOrder.indexOf(this.invoiceKey), 0) + 1;
    }

    /** Patients of the account with review items in the stage of a phase. */
    pendingPatientCount(phase: WorkspacePhase): number {
        const stage = workStageOf(phase);
        const pending = this.pendingByPatient(stage);
        return this.patientOrder.filter((key) => patientStatus(this.progress, stage, key, pending[key]) === 'pending').length;
    }

    /** Continue moves to another patient (instead of completing the account stage). */
    continuesToPatient(phase: WorkspacePhase): boolean {
        const stage = workStageOf(phase);
        const pending = this.pendingByPatient(stage);
        return this.patientOrder.some((key) => key !== this.invoiceKey && patientStatus(this.progress, stage, key, pending[key]) === 'pending');
    }

    isPhaseCompleted(phase: WorkspacePhase): boolean {
        return this.stepper.steps.find((step) => step.stage === stageOfPhase(phase))?.status === 'completed';
    }

    // Intake panel -----------------------------------------------------------------------------

    /** Registers intake services in the audit (finding, or manual remediation = review requested) with the comment. */
    onIntakeRegistered(request: IntakeRegistrationRequest): void {
        let record = this.record;
        const findingIds: string[] = [];
        for (const serviceId of request.serviceIds) {
            const service = this.intakeServices.find((item) => item.id === serviceId);
            if (!service) {
                continue;
            }
            const result = addFinding(record, fromIntakeService(this.invoiceKey, service, request.comment));
            const id = result.existingId ?? buildFindingId('intake', this.invoiceKey, service.id);
            record = request.kind === 'remediation' ? setFindingStatus(result.record, id, 'review') : result.record;
            if (request.comment && !result.added) {
                record = { ...record, findings: record.findings.map((finding) => (finding.id === id && !finding.comment ? { ...finding, comment: request.comment } : finding)) };
            }
            findingIds.push(id);
        }
        if (!findingIds.length) {
            return;
        }
        this.commit(record);
        this.updateProgress(
            addRegistration(this.progress, { kind: request.kind, invoiceKey: this.invoiceKey, serviceIds: request.serviceIds, findingIds, comment: request.comment }, new Date().toISOString()),
            'now'
        );
    }

    onReviewedChange(event: { serviceIds: string[]; reviewed: boolean }): void {
        this.updateProgress(setServicesReviewed(this.progress, this.invoiceKey, event.serviceIds, event.reviewed, new Date().toISOString()), 'now');
    }

    /**
     * Deletes an analyst record from the Findings panel: the registration and its comments
     * (case-progress.json) and the intake findings it created in the audit (invoiceAuditState)
     * that no other registration references. Agent findings are never deleted here.
     */
    onIntakeFindingDeleted(request: IntakeFindingDeleteRequest): void {
        let findingIds = [request.id];
        if (request.source === 'registration') {
            const result = removeRegistration(this.progress, request.id, new Date().toISOString());
            if (!result.removed) {
                return;
            }
            findingIds = result.releasedFindingIds;
            this.updateProgress(result.progress, 'now');
        }
        const record = removeIntakeFindings(this.record, findingIds);
        if (record !== this.record) {
            this.commit(record);
        }
    }

    /** Dismisses an agent observation from the Findings panel, as the audit tray does (adds it first when not there). */
    onIntakeFindingDismissed(request: IntakeFindingDismissRequest): void {
        const candidate = request.source === 'analysis' ? (this.analysisFindings.find((finding) => finding.id === request.findingId) ?? null) : null;
        if (request.source === 'analysis' && !candidate) {
            return;
        }
        this.glosaDraft = null;
        this.dismissing = { findingId: request.findingId, candidate, text: request.justification };
        this.confirmDismiss();
    }

    enableDiagnostics(): void {
        this.diagnostics.setEnabled(true);
        this.recordDiagnostics();
    }

    get diagnosticsEnabled(): boolean {
        return this.diagnostics.enabled();
    }

    /** Status of a candidate already in the audit tray (by id or deduplicated), or null. */
    statusOf(candidate: AuditFinding): FindingStatus | null {
        return this.findExisting(candidate)?.status ?? null;
    }

    // Intake actions -------------------------------------------------------------------------

    onDocumentRequested(label: string): void {
        this.requestedDocuments.add(label);
    }

    goTo(id: WorkspaceTabId): void {
        this.focusTab(id);
    }

    // Agent and provider actions -------------------------------------------------------------

    addToAudit(candidate: AuditFinding): void {
        this.add(candidate);
    }

    requestReview(candidate: AuditFinding): void {
        const id = this.add(candidate);
        this.commit(setFindingStatus(this.record, id, 'review'));
    }

    startDismiss(candidate: AuditFinding | null, findingId: string): void {
        this.glosaDraft = null;
        this.dismissing = { findingId, candidate, text: '' };
    }

    confirmDismiss(): void {
        if (!this.dismissing?.text.trim()) {
            return;
        }
        const id = this.dismissing.candidate ? this.add(this.dismissing.candidate) : this.dismissing.findingId;
        this.commit(setFindingStatus(this.record, id, 'dismissed', this.dismissing.text));
        this.dismissing = null;
    }

    addProviderComment(comment: ProviderComment): void {
        this.selectedFindingId = this.add(fromProviderComment(this.invoiceKey, comment));
    }

    providerCommentAdded(comment: ProviderComment): boolean {
        return !!this.findExisting(fromProviderComment(this.invoiceKey, comment));
    }

    // Audit actions --------------------------------------------------------------------------

    selectFinding(finding: AuditFinding): void {
        if (this.selectedFindingId !== finding.id) {
            this.dismissing = null;
            this.glosaDraft = null;
        }
        this.selectedFindingId = finding.id;
    }

    setStatus(finding: AuditFinding, status: FindingStatus): void {
        this.commit(setFindingStatus(this.record, finding.id, status));
    }

    startGlosa(finding: AuditFinding): void {
        this.dismissing = null;
        const existing = this.glosaFor(finding.id);
        const available = availableToObject(this.record, finding, this.invoice?.totalBilled ?? null);
        this.glosaDraft = {
            findingId: finding.id,
            reason: existing?.reason ?? '',
            amount: String(existing?.objectedAmount ?? available ?? ''),
            comment: existing?.comment ?? '',
            error: null,
            available,
        };
    }

    saveGlosa(): void {
        if (!this.glosaDraft) {
            return;
        }
        const draft = this.glosaDraft;
        const result = proposeGlosa(this.record, draft.findingId, { reason: draft.reason, objectedAmount: draft.amount, comment: draft.comment }, this.invoice?.totalBilled ?? null);
        if (!result.ok || !result.record) {
            this.glosaDraft = { ...draft, error: result.error, available: result.available };
            return;
        }
        this.commit(result.record);
        this.glosaDraft = null;
    }

    glosaFor(findingId: string): ProposedGlosa | undefined {
        return this.record.glosas.find((glosa) => glosa.findingId === findingId);
    }

    findingById(findingId: string): AuditFinding | undefined {
        return this.record.findings.find((finding) => finding.id === findingId);
    }

    advanceCommunication(): void {
        this.commit(advanceCommunication(this.record));
    }

    communicationIndex(): number {
        return this.communicationSteps.indexOf(this.record.communication);
    }

    originLabelKey(origin: FindingOrigin | 'all'): string {
        return `${I18N}.ORIGIN.${origin.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    }

    // Internals ------------------------------------------------------------------------------

    private focusTab(id: WorkspaceTabId): void {
        this.selectTab(id);
        this.host.nativeElement.querySelector<HTMLElement>(`#ws-tab-${id}`)?.focus();
    }

    private findExisting(candidate: AuditFinding): AuditFinding | undefined {
        const probe = addFinding(this.record, candidate);
        return probe.added ? undefined : this.record.findings.find((finding) => finding.id === probe.existingId);
    }

    /** Adds (deduplicated) and persists; returns the id that now represents the observation. */
    private add(candidate: AuditFinding): string {
        const result = addFinding(this.record, candidate);
        this.commit(result.record);
        return result.existingId ?? candidate.id;
    }

    private commit(record: InvoiceAuditRecord): void {
        this.record = record;
        this.state = withRecord(this.state, this.invoiceKey, record);
        this.refreshSummary();
        this.refreshIntakeStatus();
        // Decisions change the review items of the patient: keep its status in the stage up to date.
        this.pendingCache = {};
        this.updateProgress(this.withSyncedPatients(this.progress), 'now');
        this.saving = true;
        this.store.save(this.processInstanceId, this.state).subscribe((mode) => {
            this.persistence = mode;
            this.saving = false;
        });
    }

    private refreshSummary(): void {
        this.summary = summarizeFinancials(this.record, this.invoice?.totalBilled ?? null);
    }

    /** The analysis widget reads process variables as form fields; batchState is the parsed one the case already loaded. */
    private buildFields(): void {
        const vars = { ...(this.variables ?? {}), batchState: this.batchState ?? this.variables?.['batchState'] ?? null };
        this.analysisField = createEmbeddedFormField('unifiedWidgetPayloadText', vars, true) as unknown as FormFieldModel;
    }

    /** Services and documents of this invoice (same mapping as the intake widget, without patient clustering). */
    private buildIntake(): void {
        this.intakeServices = [];
        this.intakeDocuments = [];
        this.servicesByInvoice.clear();
        this.warningsByInvoice.clear();
        this.pendingCache = {};
        if (!this.batchState || !this.invoice?.documentIds.length) {
            return;
        }
        const view = mapBatchStateToIntakeForDocuments(this.batchState, this.invoice.documentIds);
        this.intakeServices = view.services;
        this.intakeDocuments = view.documents;
    }

    private refreshIntakeStatus(): void {
        this.intakeFindingStatus = intakeFindingStatusById(this.invoiceKey, this.intakeServices, this.record);
    }

    // Progress ---------------------------------------------------------------------------------

    /**
     * Loads case-progress.json of the account. Until it answers (or when the folder is not
     * resolved) the progress lives in memory from the stage the Control Center infers. With
     * `restorePosition`, the workspace reopens where the analyst was.
     */
    private loadProgress(restorePosition: boolean): void {
        // A position still waiting for its debounce belongs to the account shown so far: write it first.
        this.flushProgress();
        const token = ++this.progressLoadToken;
        const now = new Date().toISOString();
        this.stopPolling();
        this.polls = 0;
        this.autoAdvanceNotice = null;
        this.agentMeshStarted = false;
        this.agentMeshTaskOpen = false;
        this.agentMeshTaskName = null;
        this.inferredStage = inferCaseStage(this.variables);
        this.progress = emptyCaseProgress(this.processInstanceId, this.inferredStage, now);
        this.progressFolder = null;
        this.progressDocumentId = null;
        this.progressPersistence = 'loading';
        this.refreshStepper();
        if (restorePosition) {
            this.activeTab = tabOfPhase(workPhaseOfStage(this.stepper.current));
        }
        void (async () => {
            let folder: CaseFolderResolution | null = null;
            let loaded: CaseProgress | null = null;
            try {
                folder = await this.progressRepository.resolveFolder(this.variables ?? {}, this.batchState, this.processInstanceId);
                if (folder) {
                    const result = await this.progressRepository.load(folder, this.processInstanceId);
                    if (token !== this.progressLoadToken) {
                        return;
                    }
                    this.progressDocumentId = result.documentId;
                    loaded = result.progress;
                }
            } catch {
                folder = null;
            }
            if (token !== this.progressLoadToken) {
                return;
            }
            this.progressFolder = folder;
            this.progressPersistence = folder ? 'repository' : 'memory';
            const base = loaded ?? this.progress;
            const pid = this.processInstanceId;
            this.progress = pid && base.processInstanceId !== pid ? { ...base, processInstanceId: pid } : base;
            this.refreshStepper();
            if (restorePosition && loaded) {
                const lastTab = loaded.lastTab;
                const lastPhase = lastTab ? this.tabs.find((tab) => tab.id === lastTab)?.phase : null;
                // The last tab wins while it belongs to the current work phase or an earlier one.
                const currentPhase = workPhaseOfStage(this.stepper.current);
                this.activeTab =
                    lastTab && lastPhase && stageIndex(stageOfPhase(lastPhase)) <= stageIndex(stageOfPhase(currentPhase)) ? lastTab : tabOfPhase(currentPhase);
            }
            // The file follows Automate when it went further (stage written, not only shown) and
            // records the patient and tab on screen; patient statuses are synced on the way. The
            // first open creates the file so the Control Center and later sessions can read it.
            const restored = restoreCaseProgress(this.progress, { inferred: this.inferredStage, invoiceKey: this.invoice ? this.invoiceKey : null, tab: this.activeTab }, new Date().toISOString());
            this.updateProgress(restored, 'now', !!folder && (!this.progressDocumentId || restored !== loaded));
            this.evaluateAccountStage();
            this.revealRequestedSection();
        })();
    }

    /**
     * `now`: saved right away (actions, patient changes); `position`: debounced (tab changes).
     * Nothing is written when the progress did not change, unless `force` (file to create or to
     * bring up to date after reading it).
     */
    private updateProgress(next: CaseProgress, mode: 'now' | 'position', force = false): void {
        const previous = this.progress;
        this.progress = next;
        this.pendingCache = {};
        // Per-patient status follows the review items (stored in the file): clean patients are
        // approved in the intake and the current stage is synced.
        this.progress = this.withSyncedPatients(this.progress);
        if (this.progress === previous && !force) {
            return;
        }
        this.refreshStepper();
        if (mode === 'position') {
            if (this.positionTimer) {
                clearTimeout(this.positionTimer);
            }
            this.positionTimer = setTimeout(() => {
                this.positionTimer = null;
                this.persistProgress();
            }, POSITION_SAVE_DELAY_MS);
            return;
        }
        if (this.positionTimer) {
            clearTimeout(this.positionTimer);
            this.positionTimer = null;
        }
        this.persistProgress();
    }

    /**
     * Saves the progress as it is NOW (the repository writes one at a time per process, in call
     * order, and later reads wait for them); a failed write keeps the progress in memory and says so.
     */
    private persistProgress(): void {
        const folder = this.progressFolder;
        if (!folder || this.progressPersistence !== 'repository') {
            return;
        }
        const token = this.progressLoadToken;
        this.progressRepository.save(folder, this.progress, this.progressDocumentId, this.processInstanceId).then(
            (id) => {
                if (token === this.progressLoadToken) {
                    this.progressDocumentId = id;
                }
            },
            () => {
                if (token === this.progressLoadToken) {
                    this.progressPersistence = 'memory';
                }
            }
        );
    }

    private refreshStepper(): void {
        this.pendingCache = {};
        this.reviewedIds = new Set(this.progress.reviewedServices.map((entry) => entry.serviceId));
        const agentsError = this.agents.some((agent) => agent.parseError);
        // Automate reached agent analysis, no agent answered (root or AgentMesh) and AgentMesh is not
        // waiting for the analyst yet: the stage is still processing.
        const agentsBusy = agentStageProcessing({ stage: this.inferredStage, agentsAnswered: this.agentsAnswered, agentMeshTaskOpen: this.agentMeshTaskOpen });
        this.stepper = buildCaseStepper(this.progress, this.inferredStage, agentsError ? { '4_AGENTS': true } : {}, agentsBusy ? { '4_AGENTS': true } : {});
        this.syncPolling();
    }

    // Account progress by patient ------------------------------------------------------------------

    /** Review items per patient in a stage (cached until the progress, decisions or data change). */
    private pendingByPatient(stage: CaseWorkStage): CasePatientPending {
        const cached = this.pendingCache[stage];
        if (cached) {
            return cached;
        }
        const invoices = this.accountInvoices;
        const agentShares = stage === '4_AGENTS' ? this.agentFindingsByInvoice(invoices) : null;
        const out: Record<string, number> = {};
        for (const invoice of invoices) {
            const record = invoice.key === this.invoiceKey ? this.record : (this.state.invoices[invoice.key] ?? emptyAuditRecord());
            if (stage === '2_INTAKE') {
                const reviewed = new Set(this.progress.reviewedServices.filter((entry) => !entry.invoiceKey || entry.invoiceKey === invoice.key).map((entry) => entry.serviceId));
                out[invoice.key] = intakePendingCount(this.servicesOf(invoice), reviewed);
            } else if (agentShares) {
                // Agent observations still without a decision (not sent to the audit nor dismissed).
                out[invoice.key] = (agentShares.get(invoice.key) ?? []).filter((candidate) => addFinding(record, candidate).added).length;
            } else {
                out[invoice.key] = record.findings.filter((finding) => finding.status === 'open').length;
            }
        }
        this.pendingCache[stage] = out;
        return out;
    }
    private get accountInvoices(): CaseInvoiceOption[] {
        if (this.invoices.length) {
            return this.invoices;
        }
        return this.invoice ? [this.invoice] : [];
    }

    private servicesOf(invoice: CaseInvoiceOption): IntakeAccountServiceItemViewModel[] {
        if (invoice.key === this.invoiceKey) {
            return this.intakeServices;
        }
        let services = this.servicesByInvoice.get(invoice.key);
        if (!services) {
            services = this.batchState && invoice.documentIds.length ? mapBatchStateToIntakeForDocuments(this.batchState, invoice.documentIds).services : [];
            this.servicesByInvoice.set(invoice.key, services);
        }
        return services;
    }

    /**
     * Agent results cover the whole account. An observation belongs to the patient whose invoice
     * bills its service code; one without a matching code belongs to the first invoice (it is
     * reviewed once for the account, not once per patient).
     */
    private agentFindingsByInvoice(invoices: CaseInvoiceOption[]): Map<string, AuditFinding[]> {
        const shares = new Map<string, AuditFinding[]>();
        const first = invoices[0]?.key;
        if (!first) {
            return shares;
        }
        for (const agent of this.agents) {
            (agent.result?.findings ?? []).forEach((raw, index) => {
                const code = fromAgentFinding(agent.tab.id, first, raw, index).serviceCode;
                const owner = (code && invoices.find((invoice) => this.servicesOf(invoice).some((service) => service.serviceCode === code || service.cup === code))?.key) || first;
                shares.set(owner, [...(shares.get(owner) ?? []), fromAgentFinding(agent.tab.id, owner, raw, index)]);
            });
        }
        return shares;
    }

    /** Stores the pending / reviewed status of every patient in the account's current stage. */
    private withSyncedPatients(progress: CaseProgress): CaseProgress {
        if (!this.accountInvoices.length) {
            return progress;
        }
        const now = new Date().toISOString();
        // Patients without intake warnings nor open findings are approved in the intake on their own.
        const approved = autoApproveCleanPatients(progress, this.cleanIntakePatients(), now);
        const stage = approved.currentStage;
        return isWorkStage(stage) ? syncPatientStage(approved, stage, this.pendingByPatient(stage), now) : approved;
    }

    /**
     * Intake warnings of a patient's services (subtotal mismatch, no support), by service id. Services
     * reviewed or remediated (case-progress.json, audit decisions) have none.
     */
    private warningsOf(invoice: CaseInvoiceOption): Map<string, unknown[]> {
        const source = this.warningsSource;
        if (!source || source.progress !== this.progress || source.state !== this.state || source.record !== this.record) {
            this.warningsByInvoice.clear();
            this.warningsSource = { progress: this.progress, state: this.state, record: this.record };
        }
        let warnings = this.warningsByInvoice.get(invoice.key);
        if (!warnings) {
            const services = this.servicesOf(invoice);
            const record = this.recordOf(invoice);
            const resolved = resolvedIntakeServiceIds({
                reviewed: this.progress.reviewedServices.map((entry) => entry.serviceId),
                registrations: this.progress.registrations.filter((entry) => entry.invoiceKey === invoice.key),
                findings: record.findings,
                findingStatus: intakeFindingStatusById(invoice.key, services, record),
            });
            warnings = intakeWarningsById(services, resolved);
            this.warningsByInvoice.set(invoice.key, warnings);
        }
        return warnings;
    }

    /** Audit record of a patient of the account (the active one may hold unsaved decisions). */
    private recordOf(invoice: CaseInvoiceOption): InvoiceAuditRecord {
        return invoice.key === this.invoiceKey ? this.record : (this.state.invoices[invoice.key] ?? emptyAuditRecord());
    }

    private serviceIdsWithoutWarnings(invoice: CaseInvoiceOption): string[] {
        return [...this.warningsOf(invoice).entries()].filter(([, list]) => !list.length).map(([id]) => id);
    }

    /** Patients of the account with services, no intake warning and no open finding (see isCleanIntakePatient). */
    private cleanIntakePatients(): string[] {
        return this.accountInvoices
            .filter((invoice) => {
                return isCleanIntakePatient({
                    warnings: this.warningsOf(invoice),
                    openFindings: this.recordOf(invoice).findings.filter((finding) => finding.status === 'open').length,
                });
            })
            .map((invoice) => invoice.key);
    }

    /** Patients without intake warnings still not completed in the intake (bulk action of the intake). */
    get patientsWithoutWarnings(): CaseInvoiceOption[] {
        const block = this.progress.patientStages['2_INTAKE']?.patients ?? {};
        return this.accountInvoices.filter((invoice) => {
            const warnings = this.warningsOf(invoice);
            return warnings.size > 0 && [...warnings.values()].every((list) => !list.length) && block[invoice.key]?.status !== 'completed';
        });
    }

    /** Services of the active patient without intake warnings that are not marked reviewed yet. */
    get servicesWithoutWarningsToReview(): string[] {
        const invoice = this.invoice;
        return invoice ? this.serviceIdsWithoutWarnings(invoice).filter((id) => !isServiceReviewed(this.progress, id)) : [];
    }

    /**
     * Bulk action of the intake: every patient without intake warnings is completed in the intake
     * and its services marked reviewed (saved in case-progress.json); the account may then advance.
     */
    markPatientsWithoutWarningsReviewed(): void {
        const patients = this.patientsWithoutWarnings;
        if (!patients.length) {
            return;
        }
        const services = Object.fromEntries(patients.map((invoice) => [invoice.key, this.serviceIdsWithoutWarnings(invoice)]));
        this.autoAdvanceNotice = null;
        this.updateProgress(markPatientsReviewed(this.progress, '2_INTAKE', services, new Date().toISOString()), 'now');
        this.evaluateAccountStage();
    }

    /** Active patient: marks its services without intake warnings as reviewed (saved); the account may then advance. */
    markServicesWithoutWarningsReviewed(): void {
        const ids = this.servicesWithoutWarningsToReview;
        if (!ids.length) {
            return;
        }
        this.autoAdvanceNotice = null;
        this.updateProgress(setServicesReviewed(this.progress, this.invoiceKey, ids, true, new Date().toISOString()), 'now');
        this.evaluateAccountStage();
    }

    /** Automate delivered what a stage needs (intake: IDP output; agent analysis: the three results). */
    private automateDone(stage: CaseWorkStage): boolean {
        const reached = stageIndex(this.inferredStage);
        return stage === '2_INTAKE' ? reached >= stageIndex('2_INTAKE') : reached > stageIndex(stage);
    }

    /**
     * Automatic advance of the ACCOUNT stage when no patient has review items in it (once per
     * stage; see autoAdvanceStage). Evaluated when the progress loads and when Automate delivers
     * new data, never in the middle of the analyst's actions; a clear notice says what happened.
     */
    private evaluateAccountStage(): void {
        if (this.progressPersistence === 'loading' || !this.accountInvoices.length) {
            return;
        }
        const now = new Date().toISOString();
        const from = this.progress.currentStage;
        let progress = this.progress;
        let advanced = false;
        for (let guard = 0; guard < CASE_AUTO_STEPS; guard++) {
            const stage = progress.currentStage;
            if (!isWorkStage(stage) || !this.automateDone(stage)) {
                break;
            }
            const result = autoAdvanceStage(progress, stage, this.patientOrder, this.pendingByPatient(stage), now);
            progress = result.progress;
            if (!result.advanced) {
                break;
            }
            advanced = true;
        }
        if (advanced) {
            this.autoAdvanceNotice = { fromKey: accountStageLabelKey(from), toKey: accountStageLabelKey(progress.currentStage) };
            const phase = phaseOfStage(progress.currentStage) ?? workPhaseOfStage(progress.currentStage);
            this.activeTab = tabOfPhase(phase);
            progress = rememberPosition(progress, this.activeTab, this.invoiceKey, now);
        }
        this.updateProgress(progress, 'now');
    }

    // Automate polling -----------------------------------------------------------------------------

    /** Automate still works on a stage the analyst needs (agents pending, or a stage shown as processing). */
    private get awaitingAutomate(): boolean {
        return !!this.processInstanceId && (this.inferredStage === '4_AGENTS' || this.stepper.steps.some((step) => !!step.phase && step.availability === 'processing'));
    }

    private syncPolling(): void {
        if (this.destroyed || !this.awaitingAutomate || this.polls >= AUTOMATE_POLL_LIMIT) {
            if (!this.awaitingAutomate) {
                this.stopPolling();
            }
            return;
        }
        if (this.pollTimer || (this.pollSubscription && !this.pollSubscription.closed)) {
            return;
        }
        // First read right away: the case opened with root variables only (AgentMesh results may be in the child).
        this.pollTimer = setTimeout(() => this.poll(), this.polls === 0 ? 0 : AUTOMATE_POLL_MS);
    }

    /** AgentMesh is read only while the agent stage is pending (processing or waiting without results). */
    private get readAgentMesh(): boolean {
        return this.inferredStage === '4_AGENTS' || this.stepper.steps.some((step) => step.stage === '4_AGENTS' && step.availability === 'processing');
    }

    private poll(): void {
        this.pollTimer = null;
        const processInstanceId = this.processInstanceId;
        if (this.destroyed || !processInstanceId) {
            return;
        }
        this.polls++;
        const includeChild = this.readAgentMesh;
        this.pollSubscription = this.accountVariables.readAccountVariables(processInstanceId, { fresh: true, includeChild }).subscribe((read) => {
            this.pollSubscription = null;
            if (this.destroyed || processInstanceId !== this.processInstanceId) {
                return;
            }
            // The variables service answers {} when the request fails.
            this.pollFailed = !read.rootRead && !read.agentMesh;
            if (!this.pollFailed) {
                this.applyAutomateRefresh(read, includeChild);
            }
            this.syncPolling();
        });
    }

    private stopPolling(): void {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        this.pollSubscription?.unsubscribe();
        this.pollSubscription = null;
    }

    /**
     * New process variables from the poll: agents, analysis payload and the stage Automate reached.
     * The analyst's work (progress file, audit tray, intake selection) stays as it is; the progress
     * only moves forward to the inferred stage.
     */
    private applyAutomateRefresh(read: AccountVariablesRead, childRead: boolean): void {
        const before = this.inferredStage;
        const answered = this.agentsAnswered;
        const taskOpenBefore = this.agentMeshTaskOpen;
        if (childRead) {
            // Root variables win; AgentMesh fills what the root does not have yet (see mergeProcessVariables).
            this.agentMeshStarted = this.agentMeshStarted || !!read.agentMesh;
            this.agentMeshTaskOpen = !!read.agentMesh?.openTasks.length;
            this.agentMeshTaskName = read.agentMesh?.openTasks[0]?.name ?? null;
        }
        // A value read earlier (e.g. from AgentMesh) stays when the new read has it empty.
        this.variables = mergeProcessVariables(read.variables, this.variables).variables;
        this.inferredStage = reachedAutomateStage(inferCaseStage(this.variables), this.agentMeshStarted);
        this.buildFields();
        this.buildAgents();
        if (this.inferredStage === before && this.agentsAnswered === answered && this.agentMeshTaskOpen === taskOpenBefore) {
            return;
        }
        this.pendingCache = {};
        this.updateProgress(reconcileCaseProgress(this.progress, this.inferredStage, new Date().toISOString()), 'now');
        this.refreshStepper();
        this.evaluateAccountStage();
        this.recordDiagnostics();
    }

    /** Technical view: active invoice with its raw services, and the variables read (masked). */
    private recordDiagnostics(): void {
        if (!this.diagnostics.enabled()) {
            return;
        }
        const pid = this.processInstanceId ?? 'form';
        const variables = this.variables ?? {};
        if (this.invoice) {
            this.diagnostics.record({
                kind: 'process-variables',
                key: `case-invoice:${pid}`,
                label: `case · active invoice ${this.invoice.invoiceNumber ?? this.invoice.key} · ${this.intakeServices.length} service(s) · ${this.invoice.documentIds.length} document(s)`,
                durationMs: 0,
                rows: this.intakeServices.length,
                tables: buildInvoiceDiagnosticTables(this.invoice, this.intakeServices),
            });
        }
        this.diagnostics.record({
            kind: 'process-variables',
            key: `case-variables:${pid}`,
            label: `case · process variables read · ${Object.keys(variables).length} variable(s) · stage ${this.inferredStage ?? '?'}`,
            durationMs: 0,
            rows: Object.keys(variables).length,
            fields: summarizeCaseVariables(variables),
        });
        if (this.processInstanceId) {
            this.diagnostics.captureVariables(this.processInstanceId, variables, 'instance');
        }
    }

    private buildPatientFacts(): void {
        const patient = this.invoice?.patient;
        this.patientFacts = patient
            ? PATIENT_FACTS.filter((key) => !!patient[key]).map((key) => ({
                  labelKey: `MEDICAL_RECORDS.CASE_DETAIL.PATIENT_FACTS.${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`,
                  value: patient[key] as string,
              }))
            : [];
    }

    private buildAgents(): void {
        const vars = this.variables ?? {};
        const sources = resolveAgentSources({
            // Unified payload first (Automate script BuildIncrementalUnifiedWidgetPayload), then the per-agent variables.
            fieldValue: vars['unifiedWidgetPayloadText'] ?? null,
            fallbackValues: Object.fromEntries(AGENT_TABS.map((tab) => [tab.field, vars[tab.field]])),
        });
        this.agents = AGENT_TABS.map((tab) => {
            const source = sources.find((item) => item.id === tab.field);
            const result = source?.result ?? null;
            const findings = (result?.findings ?? []).map((finding, index) => fromAgentFinding(tab.id, this.invoiceKey, finding, index));
            const counts = new Map<string, number>();
            findings.forEach((finding) => finding.severity && counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1));
            return {
                tab,
                result,
                parseError: !!source?.parseError,
                findings,
                severities: SEVERITY_ORDER.filter((level) => counts.has(level)).map((level) => ({ level, count: counts.get(level) as number })),
            };
        });
        this.analysisFindings = this.agents.flatMap((agent) => agent.findings);
    }
}
