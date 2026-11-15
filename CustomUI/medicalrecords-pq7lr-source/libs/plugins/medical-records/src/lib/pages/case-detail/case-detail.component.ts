import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CASE_DETAIL_DATA } from './case-detail-data.provider';
import { CaseDetail, CaseDocument, ScoreSummary } from './case-detail.model';
import { CaseDocumentViewerComponent } from './case-document-viewer.component';
import { Subscription, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ProcessVariablesService } from '../../dashboard/services/process-variables.service';
import { BatchStateCaseDetailProvider, parseBatchState } from './batch-state-case-detail.provider';
import { summarizeCase } from './case-score';
import { CaseTabTarget, pickKnown, readCaseRouteContext } from './utils/case-navigation.util';
import { buildCaseAccountView, CaseAccountSummary, CaseInvoiceMode, CaseInvoiceOption, resolveInvoiceSelection } from './utils/case-invoice.util';
import { PatientKey } from '../../idp/idp-account-mapping.util';

type MainTabId = 'summary' | 'requests' | 'tasks' | 'documents' | 'returns' | 'guidelines' | 'timeline' | 'audit';
type SubTabId = 'clinical' | 'documents' | 'score' | 'audit';

/** Patient data shown under the invoice, in this order (from the IDP account mapping). */
const PATIENT_FACTS: PatientKey[] = ['identification', 'medicalRecord', 'dateOfBirth', 'age', 'sex', 'affiliateNumber', 'admissionDate', 'dischargeDate', 'diagnosis'];

interface TabItem<T extends string> {
    id: T;
    labelKey: string;
    icon: string;
}

const I18N = 'MEDICAL_RECORDS.CASE_DETAIL';

/**
 * Case detail view (demo, read-only v1). Data comes from CASE_DETAIL_DATA (mock by default).
 * Header actions are visual only and never write Automate variables.
 */
@Component({
    selector: 'medical-records-case-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, CaseDocumentViewerComponent],
    templateUrl: './case-detail.component.html',
    styleUrls: ['./case-detail.component.scss'],
})
export class CaseDetailComponent implements OnInit, OnDestroy {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly provider = inject(CASE_DETAIL_DATA);
    private readonly route = inject(ActivatedRoute, { optional: true });
    private readonly router = inject(Router, { optional: true });
    private readonly processVariables = inject(ProcessVariablesService);
    private routeSubscription?: Subscription;

    loadingCase = false;

    /** Opened from a process: the account identifier replaces the demo data, even while loading. */
    accountMode = false;
    processInstanceId: string | null = null;
    account: CaseAccountSummary | null = null;

    /** Customer invoices of the account (one per patient); `select` waits for the user's choice. */
    invoices: CaseInvoiceOption[] = [];
    invoiceMode: CaseInvoiceMode = 'none';
    selectedInvoice: CaseInvoiceOption | null = null;

    detail: CaseDetail = this.provider.getCase();
    score: ScoreSummary = summarizeCase(this.detail);
    request: CaseDetail['linkedRequests'][number] | undefined = this.detail.linkedRequests[0];

    /** Case data pushed by a host (e.g. the form widget). Falls back to the default provider. */
    @Input() set data(value: CaseDetail | null | undefined) {
        this.detail = value ?? this.provider.getCase();
        this.score = summarizeCase(this.detail);
        this.request = this.detail.linkedRequests[0];
    }

    viewingDocument: CaseDocument | null = null;

    readonly steps = [
        { key: 'OPERATIONS', icon: 'inbox' },
        { key: 'CASE', icon: 'assignment_ind' },
        { key: 'COMPLIANCE', icon: 'fact_check' },
        { key: 'ELIGIBILITY', icon: 'verified_user' },
        { key: 'READINESS', icon: 'speed' },
        { key: 'MEDICAL_REPORT', icon: 'description' },
        { key: 'CONSOLIDATION', icon: 'task_alt' },
    ].map((step) => ({ ...step, labelKey: `${I18N}.STEPS.${step.key}`, current: step.key === 'CASE' }));

    readonly tabs: TabItem<MainTabId>[] = [
        { id: 'summary', icon: 'description', labelKey: `${I18N}.TABS.SUMMARY` },
        { id: 'requests', icon: 'send', labelKey: `${I18N}.TABS.REQUESTS` },
        { id: 'tasks', icon: 'checklist', labelKey: `${I18N}.TABS.TASKS` },
        { id: 'documents', icon: 'folder_open', labelKey: `${I18N}.TABS.DOCUMENTS` },
        { id: 'returns', icon: 'report', labelKey: `${I18N}.TABS.RETURNS` },
        { id: 'guidelines', icon: 'compare_arrows', labelKey: `${I18N}.TABS.GUIDELINES` },
        { id: 'timeline', icon: 'history', labelKey: `${I18N}.TABS.TIMELINE` },
        { id: 'audit', icon: 'task_alt', labelKey: `${I18N}.TABS.AUDIT` },
    ];

    readonly subTabs: TabItem<SubTabId>[] = [
        { id: 'clinical', icon: '', labelKey: `${I18N}.SUBTABS.CLINICAL` },
        { id: 'documents', icon: '', labelKey: `${I18N}.SUBTABS.DOCUMENTS` },
        { id: 'score', icon: '', labelKey: `${I18N}.SUBTABS.SCORE` },
        { id: 'audit', icon: '', labelKey: `${I18N}.SUBTABS.AUDIT` },
    ];

