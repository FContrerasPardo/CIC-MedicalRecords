import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WidgetComponent } from '@alfresco/adf-core';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { ChangeDetectorRef, Component, ElementRef, HostListener, inject, OnDestroy, ViewChild } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { resolveAgentSources, resolveBatchState } from './analysis-payload.resolver';
import { triggerNativeUpload } from './support-document-upload';
import { BatchStateSource } from '../intake-account-widget/batch-state.model';
import {
    isDocumentReviewPending,
    markAllPendingReviewsComplete,
    markDocumentReviewComplete,
} from '../intake-account-widget/batch-state.mutations';
import { DocumentViewerComponent } from '../../../../../../workspace-hxp/content-services-extension/content-browser/feature-shell/src/lib/components/document-viewer/document-viewer.component';
import {
    ActionGroup,
    AGENT_LABELS,
    AgentCard,
    AgentFieldId,
    AgentResult,
    AgentSource,
    AnalysisDashboardModel,
    AnalysisMetric,
    buildAnalysisDashboardModel,
    filterFindings,
    FindingCluster,
    FindingRow,
    getUniqueFindingTypes,
    getUniqueServiceCodes,
    groupFindingsByType,
    groupRecommendedActionsByPriority,
    MissingDocumentRow,
    RecommendedActionView,
    ResolutionEntry,
    ResolutionView,
    RiskTone,
    UserSubsanation,
} from './analysis.mapper';

interface AgentDetailView {
    card: AgentCard;
    findings: FindingRow[];
    actions: RecommendedActionView[];
}

interface RemediationDocRow {
    id: string;
    name: string;
    className?: string;
    pending: boolean;
}

// Temporary hardcoded demo node — mirrors the agent-rules widget. Will become a per-agreement document later.
const CONTRACT_DOCUMENT = {
    repositoryId: 'default',
    repositoryNodeId: '07b0dd64-d021-4795-821e-f45d857956b4',
    title: 'Contrato de Prestación de Servicios',
};

@Component({
    selector: 'medical-records-analysis-task-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, DocumentViewerComponent],
    templateUrl: './analysis-task-widget.component.html',
    styleUrls: ['./analysis-task-widget.component.scss']
})
export class AnalysisTaskWidgetComponent extends WidgetComponent implements OnDestroy {
    @ViewChild('findingsPanel') findingsPanel?: ElementRef<HTMLElement>;

    filterAgentId: AgentFieldId | null = null;
    filterRiskTone: RiskTone | null = null;
    filterType: string | null = null;
    filterScope: 'service' | 'account' | null = null;
    filterServiceCode: string | null = null;
    filterStatus: 'resolved' | 'pending' | null = null;
    showFilters = false;
    expandedFindingIds = new Set<string>();
    expandedClusterIds = new Set<string>();
    expandedMissingDocIds = new Set<string>();
    collapsedActionTones = new Set<RiskTone>(['critical', 'high', 'medium', 'low', 'pending']);
    activeAgentDetail: AgentDetailView | null = null;

    readonly riskFilterOptions: RiskTone[] = ['critical', 'high', 'medium', 'low'];
    readonly contractTitle = CONTRACT_DOCUMENT.title;

    contractViewerOpen = false;
    contractViewerLoading = false;
    contractViewerSettling = false;
    contractViewerError: string | null = null;
    contractViewerDocument?: Document;

    docViewerOpen = false;
    docViewerLoading = false;
    docViewerSettling = false;
    docViewerError: string | null = null;
    docViewerDocument?: Document;
    docViewerTitle = '';

    readonly uploadFieldId = 'Attachfile0uqfqo';
    uploadStatusKey: string | null = null;

    selectedFindingIds = new Set<string>();
    subsanationModalOpen = false;
    subsanationDraftComment = '';
    subsanationModalMode: 'create' | 'view' = 'create';
    activeResolutionId: string | null = null;
    barLeft = 0;

