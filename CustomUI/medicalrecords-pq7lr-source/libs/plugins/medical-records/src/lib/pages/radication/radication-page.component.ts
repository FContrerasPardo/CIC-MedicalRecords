import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { isPendingDocument } from '@hxp/shared-hxp/services';
import { Subscription } from 'rxjs';
import { ChecklistLoadResult } from '../agreements/checklist/documentation-checklist-repository.service';
import { DEFAULT_DOCUMENTATION_CHECKLIST, parseDocumentationChecklist } from '../agreements/checklist/documentation-checklist.util';
import { AgreementRepositoryService } from '../agreements/store/agreement-repository.service';
import { normalizeProviderName } from '../agreements/store/agreement-store.util';
import { mapBatchStateToCaseDocuments, parseBatchState } from '../case-detail/batch-state-case-detail.provider';
import { CaseDocument } from '../case-detail/case-detail.model';
import { CaseDocumentViewerComponent } from '../case-detail/case-document-viewer.component';
import { buildCaseAccountView, CaseAccountView, CaseInvoiceOption } from '../case-detail/utils/case-invoice.util';
import { buildCaseQueryParams, CASE_ROUTE_COMMANDS } from '../case-detail/utils/case-navigation.util';
import { RadicationDocument, RadicationProcessService, RadicationStartFailure, RadicationStepErrorCode, RadicationStepFailure } from './radication-process.service';
import { RadicationStageArtComponent } from './radication-stage-art.component';
import { provideMockExternalVerificationAdapters } from './external-checks/external-verification.adapters';
import { ExternalChecksContext, RadicationExternalChecksComponent } from './external-checks/radication-external-checks.component';
import { AutomateErrorDetail, describeAutomateError, StartFieldCheck } from './utils/radication-diagnostics.util';
import { buildProviderFindingComments, MAX_COMMENT_LENGTH, parseProviderFindingComments, PROVIDER_FINDING_COMMENTS_VARIABLE, ProviderFindingComments } from './utils/radication-intake.util';
import { generateRadicationNumber, isValidRadicationNumber } from './utils/radication-number.util';
import { PolicySource } from './policy/preanalysis-policy-repository.service';
import { buildPolicyView, parsePreanalysisPolicy, PolicyView, PreanalysisPolicy } from './utils/radication-policy.util';
import { buildRadicationPreanalysis, PreanalysisFinding, PreanalysisStatus, RadicationPreanalysis } from './utils/radication-preanalysis.util';
import {
    agentReviewStatus,
    AgentReviewRow,
    agentRowsAsFindings,
    FindingSection,
    parseAgentReview,
    receivedDocumentRows,
    agentRuleViews,
    isDeliveredRow,
    reviewTableRows,
    PREANALYSIS_RESULT_VARIABLE,
} from './utils/radication-agent-review.util';
import {
    deriveRadicationProgress,
    RADICATION_IDP_SUBSTEPS,
    RADICATION_PROCESSING_STAGES,
    RadicationProgress,
    RadicationStageKey,
    RadicationStageState,
    RadicationStageView,
    RadicationSubstepView,
} from './utils/radication-progress.util';
import {
    classifyStartError,
    isAcceptedLocalFile,
    RADICATION_ACCEPTED_EXTENSIONS,
    RADICATION_START_FORM,
    RadicationIssue,
    RadicationStartErrorCode,
    RadicationUploadItem,
    validateRadicationDraft,
} from './utils/radication-start.util';

const I18N = 'MEDICAL_RECORDS.RADICATION';
const POLL_INTERVAL_MS = 4000;
const POLL_LIMIT = 150;

/** The four steps of the pre-radication, as CIC-Fin's loan application (upload → processing → review → confirmation). */
export type RadicationStep = 'upload' | 'processing' | 'review' | 'summary';
export const RADICATION_STEPS: readonly RadicationStep[] = ['upload', 'processing', 'review', 'summary'];

/**
 * One row of the review table: a finding of the agent's pre-analysis (`preanalysisResult`) or, when
 * the agent result is absent, of the deterministic checklist; with its documents for the viewer.
 */
export interface RadicationReviewRow {
    finding: PreanalysisFinding;
    agent: AgentReviewRow | null;
    documents: CaseDocument[];
}

/** A new account, or more documents for the account already radicated. */
type UploadMode = 'new' | 'more';

/**
 * Animated track of a processing stage, with the art of CIC-Fin's validation tracks
 * (`loan-application.component.html` #validationTrackArt): `signatures` (signature and business
 * rules), `checklist` (document checklist) and `packaging` (documents to e-mail and cloud).
 */
interface RadicationStageTrack {
    key: 'rules' | 'checklist' | 'notify';
    art: 'signatures' | 'checklist' | 'packaging';
}

const STAGE_TRACKS: Partial<Record<RadicationStageKey, readonly RadicationStageTrack[]>> = {
    preanalysis: [
        { key: 'rules', art: 'signatures' },
        { key: 'checklist', art: 'checklist' },
    ],
    intake: [{ key: 'notify', art: 'packaging' }],
};

