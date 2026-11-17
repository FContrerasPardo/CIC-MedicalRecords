import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormFieldModel } from '@alfresco/adf-core';
import { TranslateModule } from '@ngx-translate/core';
import { BatchStateSource } from '../../../form-widgets/intake-account-widget/batch-state.model';
import { mapBatchStateToIntakeForDocuments } from '../../../form-widgets/intake-account-widget/batch-state.mapper';
import { IntakeAccountServiceItemViewModel } from '../../../form-widgets/intake-account-widget/intake-account-view.model';
import { IntakeAccountWidgetComponent } from '../../../form-widgets/intake-account-widget/intake-account-widget.component';
import { AnalysisTaskWidgetComponent } from '../../../form-widgets/analysis-task-widget/analysis-task-widget.component';
import { resolveAgentSources } from '../../../form-widgets/analysis-task-widget/analysis-payload.resolver';
import { AgentFieldId, AgentResult } from '../../../form-widgets/analysis-task-widget/analysis.mapper';
import { createEmbeddedFormField } from '../../../form-widgets/shared/embedded-form-field';
import { PatientKey } from '../../../idp/idp-account-mapping.util';
import { CaseInvoiceOption } from '../utils/case-invoice.util';
import { WORKSPACE_TAB_IDS, WorkspaceTabId } from '../utils/case-navigation.util';
import {
    addFinding,
    advanceCommunication,
    AuditFinding,
    availableToObject,
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
    InvoiceAuditRecord,
    InvoiceAuditState,
    parseProviderComments,
    ProposedGlosa,
    ProviderComment,
    proposeGlosa,
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
type WorkspacePhase = 'INTAKE' | 'ANALYSIS' | 'AUDIT';

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
 * Invoice / patient workspace of the ARS (#147), in three phases:
 * - Intake: the intake widget embedded for this invoice (Service Explorer + Document Control Center);
 * - Analysis: the consolidated analysis widget (score and the three agents), then one tab per agent
 *   where each observation can be sent to the audit;
 * - Audit and glosas: decision per finding, provider responses and the communication to the provider.
 * Agent logic is untouched. Findings, proposed glosas and the communication status persist per
 * invoice (see InvoiceAuditStoreService). The AI proposes; every action here is a human decision.
 */
@Component({
    selector: 'medical-records-invoice-workspace',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, IntakeAccountWidgetComponent, AnalysisTaskWidgetComponent, AuditAssistantComponent],
    templateUrl: './invoice-workspace.component.html',
    styleUrls: ['./invoice-workspace.component.scss'],
})
export class InvoiceWorkspaceComponent implements OnChanges {
    private readonly store = inject(InvoiceAuditStoreService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

    /** Embedded widgets read these stand-in form fields (writes stay in this view). */
    intakeField: FormFieldModel | null = null;
    analysisField: FormFieldModel | null = null;

    intakeServices: IntakeAccountServiceItemViewModel[] = [];
    /** Labels of support documents requested from the provider in the intake (simulated). */
    readonly requestedDocuments = new Set<string>();
    agents: AgentView[] = [];
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

    get pendingIntake(): IntakeAccountServiceItemViewModel[] {
        return this.intakeServices.filter((service) => service.supportStatus !== 'Complete');
    }

    get pendingDecisionCount(): number {
        return this.record.findings.filter((finding) => findingStage(finding.status) === 'pending').length;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['initialTab'] && this.initialTab && WORKSPACE_TAB_IDS.includes(this.initialTab)) {
            this.activeTab = this.initialTab;
        }
        if (!changes['variables'] && !changes['batchState'] && !changes['invoice'] && !changes['processInstanceId']) {
            return;
        }
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
    }

    selectTab(id: WorkspaceTabId): void {
        this.activeTab = id;
    }

    onTabKeydown(event: KeyboardEvent): void {
        const index = this.tabs.findIndex((tab) => tab.id === this.activeTab);
        const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: this.tabs.length - 1 };
        if (!(event.key in moves)) {
            return;
        }
        event.preventDefault();
        const next = this.tabs[(moves[event.key] + this.tabs.length) % this.tabs.length];
        this.focusTab(next.id);
    }

    /** First tab of a phase group (shows the phase label before it). */
    startsPhase(index: number): boolean {
        return index === 0 || this.tabs[index - 1].phase !== this.tabs[index].phase;
    }

    /** Status of a candidate already in the audit tray (by id or deduplicated), or null. */
    statusOf(candidate: AuditFinding): FindingStatus | null {
        return this.findExisting(candidate)?.status ?? null;
    }

    // Intake actions -------------------------------------------------------------------------

    fromIntake(service: IntakeAccountServiceItemViewModel): AuditFinding {
        return fromIntakeService(this.invoiceKey, service);
    }

    registerIntake(service: IntakeAccountServiceItemViewModel): void {
        this.add(this.fromIntake(service));
    }

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
        this.saving = true;
        this.store.save(this.processInstanceId, this.state).subscribe((mode) => {
            this.persistence = mode;
            this.saving = false;
        });
    }

    private refreshSummary(): void {
        this.summary = summarizeFinancials(this.record, this.invoice?.totalBilled ?? null);
    }

    /** The widgets read process variables as form fields; batchState is the parsed one the case already loaded. */
    private buildFields(): void {
        const vars = { ...(this.variables ?? {}), batchState: this.batchState ?? this.variables?.['batchState'] ?? null };
        this.intakeField = createEmbeddedFormField('batchState', vars) as unknown as FormFieldModel;
        this.analysisField = createEmbeddedFormField('unifiedWidgetPayloadText', vars, true) as unknown as FormFieldModel;
    }

    /** Services of this invoice (same mapping as the embedded intake), for sending observations to the audit. */
    private buildIntake(): void {
        this.intakeServices = [];
        if (!this.batchState || !this.invoice?.documentIds.length) {
            return;
        }
        this.intakeServices = mapBatchStateToIntakeForDocuments(this.batchState, this.invoice.documentIds).services;
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
    }
}