    private mutatedBatchState: BatchStateSource | null = null;
    private mutatedAgentResults: Partial<Record<AgentFieldId, AgentResult>> = {};
    private cachedBatchStateKey: unknown = Symbol('uninitialized');
    private cachedBatchState: BatchStateSource | null = null;

    private pendingContractOpen = false;
    private contractRequestId = 0;
    private contractSettlingTimer?: ReturnType<typeof setTimeout>;
    private docViewerRequestId = 0;
    private docViewerSettlingTimer?: ReturnType<typeof setTimeout>;
    private readonly documentService = inject(DocumentService);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    private readonly hostRef = inject(ElementRef) as ElementRef<HTMLElement>;

    private _cachedFieldValue: unknown = undefined;
    private _cachedCodingValue: unknown = undefined;
    private _cachedComplianceValue: unknown = undefined;
    private _cachedFinancialValue: unknown = undefined;
    private _cachedAnalysisModel: AnalysisDashboardModel | null = null;

    get formFieldId(): string {
        return this.field?.id ?? 'analysis-task-widget';
    }

    get analysisModel(): AnalysisDashboardModel {
        const fieldValue = this.field?.value;
        const codingValue = this.field?.form?.getFieldById('codingIntegrityResult')?.value;
        const complianceValue = this.field?.form?.getFieldById('complianceAlertResult')?.value;
        const financialValue = this.field?.form?.getFieldById('financialVarianceResult')?.value;

        if (
            this._cachedAnalysisModel !== null &&
            fieldValue === this._cachedFieldValue &&
            codingValue === this._cachedCodingValue &&
            complianceValue === this._cachedComplianceValue &&
            financialValue === this._cachedFinancialValue
        ) {
            return this._cachedAnalysisModel;
        }

        this._cachedFieldValue = fieldValue;
        this._cachedCodingValue = codingValue;
        this._cachedComplianceValue = complianceValue;
        this._cachedFinancialValue = financialValue;

        const sources = resolveAgentSources({
            fieldValue,
            fallbackValues: {
                codingIntegrityResult: codingValue,
                complianceAlertResult: complianceValue,
                financialVarianceResult: financialValue,
            },
        });

        for (const source of sources) {
            const override = this.mutatedAgentResults[source.id];
            if (override) {
                source.result = override;
                source.parseError = null;
            }
        }

        this._cachedAnalysisModel = buildAnalysisDashboardModel(sources);
        return this._cachedAnalysisModel;
    }

    get filteredFindings(): FindingRow[] {
        return filterFindings(this.analysisModel.allFindings, {
            agentId: this.filterAgentId,
            riskTone: this.filterRiskTone,
            type: this.filterType,
            scope: this.filterScope,
            serviceCode: this.filterServiceCode,
            status: this.filterStatus,
        });
    }

    get findingTypeOptions(): string[] {
        return getUniqueFindingTypes(this.analysisModel.allFindings);
    }

    get findingServiceOptions(): string[] {
        return getUniqueServiceCodes(this.analysisModel.allFindings);
    }

    get currencyCode(): string {
        return this.analysisModel.currencyCode;
    }

    get batchState(): BatchStateSource | null {
        if (this.mutatedBatchState) {
            return this.mutatedBatchState;
        }

        const key = this.field?.value;
        if (key !== this.cachedBatchStateKey) {
            this.cachedBatchStateKey = key;
            this.cachedBatchState = resolveBatchState(key) ?? this.readFallbackBatchState();
        }

        return this.cachedBatchState;
    }

    get remediationDocs(): RemediationDocRow[] {
        return (this.batchState?.documents ?? []).map((doc) => ({
            id: doc.id,
            name: doc.name,
            className: doc.className,
            pending: isDocumentReviewPending(doc),
        }));
    }

    get pendingRemediationCount(): number {
        return this.remediationDocs.filter((doc) => doc.pending).length;
    }

    get riskRingDash(): string {
        const circumference = 314.16;
        const score = Math.max(0, Math.min(100, this.analysisModel.riskScore));
        return `${((score / 100) * circumference).toFixed(1)} ${circumference}`;
    }

    get hasSelection(): boolean {
        return this.selectedFindingIds.size > 0;
    }

