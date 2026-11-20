import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { documentSupportLabel } from '../../../../form-widgets/intake-account-widget/batch-state.mapper';
import { IntakeAccountDocumentItemViewModel, IntakeAccountServiceItemViewModel } from '../../../../form-widgets/intake-account-widget/intake-account-view.model';
import { toCaseDocument } from '../../batch-state-case-detail.provider';
import { CaseDocument } from '../../case-detail.model';
import { CaseDocumentViewerComponent } from '../../case-document-viewer.component';
import { CaseRegistration, CaseRegistrationKind } from '../../utils/case-progress.util';
import {
    applyIntakeCriteria,
    billedRowAmounts,
    BilledRowAmounts,
    buildIntakeFindings,
    computeIntakeKpis,
    documentsLinkedToService,
    filterServices,
    groupIntakeServices,
    INTAKE_FILTERS,
    INTAKE_WARNINGS,
    IntakeCriteria,
    IntakeFilter,
    IntakeFindingAction,
    intakeFindingAction,
    IntakeFindingEntry,
    IntakeFindingLike,
    intakeGroupOptions,
    IntakeKpis,
    IntakeServiceGroup,
    IntakeWarning,
    intakeWarningsById,
    isSupported,
    NO_GROUP_KEY,
    originKey,
    PendingSupportClass,
    pendingSupportByClass,
    resolvedIntakeServiceIds,
    ServiceDetailField,
    serviceDetailFields,
    servicesLinkedToDocument,
    servicesMissingDocument,
} from '../../utils/case-intake.util';
import { FindingStatus } from '../audit-findings.util';

const I18N = 'MEDICAL_RECORDS.INVOICE_WORKSPACE.INTAKE_PANEL';

export interface IntakeRegistrationRequest {
    kind: CaseRegistrationKind;
    serviceIds: string[];
    comment: string | null;
}

/** Deletes an analyst record: a registration (progress) or an intake finding (audit). */
export interface IntakeFindingDeleteRequest {
    source: 'registration' | 'audit';
    /** Registration id or audit finding id. */
    id: string;
}

/** Dismisses an agent observation with a justification, as the audit tray does. */
export interface IntakeFindingDismissRequest {
    source: 'audit' | 'analysis';
    findingId: string;
    justification: string;
}

type ServiceGroup = IntakeServiceGroup<IntakeAccountServiceItemViewModel>;

/** Width of the service detail drawer (kept free by the document viewer while the drawer is open). */
const DRAWER_WIDTH = 'min(520px, 100vw)';

/** What narrows the explorer from the right column: a finding or a pending support class. */
interface IntakeFocus {
    kind: 'finding' | 'missing';
    /** Finding entry id or support class label. */
    key: string;
    label: string;
    ids: ReadonlySet<string>;
}

/**
 * Intake of one customer invoice in the case view (#147). Left: indicator strip, filter bar,
 * sticky selection/comment bar and the Service Explorer grouped by service (collapsible groups,
 * selection per group and per item, detail in a side drawer). Right, sticky: Document Control
 * Center (pending support by class, documents) and the Findings panel (intake registrations,
 * audit findings, analysis observations); selecting a finding or a pending class narrows the
 * explorer to its items. Support comes from the documentary coverage only. Registrations and
 * reviewed marks are emitted; the workspace persists them.
 */
@Component({
    selector: 'medical-records-case-intake-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, CaseDocumentViewerComponent],
    templateUrl: './case-intake-panel.component.html',
    styleUrls: ['./case-intake-panel.component.scss'],
})
export class CaseIntakePanelComponent implements OnChanges {
    @Input() services: IntakeAccountServiceItemViewModel[] = [];
    @Input() documents: IntakeAccountDocumentItemViewModel[] = [];
    /** Services the analyst marked as reviewed (persisted progress). */
    @Input() reviewedIds: ReadonlySet<string> = new Set();
    /** Audit status of the finding registered for a service, by service id. */
    @Input() findingStatus: Readonly<Record<string, FindingStatus>> = {};
    @Input() registrations: readonly CaseRegistration[] = [];
    @Input() requestedDocuments: ReadonlySet<string> = new Set();
    /** Findings of this invoice in the audit tray (invoice-audit-store). */
    @Input() auditFindings: readonly IntakeFindingLike[] = [];
    /** Observations of the analysis agents for this invoice (registered or not). */
    @Input() analysisFindings: readonly IntakeFindingLike[] = [];

