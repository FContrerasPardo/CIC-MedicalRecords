import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ProcessVariablesService } from '../../dashboard/services/process-variables.service';
import { BatchStateSource } from '../../form-widgets/intake-account-widget/batch-state.model';
import { parseBatchState } from './batch-state-case-detail.provider';
import { readCaseRouteContext, resolveWorkspaceTab, WorkspaceTabId } from './utils/case-navigation.util';
import { buildCaseAccountView, CaseAccountSummary, CaseInvoiceMode, CaseInvoiceOption, resolveInvoiceSelection } from './utils/case-invoice.util';
import { resolveAccountReference } from './utils/case-account-validation.util';
import { InvoiceWorkspaceComponent } from './invoice-workspace/invoice-workspace.component';


const I18N = 'MEDICAL_RECORDS.CASE_DETAIL';

/**
 * Medical account view of the ARS: the provider's account (who bills, who pays, invoices,
 * documents, total and status) and, for the selected customer invoice, the invoice and patient
 * workspace (Intake, Analysis, Audit and glosas). Opened from the dashboard with the process
 * instance in the route; inside a task form the host passes batchState directly.
 */
@Component({
    selector: 'medical-records-case-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, InvoiceWorkspaceComponent],
    templateUrl: './case-detail.component.html',
    styleUrls: ['./case-detail.component.scss'],
})
export class CaseDetailComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute, { optional: true });
    private readonly router = inject(Router, { optional: true });
    private readonly processVariables = inject(ProcessVariablesService);
    private routeSubscription?: Subscription;

    readonly i18n = I18N;

    loadingCase = false;
    /** Opened from a process (route) or with a batchState from a host form. */
    accountMode = false;
    processInstanceId: string | null = null;
    account: CaseAccountSummary | null = null;

    /** Customer invoices of the account (one per patient); `select` waits for the user's choice. */
    invoices: CaseInvoiceOption[] = [];
    invoiceMode: CaseInvoiceMode = 'none';
    selectedInvoice: CaseInvoiceOption | null = null;
    initialTab: WorkspaceTabId | null = null;

    /** Process variables and batchState of the account, handed to the invoice workspace (#147). */
    processVariablesSnapshot: Record<string, unknown> = {};
    batchState: BatchStateSource | null = null;
    private requestedInvoiceKey: string | null = null;

    /** Host form (case-detail widget): the account comes from its batchState, without a process. */
    @Input() set batchStateSource(value: BatchStateSource | null | undefined) {
        if (this.processInstanceId) {
            return;
        }
        this.applyAccount({ batchState: value ?? null }, this.requestedInvoiceKey);
    }

    /**
     * Opened from a task (query params from the patient row): load the process variables and build
     * the account from batchState. An account with a single customer invoice opens it directly; with
     * several, the invoice selector comes first and the choice travels in the `invoice` query param.
     */
    ngOnInit(): void {
        this.routeSubscription = this.route?.queryParamMap
            .pipe(
                map((params) => readCaseRouteContext((key) => params.get(key))),
                tap((context) => {
                    this.initialTab = resolveWorkspaceTab(context.target);
                    this.requestedInvoiceKey = context.invoiceKey;
                    if (context.processInstanceId) {
                        this.accountMode = true;
                        this.processInstanceId = context.processInstanceId;
                    }
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
                if (!result) {
                    return;
                }
                this.loadingCase = false;
                this.applyAccount(result.variables ?? {}, result.invoiceKey);
            });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
    }

    /** Radication number (`MedRecNum`) or account variable; the short process id until Automate provides one. */
    get accountReference(): string | null {
        if (!this.processInstanceId) {
            return null;
        }
        const reference = resolveAccountReference(this.processVariablesSnapshot, [], this.processInstanceId);
        return reference.kind === 'account' ? reference.value : this.processInstanceId.slice(0, 8);
    }

    /** Several invoices and none chosen yet: show the selector instead of the workspace. */
    get awaitingInvoice(): boolean {
        return this.invoiceMode === 'select' && !this.selectedInvoice;
    }

    /** From a process it navigates, so the browser back button returns to the selector; in a host form it stays local. */
    selectInvoice(key: string | null): void {
        if (!this.router || !this.processInstanceId) {
            this.applySelection(this.invoices, key);
            return;
        }
        this.router.navigate([], { relativeTo: this.route ?? undefined, queryParams: { invoice: key }, queryParamsHandling: 'merge' });
    }

    onInvoiceChange(event: Event): void {
        this.selectInvoice((event.target as HTMLSelectElement).value || null);
    }

    private applyAccount(variables: Record<string, unknown>, invoiceKey: string | null): void {
        const batchState = parseBatchState(variables['batchState']);
        this.processVariablesSnapshot = variables;
        this.batchState = batchState;
        this.accountMode = this.accountMode || !!batchState;
        if (!batchState) {
            this.account = null;
            this.applySelection([], null);
            return;
        }
        const view = buildCaseAccountView(batchState);
        this.account = view.account;
        this.applySelection(view.invoices, invoiceKey);
    }

    private applySelection(options: CaseInvoiceOption[], invoiceKey: string | null): void {
        const selection = resolveInvoiceSelection(options, invoiceKey);
        this.invoices = selection.options;
        this.invoiceMode = selection.mode;
        this.selectedInvoice = selection.selected;
    }
}