    get selectedCount(): number {
        return this.selectedFindingIds.size;
    }

    get savedSubsanations(): UserSubsanation[] {
        return this.readSavedSubsanations();
    }

    get selectedFindings(): FindingRow[] {
        return this.analysisModel.allFindings.filter((finding) => this.selectedFindingIds.has(finding.id));
    }

    get resolutionViews(): ResolutionView[] {
        return this.analysisModel.resolutions;
    }

    get activeResolution(): ResolutionView | null {
        if (!this.activeResolutionId) {
            return null;
        }
        return this.resolutionViews.find((view) => view.id === this.activeResolutionId) ?? null;
    }

    get modalFindings(): FindingRow[] {
        return this.subsanationModalMode === 'view'
            ? this.activeResolution?.findings ?? []
            : this.selectedFindings;
    }

    get filteredFindingClusters(): FindingCluster[] {
        const typeClusters = groupFindingsByType(this.filteredFindings);

        const multi = typeClusters.filter((c) => !c.isSingle);
        const singleFindings = typeClusters.filter((c) => c.isSingle).map((c) => c.findings[0]);

        if (!singleFindings.length) return multi;

        const riskOrder: RiskTone[] = ['critical', 'high', 'medium', 'low', 'pending'];
        const riskScore = (tone: RiskTone): number =>
            Math.max(0, riskOrder.length - riskOrder.indexOf(tone));

        const agentMap = new Map<AgentFieldId, FindingRow[]>();
        for (const finding of singleFindings) {
            const list = agentMap.get(finding.agentId) ?? [];
            list.push(finding);
            agentMap.set(finding.agentId, list);
        }

        const agentClusters: FindingCluster[] = Array.from(agentMap.entries()).map(
            ([agentId, findings]) => {
                const topFinding = findings.reduce((best, f) =>
                    riskScore(f.riskLevel) > riskScore(best.riskLevel) ? f : best
                );
                return {
                    id: `agent-cluster-${agentId}`,
                    type: agentId,
                    typeLabel: AGENT_LABELS[agentId],
                    count: findings.length,
                    topRiskTone: topFinding.riskLevel,
                    topRiskLabel: topFinding.riskLabel,
                    agentTones: [...new Set(findings.map((f) => f.agentTone))],
                    findings,
                    isSingle: false,
                };
            }
        );

        const combined = [...multi, ...agentClusters];
        return combined.sort((a, b) => {
            const byRisk = riskScore(b.topRiskTone) - riskScore(a.topRiskTone);
            return byRisk !== 0 ? byRisk : b.count - a.count;
        });
    }

    get recommendedActionGroups(): ActionGroup[] {
        return groupRecommendedActionsByPriority(this.analysisModel.recommendedActions);
    }

    trackByMetric(_: number, metric: AnalysisMetric): string {
        return metric.id;
    }

    trackByCard(_: number, card: AgentCard): string {
        return card.id;
    }

    trackByAction(_: number, action: RecommendedActionView): string {
        return action.id;
    }

    trackByFinding(_: number, finding: FindingRow): string {
        return finding.id;
    }

    trackByMissingDoc(_: number, doc: MissingDocumentRow): string {
        return doc.id;
    }

    trackByCluster(_: number, cluster: FindingCluster): string {
        return cluster.id;
    }