    @Output() registered = new EventEmitter<IntakeRegistrationRequest>();
    @Output() reviewedChange = new EventEmitter<{ serviceIds: string[]; reviewed: boolean }>();
    @Output() documentRequested = new EventEmitter<string>();
    @Output() findingDeleted = new EventEmitter<IntakeFindingDeleteRequest>();
    @Output() findingDismissed = new EventEmitter<IntakeFindingDismissRequest>();

    readonly i18n = I18N;
    readonly drawerWidth = DRAWER_WIDTH;
    readonly filters = INTAKE_FILTERS;
    readonly warningReasons = INTAKE_WARNINGS;
    readonly noGroupKey = NO_GROUP_KEY;
    readonly supportLabel = (className: string): string => documentSupportLabel(className);

    kpis: IntakeKpis = { documents: 0, services: 0, supported: 0, unsupported: 0, readiness: 100 };
    pendingClasses: PendingSupportClass[] = [];
    groupOptions: Array<{ key: string; label: string | null; count: number }> = [];
    findings: IntakeFindingEntry[] = [];

    // Filters -------------------------------------------------------------------------------------
    filter: IntakeFilter = 'all';
    search = '';
    /** Group of the group filter ('' = all). */
    groupKey = '';
    /** Id of the document chosen in the document filter ('' = all). */
    documentId = '';
    /** Reason of the "With warnings" filter ('' = any reason). */
    warningReason: IntakeWarning | '' = '';
    focus: IntakeFocus | null = null;
    readonly collapsed = new Set<string>();

    readonly selected = new Set<string>();
    bulkComment = '';
    bulkKind: CaseRegistrationKind = 'finding';

    drawerService: IntakeAccountServiceItemViewModel | null = null;
    drawerFields: ServiceDetailField[] = [];
    drawerDocuments: IntakeAccountDocumentItemViewModel[] = [];
    drawerComment = '';
    viewerDocument: CaseDocument | null = null;
    /** Inline confirmation open on one finding card (delete, or dismiss with justification). */
    confirming: { entryId: string; action: Exclude<IntakeFindingAction, null>; text: string } | null = null;

    private readonly translate = inject(TranslateService);
    private amounts = new Map<string, BilledRowAmounts>();
    /** Warnings by service id, computed over the whole invoice (group mismatches included); reviewed or remediated services have none. */
    private warnings = new Map<string, IntakeWarning[]>();
    private documentIds: ReadonlySet<string> | null = null;
    private withFinding: ReadonlySet<string> = new Set();
    private visibleCache: { key: unknown[]; value: IntakeAccountServiceItemViewModel[] } | null = null;
    private groupsCache: { source: IntakeAccountServiceItemViewModel[]; value: ServiceGroup[] } | null = null;

    get linkedDocument(): IntakeAccountDocumentItemViewModel | null {
        return this.documentId ? (this.documents.find((document) => document.id === this.documentId) ?? null) : null;
    }

    get hasActiveFilters(): boolean {
        return this.filter !== 'all' || !!this.search.trim() || !!this.groupKey || !!this.documentId || !!this.focus;
    }

    /** Services after every filter (memoized on the inputs of the criteria). */
    get visibleServices(): IntakeAccountServiceItemViewModel[] {
        const criteria = this.criteria();
        const key: unknown[] = [
            this.services,
            criteria.filter,
            criteria.reviewed,
            criteria.withFinding,
            criteria.search,
            criteria.documentIds,
            criteria.groupKey,
            criteria.focusIds,
            criteria.warnings,
            criteria.warningReason,
        ];
        if (!this.visibleCache || this.visibleCache.key.some((value, index) => value !== key[index])) {
            this.visibleCache = { key, value: applyIntakeCriteria(this.services, criteria) };
        }
        return this.visibleCache.value;
    }

    get visibleGroups(): ServiceGroup[] {
        const visible = this.visibleServices;
        if (this.groupsCache?.source !== visible) {
            this.groupsCache = { source: visible, value: groupIntakeServices(visible) };
        }
        return this.groupsCache.value;
    }

    get allVisibleSelected(): boolean {
        const visible = this.visibleServices;
        return visible.length > 0 && visible.every((service) => this.selected.has(service.id));
    }