/** A document of the account, as CIC-Fin's `AgenticBankUpload`: local file or repository document, plus its form reference. */
interface RadicationUpload extends RadicationUploadItem {
    key: number;
    file?: File;
    document?: RadicationDocument;
}

/**
 * Provider pre-radication (#146, `docs/ARS_DEMO_REORIENTACION.md` §5 stage 0), built on CIC-Fin's
 * loan application (`loan-application.component.*`): same layout, cards, processing stages and
 * animations, with the `--mr-*` tokens.
 * 1. Load: provider, email and documents; `MedRecNum` generated.
 * 2. Process: starts `medical-records` and follows IDP up to the Intake task, from the runtime.
 * 3. Review: invoices and patients found and one row per finding with its comment and documents:
 *    the agent's pre-analysis (`preanalysisResult`, comments in `DataTable0hznuv`) or, without
 *    it, the agreement's documentary checklist (`providerFindingComments`, ARS audit #147).
 * 4. Summary: before the decision, load more documents (back to 1 on the same account) or radicate
 *    (completes Intake); afterwards, the radicated account with links to the case and the ARS dashboard.
 */
@Component({
    selector: 'medical-records-radication-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        RouterModule,
        TranslateModule,
        RadicationStageArtComponent,
        RadicationExternalChecksComponent,
        CaseDocumentViewerComponent,
    ],
    // v1: simulated external systems only (no HTTP); a real integration replaces its adapter.
    providers: [provideMockExternalVerificationAdapters()],
    templateUrl: './radication-page.component.html',
    styleUrls: ['./radication-page.component.scss'],
})
export class RadicationPageComponent implements OnInit, OnDestroy {
    private readonly translate = inject(TranslateService);
    private readonly radication = inject(RadicationProcessService);
    private readonly agreementRepository = inject(AgreementRepositoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly subscriptions = new Subscription();

    @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

    readonly i18n = I18N;
    readonly steps = RADICATION_STEPS;
    readonly maxCommentLength = MAX_COMMENT_LENGTH;
    readonly accept = RADICATION_ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(',');
    readonly caseRoute: string[] = [...CASE_ROUTE_COMMANDS];
    readonly fileIssues: RadicationIssue[] = ['FILE_TYPE', 'FILE_SIZE', 'FILE_DUPLICATE', 'UPLOADS_PENDING', 'UPLOADS_FAILED'];

    step: RadicationStep = 'upload';
    uploadMode: UploadMode = 'new';
    /** Where "Back" returns from a "more documents" upload: the review or the summary that opened it. */
    uploadReturnStep: RadicationStep = 'summary';

    /** Generated when the form opens and shown read only, like CIC-Fin's application number. */
    radicationNumber = '';
    providerName = '';
    email = '';
    uploads: RadicationUpload[] = [];
    submitAttempted = false;
    dragging = false;
    sending = false;
    radicatedAt: Date | null = null;
    /** Documents sent so far, over every upload round. */
    documentsSent = 0;

    processInstanceId: string | null = null;
    startError: RadicationStartErrorCode | null = null;
    /** Automate's own answer (HTTP status, code, message; emails masked). */
    startErrorDetail: string | null = null;
    startErrorFields: StartFieldCheck[] = [];
    /** Fields of the deployed start form that do not match what the page sends, checked when the page opens. */
    formFieldIssues: StartFieldCheck[] = [];

    progress: RadicationProgress | null = null;
    pollFailed = false;
    readonly stageTracks = STAGE_TRACKS;
    /** Invoices for the simulated external verifications; replaced once `batchState` is read. */
    externalChecksContext: ExternalChecksContext | null = null;
    private accountContextRequested = false;

    checklistResult: ChecklistLoadResult | null = null;
    preanalysis: RadicationPreanalysis | null = null;
    account: CaseAccountView | null = null;
    /** Rows of the review table (agent result, or checklist findings as fallback). */
    reviewRows: RadicationReviewRow[] = [];
    /** Where the review rows come from. */
    reviewSource: 'agent' | 'checklist' = 'checklist';
    /** `false` once the deployed Intake form proved to have no `DataTable0hznuv` field. */
    agentTableAvailable = true;
    /** Document open in the viewer. */
    viewerDocument: CaseDocument | null = null;
    /** Pre-analysis policy (Appdata file or bundled copy) and its view for this account's review. */
    policy: PreanalysisPolicy | null = null;
    policySource: PolicySource | null = null;
    policyView: PolicyView | null = null;
    /** Agreement whose checklist and policy apply: matched by the account's provider name, else the default one. */
    agreementId: string | null = null;
    agreementName: string | null = null;
    agreementMatched = false;
    /** Normalized provider name the loaded rules belong to (`null` before the first load), and that load. */
    private agreementRulesKey: string | null = null;
    private agreementRulesLoad: Promise<void> | null = null;

    /** findingId → comment typed by the provider. */
    comments: Record<string, string> = {};
    savedComments: Record<string, string> = {};
    savingComments = false;
    deciding = false;
    /** The provider radicated the account (Intake completed with "continue"). */
    intakeCompleted = false;
    stepError: RadicationStepErrorCode | null = null;
    stepErrorDetail: string | null = null;

    private nextKey = 1;
    private pollTimer: ReturnType<typeof setTimeout> | null = null;
    private polls = 0;
    private destroyed = false;

    ngOnInit(): void {
        this.radicationNumber = generateRadicationNumber({ date: new Date() });
        void this.loadAgreementRules();
        void this.inspectForm();
        const resumed = this.route.snapshot.queryParamMap.get('process');
        if (resumed) {
            void this.resume(resumed);
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.subscriptions.unsubscribe();
        this.stopPolling();
    }

    // ── Stepper ──────────────────────────────────────────────────────────────

    stepIndex(step: RadicationStep = this.step): number {
        return RADICATION_STEPS.indexOf(step);
    }

    stepState(step: RadicationStep): 'done' | 'active' | 'pending' {
        if (step === 'summary' && this.radicated) {
            return 'done';
        }
        const current = this.stepIndex();
        const index = this.stepIndex(step);
        return index < current ? 'done' : index === current ? 'active' : 'pending';
    }

    // ── Step 1: load ─────────────────────────────────────────────────────────

    get issues(): RadicationIssue[] {
        const provider = this.uploadMode === 'more' ? this.providerName || '—' : this.providerName;
        const email = this.uploadMode === 'more' ? this.email || 'x@x.x' : this.email;
        return validateRadicationDraft({ providerName: provider, email, uploads: this.uploads });
    }

    hasIssue(issue: RadicationIssue): boolean {
        return (this.submitAttempted || issue === 'FILE_TYPE' || issue === 'FILE_SIZE' || issue === 'FILE_DUPLICATE') && this.issues.includes(issue);
    }

    get uploadedCount(): number {
        return this.uploads.filter((upload) => upload.status === 'uploaded').length;
    }

    /** Native attach dialog (repository or local upload), as CIC-Fin's `openRepositoryPicker`; file input when it is not registered. */
    openPicker(): void {
        if (this.sending) {
            return;
        }
        if (!this.radication.repositoryPickerAvailable) {
            this.fileInput?.nativeElement.click();
            return;
        }
        this.subscriptions.add(
            this.radication.pickDocuments().subscribe((documents) => {
                for (const document of documents) {
                    const name = documentName(document);
                    if (this.uploads.some((upload) => upload.name.toLowerCase() === name.toLowerCase())) {
                        continue;
                    }
                    this.uploads = [...this.uploads, { key: this.nextKey++, name, size: null, source: 'repository', status: 'uploaded', document }];
                }
            })
        );
    }

    onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.addFiles(input.files);
        input.value = '';
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragging = false;
        if (!this.sending) {
            this.addFiles(event.dataTransfer?.files ?? null);
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragging = true;
    }

    removeUpload(upload: RadicationUpload): void {
        this.uploads = this.uploads.filter((current) => current.key !== upload.key);
    }

    retryUpload(upload: RadicationUpload): void {
        if (upload.file && isAcceptedLocalFile(upload.file)) {
            this.startUpload(upload.key, upload.file);
        }
    }

    /** New account: starts the process. More documents: completes Intake with them (same account). */
    async submit(): Promise<void> {
        this.submitAttempted = true;
        if (this.issues.length || this.sending) {
            return;
        }
        this.sending = true;
        this.clearErrors();
        const documents = this.uploads.map((upload) => upload.document).filter((document): document is RadicationDocument => !!document);
        try {
            if (this.uploadMode === 'more' && this.processInstanceId) {
                await this.radication.completeIntake(this.processInstanceId, { decision: 'more-documents', comments: this.commentsPayload(), newDocuments: documents });
            } else {
                this.processInstanceId = await this.radication.start({
                    radicationNumber: this.radicationNumber,
                    providerName: this.providerName,
                    email: this.email,
                    documents,
                    language: this.translate.currentLang || this.translate.defaultLang || 'es',
                });
                this.radicatedAt = new Date();
                void this.router.navigate([], { relativeTo: this.route, queryParams: { process: this.processInstanceId }, queryParamsHandling: 'merge', replaceUrl: true });
            }
            this.documentsSent += documents.length;
            this.reviewUploadOpen = false;
            this.goProcessing();
        } catch (error) {
            console.error('[medical-records] radication submit failed', error);
            if (error instanceof RadicationStepFailure) {
                this.setStepError(error);
            } else {
                this.startError = classifyStartError(error);
                const failure = error instanceof RadicationStartFailure ? error : null;
                this.startErrorFields = failure?.fieldIssues ?? [];
                this.startErrorDetail = formatAutomateDetail(failure ? failure.detail : describeAutomateError(error));
            }
        } finally {
            this.sending = false;
        }
    }

    /** Reads the deployed start form and compares its field ids with the ones sent (recorded in the technical view). */
    async inspectForm(): Promise<void> {
        try {
            this.formFieldIssues = (await this.radication.inspectStartForm()).blocking;
        } catch {
            // The failure is in the technical view; the start attempt reports it to the user.
            this.formFieldIssues = [];
        }
    }

    // ── Step 2: process ──────────────────────────────────────────────────────

    get processingStages(): RadicationStageView[] {
        return (this.progress?.stages ?? []).filter((stage) => RADICATION_PROCESSING_STAGES.includes(stage.key));
    }

    /** IDP sub-steps from the running service tasks; without runtime detail, the three animated together. */
    get idpSubsteps(): RadicationSubstepView[] {
        return this.progress?.idpSubsteps ?? RADICATION_IDP_SUBSTEPS.map((key) => ({ key, state: 'active' as RadicationStageState }));
    }

    /** Share of the processing stages done (an active one counts half), as CIC-Fin's overall progress. */
    get overallProgress(): number {
        const stages = this.processingStages;
        if (!stages.length) {
            return 0;
        }
        const score = stages.reduce((sum, stage) => sum + (stage.state === 'done' ? 1 : stage.state === 'active' ? 0.5 : 0), 0);
        return Math.round((score / stages.length) * 100);
    }

    get stageInError(): boolean {
        return this.processingStages.some((stage) => stage.state === 'error');
    }

    refresh(): void {
        this.polls = 0;
        this.schedulePoll(0);
    }

    // ── Step 3: review (pre-analysis + comments) ─────────────────────────────

    get commentsDirty(): boolean {
        const typed = this.commentsPayload()?.comments ?? [];
        const saved = Object.entries(this.savedComments).filter(([, text]) => !!text);
        return typed.length !== saved.length || typed.some((item) => this.savedComments[item.findingId] !== item.comment);
    }

    /** Review rows whose details are open (all start collapsed). */
    expandedRows = new Set<string>();

    isExpanded(row: RadicationReviewRow): boolean {
        return this.expandedRows.has(row.finding.id);
    }

    toggleRow(row: RadicationReviewRow): void {
        const next = new Set(this.expandedRows);
        if (next.has(row.finding.id)) {
            next.delete(row.finding.id);
        } else {
            next.add(row.finding.id);
        }
        this.expandedRows = next;
    }

    get allRowsExpanded(): boolean {
        return this.reviewRows.length > 0 && this.reviewRows.every((row) => this.expandedRows.has(row.finding.id));
    }

    toggleAllRows(): void {
        this.expandedRows = this.allRowsExpanded ? new Set() : new Set(this.reviewRows.map((row) => row.finding.id));
    }

    /** A delivered document with no requirement (page "received" row or agent RuleId DELIVERED). */
    isDelivered(row: RadicationReviewRow): boolean {
        return !!row.agent && isDeliveredRow(row.agent);
    }

    /** Status of a review row: the agent's, or missing/attention for a checklist finding. */
    rowStatus(row: RadicationReviewRow): 'missing' | 'attention' | 'pass' {
        if (row.agent) {
            return row.agent.status;
        }
        return row.finding.kind === 'MISSING_DOCUMENTS' || row.finding.kind === 'NO_INVOICE' ? 'missing' : 'attention';
    }

    /**
     * Collapsed description (CIC-Fin's `reviewSummary`): what the agent verified up front and,
     * when the row is not a pass, what is still pending; the plain comment when it has no sections.
     */
    rowHeadline(row: RadicationReviewRow): { verified: string | null; pending: string | null; plain: string | null } {
        if (!row.agent) {
            return { verified: null, pending: null, plain: row.finding.subject || null };
        }
        const sections = row.agent.sections ?? [];
        const pick = (kind: FindingSection['kind']): string | null => sections.find((section) => section.kind === kind)?.text || null;
        const verified = pick('verified');
        const pending = row.agent.status === 'pass' ? null : pick('pending');
        return { verified, pending, plain: verified || pending ? null : pick('general') || row.agent.comment || null };
    }

    /** One invoice (one patient): the header already shows it, rows do not repeat it. */
    get singleInvoice(): boolean {
        return (this.account?.invoices.length ?? 0) <= 1;
    }

    /** Inline "Add documents" block of the review (CIC-Fin's review upload): same account, Intake "more-documents". */
    reviewUploadOpen = false;

    openReviewUpload(): void {
        this.uploadMode = 'more';
        this.uploadReturnStep = 'review';
        this.uploads = [];
        this.submitAttempted = false;
        this.clearErrors();
        this.reviewUploadOpen = true;
    }

    closeReviewUpload(): void {
        this.reviewUploadOpen = false;
        this.uploads = [];
        this.submitAttempted = false;
    }

    get reviewUploadReady(): boolean {
        return this.uploads.length > 0 && this.uploads.every((upload) => upload.status === 'uploaded');
    }

    /** Assistant summary: rows per status. */
    get reviewCounts(): { missing: number; attention: number; pass: number } {
        const counts = { missing: 0, attention: 0, pass: 0 };
        for (const row of this.reviewRows) {
            counts[this.rowStatus(row)]++;
        }
        return counts;
    }

    /** Assistant list: what the provider must resolve, most severe first. */
    get reviewAlerts(): RadicationReviewRow[] {
        const order = { missing: 0, attention: 1, pass: 2 };
        return this.reviewRows.filter((row) => this.rowStatus(row) !== 'pass').sort((a, b) => order[this.rowStatus(a)] - order[this.rowStatus(b)]);
    }

    /** Opens a row from the assistant and scrolls to it. */
    focusRow(row: RadicationReviewRow): void {
        this.expandedRows = new Set([...this.expandedRows, row.finding.id]);
        setTimeout(() => document.getElementById('review-row-' + row.finding.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }

    get commentCount(): number {
        return this.commentsPayload()?.comments.length ?? 0;
    }

    /** Overall status of the review: the agent's result when used, the checklist's otherwise. */
    get reviewStatus(): PreanalysisStatus {
        if (this.reviewSource === 'agent') {
            return agentReviewStatus(this.reviewRows.map((row) => row.agent).filter((row): row is AgentReviewRow => !!row));
        }
        return this.preanalysis?.status ?? 'complete';
    }

    /** Rows that still need the provider's attention (agent "Pass" rows excluded). */
    get openFindingCount(): number {
        return this.reviewRows.filter((row) => row.agent?.status !== 'pass').length;
    }

    /** The finding's comment is saved and unchanged. */
    commentAttended(finding: PreanalysisFinding): boolean {
        const saved = this.savedComments[finding.id];
        return !!saved && saved === (this.comments[finding.id] ?? '').trim();
    }

    sectionLabel(section: FindingSection): string | null {
        return section.kind === 'general' ? null : `${I18N}.REVIEW.COMMENT_${section.kind.toUpperCase()}`;
    }

    /**
     * Saves one row's comment. Agent rows are annotated in the Intake table `DataTable0hznuv`
     * (CIC-Fin pattern); without that field, or for checklist rows, every comment is saved in
     * `providerFindingComments`.
     */
    async saveRowComment(row: RadicationReviewRow): Promise<void> {
        const text = (this.comments[row.finding.id] ?? '').trim();
        if (!text || !this.processInstanceId || this.savingComments) {
            return;
        }
        if (!row.agent || row.agent.received || !this.agentTableAvailable) {
            await this.saveComments();
            return;
        }
        this.savingComments = true;
        this.clearErrors();
        try {
            await this.radication.saveAgentReviewComment(this.processInstanceId, row.agent.raw, text);
            row.agent = { ...row.agent, userComment: text, attended: true, raw: { ...row.agent.raw, UserComment: text, Attended: true } };
            this.savedComments = { ...this.savedComments, [row.finding.id]: text };
        } catch (error) {
            if (error instanceof RadicationStepFailure && error.code === 'REVIEW_TABLE_MISSING') {
                // Recorded in the technical view; the comments keep their previous home.
                this.agentTableAvailable = false;
                this.savingComments = false;
                await this.saveComments();
                return;
            }
            this.setStepError(error);
        } finally {
            this.savingComments = false;
        }
    }

    /** Invoice (and patient) the finding refers to, when its documents belong to one. */
    findingInvoice(finding: PreanalysisFinding): CaseInvoiceOption | null {
        return finding.invoiceKey ? (this.account?.invoices.find((invoice) => invoice.key === finding.invoiceKey) ?? null) : null;
    }

    viewDocument(document: CaseDocument): void {
        this.viewerDocument = document;
        // Records in the technical view whether the node behind the button exists and has content.
        void this.radication.probeDocument(document);
    }

    /** Saves every typed comment (the whole `providerFindingComments` payload), as CIC-Fin's `saveReviewComment`. */
    async saveComments(): Promise<void> {
        const payload = this.commentsPayload();
        if (!payload || !this.processInstanceId || this.savingComments) {
            return;
        }
        this.savingComments = true;
        this.clearErrors();
        try {
            await this.radication.saveFindingComments(this.processInstanceId, payload);
            this.savedComments = Object.fromEntries(payload.comments.map((item) => [item.findingId, item.comment]));
        } catch (error) {
            this.setStepError(error);
        } finally {
            this.savingComments = false;
        }
    }

    // ── Step 4: summary (decision, then radicated account) ───────────────────

    /** The account left Intake towards the ARS: the summary shows it as radicated. */
    get radicated(): boolean {
        return this.intakeCompleted || !!this.progress?.afterIntake;
    }

    /** Back to step 1 on the same account: only documents, provider and number stay. */
    loadMoreDocuments(returnStep: RadicationStep = 'summary'): void {
        this.uploadReturnStep = returnStep;
        this.uploadMode = 'more';
        this.uploads = [];
        this.submitAttempted = false;
        this.clearErrors();
        this.step = 'upload';
    }

    /** Radicates the account: completes Intake with "continue" and the comments. */
    async continueToSummary(): Promise<void> {
        if (!this.processInstanceId || this.deciding) {
            return;
        }
        this.deciding = true;
        this.clearErrors();
        try {
            await this.radication.completeIntake(this.processInstanceId, { decision: 'continue', comments: this.commentsPayload() });
            this.intakeCompleted = true;
            this.step = 'summary';
            this.refresh();
        } catch (error) {
            this.setStepError(error);
        } finally {
            this.deciding = false;
        }
    }

    get caseQueryParams(): Record<string, string> {
        return this.processInstanceId ? buildCaseQueryParams({ processInstanceId: this.processInstanceId }) : {};
    }

    get summaryStatus(): 'pending' | 'received' | 'in-analysis' | 'error' {
        if (this.progress?.failed) {
            return 'error';
        }
        if (this.progress?.afterIntake) {
            return 'in-analysis';
        }
        return this.intakeCompleted ? 'received' : 'pending';
    }

    /** Back to an empty form with a new radication number; the radicated account keeps running in Automate. */
    reset(): void {
        this.stopPolling();
        this.radicationNumber = generateRadicationNumber({ date: new Date() });
        this.providerName = '';
        this.email = '';
        this.uploads = [];
        this.submitAttempted = false;
        this.uploadMode = 'new';
        this.uploadReturnStep = 'summary';
        this.step = 'upload';
        this.processInstanceId = null;
        this.progress = null;
        this.externalChecksContext = null;
        this.accountContextRequested = false;
        this.preanalysis = null;
        this.account = null;
        this.reviewRows = [];
        this.policyView = null;
        this.reviewSource = 'checklist';
        this.agentTableAvailable = true;
        this.viewerDocument = null;
        this.comments = {};
        this.savedComments = {};
        this.intakeCompleted = false;
        this.documentsSent = 0;
        this.radicatedAt = null;
        this.pollFailed = false;
        this.clearErrors();
        void this.router.navigate([], { relativeTo: this.route, queryParams: { process: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    // ── Shared ───────────────────────────────────────────────────────────────

    async copyNumber(): Promise<void> {
        await navigator.clipboard?.writeText(this.radicationNumber).catch(() => undefined);
    }

    formatSize(bytes: number | null): string {
        if (bytes === null) {
            return '';
        }
        return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    /**
     * The documentary checklist and pre-analysis policy of the account's agreement
     * (`/MedRec/Appdata/Agreements/<agreementId>/`), resolved by the provider name against the
     * agreements index; without a match, the default agreement. Each file falls back to the old global
     * file and then to the bundled template. Reloaded only when the provider changes.
     */
    loadAgreementRules(providerName: string | null = null): Promise<void> {
        const key = normalizeProviderName(providerName);
        if (this.agreementRulesKey !== key || !this.agreementRulesLoad) {
            this.agreementRulesKey = key;
            this.agreementRulesLoad = this.fetchAgreementRules(providerName, key);
        }
        return this.agreementRulesLoad;
    }

    private async fetchAgreementRules(providerName: string | null, key: string): Promise<void> {
        try {
            const resolved = await this.agreementRepository.resolveRulesForProvider(providerName);
            if (this.agreementRulesKey !== key) {
                return;
            }
            const checklist = parseDocumentationChecklist(resolved.checklist.content);
            this.checklistResult = checklist
                ? { checklist, source: resolved.checklist.source, documentId: resolved.checklist.documentId, modifiedAt: resolved.checklist.modifiedAt }
                : null;
            this.policy = parsePreanalysisPolicy(resolved.policy.content);
            this.policySource = this.policy ? resolved.policy.source : null;
            this.agreementId = resolved.entry?.agreementId ?? null;
            this.agreementName = resolved.entry?.providerName ?? null;
            this.agreementMatched = resolved.matched;
        } catch {
            if (this.agreementRulesKey !== key) {
                return;
            }
            this.agreementRulesLoad = null;
            this.checklistResult = null;
            this.policy = null;
            this.policySource = null;
        }
        this.updatePolicyView();
    }

    /** Provider of the account: the IDP invoice's provider, else the name typed on upload. */
    private accountProviderName(): string | null {
        return this.account?.account.provider || this.providerName || null;
    }

    /** Profile by invoice count, with each class marked from the review rows. */
    private updatePolicyView(): void {
        if (!this.policy || !this.preanalysis) {
            this.policyView = null;
            return;
        }
        const rows = this.reviewRows.map((row) => ({ className: row.agent?.className ?? row.finding.subject ?? '', status: this.rowStatus(row) }));
        this.policyView = buildPolicyView(this.policy, this.account?.invoices.length ?? 0, rows);
    }

    /** Opened with `?process=<id>`: continues the radicated account from where it is (review or summary). */
    private async resume(processInstanceId: string): Promise<void> {
        this.processInstanceId = processInstanceId;
        this.uploadMode = 'more';
        try {
            const variables = await this.radication.variables(processInstanceId);
            const number = String(variables[RADICATION_START_FORM.fields.radicationNumber] ?? '');
            if (isValidRadicationNumber(number)) {
                this.radicationNumber = number;
            }
            this.email = String(variables[RADICATION_START_FORM.fields.email] ?? '');
            this.savedComments = parseProviderFindingComments(variables[PROVIDER_FINDING_COMMENTS_VARIABLE]);
            this.comments = { ...this.savedComments };
        } catch {
            // The technical view shows the failed read; progress still loads.
        }
        this.goProcessing();
    }

    private goProcessing(): void {
        this.step = 'processing';
        this.progress = deriveRadicationProgress({ processStatus: 'RUNNING', childProcesses: [], tasks: [] });
        this.externalChecksContext = { seed: this.radicationNumber || null, invoiceCount: 1 };
        this.accountContextRequested = false;
        this.refresh();
    }

    /** Once IDP finished: the account's invoices from `batchState`, for the external verifications. */
    private async loadAccountContext(): Promise<void> {
        if (!this.processInstanceId) {
            return;
        }
        try {
            const variables = await this.radication.variables(this.processInstanceId);
            const account = buildCaseAccountView(parseBatchState(variables['batchState']));
            if (this.destroyed || !account.invoices.length) {
                return;
            }
            this.account = account;
            void this.loadAgreementRules(this.accountProviderName());
            this.externalChecksContext = {
                providerId: account.account.providerTaxId,
                invoices: account.invoices,
                invoiceCount: account.invoices.length,
                seed: this.radicationNumber || null,
            };
        } catch {
            // Keeps the synthetic references; the technical view shows the failed read.
        }
    }

    private schedulePoll(delay: number): void {
        this.stopPolling();
        this.pollTimer = setTimeout(() => void this.poll(), delay);
    }

    private async poll(): Promise<void> {
        if (!this.processInstanceId || this.destroyed) {
            return;
        }
        this.polls++;
        try {
            const snapshot = await this.radication.snapshot(this.processInstanceId);
            if (snapshot.processStatus) {
                this.progress = deriveRadicationProgress(snapshot);
            }
            this.pollFailed = false;
        } catch {
            this.pollFailed = true;
        }
        if (this.destroyed) {
            return;
        }
        const preanalysisStage = this.progress?.stages.find((stage) => stage.key === 'preanalysis');
        if (this.step === 'processing' && !this.accountContextRequested && (preanalysisStage?.state === 'active' || preanalysisStage?.state === 'done')) {
            this.accountContextRequested = true;
            void this.loadAccountContext();
        }
        if (this.step === 'processing' && this.progress?.intakeReady) {
            await this.loadPreanalysis();
            this.step = 'review';
            return;
        }
        if (this.step === 'processing' && this.progress?.afterIntake) {
            await this.loadPreanalysis();
            this.step = 'summary';
        }
        const waiting = this.step === 'processing' || (this.step === 'summary' && this.intakeCompleted && !this.progress?.afterIntake && !this.progress?.failed);
        if (waiting && !this.progress?.failed && this.polls < POLL_LIMIT) {
            this.schedulePoll(POLL_INTERVAL_MS);
        }
    }

    /** Reads `batchState` (IDP): invoices and patients, the agreement's checklist and the documents of each finding. */
    private async loadPreanalysis(): Promise<void> {
        if (!this.processInstanceId) {
            return;
        }
        let checklist = this.checklistResult?.checklist ?? DEFAULT_DOCUMENTATION_CHECKLIST;
        try {
            const [variables, intakeTable] = await Promise.all([
                this.radication.variables(this.processInstanceId),
                this.radication.intakeReviewTable(this.processInstanceId),
            ]);
            const batchState = parseBatchState(variables['batchState']);
            this.account = buildCaseAccountView(batchState);
            // The agreement of the account's provider decides the checklist and the policy.
            await this.loadAgreementRules(this.accountProviderName());
            checklist = this.checklistResult?.checklist ?? DEFAULT_DOCUMENTATION_CHECKLIST;
            this.preanalysis = buildRadicationPreanalysis(checklist, batchState);
            const invoices = this.account.invoices;
            // The open Intake task holds the saved comments until it completes; then preanalysisResult does.
            const agentSource = reviewTableRows(intakeTable).length ? intakeTable : variables[PREANALYSIS_RESULT_VARIABLE];
            const agentRows = parseAgentReview(agentSource, invoices.map((invoice) => invoice.invoiceNumber));
            const documentsOf = (ids: readonly string[]) => (batchState && ids.length ? mapBatchStateToCaseDocuments(batchState, ids) : []);
            if (agentRows) {
                // Every extracted document shows up: classes the agent did not cite become "received" rows.
                const extracted = ((batchState?.documents ?? []) as Array<{ id?: string; className?: string }>).filter(Boolean).map((document) => ({
                    id: String(document.id ?? ''),
                    className: String(document.className ?? ''),
                    invoiceNumber: invoices.find((invoice) => invoice.documentIds.includes(String(document.id ?? '')))?.invoiceNumber ?? '',
                }));
                const allRows = [...agentRows, ...receivedDocumentRows(agentRows, extracted)];
                const findings = agentRowsAsFindings(allRows, invoices);
                this.reviewSource = 'agent';
                this.reviewRows = allRows.map((agent, index) => ({ finding: findings[index], agent, documents: documentsOf(agent.documentIds) }));
                // The checklist rules as the agent applied them (it reads the service lines semantically).
                const ruleViews = agentRuleViews(agentRows, new Map(checklist.rules.map((rule) => [rule.ruleId, rule.description])));
                if (ruleViews.length) {
                    this.preanalysis = { ...this.preanalysis, rules: ruleViews };
                }
            } else {
                this.reviewSource = 'checklist';
                this.reviewRows = this.preanalysis.findings.map((finding) => ({ finding, agent: null, documents: documentsOf(finding.documentIds) }));
            }
            const stored = parseProviderFindingComments(variables[PROVIDER_FINDING_COMMENTS_VARIABLE]);
            // Annotations already in the agent's table count as saved comments.
            const annotated = Object.fromEntries(
                this.reviewRows.filter((row) => row.agent?.attended && row.agent.userComment).map((row) => [row.finding.id, row.agent?.userComment ?? ''])
            );
            const saved = { ...stored, ...annotated };
            if (Object.keys(saved).length) {
                this.savedComments = saved;
                this.comments = { ...saved, ...this.comments };
            }
        } catch {
            this.preanalysis = buildRadicationPreanalysis(checklist, null);
            this.reviewSource = 'checklist';
            this.reviewRows = this.preanalysis.findings.map((finding) => ({ finding, agent: null, documents: [] }));
        }
        this.updatePolicyView();
    }

    private commentsPayload(): ProviderFindingComments | null {
        if (!this.preanalysis) {
            return null;
        }
        return buildProviderFindingComments({
            radicationNumber: this.radicationNumber,
            findings: this.reviewRows.map((row) => row.finding),
            comments: this.comments,
            at: new Date(),
        });
    }

    /** As CIC-Fin's `onFilesSelected`: each accepted file starts uploading at once; rejected ones stay listed with their reason. */
    private addFiles(list: FileList | null): void {
        for (const file of Array.from(list ?? [])) {
            if (this.uploads.some((upload) => upload.name.toLowerCase() === file.name.toLowerCase())) {
                continue;
            }
            const key = this.nextKey++;
            const accepted = isAcceptedLocalFile(file);
            this.uploads = [...this.uploads, { key, name: file.name, size: file.size, source: 'local', status: accepted ? 'uploading' : 'error', file }];
            if (accepted) {
                this.startUpload(key, file);
            }
        }
    }

    private startUpload(key: number, file: File): void {
        this.patchUpload(key, { status: 'uploading', document: undefined });
        this.subscriptions.add(
            this.radication.upload(file).subscribe({
                next: (document) => this.patchUpload(key, { status: 'uploaded', document }),
                error: (error: unknown) => {
                    console.error('[medical-records] radication upload failed', error);
                    this.patchUpload(key, { status: 'error' });
                },
            })
        );
    }

    private patchUpload(key: number, patch: Partial<RadicationUpload>): void {
        this.uploads = this.uploads.map((upload) => (upload.key === key ? { ...upload, ...patch } : upload));
    }

    private clearErrors(): void {
        this.startError = null;
        this.startErrorDetail = null;
        this.startErrorFields = [];
        this.stepError = null;
        this.stepErrorDetail = null;
    }

    private setStepError(error: unknown): void {
        const failure = error instanceof RadicationStepFailure ? error : new RadicationStepFailure('INTAKE_FAILED', describeAutomateError(error));
        this.stepError = failure.code;
        this.stepErrorDetail = formatAutomateDetail(failure.detail);
    }

    private stopPolling(): void {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }
}

/** Status, code, message and fields from Automate, or `null` when there is nothing concrete to show. */
function formatAutomateDetail(detail: AutomateErrorDetail | null): string | null {
    if (!detail) {
        return null;
    }
    const text = [detail.status ? `HTTP ${detail.status}` : '', detail.code ?? '', detail.message ?? '', detail.fields.length ? detail.fields.join(', ') : '']
        .filter(Boolean)
        .join(' · ');
    return text || null;
}

function documentName(document: RadicationDocument): string {
    const source = isPendingDocument(document) ? document.document : document;
    return String(source?.sys_name ?? source?.sys_title ?? source?.sys_id ?? '—');
}