    readonly timelineFilters = [
        'ALL', 'REQUESTS', 'TASKS', 'PENDING', 'DOCUMENTS', 'RECORD', 'ANALYSES', 'GUIDELINES', 'PAYER', 'SLA', 'CHANGES', 'SYSTEM',
    ];
    readonly auditColumns = ['DATE', 'ACTION', 'OWNER', 'ORIGIN', 'CHANGE'];
    readonly documentColumns = ['CATEGORY', 'DOCUMENT', 'CLASSIFICATION', 'DATE', 'ORIGIN', 'REFERENCE', 'ACTIONS'];

    activeTimelineFilter = 'ALL';

    activeTab: MainTabId = 'summary';
    activeSubTab: SubTabId = 'score';

    readonly i18n = I18N;

    /**
     * Opened from a task (query params from the patient row): load the process variables and
     * show real documents from batchState; land on the requested tab. An account with a single
     * customer invoice opens it directly; with several, the invoice selector comes first and the
     * choice travels in the `invoice` query param. Without params it stays on the demo data.
     */
    ngOnInit(): void {
        this.routeSubscription = this.route?.queryParamMap
            .pipe(
                map((params) => readCaseRouteContext((key) => params.get(key))),
                tap((context) => {
                    this.applyTarget(context.target);
                    this.accountMode = !!context.processInstanceId;
                    this.processInstanceId = context.processInstanceId;
                }),
                switchMap((context) => {
                    if (!context.processInstanceId) {
                        return of(null);
                    }
                    this.loadingCase = true;
                    return this.processVariables
                        .fetchVariables(context.processInstanceId)
                        .pipe(map((variables) => ({ variables, invoiceKey: context.invoiceKey })));
                })
            )
            .subscribe((result) => {
                this.loadingCase = false;
                if (!result?.variables) {
                    return;
                }
                const batchState = parseBatchState(result.variables['batchState']);
                const view = buildCaseAccountView(batchState);
                this.account = view.account;
                const selection = resolveInvoiceSelection(view.invoices, result.invoiceKey);
                this.invoices = selection.options;
                this.invoiceMode = selection.mode;
                this.selectedInvoice = selection.selected;
                this.data = new BatchStateCaseDetailProvider(batchState, selection.selected).getCase();
            });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
    }

    /** Short process id used as the account reference until Automate provides a business key. */
    get accountReference(): string | null {
        return this.processInstanceId ? this.processInstanceId.slice(0, 8) : null;
    }

    /** Demographics of the selected invoice's patient that have a value. */
    get patientFacts(): Array<{ labelKey: string; value: string }> {
        const patient = this.selectedInvoice?.patient;
        if (!patient) {
            return [];
        }
        return PATIENT_FACTS.filter((key) => !!patient[key]).map((key) => ({
            labelKey: `${I18N}.PATIENT_FACTS.${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`,
            value: patient[key] as string,
        }));
    }

    /** Several invoices and none chosen yet: show the selector instead of the case. */
    get awaitingInvoice(): boolean {
        return this.invoiceMode === 'select' && !this.selectedInvoice;
    }

    /** Navigates so the browser back button returns to the selector. */
    selectInvoice(key: string | null): void {
        this.router?.navigate([], { relativeTo: this.route ?? undefined, queryParams: { invoice: key }, queryParamsHandling: 'merge' });
    }

    onInvoiceChange(event: Event): void {
        this.selectInvoice((event.target as HTMLSelectElement).value || null);
    }

    private applyTarget(target: CaseTabTarget | null): void {
        const tab = pickKnown(target?.tab, this.tabs.map((item) => item.id));
        if (tab) {
            this.activeTab = tab;
        }
        const sub = pickKnown(target?.subTab, this.subTabs.map((item) => item.id));
        if (sub) {
            this.activeSubTab = sub;
        }
    }

    openDocument(doc: CaseDocument): void {
        if (doc.nodeId) {
            this.viewingDocument = doc;
        }
    }

    closeDocument(): void {
        this.viewingDocument = null;
    }

    selectTab(id: MainTabId): void {
        this.activeTab = id;
    }

    selectSubTab(id: SubTabId): void {
        this.activeSubTab = id;
    }

    onTabKeydown(event: KeyboardEvent): void {
        this.moveFocus(event, this.tabs, this.activeTab, 'case-tab-', (id) => this.selectTab(id));
    }

    onSubTabKeydown(event: KeyboardEvent): void {
        this.moveFocus(event, this.subTabs, this.activeSubTab, 'case-subtab-', (id) => this.selectSubTab(id));
    }

    /** Arrow/Home/End navigation with automatic activation (WAI-ARIA tabs pattern). */
    private moveFocus<T extends string>(
        event: KeyboardEvent,
        items: TabItem<T>[],
        current: T,
        prefix: string,
        select: (id: T) => void
    ): void {
        const index = items.findIndex((item) => item.id === current);
        let next = index;
        switch (event.key) {
            case 'ArrowRight':
                next = (index + 1) % items.length;
                break;
            case 'ArrowLeft':
                next = (index - 1 + items.length) % items.length;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = items.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        select(items[next].id);
        this.host.nativeElement.querySelector<HTMLElement>(`#${prefix}${items[next].id}`)?.focus();
    }
}
