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
import { agreementAliases, normalizeProviderName, resolveAgreementForProvider } from '../agreements/store/agreement-store.util';
import { mapBatchStateToCaseDocuments, parseBatchState } from '../case-detail/batch-state-case-detail.provider';
import { CaseDocument } from '../case-detail/case-detail.model';
import { CaseDocumentViewerComponent } from '../case-detail/case-document-viewer.component';
import { buildCaseAccountView, CaseAccountView, CaseInvoiceOption } from '../case-detail/utils/case-invoice.util';
import { RadicationDocument, RadicationProcessService, RadicationStartFailure, RadicationStepErrorCode, RadicationStepFailure } from './radication-process.service';
import { RadicationStageArtComponent } from './radication-stage-art.component';
import { provideMockExternalVerificationAdapters } from './external-checks/external-verification.adapters';
import { ExternalChecksContext, RadicationExternalChecksComponent } from './external-checks/radication-external-checks.component';
import { AutomateErrorDetail, describeAutomateError, StartFieldCheck } from './utils/radication-diagnostics.util';
import { buildProviderFindingComments, MAX_COMMENT_LENGTH, parseProviderFindingComments, PROVIDER_FINDING_COMMENTS_VARIABLE, ProviderFindingComments } from './utils/radication-intake.util';
import { generateRadicationNumber, isValidRadicationNumber } from './utils/radication-number.util';
import { PolicySource } from './policy/preanalysis-policy-repository.service';
import { RadicationPolicyDialogComponent } from './policy/radication-policy-dialog.component';
import { buildPolicyView, chooseLocalizedPolicy, PolicyView, PreanalysisPolicy } from './utils/radication-policy.util';
import { AgreementContentLanguage, resolveContentLanguage } from '../agreements/store/agreement-locale.util';
import { agreementTemplateFile, templateAgreementsIndex, templateTranslations } from '../agreements/store/agreement-templates';
import {
    agreementDisplayName,
    buildProviderOptions,
    buildRequiredDocumentsSummary,
    chooseLocalizedChecklist,
    defaultProviderOption,
    ProviderOption,
    ProviderOptionDetails,
    RequiredDocumentsSummary,
} from './utils/radication-provider.util';
import { buildRadicationPreanalysis, PreanalysisFinding, PreanalysisStatus, RadicationPreanalysis } from './utils/radication-preanalysis.util';
import {
    agentReviewStatus,
    AgentReviewRow,
    agentRowsAsFindings,
    FindingSection,
    parseAgentReview,
    receivedDocumentRows,
    agentRuleViews,
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
import {
    canVisitRadicationStep,
    furthestStep,
    RADICATION_STEPS,
    RadicationStep,
    radicationStepIndex,
    RadicationStepperState,
    RadicationStepState,
    radicationStepState,
} from './utils/radication-steps.util';

const I18N = 'MEDICAL_RECORDS.RADICATION';
const POLL_INTERVAL_MS = 4000;
const POLL_LIMIT = 150;


/**
 * One row of the review table: a finding of the agent's pre-analysis (`preanalysisResult`) or, when
 * the agent result is absent, of the deterministic checklist; with its documents for the viewer.
 */
export interface RadicationReviewRow {
    finding: PreanalysisFinding;
    agent: AgentReviewRow | null;
    documents: CaseDocument[];
}

/** Auto-save state of one row's comment. */
type CommentSaveState = 'saving' | 'saved' | 'error';

const COMMENT_DEBOUNCE_MS = 1200;
/** Pause on the completed consolidation stage before the review opens. */
const CONSOLIDATION_PAUSE_MS = 900;

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
        RadicationPolicyDialogComponent,
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
    readonly fileIssues: RadicationIssue[] = ['FILE_TYPE', 'FILE_SIZE', 'FILE_DUPLICATE', 'UPLOADS_PENDING', 'UPLOADS_FAILED'];

    private currentStep: RadicationStep = 'upload';
    /** Furthest step reached: the stepper opens it and every step before it. */
    reachedStep: RadicationStep = 'upload';

    /** Current step; entering a step also makes it reachable from the stepper. */
    get step(): RadicationStep {
        return this.currentStep;
    }

    set step(value: RadicationStep) {
        this.currentStep = value;
        this.reachedStep = furthestStep(this.reachedStep, value);
    }

    /**
     * A processing round runs (after the start or new documents) until the review is ready. Its
     * polling goes on even when the user looks at another step from the stepper.
     */
    private processingRound = false;
    /**
     * The round may open the review by itself (the user stayed on, or came back to, the processing
     * step). Leaving it from the stepper disarms it. The review never moves to the summary by itself.
     */
    private autoAdvance = false;
    uploadMode: UploadMode = 'new';
    /** Documents sent with the account (every round), shown read only when going back to step 1. */
    sentUploads: RadicationUploadItem[] = [];

    /** Generated when the form opens and shown read only, like CIC-Fin's application number. */
    radicationNumber = '';
    providerName = '';
    /** Providers of the agreements index; `failed` falls back to the free-text field with a notice. */
    providerOptions: ProviderOption[] = [];
    providerOptionsState: 'loading' | 'ready' | 'failed' = 'loading';
    /** Agreement of the provider chosen in step 1 (selector, or the free text matched in the index). */
    selectedAgreementId: string | null = null;
    /** Documents the chosen provider's agreement requires (UI language), and its load. */
    requirements: RequiredDocumentsSummary | null = null;
    requirementsState: 'idle' | 'loading' | 'ready' | 'empty' = 'idle';
    requirementsAgreementName: string | null = null;
    private requirementsToken = 0;
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
    /** The account's invoices were read (or could not be): the external verifications may start with them. */
    accountContextReady = false;
    /** Every external verification showed its result (animation included). */
    externalChecksDone = false;
    /** The review data (agent result, checklist) is loaded while Intake is open. */
    reviewDataReady = false;
    /** Consolidation finished: the review opens after a short pause. */
    consolidated = false;

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
    /**
     * Pre-analysis policy shown for this account's review, in the UI language
     * (`preanalysis-policy.<lang>.json`, else the base translated, else the bundled template in that language).
     * The Automate agent keeps reading the base file.
     */
    policy: PreanalysisPolicy | null = null;
    policySource: PolicySource | null = null;
    policyView: PolicyView | null = null;
    /** Some policy texts are shown in the base language (no version in the UI language). */
    policyBaseLanguageShown = false;
    /** Agreement whose policy is shown, and the latest load (a newer language or agreement wins). */
    private policyAgreementId: string | null = null;
    private policyLoadToken = 0;
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
    /** Auto-save state and error detail per finding id. */
    commentSaveState: Record<string, CommentSaveState> = {};
    commentSaveError: Record<string, string | null> = {};
    private commentTimers = new Map<string, ReturnType<typeof setTimeout>>();
    /** Saves run one after another (the Intake form is saved whole). */
    private saveQueue: Promise<void> = Promise.resolve();
    /** Invoice keys the review table is filtered by; empty = all. */
    selectedInvoiceKeys = new Set<string>();
    policyDialogOpen = false;
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
        void this.loadProviderOptions();
        // The policy and the step-1 requirements are shown in the UI language: reload them when it changes.
        this.subscriptions.add(
            this.translate.onLangChange.subscribe(() => {
                void this.loadLocalizedPolicy();
                void this.loadRequirements(this.selectedAgreementId);
            })
        );
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
        this.commentTimers.forEach((timer) => clearTimeout(timer));
        this.commentTimers.clear();
    }

    // ── Stepper ──────────────────────────────────────────────────────────────

    stepIndex(step: RadicationStep = this.step): number {
        return radicationStepIndex(step);
    }

    /** While a processing round runs (new documents included), the review and summary wait for it. */
    private get availableStep(): RadicationStep {
        return this.processingRound && this.stepIndex(this.reachedStep) > this.stepIndex('processing') ? 'processing' : this.reachedStep;
    }

    private get stepperState(): RadicationStepperState {
        return { current: this.step, reached: this.availableStep, radicated: this.radicated, busy: this.sending || this.deciding };
    }

    stepState(step: RadicationStep): RadicationStepState {
        return radicationStepState(step, this.stepperState);
    }

    canVisitStep(step: RadicationStep): boolean {
        return canVisitRadicationStep(step, this.stepperState);
    }

    /**
     * Stepper navigation: shows a step already reached, as it is. Nothing is restarted or sent; step 1
     * shows the documents already sent in read only. Only coming back to "Process" while its round
     * still runs lets the review open by itself again.
     */
    goToStep(step: RadicationStep): void {
        if (!this.canVisitStep(step)) {
            return;
        }
        this.autoAdvance = step === 'processing' && this.processingRound;
        this.step = step;
        if (step === 'processing' && this.processingRound) {
            // Resumes the round's polling and the consolidation that may have finished meanwhile.
            this.maybeConsolidate();
            this.refresh();
        }
    }

    /** Step 1 after the account was sent: the documents sent, read only (the account is not restarted). */
    get uploadLocked(): boolean {
        return !!this.processInstanceId;
    }

    /** Back to the furthest step reached, from the read-only step 1. */
    returnToFlow(): void {
        this.goToStep(this.availableStep);
    }

    // ── Step 1: load ─────────────────────────────────────────────────────────

    /** The chosen option of the selector (`null` without one or in free-text mode). */
    get selectedProvider(): ProviderOption | null {
        return this.providerOptions.find((option) => option.agreementId === this.selectedAgreementId) ?? null;
    }

    /**
     * Providers of the agreements index (provider name and the aliases of each `agreement.json`).
     * With a single agreement it is preselected. If the index cannot be read, or lists no provider,
     * the field goes back to free text with a notice. Only a help for the provider: the ARS confirms
     * the agreement with the provider extracted from the invoice.
     */
    private async loadProviderOptions(): Promise<void> {
        this.providerOptionsState = 'loading';
        try {
            const entries = (await this.agreementRepository.loadIndex()).index.agreements;
            const language = this.contentLanguage();
            const files = await Promise.all(entries.map((entry) => this.agreementRepository.loadLocalizedFile(entry.agreementId, 'agreement', language).catch(() => null)));
            const details: Record<string, ProviderOptionDetails> = {};
            entries.forEach((entry, position) => {
                const content = files[position]?.content ?? agreementTemplateFile(entry.agreementId, 'agreement', language);
                const general = (content['general'] ?? {}) as Record<string, unknown>;
                details[entry.agreementId] = {
                    aliases: agreementAliases(content),
                    contractId: typeof general['contractId'] === 'string' ? general['contractId'] : null,
                    payer: typeof general['payer'] === 'string' ? general['payer'] : null,
                };
            });
            if (this.destroyed) {
                return;
            }
            this.providerOptions = buildProviderOptions(entries, details);
            this.providerOptionsState = this.providerOptions.length ? 'ready' : 'failed';
        } catch {
            if (this.destroyed) {
                return;
            }
            this.providerOptions = [];
            this.providerOptionsState = 'failed';
        }
        this.applyDefaultProvider();
    }

    /** Preselects the only agreement of a new radication. */
    private applyDefaultProvider(): void {
        const option = defaultProviderOption(this.providerOptions);
        if (option && this.uploadMode === 'new' && !this.selectedAgreementId && !this.providerName.trim()) {
            this.selectProvider(option.agreementId);
        }
    }

    selectProvider(agreementId: string | null): void {
        const option = this.providerOptions.find((candidate) => candidate.agreementId === agreementId) ?? null;
        this.selectedAgreementId = option?.agreementId ?? null;
        this.providerName = option?.providerName ?? '';
        void this.loadRequirements(this.selectedAgreementId);
    }

    /** Free-text fallback: the typed name is matched as the review does (bundled index, aliases included). */
    onFreeTextProvider(): void {
        if (this.uploadMode !== 'new') {
            return;
        }
        const entries = templateAgreementsIndex().agreements;
        const aliases = Object.fromEntries(entries.map((entry) => [entry.agreementId, agreementAliases(agreementTemplateFile(entry.agreementId, 'agreement'))]));
        const resolution = this.providerName.trim() ? resolveAgreementForProvider(entries, this.providerName, aliases) : null;
        this.selectedAgreementId = resolution?.matched ? (resolution.entry?.agreementId ?? null) : null;
        void this.loadRequirements(this.selectedAgreementId);
    }

    /**
     * Checklist and pre-analysis policy of the agreement in the UI language, with the review's order:
     * the language version, else the base translated, else the bundled template. Without an
     * agreement the card invites the provider to choose one.
     */
    private async loadRequirements(agreementId: string | null): Promise<void> {
        const token = ++this.requirementsToken;
        if (!agreementId) {
            this.requirements = null;
            this.requirementsAgreementName = null;
            this.requirementsState = 'idle';
            return;
        }
        this.requirementsState = 'loading';
        const language = this.contentLanguage();
        const translations = templateTranslations();
        const choose = async <T>(kind: 'preanalysisPolicy' | 'documentationChecklist', pick: (input: Parameters<typeof chooseLocalizedChecklist>[0]) => T): Promise<T> => {
            const template = agreementTemplateFile(agreementId, kind, language);
            try {
                const file = await this.agreementRepository.loadLocalizedFile(agreementId, kind, language);
                return pick({
                    language,
                    variant: file.localized ? file.content : file.variantDocumentId ? null : undefined,
                    base: file.missingLanguage ? file.content : null,
                    template,
                    translations,
                });
            } catch {
                return pick({ language, base: null, template, translations });
            }
        };
        const [policy, checklist] = await Promise.all([
            choose('preanalysisPolicy', (input) => chooseLocalizedPolicy(input).policy),
            choose('documentationChecklist', (input) => chooseLocalizedChecklist(input)),
        ]);
        if (token !== this.requirementsToken || this.destroyed) {
            return;
        }
        const option = this.providerOptions.find((candidate) => candidate.agreementId === agreementId);
        const entry = templateAgreementsIndex().agreements.find((candidate) => candidate.agreementId === agreementId);
        this.requirementsAgreementName = option ? agreementDisplayName(option) : entry ? agreementDisplayName({ ...entry, contractId: '' }) : agreementId;
        this.requirements = buildRequiredDocumentsSummary(policy, checklist);
        this.requirementsState = this.requirements ? 'ready' : 'empty';
    }

    private contentLanguage(): AgreementContentLanguage {
        return resolveContentLanguage(this.translate.currentLang || this.translate.defaultLang);
    }

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
            this.sentUploads = [
                ...this.sentUploads,
                ...this.uploads.filter((upload) => !!upload.document).map(({ name, size, source }): RadicationUploadItem => ({ name, size, source, status: 'uploaded' })),
            ];
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

    /**
     * Stages as shown: the pre-analysis is done only when the agent finished and every external
     * verification showed its result; then "Consolidation / Ready for review" (the Intake stage) runs and
     * completes only once the review data is loaded. The review cannot open before that.
     */
    get processingStages(): RadicationStageView[] {
        return (this.progress?.stages ?? [])
            .filter((stage) => RADICATION_PROCESSING_STAGES.includes(stage.key))
            .map((stage) => ({ key: stage.key, state: this.displayedStageState(stage) }));
    }

    /** The pre-analysis agent finished in the runtime (the external verifications may still be running). */
    get preanalysisRuntimeDone(): boolean {
        return this.progress?.stages.find((stage) => stage.key === 'preanalysis')?.state === 'done';
    }

    /** Label of a processing stage: the Intake stage is shown as the consolidation. */
    stageLabelKey(stage: RadicationStageView): string {
        return stage.key === 'intake' ? `${I18N}.PROVIDER_FLOW.CONSOLIDATION` : `${I18N}.PROGRESS.${stage.key.toUpperCase()}`;
    }

    stageHintKey(stage: RadicationStageView): string {
        if (stage.key === 'intake') {
            return `${I18N}.PROVIDER_FLOW.CONSOLIDATION_HINT`;
        }
        if (stage.key === 'preanalysis' && this.preanalysisRuntimeDone && !this.externalChecksDone) {
            return `${I18N}.PROVIDER_FLOW.WAITING_CHECKS`;
        }
        return `${I18N}.PROGRESS.${stage.key.toUpperCase()}_HINT`;
    }

    onExternalChecksSettled(): void {
        // Emitted from the child's effect: update the page outside that change detection pass.
        setTimeout(() => {
            if (this.destroyed) {
                return;
            }
            this.externalChecksDone = true;
            this.maybeConsolidate();
        });
    }

    private displayedStageState(stage: RadicationStageView): RadicationStageState {
        if (stage.state === 'error') {
            return 'error';
        }
        if (stage.key === 'preanalysis' && stage.state === 'done') {
            return this.externalChecksDone ? 'done' : 'active';
        }
        if (stage.key === 'intake') {
            if (this.consolidated) {
                return 'done';
            }
            return this.preanalysisRuntimeDone && this.externalChecksDone ? 'active' : 'pending';
        }
        return stage.state;
    }

    /**
     * Consolidation completes when the verifications finished and the agent's result is loaded; then,
     * after a short pause, the review becomes available and opens if the user is on the processing step.
     */
    private maybeConsolidate(): void {
        if (!this.processingRound || this.consolidated || !this.reviewDataReady || !this.externalChecksDone) {
            return;
        }
        this.consolidated = true;
        setTimeout(() => {
            if (!this.destroyed && this.processingRound && this.consolidated) {
                this.reviewReached();
            }
        }, CONSOLIDATION_PAUSE_MS);
    }

    /**
     * Ends the processing round: the review is reachable from the stepper and keeps its upload zone
     * ready for more documents of the same account. It opens only when the round may advance (the
     * user is on "Process"); this is the only automatic step change, and never goes past the review.
     */
    private reviewReached(): void {
        this.processingRound = false;
        this.uploadMode = 'more';
        this.uploads = [];
        this.submitAttempted = false;
        this.reachedStep = furthestStep(this.reachedStep, 'review');
        if (this.autoAdvance && this.step === 'processing') {
            this.step = 'review';
        }
        this.autoAdvance = false;
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
        const rows = this.visibleReviewRows;
        return rows.length > 0 && rows.every((row) => this.expandedRows.has(row.finding.id));
    }

    toggleAllRows(): void {
        this.expandedRows = this.allRowsExpanded ? new Set() : new Set(this.visibleReviewRows.map((row) => row.finding.id));
    }

    // Invoice / patient filter: one or several cards; none selected = every row.

    /** Rows of the selected invoices; account-level rows (no invoice) only show without a filter. */
    get visibleReviewRows(): RadicationReviewRow[] {
        if (!this.selectedInvoiceKeys.size) {
            return this.reviewRows;
        }
        return this.reviewRows.filter((row) => !!row.finding.invoiceKey && this.selectedInvoiceKeys.has(row.finding.invoiceKey));
    }

    isInvoiceSelected(key: string): boolean {
        return this.selectedInvoiceKeys.has(key);
    }

    toggleInvoiceFilter(key: string): void {
        const next = new Set(this.selectedInvoiceKeys);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        this.selectedInvoiceKeys = next;
    }

    clearInvoiceFilter(): void {
        this.selectedInvoiceKeys = new Set();
    }

    /** Findings that do not comply, per invoice (shown on its filter card). */
    invoiceOpenCount(key: string): number {
        return this.reviewRows.filter((row) => row.finding.invoiceKey === key && this.rowStatus(row) !== 'pass').length;
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

    /** Status column: only "Compliant" or "Non-compliant"; "Needs attention" does not comply. */
    rowCompliant(row: RadicationReviewRow): boolean {
        return this.rowStatus(row) === 'pass';
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
        if (!this.visibleReviewRows.includes(row)) {
            this.clearInvoiceFilter();
        }
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

    // Comments save themselves: after a pause in typing, when the field loses focus and before Continue.
    // Each row shows "Saving…", "Saved" or its error with a retry, instead of a save button.

    /** The typed comment differs from the saved one. */
    commentDirty(row: RadicationReviewRow): boolean {
        return (this.comments[row.finding.id] ?? '').trim() !== (this.savedComments[row.finding.id] ?? '');
    }

    onCommentChange(row: RadicationReviewRow): void {
        const id = row.finding.id;
        this.clearCommentTimer(id);
        if (this.commentSaveState[id] && this.commentSaveState[id] !== 'saving') {
            const next = { ...this.commentSaveState };
            delete next[id];
            this.commentSaveState = next;
        }
        this.commentTimers.set(
            id,
            setTimeout(() => void this.autoSaveComment(row), COMMENT_DEBOUNCE_MS)
        );
    }

    onCommentBlur(row: RadicationReviewRow): void {
        void this.autoSaveComment(row);
    }

    retryComment(row: RadicationReviewRow): void {
        void this.autoSaveComment(row);
    }

    /** Queues the row's save when its comment changed; resolves `false` when it could not be saved. */
    autoSaveComment(row: RadicationReviewRow): Promise<boolean> {
        this.clearCommentTimer(row.finding.id);
        if (!this.processInstanceId || !this.commentDirty(row)) {
            return Promise.resolve(true);
        }
        const run = this.saveQueue.then(() => this.saveRowComment(row));
        this.saveQueue = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    /** Saves every pending comment (Continue waits for it); `false` when one failed. */
    async flushComments(): Promise<boolean> {
        const pending = this.reviewRows.filter((row) => this.commentDirty(row) || this.commentTimers.has(row.finding.id));
        const results = await Promise.all(pending.map((row) => this.autoSaveComment(row)));
        await this.saveQueue;
        return results.every(Boolean) && !this.reviewRows.some((row) => this.commentSaveState[row.finding.id] === 'error');
    }

    /**
     * Saves one row's comment. Agent rows are annotated in the Intake table `DataTable0hznuv`
     * (CIC-Fin pattern); without that field, for checklist rows, or when the comment was
     * cleared, every comment is saved in `providerFindingComments`.
     */
    private async saveRowComment(row: RadicationReviewRow): Promise<boolean> {
        const id = row.finding.id;
        if (!this.processInstanceId || !this.commentDirty(row)) {
            return true;
        }
        const text = (this.comments[id] ?? '').trim();
        this.commentSaveState = { ...this.commentSaveState, [id]: 'saving' };
        this.commentSaveError = { ...this.commentSaveError, [id]: null };
        try {
            if (row.agent && !row.agent.received && this.agentTableAvailable && text) {
                try {
                    await this.radication.saveAgentReviewComment(this.processInstanceId, row.agent.raw, text);
                    row.agent = { ...row.agent, userComment: text, attended: true, raw: { ...row.agent.raw, UserComment: text, Attended: true } };
                    this.savedComments = { ...this.savedComments, [id]: text };
                } catch (error) {
                    if (!(error instanceof RadicationStepFailure && error.code === 'REVIEW_TABLE_MISSING')) {
                        throw error;
                    }
                    // Recorded in the technical view; the comments keep their previous home.
                    this.agentTableAvailable = false;
                    await this.persistAllComments();
                }
            } else {
                await this.persistAllComments();
            }
            this.commentSaveState = { ...this.commentSaveState, [id]: 'saved' };
            return true;
        } catch (error) {
            const code = error instanceof RadicationStepFailure ? error.code : 'INTAKE_FAILED';
            this.commentSaveState = { ...this.commentSaveState, [id]: 'error' };
            this.commentSaveError = { ...this.commentSaveError, [id]: `${I18N}.STEP_ERRORS.${code}` };
            return false;
        }
    }

    private clearCommentTimer(id: string): void {
        const timer = this.commentTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.commentTimers.delete(id);
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
    private async persistAllComments(): Promise<void> {
        const payload = this.commentsPayload();
        if (!payload || !this.processInstanceId) {
            return;
        }
        await this.radication.saveFindingComments(this.processInstanceId, payload);
        this.savedComments = Object.fromEntries(payload.comments.map((item) => [item.findingId, item.comment]));
    }

    /**
     * Continue of the review: saves the pending comments; with new documents loaded, sends them
     * (Intake "more-documents") and processes the account again; otherwise goes to the confirmation.
     */
    async continueFromReview(): Promise<void> {
        if (!this.preanalysis || this.deciding || this.sending) {
            return;
        }
        if (this.reviewReadOnly) {
            // Intake already completed: nothing to save or send, only the summary to show.
            this.step = 'summary';
            return;
        }
        this.clearErrors();
        this.commentsBlocked = false;
        this.deciding = true;
        let saved = false;
        try {
            saved = await this.flushComments();
        } finally {
            this.deciding = false;
        }
        if (!saved) {
            this.commentsBlocked = true;
            return;
        }
        if (this.uploads.length) {
            await this.submit();
            return;
        }
        this.step = 'summary';
    }

    /** Continue stopped because a comment could not be saved (the row shows why). */
    commentsBlocked = false;

    // ── Step 4: summary (decision, then radicated account) ───────────────────

    /** The account left Intake towards the ARS: the summary shows it as radicated. */
    get radicated(): boolean {
        return this.intakeCompleted || !!this.progress?.afterIntake;
    }

    /**
     * The account already left Intake (radicated here, or past Intake in Automate, e.g. a reopened
     * account): the review is shown read only, with a notice; comments and documents are closed.
     */
    get reviewReadOnly(): boolean {
        return this.radicated;
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

    /** Total billed of the account: the account's own total, else the sum of its invoices; `null` without amounts. */
    get accountTotal(): number | null {
        if (this.account?.account.totalBilled != null) {
            return this.account.account.totalBilled;
        }
        const amounts = (this.account?.invoices ?? []).map((invoice) => invoice.totalBilled).filter((value): value is number => value !== null);
        return amounts.length ? amounts.reduce((sum, value) => sum + value, 0) : null;
    }

    /** Amount in Dominican pesos: "RD$ 12,345.60" (thousands separators, 2 decimals). */
    formatAmount(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return '—';
        }
        return `RD$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /** Date in the language the page is shown in (the date pipe would use the app's English locale). */
    formatDateTime(value: Date | null): string {
        if (!value) {
            return '—';
        }
        const language = this.translate.currentLang || this.translate.defaultLang || 'es';
        try {
            return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
        } catch {
            return value.toISOString();
        }
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
        this.selectedAgreementId = null;
        void this.loadRequirements(null);
        this.email = '';
        this.uploads = [];
        this.submitAttempted = false;
        this.uploadMode = 'new';
        this.applyDefaultProvider();
        this.step = 'upload';
        this.reachedStep = 'upload';
        this.processingRound = false;
        this.autoAdvance = false;
        this.sentUploads = [];
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
        this.commentSaveState = {};
        this.commentSaveError = {};
        this.commentTimers.forEach((timer) => clearTimeout(timer));
        this.commentTimers.clear();
        this.commentsBlocked = false;
        this.selectedInvoiceKeys = new Set();
        this.policyDialogOpen = false;
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
            this.agreementId = resolved.entry?.agreementId ?? null;
            this.agreementName = resolved.entry?.providerName ?? null;
            this.agreementMatched = resolved.matched;
            // `resolved.policy` is the base file (English) the agent reads; the page shows the UI language version.
            this.policyAgreementId = resolved.policy.agreementId;
            await this.loadLocalizedPolicy();
            return;
        } catch {
            if (this.agreementRulesKey !== key) {
                return;
            }
            this.agreementRulesLoad = null;
            this.checklistResult = null;
            this.policyAgreementId = null;
            this.policy = null;
            this.policySource = null;
            this.policyBaseLanguageShown = false;
        }
        this.updatePolicyView();
    }

    /** The agreement's policy in the UI language (es/en/pt; others fall back to English), reloaded on language change. */
    private async loadLocalizedPolicy(): Promise<void> {
        const agreementId = this.policyAgreementId;
        if (!agreementId) {
            return;
        }
        const token = ++this.policyLoadToken;
        const language: AgreementContentLanguage = resolveContentLanguage(this.translate.currentLang || this.translate.defaultLang);
        const template = agreementTemplateFile(agreementId, 'preanalysisPolicy', language);
        let choice = chooseLocalizedPolicy({ language, base: null, template, translations: templateTranslations() });
        let fromAppdata = false;
        try {
            const file = await this.agreementRepository.loadLocalizedFile(agreementId, 'preanalysisPolicy', language);
            choice = chooseLocalizedPolicy({
                language,
                variant: file.localized ? file.content : file.variantDocumentId ? null : undefined,
                base: file.missingLanguage ? file.content : null,
                template,
                translations: templateTranslations(),
            });
            fromAppdata = choice.origin !== 'template';
        } catch {
            // Appdata unreachable: the bundled template in the UI language.
        }
        if (token !== this.policyLoadToken || this.destroyed) {
            return;
        }
        this.policy = choice.policy;
        this.policySource = choice.policy ? (fromAppdata ? 'appdata' : 'default') : null;
        this.policyBaseLanguageShown = choice.baseLanguageShown;
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
        this.processingRound = true;
        this.autoAdvance = true;
        this.progress = deriveRadicationProgress({ processStatus: 'RUNNING', childProcesses: [], tasks: [] });
        this.externalChecksContext = { seed: this.radicationNumber || null, invoiceCount: 1 };
        this.accountContextRequested = false;
        this.accountContextReady = false;
        this.externalChecksDone = false;
        this.reviewDataReady = false;
        this.consolidated = false;
        this.selectedInvoiceKeys = new Set();
        this.uploads = [];
        this.submitAttempted = false;
        this.refresh();
    }

    /** Once IDP finished: the account's invoices from `batchState`, for the external verifications. */
    private async loadAccountContext(): Promise<void> {
        try {
            await this.readAccountContext();
        } finally {
            // With or without invoices, the verifications start now, so step 2 shows what step 3 lists.
            this.accountContextReady = true;
        }
    }

    private async readAccountContext(): Promise<void> {
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
        if (this.processingRound && !this.accountContextRequested && (preanalysisStage?.state === 'active' || preanalysisStage?.state === 'done')) {
            this.accountContextRequested = true;
            void this.loadAccountContext();
        }
        if (this.processingRound && this.progress?.intakeReady) {
            // The review opens only after consolidation: agent result loaded and verifications finished.
            if (!this.reviewDataReady) {
                await this.loadPreanalysis();
                this.reviewDataReady = true;
            }
            this.maybeConsolidate();
            return;
        }
        if (this.processingRound && this.progress?.afterIntake) {
            // Automate already passed Intake (e.g. a reopened account): the review opens read only,
            // with a notice; it never jumps to the summary by itself.
            await this.loadPreanalysis();
            this.reviewDataReady = true;
            this.reviewReached();
        }
        const waiting = this.processingRound || (this.intakeCompleted && !this.progress?.afterIntake && !this.progress?.failed);
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
