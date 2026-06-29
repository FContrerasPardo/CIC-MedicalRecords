import { CommonModule } from '@angular/common';
import { WidgetComponent } from '@alfresco/adf-core';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { resolveAgentSources } from './analysis-payload.resolver';
import { DocumentViewerComponent } from '../../../../../../workspace-hxp/content-services-extension/content-browser/feature-shell/src/lib/components/document-viewer/document-viewer.component';
import {
    ActionGroup,
    AgentCard,
    AgentFieldId,
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
    RiskTone,
} from './analysis.mapper';

interface AgentDetailView {
    card: AgentCard;
    findings: FindingRow[];
    actions: RecommendedActionView[];
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
    imports: [CommonModule, TranslateModule, DocumentViewerComponent],
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
    showFilters = false;
    expandedFindingIds = new Set<string>();
    expandedClusterIds = new Set<string>();
    collapsedActionTones = new Set<RiskTone>(['critical', 'high', 'medium', 'low', 'pending']);
    activeAgentDetail: AgentDetailView | null = null;

    readonly riskFilterOptions: RiskTone[] = ['critical', 'high', 'medium', 'low'];
    readonly contractTitle = CONTRACT_DOCUMENT.title;

    contractViewerOpen = false;
    contractViewerLoading = false;
    contractViewerSettling = false;
    contractViewerError: string | null = null;
    contractViewerDocument?: Document;

    private pendingContractOpen = false;
    private contractRequestId = 0;
    private contractSettlingTimer?: ReturnType<typeof setTimeout>;
    private readonly documentService = inject(DocumentService);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

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

    get riskRingDash(): string {
        const circumference = 314.16;
        const score = Math.max(0, Math.min(100, this.analysisModel.riskScore));
        return `${((score / 100) * circumference).toFixed(1)} ${circumference}`;
    }

    get filteredFindingClusters(): FindingCluster[] {
        return groupFindingsByType(this.filteredFindings);
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

    setServiceFilter(serviceCode: string | null): void {
        this.filterServiceCode = serviceCode;
    }

    clearFilters(): void {
        this.filterAgentId = null;
        this.filterRiskTone = null;
        this.filterType = null;
        this.filterScope = null;
        this.filterServiceCode = null;
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

    toggleClusterExpanded(id: string): void {
        if (this.expandedClusterIds.has(id)) {
            this.expandedClusterIds.delete(id);
        } else {
            this.expandedClusterIds.add(id);
        }
        this.expandedClusterIds = new Set(this.expandedClusterIds);
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

    ngOnDestroy(): void {
        this.clearContractSettling();
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