    get someVisibleSelected(): boolean {
        return this.visibleServices.some((service) => this.selected.has(service.id)) && !this.allVisibleSelected;
    }

    get drawerIndex(): number {
        return this.drawerService ? this.visibleServices.findIndex((service) => service.id === this.drawerService?.id) : -1;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['services'] || changes['documents']) {
            this.kpis = computeIntakeKpis(this.services, this.documents.length);
            this.pendingClasses = pendingSupportByClass(this.services);
            this.groupOptions = intakeGroupOptions(this.services);
            this.amounts = new Map(this.services.map((service) => [service.id, billedRowAmounts(service)]));
            const ids = new Set(this.services.map((service) => service.id));
            [...this.selected].filter((id) => !ids.has(id)).forEach((id) => this.selected.delete(id));
            if (this.drawerService && !ids.has(this.drawerService.id)) {
                this.closeDrawer();
            }
            if (this.documentId) {
                this.setDocument(this.documentId);
            }
            if (this.groupKey && !this.groupOptions.some((option) => option.key === this.groupKey)) {
                this.groupKey = '';
            }
        }
        if (changes['findingStatus']) {
            this.withFinding = new Set(Object.keys(this.findingStatus ?? {}));
        }
        if (changes['services'] || changes['reviewedIds'] || changes['registrations'] || changes['auditFindings'] || changes['findingStatus']) {
            const resolved = resolvedIntakeServiceIds({
                reviewed: this.reviewedIds,
                registrations: this.registrations,
                findings: this.auditFindings,
                findingStatus: this.findingStatus,
            });
            this.warnings = intakeWarningsById(this.services, resolved);
        }
        if (changes['services'] || changes['registrations'] || changes['auditFindings'] || changes['analysisFindings']) {
            this.findings = buildIntakeFindings(this.services, this.registrations, this.auditFindings, this.analysisFindings);
            this.refreshFocus();
            if (this.confirming && !this.findings.some((entry) => entry.id === this.confirming?.entryId)) {
                this.confirming = null;
            }
        }
    }

    /** Quantity, unit price and total of a row (Total, else Price x Quantity; quantity 1 when not detected). */
    amountsOf(service: IntakeAccountServiceItemViewModel): BilledRowAmounts {
        return this.amounts.get(service.id) ?? billedRowAmounts(service);
    }

    isSupported(service: IntakeAccountServiceItemViewModel): boolean {
        return isSupported(service);
    }

    filterLabelKey(filter: IntakeFilter): string {
        return `${I18N}.FILTER.${originKey(filter)}`;
    }

    countFor(filter: IntakeFilter): number {
        return filterServices(this.services, filter, this.reviewedIds, null, this.withFinding, this.warnings).length;
    }

    setFilter(filter: IntakeFilter): void {
        this.filter = filter;
    }

    // Warnings ------------------------------------------------------------------------------------

    warningsOf(service: IntakeAccountServiceItemViewModel): IntakeWarning[] {
        return this.warnings.get(service.id) ?? [];
    }

    warningLabelKey(warning: IntakeWarning): string {
        return `${I18N}.WARNING.${originKey(warning)}`;
    }

    /** Tooltip / screen-reader text of a row's warnings: the reasons, comma separated. */
    warningText(warnings: readonly IntakeWarning[]): string {
        const reasons = warnings.map((warning) => this.translate.instant(this.warningLabelKey(warning))).join(', ');
        return this.translate.instant(`${I18N}.WARNING.ARIA`, { reasons });
    }

    /** Services of the invoice with the given warning reason (any reason when ''). */
    warningCount(reason: IntakeWarning | ''): number {
        return filterServices(this.services, 'withWarnings', this.reviewedIds, null, this.withFinding, this.warnings, reason || null).length;
    }

    /** Selects every service that passes the active filters, in every group (collapsed ones included). */
    selectAllVisible(): void {
        this.visibleServices.forEach((service) => this.selected.add(service.id));
    }

    clearFilters(): void {
        this.filter = 'all';
        this.warningReason = '';
        this.search = '';
        this.groupKey = '';
        this.clearLinked();
        this.clearFocus();
    }

    // Groups ------------------------------------------------------------------------------------

    isCollapsed(group: ServiceGroup): boolean {
        return this.collapsed.has(group.key);
    }

    toggleCollapsed(group: ServiceGroup): void {
        if (this.collapsed.has(group.key)) {
            this.collapsed.delete(group.key);
        } else {
            this.collapsed.add(group.key);
        }
    }

    setAllCollapsed(collapse: boolean): void {
        this.collapsed.clear();
        if (collapse) {
            this.visibleGroups.forEach((group) => this.collapsed.add(group.key));
        }
    }

    groupSelected(group: ServiceGroup): boolean {
        return group.services.every((service) => this.selected.has(service.id));
    }

    groupPartlySelected(group: ServiceGroup): boolean {
        return !this.groupSelected(group) && group.services.some((service) => this.selected.has(service.id));
    }

    /** Selects (or clears) every visible item of the group. */
    toggleGroup(group: ServiceGroup): void {
        const select = !this.groupSelected(group);
        group.services.forEach((service) => (select ? this.selected.add(service.id) : this.selected.delete(service.id)));
    }

    // Selection and registration --------------------------------------------------------------

    toggle(service: IntakeAccountServiceItemViewModel): void {
        if (this.selected.has(service.id)) {
            this.selected.delete(service.id);
        } else {
            this.selected.add(service.id);
        }
    }

    toggleAllVisible(): void {
        const visible = this.visibleServices;
        const select = !this.allVisibleSelected;
        visible.forEach((service) => (select ? this.selected.add(service.id) : this.selected.delete(service.id)));
    }

    clearSelection(): void {
        this.selected.clear();
        this.bulkComment = '';
    }

    registerOne(service: IntakeAccountServiceItemViewModel, kind: CaseRegistrationKind = 'finding', comment: string | null = null): void {
        this.registered.emit({ kind, serviceIds: [service.id], comment: comment?.trim() || null });
    }

    registerSelected(): void {
        if (!this.selected.size) {
            return;
        }
        this.registered.emit({ kind: this.bulkKind, serviceIds: [...this.selected], comment: this.bulkComment.trim() || null });
        this.clearSelection();
    }

    markSelectedReviewed(): void {
        if (this.selected.size) {
            this.reviewedChange.emit({ serviceIds: [...this.selected], reviewed: true });
        }
    }

    toggleReviewed(service: IntakeAccountServiceItemViewModel): void {
        this.reviewedChange.emit({ serviceIds: [service.id], reviewed: !this.reviewedIds.has(service.id) });
    }

    // Drawer ------------------------------------------------------------------------------------

    openDrawer(service: IntakeAccountServiceItemViewModel): void {
        this.drawerService = service;
        this.drawerFields = serviceDetailFields(service, I18N);
        this.drawerDocuments = documentsLinkedToService(service, this.documents, this.supportLabel);
        this.drawerComment = '';
    }

    moveDrawer(step: number): void {
        const visible = this.visibleServices;
        const next = visible[this.drawerIndex + step];
        if (next) {
            this.openDrawer(next);
        }
    }

    closeDrawer(): void {
        this.drawerService = null;
        this.drawerFields = [];
        this.drawerDocuments = [];
        this.drawerComment = '';
    }

    registerFromDrawer(kind: CaseRegistrationKind): void {
        if (this.drawerService) {
            this.registerOne(this.drawerService, kind, this.drawerComment);
            this.drawerComment = '';
        }
    }

    registrationsOf(serviceId: string): CaseRegistration[] {
        return this.registrations.filter((entry) => entry.serviceIds.includes(serviceId)).slice().reverse();
    }

    /** Escape closes the innermost layer first: the document viewer (it handles its own key), then the drawer. */
    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.viewerDocument) {
            return;
        }
        if (this.drawerService) {
            this.closeDrawer();
        } else if (this.confirming) {
            this.cancelConfirm();
        }
    }

    // Documents ---------------------------------------------------------------------------------

    view(document: IntakeAccountDocumentItemViewModel): void {
        this.viewerDocument = toCaseDocument(document);
    }

    /** Document filter (toolbar select and the link button of the Document Control Center). */
    setDocument(documentId: string): void {
        const document = this.documents.find((item) => item.id === documentId);
        this.documentId = document ? document.id : '';
        this.documentIds = document ? new Set(servicesLinkedToDocument(document, this.services, this.supportLabel)) : null;
    }

    showLinked(document: IntakeAccountDocumentItemViewModel): void {
        if (this.documentId === document.id) {
            this.clearLinked();
            return;
        }
        this.setDocument(document.id);
        this.filter = 'all';
    }

    clearLinked(): void {
        this.documentId = '';
        this.documentIds = null;
    }

    linkedCount(document: IntakeAccountDocumentItemViewModel): number {
        return servicesLinkedToDocument(document, this.services, this.supportLabel).length;
    }

    requestDocument(label: string): void {
        this.documentRequested.emit(label);
    }

    // Focus: pending support class or finding -----------------------------------------------------

    isFocused(kind: IntakeFocus['kind'], key: string): boolean {
        return this.focus?.kind === kind && this.focus.key === key;
    }

    /** Pending support class: narrows the explorer to the services that do not meet it. */
    focusMissing(pending: PendingSupportClass): void {
        if (this.isFocused('missing', pending.label)) {
            this.clearFocus();
            return;
        }
        this.focus = { kind: 'missing', key: pending.label, label: pending.label, ids: new Set(servicesMissingDocument(this.services, pending.label)) };
        this.filter = 'all';
    }

    /** Finding: narrows the explorer to its associated items. */
    focusFinding(entry: IntakeFindingEntry): void {
        if (this.isFocused('finding', entry.id)) {
            this.clearFocus();
            return;
        }
        this.focus = { kind: 'finding', key: entry.id, label: entry.title, ids: new Set(entry.serviceIds) };
        this.filter = 'all';
    }

    clearFocus(): void {
        this.focus = null;
    }

    // Delete / dismiss a finding card ------------------------------------------------------------

    actionOf(entry: IntakeFindingEntry): IntakeFindingAction {
        return intakeFindingAction(entry);
    }

    isConfirming(entry: IntakeFindingEntry): boolean {
        return this.confirming?.entryId === entry.id;
    }

    startConfirm(entry: IntakeFindingEntry): void {
        const action = intakeFindingAction(entry);
        this.confirming = action ? { entryId: entry.id, action, text: '' } : null;
    }

    cancelConfirm(): void {
        this.confirming = null;
    }

    /** Deletes the analyst's record, or dismisses the agent observation (justification required). */
    confirmAction(entry: IntakeFindingEntry): void {
        const confirming = this.confirming;
        if (!confirming || confirming.entryId !== entry.id) {
            return;
        }
        if (confirming.action === 'delete' && (entry.source === 'registration' || entry.source === 'audit')) {
            if (this.focus?.kind === 'finding' && this.focus.key === entry.id) {
                this.clearFocus();
            }
            this.findingDeleted.emit({ source: entry.source, id: entry.refId });
        } else if (confirming.action === 'dismiss' && entry.source !== 'registration') {
            const justification = confirming.text.trim();
            if (!justification) {
                return;
            }
            this.findingDismissed.emit({ source: entry.source, findingId: entry.refId, justification });
        }
        this.confirming = null;
    }

    originLabelKey(entry: IntakeFindingEntry): string {
        return `MEDICAL_RECORDS.INVOICE_WORKSPACE.ORIGIN.${originKey(entry.origin)}`;
    }

    statusLabelKey(status: string): string {
        return `MEDICAL_RECORDS.INVOICE_WORKSPACE.STATUS.${status.toUpperCase()}`;
    }

    private refreshFocus(): void {
        const focus = this.focus;
        if (focus?.kind === 'finding') {
            const entry = this.findings.find((item) => item.id === focus.key);
            this.focus = entry ? { ...focus, label: entry.title, ids: new Set(entry.serviceIds) } : null;
        } else if (focus?.kind === 'missing') {
            const ids = servicesMissingDocument(this.services, focus.key);
            this.focus = ids.length ? { ...focus, ids: new Set(ids) } : null;
        }
    }

    private criteria(): IntakeCriteria {
        return {
            filter: this.filter,
            reviewed: this.reviewedIds,
            withFinding: this.withFinding,
            search: this.search,
            documentIds: this.documentIds,
            groupKey: this.groupKey || null,
            focusIds: this.focus?.ids ?? null,
            warnings: this.warnings,
            warningReason: this.filter === 'withWarnings' ? this.warningReason || null : null,
        };
    }
}