    trackByActionGroup(_: number, group: ActionGroup): string {
        return group.tone;
    }

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }

    setAgentFilter(agentId: AgentFieldId | null): void {
        if (agentId === null) {
            this.filterAgentId = null;
            return;
        }

        this.filterAgentId = this.filterAgentId === agentId ? null : agentId;
    }

    setRiskFilter(riskTone: RiskTone): void {
        this.filterRiskTone = this.filterRiskTone === riskTone ? null : riskTone;
    }

    setTypeFilter(type: string | null): void {
        this.filterType = type;
    }

    setScopeFilter(scope: 'service' | 'account' | null): void {
        this.filterScope = this.filterScope === scope ? null : scope;
    }

    setStatusFilter(status: 'resolved' | 'pending' | null): void {
        this.filterStatus = this.filterStatus === status ? null : status;
    }

    setServiceFilter(serviceCode: string | null): void {
        this.filterServiceCode = serviceCode;
    }

    clearFilters(): void {
        this.filterAgentId = null;
        this.filterRiskTone = null;
        this.filterType = null;
        this.filterScope = null;
        this.filterServiceCode = null;
        this.filterStatus = null;
    }

    isFindingExpanded(id: string): boolean {
        return this.expandedFindingIds.has(id);
    }

    toggleFindingExpanded(id: string): void {
        if (this.expandedFindingIds.has(id)) {
            this.expandedFindingIds.delete(id);
        } else {
            this.expandedFindingIds.add(id);
        }
        this.expandedFindingIds = new Set(this.expandedFindingIds);
    }

    isClusterExpanded(id: string): boolean {
        return this.expandedClusterIds.has(id);
    }

    isClusterResolved(cluster: FindingCluster): boolean {
        return cluster.findings.length > 0 && cluster.findings.every((finding) => this.isFindingResolved(finding));
    }

    toggleClusterExpanded(id: string): void {
        if (this.expandedClusterIds.has(id)) {
            this.expandedClusterIds.delete(id);
        } else {
            this.expandedClusterIds.add(id);
        }
        this.expandedClusterIds = new Set(this.expandedClusterIds);
    }

    isMissingDocExpanded(id: string): boolean {
        return this.expandedMissingDocIds.has(id);
    }

    toggleMissingDoc(id: string): void {
        if (this.expandedMissingDocIds.has(id)) {
            this.expandedMissingDocIds.delete(id);
        } else {
            this.expandedMissingDocIds.add(id);
        }
        this.expandedMissingDocIds = new Set(this.expandedMissingDocIds);
    }

    isActionGroupExpanded(tone: RiskTone): boolean {
        return !this.collapsedActionTones.has(tone);
    }

    toggleActionGroup(tone: RiskTone): void {
        if (this.collapsedActionTones.has(tone)) {
            this.collapsedActionTones.delete(tone);
        } else {
            this.collapsedActionTones.add(tone);
        }
        this.collapsedActionTones = new Set(this.collapsedActionTones);
    }

    scrollToFindings(agentId?: AgentFieldId): void {
        if (agentId) {
            this.filterAgentId = agentId;
        }

        this.findingsPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    focusSeverity(tone: RiskTone): void {
        this.setRiskFilter(tone);
        this.findingsPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    trackByRemediationDoc(_: number, doc: RemediationDocRow): string {
        return doc.id;
    }

    trackBySubsanation(_: number, sub: UserSubsanation): string {
        return sub.id;
    }

    trackByResolution(_: number, view: ResolutionView): string {
        return view.id;
    }

    isFindingSelected(id: string): boolean {
        return this.selectedFindingIds.has(id);
    }

    isFindingResolved(finding: FindingRow): boolean {
        return Boolean(finding.resolutionId);
    }

    toggleFindingSelection(id: string): void {
        const finding = this.analysisModel.allFindings.find((row) => row.id === id);
        if (finding && this.isFindingResolved(finding)) {
            return;
        }

        if (this.selectedFindingIds.has(id)) {
            this.selectedFindingIds.delete(id);
        } else {
            this.selectedFindingIds.add(id);
        }
        this.selectedFindingIds = new Set(this.selectedFindingIds);
        this.updateSelectionBarLeft();
    }

    clearSelection(): void {
        this.selectedFindingIds = new Set();
    }

    @HostListener('window:scroll')
    @HostListener('window:resize')
    onViewportChange(): void {
        if (this.hasSelection) {
            this.updateSelectionBarLeft();
        }
    }

    private updateSelectionBarLeft(): void {
        const element = this.hostRef?.nativeElement;
        if (!element) {
            return;
        }
        const rect = element.getBoundingClientRect();
        this.barLeft = Math.round(rect.left + rect.width / 2);
    }

    openSubsanationModal(): void {
        this.subsanationModalMode = 'create';
        this.activeResolutionId = null;
        this.subsanationDraftComment = '';
        this.subsanationModalOpen = true;
    }

    openResolutionView(resolutionId: string | undefined | null): void {
        if (!resolutionId) {
            return;
        }
        const view = this.resolutionViews.find((item) => item.id === resolutionId);
        if (!view) {
            return;
        }
        this.subsanationModalMode = 'view';
        this.activeResolutionId = resolutionId;
        this.subsanationDraftComment = view.comment;
        this.subsanationModalOpen = true;
    }

    closeSubsanationModal(): void {
        this.subsanationModalOpen = false;
        this.subsanationDraftComment = '';
        this.subsanationModalMode = 'create';
        this.activeResolutionId = null;
    }

    submitSubsanation(): void {
        const comment = this.subsanationDraftComment.trim();
        if (!comment || !this.selectedFindingIds.size) {
            return;
        }

        const findings = this.selectedFindings;
        const id = this.createResolutionId();
        const createdAt = new Date().toISOString();

        this.applyResolutionToAgents(findings, id, { comment, resolvedAt: createdAt });

        const subsanation: UserSubsanation = {
            id,
            findingIds: findings.map((finding) => finding.id),
            findingTypes: [...new Set(findings.map((finding) => finding.typeLabel))],
            agentIds: [...new Set(findings.map((finding) => finding.agentId))],
            riskLevels: [...new Set(findings.map((finding) => finding.riskLevel))],
            comment,
            createdAt,
        };
        this.saveSubsanations([...this.savedSubsanations, subsanation]);

        this.clearSelection();
        this.closeSubsanationModal();
        this.changeDetectorRef.markForCheck();
    }

    updateSubsanation(): void {
        const comment = this.subsanationDraftComment.trim();
        const view = this.activeResolution;
        if (!comment || !view) {
            return;
        }

        this.applyResolutionToAgents(view.findings, view.id, {
            comment,
            resolvedAt: new Date().toISOString(),
        });

        this.saveSubsanations(
            this.savedSubsanations.map((item) => (item.id === view.id ? { ...item, comment } : item))
        );

        this.closeSubsanationModal();
        this.changeDetectorRef.markForCheck();
    }

    undoSubsanation(resolutionId?: string | null): void {
        const id = resolutionId ?? this.activeResolutionId;
        if (!id) {
            return;
        }

        const findings = this.analysisModel.allFindings.filter((finding) => finding.resolutionId === id);
        this.clearResolutionFromAgents(findings, id);

        this.saveSubsanations(this.savedSubsanations.filter((item) => item.id !== id));

        this.closeSubsanationModal();
        this.changeDetectorRef.markForCheck();
    }

    triggerDocumentUpload(): void {
        const fieldId = this.resolveUploadFieldId();
        const result = triggerNativeUpload(fieldId);
        this.uploadStatusKey = result.status === 'opened'
            ? 'MEDICAL_RECORDS.ANALYSIS_WIDGET.DOCUMENTS.UPLOAD_OPENED'
            : result.status === 'highlighted'
                ? 'MEDICAL_RECORDS.ANALYSIS_WIDGET.DOCUMENTS.UPLOAD_HIGHLIGHTED'
                : 'MEDICAL_RECORDS.ANALYSIS_WIDGET.DOCUMENTS.UPLOAD_NOT_FOUND';
    }

    /**
     * Discover the real attach-file field id from the form model (mirrors the intake
     * widget's findUploadFieldModel), so upload keeps working even if Hyland republishes
     * the field with a different id suffix. Falls back to the configured default id,
     * which the DOM helper still resolves through its generic `Attachfile`/
     * `hxp-attach-file-widget` selectors.
     */
    private resolveUploadFieldId(): string {
        const form = this.field?.form as {
            getFieldById?: (id: string) => { id?: string } | undefined;
            getFormFields?: () => Array<{ id?: string; type?: unknown; name?: unknown }>;
        } | undefined;

        const direct = form?.getFieldById?.(this.uploadFieldId);
        if (direct?.id) {
            return direct.id;
        }

        const fields = typeof form?.getFormFields === 'function' ? form.getFormFields() : [];
        if (Array.isArray(fields) && fields.length) {
            const candidates = fields.filter((candidate) => {
                const id = String(candidate?.id ?? '').toLowerCase();
                const type = String(candidate?.type ?? '').toLowerCase();
                const name = String(candidate?.name ?? '').replace(/\s+/g, '').toLowerCase();
                return id.startsWith('attachfile') || name.startsWith('attachfile') || type === 'upload';
            });

            const attachMatch = candidates.find((candidate) =>
                String(candidate?.id ?? '').toLowerCase().startsWith('attachfile')
            );
            if (attachMatch?.id) {
                return attachMatch.id;
            }

            if (candidates.length === 1 && candidates[0]?.id) {
                return candidates[0].id;
            }
        }

        return this.uploadFieldId;
    }

    markDocumentReviewed(documentId: string): void {
        const batchState = this.batchState;
        if (!batchState || !documentId) {
            return;
        }
        this.commitBatchState(markDocumentReviewComplete(batchState, documentId));
    }

    markAllReviewed(): void {
        const batchState = this.batchState;
        if (!batchState) {
            return;
        }
        this.commitBatchState(markAllPendingReviewsComplete(batchState));
    }

    private readFallbackBatchState(): BatchStateSource | null {
        const raw = this.field?.form?.getFieldById('batchState')?.value;
        if (!raw) {
            return null;
        }
        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw) as BatchStateSource;
            } catch {
                return null;
            }
        }
        return typeof raw === 'object' && !Array.isArray(raw) ? (raw as BatchStateSource) : null;
    }

    private commitBatchState(next: BatchStateSource): void {
        this.mutatedBatchState = next;

        const batchField = this.field?.form?.getFieldById('batchState');
        if (batchField) {
            batchField.value = typeof batchField.value === 'string' ? JSON.stringify(next) : next;
        }

        this.changeDetectorRef.markForCheck();
    }

    openAgentDetail(card: AgentCard): void {
        if (card.pending || card.invalid) {
            return;
        }

        const findings = this.analysisModel.allFindings.filter((finding) => finding.agentId === card.id);
        const actions = this.analysisModel.recommendedActions.filter((action) => action.agentId === card.id);

        this.activeAgentDetail = { card, findings, actions };
    }

    closeAgentDetail(): void {
        this.activeAgentDetail = null;
    }

    openContractDocument(): void {
        this.pendingContractOpen = true;

        if (!this.contractViewerDocument) {
            this.loadContractDocument();
            return;
        }

        this.pendingContractOpen = false;
        this.contractViewerOpen = true;
        this.startContractSettling();
    }

    closeContractDocument(): void {
        this.contractViewerOpen = false;
        this.pendingContractOpen = false;
        this.clearContractSettling();
    }

    openDocumentForView(doc: RemediationDocRow): void {
        const sysId = this.getDocSysId(doc.id);
        if (!sysId) {
            return;
        }
        this.docViewerTitle = doc.name;
        this.loadDocumentForView(sysId);
    }

    closeDocumentView(): void {
        this.docViewerOpen = false;
        this.clearDocViewerSettling();
    }

    ngOnDestroy(): void {
        this.clearContractSettling();
        this.clearDocViewerSettling();
    }

    private loadContractDocument(): void {
        this.contractRequestId += 1;
        const requestId = this.contractRequestId;

        this.contractViewerLoading = true;
        this.contractViewerError = null;

        this.documentService
            .getDocumentById(CONTRACT_DOCUMENT.repositoryNodeId, CONTRACT_DOCUMENT.repositoryId)
            .pipe(take(1))
            .subscribe({
                next: (document) => {
                    if (requestId !== this.contractRequestId) {
                        return;
                    }

                    this.contractViewerLoading = false;
                    this.contractViewerDocument = document;

                    if (this.pendingContractOpen) {
                        this.pendingContractOpen = false;
                        this.contractViewerOpen = true;
                        this.startContractSettling();
                    }

                    this.changeDetectorRef.markForCheck();
                },
                error: () => {
                    if (requestId !== this.contractRequestId) {
                        return;
                    }

                    this.contractViewerLoading = false;
                    this.contractViewerDocument = undefined;
                    this.pendingContractOpen = false;
                    this.contractViewerOpen = true;
                    this.contractViewerError = 'Unable to load the contract document from the repository.';
                    this.changeDetectorRef.markForCheck();
                },
            });
    }

    private saveSubsanations(items: UserSubsanation[]): void {
        const field = this.field?.form?.getFieldById('userSubsanations');
        if (field) {
            field.value = typeof field.value === 'string' ? JSON.stringify(items) : items;
        }
    }

    private readSavedSubsanations(): UserSubsanation[] {
        const raw = this.field?.form?.getFieldById('userSubsanations')?.value;
        if (!raw) {
            return [];
        }
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? (parsed as UserSubsanation[]) : [];
            } catch {
                return [];
            }
        }
        return Array.isArray(raw) ? (raw as UserSubsanation[]) : [];
    }

    private createResolutionId(): string {
        return `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    }

    private applyResolutionToAgents(
        findings: FindingRow[],
        resolutionId: string,
        entry: { comment: string; resolvedAt: string }
    ): void {
        this.groupFindingsByAgent(findings).forEach((agentFindings, agentId) => {
            const current = this.getAgentResult(agentId);
            if (!current) {
                return;
            }

            const result = this.cloneResult(current);
            const list = Array.isArray(result.findings) ? result.findings : [];

            for (const finding of agentFindings) {
                const index = this.parseFindingIndex(finding);
                if (index >= 0 && index < list.length) {
                    list[index] = { ...list[index], resolutionId };
                }
            }
            result.findings = list;

            const resolutions = Array.isArray(result.resolutions) ? [...result.resolutions] : [];
            const resolutionEntry: ResolutionEntry = { id: resolutionId, ...entry };
            const existingIndex = resolutions.findIndex((item) => item.id === resolutionId);
            if (existingIndex >= 0) {
                resolutions[existingIndex] = resolutionEntry;
            } else {
                resolutions.push(resolutionEntry);
            }
            result.resolutions = resolutions;

            this.writeAgentResult(agentId, result);
        });
    }

    private clearResolutionFromAgents(findings: FindingRow[], resolutionId: string): void {
        this.groupFindingsByAgent(findings).forEach((agentFindings, agentId) => {
            const current = this.getAgentResult(agentId);
            if (!current) {
                return;
            }

            const result = this.cloneResult(current);
            const list = Array.isArray(result.findings) ? result.findings : [];

            for (const finding of agentFindings) {
                const index = this.parseFindingIndex(finding);
                if (index >= 0 && index < list.length && list[index]?.resolutionId === resolutionId) {
                    const cleaned = { ...list[index] };
                    delete cleaned.resolutionId;
                    list[index] = cleaned;
                }
            }
            result.findings = list;

            if (Array.isArray(result.resolutions)) {
                result.resolutions = result.resolutions.filter((item) => item.id !== resolutionId);
            }

            this.writeAgentResult(agentId, result);
        });
    }

    private groupFindingsByAgent(findings: FindingRow[]): Map<AgentFieldId, FindingRow[]> {
        const grouped = new Map<AgentFieldId, FindingRow[]>();
        for (const finding of findings) {
            const list = grouped.get(finding.agentId) ?? [];
            list.push(finding);
            grouped.set(finding.agentId, list);
        }
        return grouped;
    }

    private parseFindingIndex(finding: FindingRow): number {
        const prefix = `${finding.agentId}-`;
        const raw = finding.id.startsWith(prefix) ? finding.id.slice(prefix.length) : '';
        const index = Number.parseInt(raw, 10);
        return Number.isNaN(index) ? -1 : index;
    }

    private cloneResult(result: AgentResult): AgentResult {
        return JSON.parse(JSON.stringify(result)) as AgentResult;
    }

    private resolveSourcesNow(): Array<AgentSource<AgentResult>> {
        return resolveAgentSources({
            fieldValue: this.field?.value,
            fallbackValues: {
                codingIntegrityResult: this.field?.form?.getFieldById('codingIntegrityResult')?.value,
                complianceAlertResult: this.field?.form?.getFieldById('complianceAlertResult')?.value,
                financialVarianceResult: this.field?.form?.getFieldById('financialVarianceResult')?.value,
            },
        });
    }

    private getAgentResult(agentId: AgentFieldId): AgentResult | null {
        const override = this.mutatedAgentResults[agentId];
        if (override) {
            return override;
        }
        return this.resolveSourcesNow().find((source) => source.id === agentId)?.result ?? null;
    }

    private writeAgentResult(agentId: AgentFieldId, result: AgentResult): void {
        this.mutatedAgentResults = { ...this.mutatedAgentResults, [agentId]: result };

        const field = this.field?.form?.getFieldById(agentId);
        if (field) {
            field.value = typeof field.value === 'string' ? JSON.stringify(result) : result;
        }

        const unified = this.field?.value;
        if (
            unified &&
            typeof unified === 'object' &&
            !Array.isArray(unified) &&
            Object.prototype.hasOwnProperty.call(unified, agentId)
        ) {
            const holder = unified as Record<string, unknown>;
            holder[agentId] = typeof holder[agentId] === 'string' ? JSON.stringify(result) : result;
        }

        this._cachedAnalysisModel = null;
        this.changeDetectorRef.markForCheck();
    }

    private getDocSysId(docId: string): string | null {
        const batchState = this.batchState;
        if (!batchState) {
            return null;
        }
        const bsDoc = batchState.documents?.find((d) => d.id === docId);
        const idx = bsDoc?.pages?.[0]?.contentFileReferenceIndex;
        if (idx === undefined || idx === null) {
            return null;
        }
        return batchState.contentFileReferences?.[idx]?.sys_id ?? null;
    }

    private loadDocumentForView(sysId: string): void {
        this.docViewerRequestId += 1;
        const requestId = this.docViewerRequestId;

        this.docViewerLoading = true;
        this.docViewerError = null;
        this.docViewerDocument = undefined;
        this.docViewerOpen = true;

        this.documentService
            .getDocumentById(sysId, 'default')
            .pipe(take(1))
            .subscribe({
                next: (document) => {
                    if (requestId !== this.docViewerRequestId) {
                        return;
                    }
                    this.docViewerLoading = false;
                    this.docViewerDocument = document;
                    this.startDocViewerSettling();
                    this.changeDetectorRef.markForCheck();
                },
                error: () => {
                    if (requestId !== this.docViewerRequestId) {
                        return;
                    }
                    this.docViewerLoading = false;
                    this.docViewerError = 'Unable to load the document from the repository.';
                    this.changeDetectorRef.markForCheck();
                },
            });
    }

    private startDocViewerSettling(): void {
        this.clearDocViewerSettling();
        this.docViewerSettling = true;
        this.docViewerSettlingTimer = setTimeout(() => {
            this.docViewerSettling = false;
            this.docViewerSettlingTimer = undefined;
            this.changeDetectorRef.markForCheck();
        }, 900);
    }

    private clearDocViewerSettling(): void {
        if (this.docViewerSettlingTimer) {
            clearTimeout(this.docViewerSettlingTimer);
            this.docViewerSettlingTimer = undefined;
        }
        this.docViewerSettling = false;
    }

    private startContractSettling(): void {
        this.clearContractSettling();
        this.contractViewerSettling = true;
        this.contractSettlingTimer = setTimeout(() => {
            this.contractViewerSettling = false;
            this.contractSettlingTimer = undefined;
            this.changeDetectorRef.markForCheck();
        }, 900);
    }

    private clearContractSettling(): void {
        if (this.contractSettlingTimer) {
            clearTimeout(this.contractSettlingTimer);
            this.contractSettlingTimer = undefined;
        }
        this.contractViewerSettling = false;
    }
}
