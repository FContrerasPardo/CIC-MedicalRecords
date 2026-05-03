import { CommonModule } from '@angular/common';
import { WidgetComponent } from '@alfresco/adf-core';
import { Component } from '@angular/core';

type AgentFieldId = 'codingIntegrityResult' | 'complianceAlertResult' | 'financialVarianceResult';
type AgentTone = 'coding' | 'compliance' | 'financial';
type RiskTone = 'critical' | 'high' | 'medium' | 'low' | 'pending';

interface AgentParseError {
    parseError: true;
    rawValue?: string;
    errorMessage?: string;
}

interface AgentFinding {
    findingId?: string;
    title?: string;
    type?: string;
    riskLevel?: string;
    severity?: string;
    description?: string;
    reason?: string;
    recommendation?: string;
    serviceCode?: string;
    procedureCode?: string;
    diagnosisCode?: string | null;
    requiredDocumentType?: string;
    sourceDocument?: string;
    sourceField?: string;
    billedAmount?: number;
    expectedAmount?: number;
    approvedAmount?: number;
    varianceAmount?: number;
    variancePercentage?: number;
    authorizationId?: string;
    authorizationStatus?: string;
}

interface AgentAction {
    action?: string;
    priority?: string;
    owner?: string;
}

interface AgentResult {
    agentName?: string;
    overallRiskLevel?: string;
    summary?: string;
    findings?: AgentFinding[];
    recommendedActions?: AgentAction[];
    readyForApproval?: boolean;
    requiresManualReview?: boolean;
}

interface CodingIntegrityResult extends AgentResult {
    codingSummary?: {
        procedureCodesDetected?: number;
        serviceItemsAnalyzed?: number;
        incompatibilitiesDetected?: number;
        duplicatesDetected?: number;
        missingDiagnosisSupport?: number;
    };
}

interface ComplianceAlertResult extends AgentResult {
    complianceSummary?: {
        missingRequiredDocuments?: number;
        reviewRequiredDocuments?: number;
        servicesBlockedByMissingSupport?: number;
    };
    missingDocuments?: Array<{
        documentType?: string;
        requiredFor?: string;
        priority?: string;
        reason?: string;
    }>;
}

interface FinancialVarianceResult extends AgentResult {
    analyzedTotals?: {
        invoiceTotal?: number;
        itemizedTotal?: number;
        payerAmount?: number;
        detectedCurrency?: string;
        totalsMatch?: boolean;
        varianceAmount?: number;
        variancePercentage?: number;
    };
    authorizationSummary?: {
        missingAuthorizations?: number;
        amountExceeded?: number;
        quantityExceeded?: number;
    };
}

interface AgentSource<T extends AgentResult> {
    id: AgentFieldId;
    result: T | null;
    parseError: AgentParseError | null;
}

interface ParsedAgentCandidate<T extends AgentResult> {
    hasValue: boolean;
    result: T | null;
    parseError: AgentParseError | null;
}

interface GenericWidgetAgent {
    status?: string;
    slotName?: string;
    agentKey?: string;
    agentName?: string;
    name?: string;
    result?: unknown;
    payload?: unknown;
    message?: string;
    rawPreview?: string;
}

interface GenericWidgetWarning {
    slotName?: string;
    agentKey?: string;
    agentName?: string;
    type?: string;
    message?: string;
    rawPreview?: string;
}

interface GenericWidgetEnvelope {
    agents?: Record<string, unknown>;
    warnings?: GenericWidgetWarning[];
}

type AnalysisWidgetPayload = Partial<Record<AgentFieldId, unknown>> & GenericWidgetEnvelope;

interface AnalysisMetric {
    id: string;
    label: string;
    value: string;
    helper: string;
    pending: boolean;
    invalid: boolean;
}

interface AgentCard {
    id: AgentFieldId;
    label: string;
    title: string;
    icon: string;
    tone: AgentTone;
    actionLabel: string;
    actionIcon: string;
    pending: boolean;
    invalid: boolean;
    riskLabel: string;
    riskTone: RiskTone;
    findingTitle: string;
    findingDescription: string;
    summary: string;
    meta: string[];
}

interface RecommendedActionView {
    id: string;
    label: string;
    owner: string;
    priority: string;
    tone: RiskTone;
    icon: string;
}

interface BilledItemRow {
    id: string;
    code: string;
    description: string;
    amount: number | null;
    riskLabel: string;
    riskTone: RiskTone;
    aiStatus: string;
    actionLabel: string;
}

interface AnalysisDashboardModel {
    metrics: AnalysisMetric[];
    agentCards: AgentCard[];
    recommendedActions: RecommendedActionView[];
    billedItems: BilledItemRow[];
    currencyCode: string;
    riskScore: number;
    riskLabel: string;
    riskTone: RiskTone;
    riskSummary: string;
    analyzedClaims: string;
    totalValue: number | null;
    approvalBlocked: boolean;
    approvalStateLabel: string;
    missingAgentLabels: string[];
}

@Component({
    selector: 'medical-records-analysis-task-widget',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './analysis-task-widget.component.html',
    styleUrls: ['./analysis-task-widget.component.scss']
})
export class AnalysisTaskWidgetComponent extends WidgetComponent {
    private readonly agentFieldIds: AgentFieldId[] = [
        'codingIntegrityResult',
        'complianceAlertResult',
        'financialVarianceResult',
    ];

    private readonly agentLabels: Record<AgentFieldId, string> = {
        codingIntegrityResult: 'Coding Integrity',
        complianceAlertResult: 'Compliance Alert',
        financialVarianceResult: 'Financial Variance',
    };

    private readonly agentMatchers: Record<AgentFieldId, { slotName: string; tokens: string[] }> = {
        codingIntegrityResult: {
            slotName: 'json1',
            tokens: ['CODING', 'INTEGRITY'],
        },
        complianceAlertResult: {
            slotName: 'json2',
            tokens: ['COMPLIANCE', 'ALERT'],
        },
        financialVarianceResult: {
            slotName: 'json3',
            tokens: ['FINANCIAL', 'VARIANCE'],
        },
    };

    get formFieldId(): string {
        return this.field?.id ?? 'analysis-task-widget';
    }

    get analysisModel(): AnalysisDashboardModel {
        const coding = this.readAgentResult<CodingIntegrityResult>('codingIntegrityResult');
        const compliance = this.readAgentResult<ComplianceAlertResult>('complianceAlertResult');
        const financial = this.readAgentResult<FinancialVarianceResult>('financialVarianceResult');
        const sources: Array<AgentSource<AgentResult>> = [coding, compliance, financial];
        const missingAgentLabels = sources
            .filter((source) => !source.result && !source.parseError)
            .map((source) => this.agentLabels[source.id]);
        const riskScore = this.getHighestRiskScore(sources);
        const approvalBlocked = !sources.every((source) => source.result?.readyForApproval === true && source.result?.requiresManualReview !== true);

        return {
            metrics: this.buildMetrics(coding, compliance, financial),
            agentCards: [
                this.buildAgentCard(coding, 'code', 'coding', 'Update CUPS', 'sell'),
                this.buildAgentCard(compliance, 'assignment_late', 'compliance', 'Request Authorization', 'mail'),
                this.buildAgentCard(financial, 'request_quote', 'financial', 'Review Contract', 'plagiarism'),
            ],
            recommendedActions: this.buildRecommendedActions(sources),
            billedItems: this.buildBilledItems(coding.result, compliance.result, financial.result),
            currencyCode: financial.result?.analyzedTotals?.detectedCurrency ?? 'COP',
            riskScore,
            riskLabel: this.getRiskLabelFromScore(riskScore),
            riskTone: this.getRiskToneFromScore(riskScore),
            riskSummary: this.buildRiskSummary(sources, missingAgentLabels),
            analyzedClaims: this.formatCount(this.getAnalyzedClaims(coding.result)),
            totalValue: financial.result?.analyzedTotals?.invoiceTotal ?? financial.result?.analyzedTotals?.itemizedTotal ?? null,
            approvalBlocked,
            approvalStateLabel: approvalBlocked ? 'Blocked by agent review' : 'Ready to proceed',
            missingAgentLabels,
        };
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

    trackByBilledItem(_: number, item: BilledItemRow): string {
        return item.id;
    }

    private readAgentResult<T extends AgentResult>(id: AgentFieldId): AgentSource<T> {
        const unifiedPayload = this.resolveUnifiedPayload();

        if (unifiedPayload) {
            const parsed = this.parseAgentCandidate<T>(this.resolveUnifiedAgentValue(unifiedPayload, id));

            return {
                id,
                result: parsed.result,
                parseError: parsed.parseError,
            };
        }

        return this.readFallbackAgentResult<T>(id);
    }

    private readFallbackAgentResult<T extends AgentResult>(id: AgentFieldId): AgentSource<T> {
        const candidates = [
            this.field?.form?.getFieldById(id)?.value,
            this.field?.id === id ? this.field?.value : null,
        ];

        for (const candidate of candidates) {
            const parsed = this.parseAgentCandidate<T>(candidate);
            if (parsed.hasValue) {
                return {
                    id,
                    result: parsed.result,
                    parseError: parsed.parseError,
                };
            }
        }

        return {
            id,
            result: null,
            parseError: null,
        };
    }

    private resolveUnifiedPayload(): AnalysisWidgetPayload | null {
        const payload = this.parseJsonObject<AnalysisWidgetPayload>(this.field?.value);

        if (!payload) {
            return null;
        }

        const hasAgentKey = this.agentFieldIds.some((id) => Object.prototype.hasOwnProperty.call(payload, id));
        const hasAgentEnvelope = this.isPlainObject(payload.agents);

        return hasAgentKey || hasAgentEnvelope ? payload : null;
    }

    private resolveUnifiedAgentValue(payload: AnalysisWidgetPayload, id: AgentFieldId): unknown {
        if (Object.prototype.hasOwnProperty.call(payload, id)) {
            return payload[id];
        }

        const agent = this.findEnvelopeAgent(payload, id);

        if (agent !== null && agent !== undefined) {
            return this.extractEnvelopeAgentValue(agent);
        }

        const warning = this.findEnvelopeWarning(payload, id);

        if (warning) {
            return {
                parseError: true,
                rawValue: this.truncatePreview(warning.rawPreview ?? ''),
                errorMessage: warning.message ?? 'Invalid agent JSON.',
            };
        }

        return null;
    }

    private findEnvelopeAgent(payload: AnalysisWidgetPayload, id: AgentFieldId): unknown | null {
        if (!this.isPlainObject(payload.agents)) {
            return null;
        }

        const directAgent = payload.agents[id];

        if (directAgent !== undefined) {
            return directAgent;
        }

        for (const [agentMapKey, agent] of Object.entries(payload.agents)) {
            if (this.matchesAgentIdentity(id, agentMapKey)) {
                return agent;
            }

            if (!this.isPlainObject(agent)) {
                continue;
            }

            const result = this.isPlainObject(agent['result']) ? agent['result'] : null;
            const identities = [
                agent['agentKey'],
                agent['slotName'],
                agent['agentName'],
                agent['name'],
                result?.['agentName'],
                result?.['name'],
            ];

            if (identities.some((identity) => this.matchesAgentIdentity(id, identity))) {
                return agent;
            }
        }

        return null;
    }

    private findEnvelopeWarning(payload: AnalysisWidgetPayload, id: AgentFieldId): GenericWidgetWarning | null {
        if (!Array.isArray(payload.warnings)) {
            return null;
        }

        return payload.warnings.find((warning) => (
            warning.type !== 'EMPTY_INPUT' &&
            (
                this.matchesAgentIdentity(id, warning.agentKey) ||
                this.matchesAgentIdentity(id, warning.agentName) ||
                this.matchesAgentIdentity(id, warning.slotName)
            )
        )) ?? null;
    }

    private extractEnvelopeAgentValue(agent: unknown): unknown {
        if (!this.isPlainObject(agent)) {
            return agent;
        }

        const genericAgent = agent as GenericWidgetAgent;
        const status = this.normalizeToken(genericAgent.status);

        if (status === 'PENDING') {
            return null;
        }

        if (status === 'INVALID_JSON' || status.startsWith('INVALID')) {
            return {
                parseError: true,
                rawValue: this.truncatePreview(genericAgent.rawPreview ?? ''),
                errorMessage: genericAgent.message ?? 'Invalid agent JSON.',
            };
        }

        if (genericAgent.result !== undefined) {
            return genericAgent.result;
        }

        if (genericAgent.payload !== undefined) {
            return genericAgent.payload;
        }

        return genericAgent.status ? null : agent;
    }

    private matchesAgentIdentity(id: AgentFieldId, value: unknown): boolean {
        if (value === null || value === undefined) {
            return false;
        }

        const normalized = this.normalizeSearchText(value);
        const matcher = this.agentMatchers[id];

        if (!normalized) {
            return false;
        }

        if (
            normalized === this.normalizeSearchText(id) ||
            normalized === this.normalizeSearchText(matcher.slotName)
        ) {
            return true;
        }

        return matcher.tokens.every((token) => normalized.includes(token));
    }

    private parseAgentCandidate<T extends AgentResult>(value: unknown): ParsedAgentCandidate<T> {
        if (value === null || value === undefined) {
            return { hasValue: false, result: null, parseError: null };
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return { hasValue: false, result: null, parseError: null };
            }

            try {
                const parsed = JSON.parse(trimmed);
                return this.normalizeParsedAgentCandidate<T>(parsed, trimmed);
            } catch (error) {
                return {
                    hasValue: true,
                    result: null,
                    parseError: {
                        parseError: true,
                        rawValue: this.truncatePreview(trimmed),
                        errorMessage: error instanceof Error ? error.message : 'Invalid JSON string',
                    },
                };
            }
        }

        return this.normalizeParsedAgentCandidate<T>(value);
    }

    private normalizeParsedAgentCandidate<T extends AgentResult>(
        value: unknown,
        rawValue?: string
    ): ParsedAgentCandidate<T> {
        if (!this.isPlainObject(value)) {
            return {
                hasValue: true,
                result: null,
                parseError: {
                    parseError: true,
                    rawValue: rawValue ?? this.truncatePreview(String(value)),
                    errorMessage: 'Expected an agent JSON object.',
                },
            };
        }

        if (value['parseError'] === true) {
            return {
                hasValue: true,
                result: null,
                parseError: {
                    parseError: true,
                    rawValue: this.truncatePreview(String(value['rawValue'] ?? rawValue ?? '')),
                    errorMessage: String(value['errorMessage'] ?? 'Agent result could not be parsed.'),
                },
            };
        }

        return {
            hasValue: true,
            result: Object.keys(value).length ? value as T : null,
            parseError: null,
        };
    }

    private parseJsonObject<T>(value: unknown): T | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return null;
            }

            try {
                const parsed = JSON.parse(trimmed);
                return this.isPlainObject(parsed) ? parsed as T : null;
            } catch {
                return null;
            }
        }

        return this.isPlainObject(value) ? value as T : null;
    }

    private buildMetrics(
        codingSource: AgentSource<CodingIntegrityResult>,
        complianceSource: AgentSource<ComplianceAlertResult>,
        financialSource: AgentSource<FinancialVarianceResult>
    ): AnalysisMetric[] {
        const coding = codingSource.result;
        const compliance = complianceSource.result;
        const financial = financialSource.result;
        const tariffDeviations = this.getFindings(financial)
            .filter((finding) => this.normalizeToken(finding.type) === 'TARIFF_DEVIATION')
            .length;

        return [
            {
                id: 'inconsistencies',
                label: 'Inconsistencies',
                value: coding ? this.formatCount(this.getFindings(coding).length) : '--',
                helper: this.getMetricHelper(codingSource, 'Coding findings detected'),
                pending: this.isPending(codingSource),
                invalid: this.isInvalid(codingSource),
            },
            {
                id: 'missing-docs',
                label: 'Missing Docs',
                value: compliance ? this.formatCount(this.getMissingDocumentsCount(compliance)) : '--',
                helper: this.getMetricHelper(complianceSource, 'Required support gaps'),
                pending: this.isPending(complianceSource),
                invalid: this.isInvalid(complianceSource),
            },
            {
                id: 'tariff-deviations',
                label: 'Tariff Deviations',
                value: financial ? this.formatCount(tariffDeviations) : '--',
                helper: this.getMetricHelper(financialSource, 'Contract variance findings'),
                pending: this.isPending(financialSource),
                invalid: this.isInvalid(financialSource),
            },
        ];
    }

    private buildAgentCard<T extends AgentResult>(
        source: AgentSource<T>,
        icon: string,
        tone: AgentTone,
        actionLabel: string,
        actionIcon: string
    ): AgentCard {
        const result = source.result;
        const parseError = source.parseError;
        const finding = result ? this.selectPrimaryFinding(source.id, this.getFindings(result)) : null;
        const riskLabel = this.humanizeRisk(finding?.riskLevel ?? finding?.severity ?? result?.overallRiskLevel);
        const invalid = Boolean(parseError);
        const pending = !result && !parseError;

        return {
            id: source.id,
            label: this.agentLabels[source.id],
            title: invalid ? 'Invalid agent JSON' : finding ? this.getFindingTitle(finding) : result ? 'No blocking findings' : 'Pending agent result',
            icon,
            tone,
            actionLabel,
            actionIcon,
            pending,
            invalid,
            riskLabel: invalid ? 'Invalid JSON' : riskLabel,
            riskTone: invalid ? 'high' : this.getRiskTone(finding?.riskLevel ?? finding?.severity ?? result?.overallRiskLevel),
            findingTitle: invalid ? 'Invalid agent JSON' : finding ? this.getFindingTitle(finding) : result ? 'Agent result available' : 'Pending agent result',
            findingDescription: invalid
                ? parseError?.errorMessage ?? 'The agent output could not be parsed as JSON.'
                : finding ? this.getFindingDescription(finding, result) : result?.summary ?? 'Waiting for Automate to populate this local variable.',
            summary: invalid ? 'The widget received a value, but it was not valid JSON.' : result?.summary ?? 'No structured JSON was found for this agent output.',
            meta: invalid ? [`Variable: ${source.id}`, parseError?.rawValue ? `Raw: ${parseError.rawValue}` : 'Invalid JSON'] : this.buildAgentMeta(source.id, result, finding),
        };
    }

    private buildAgentMeta(id: AgentFieldId, result: AgentResult | null, finding: AgentFinding | null): string[] {
        if (!result) {
            return [`Variable: ${id}`, 'JSON string expected'];
        }

        if (id === 'codingIntegrityResult') {
            const coding = result as CodingIntegrityResult;
            return [
                `${this.formatCount(coding.codingSummary?.serviceItemsAnalyzed ?? 0)} services`,
                `${this.formatCount(coding.codingSummary?.procedureCodesDetected ?? 0)} procedure codes`,
            ];
        }

        if (id === 'complianceAlertResult') {
            const compliance = result as ComplianceAlertResult;
            return [
                `${this.formatCount(this.getMissingDocumentsCount(compliance))} missing docs`,
                `${this.formatCount(compliance.complianceSummary?.reviewRequiredDocuments ?? 0)} review required`,
            ];
        }

        const financial = result as FinancialVarianceResult;
        return [
            finding?.serviceCode ?? finding?.procedureCode ?? 'Service pending',
            financial.analyzedTotals?.variancePercentage !== undefined
                ? `${financial.analyzedTotals.variancePercentage}% variance`
                : 'Variance pending',
        ];
    }

    private buildRecommendedActions(sources: Array<AgentSource<AgentResult>>): RecommendedActionView[] {
        const actions = sources.flatMap((source) => {
            if (source.parseError) {
                return [{
                    id: `${source.id}-invalid-json`,
                    label: `${this.agentLabels[source.id]} returned invalid JSON`,
                    owner: 'Automate',
                    priority: 'INVALID',
                    tone: 'high' as RiskTone,
                    icon: 'error',
                }];
            }

            if (!source.result) {
                return [{
                    id: `${source.id}-pending`,
                    label: `${this.agentLabels[source.id]} result is pending`,
                    owner: 'Automate',
                    priority: 'PENDING',
                    tone: 'pending' as RiskTone,
                    icon: 'hourglass_empty',
                }];
            }

            return (source.result.recommendedActions ?? []).map((action, index) => ({
                id: `${source.id}-${index}`,
                label: action.action ?? `${this.agentLabels[source.id]} review required`,
                owner: action.owner ?? 'Review Team',
                priority: action.priority ?? source.result?.overallRiskLevel ?? 'MEDIUM',
                tone: this.getRiskTone(action.priority ?? source.result?.overallRiskLevel),
                icon: this.getActionIcon(source.id),
            }));
        });

        if (!actions.length) {
            return [{
                id: 'all-clear',
                label: 'No recommended actions returned by the agents',
                owner: 'Analysis Center',
                priority: 'LOW',
                tone: 'low',
                icon: 'task_alt',
            }];
        }

        return actions.slice(0, 6);
    }

    private buildBilledItems(
        coding: CodingIntegrityResult | null,
        compliance: ComplianceAlertResult | null,
        financial: FinancialVarianceResult | null
    ): BilledItemRow[] {
        const rows = new Map<string, BilledItemRow>();

        this.addFindingsToRows(rows, 'codingIntegrityResult', this.getFindings(coding), 'Coding Review', 'Update CUPS');
        this.addFindingsToRows(rows, 'complianceAlertResult', this.getFindings(compliance), 'Missing Doc', 'Request Authorization');
        this.addFindingsToRows(rows, 'financialVarianceResult', this.getFindings(financial), 'Tariff Review', 'Review Contract');

        return Array.from(rows.values()).sort((left, right) => this.getRiskScore(right.riskLabel) - this.getRiskScore(left.riskLabel));
    }

    private addFindingsToRows(
        rows: Map<string, BilledItemRow>,
        sourceId: AgentFieldId,
        findings: AgentFinding[],
        status: string,
        actionLabel: string
    ): void {
        findings.forEach((finding, index) => {
            const id = finding.serviceCode ?? finding.procedureCode ?? finding.findingId ?? `${sourceId}-${index}`;
            const existing = rows.get(id);
            const riskLabel = this.humanizeRisk(finding.riskLevel ?? finding.severity);
            const nextRow: BilledItemRow = {
                id,
                code: finding.serviceCode ?? finding.procedureCode ?? finding.diagnosisCode ?? finding.findingId ?? 'N/A',
                description: this.getFindingDescription(finding),
                amount: finding.billedAmount ?? finding.expectedAmount ?? finding.approvedAmount ?? null,
                riskLabel,
                riskTone: this.getRiskTone(finding.riskLevel ?? finding.severity),
                aiStatus: this.normalizeToken(finding.type) === 'TARIFF_DEVIATION' ? 'Tariff Deviation' : status,
                actionLabel,
            };

            if (!existing) {
                rows.set(id, nextRow);
                return;
            }

            rows.set(id, {
                ...existing,
                description: this.getRiskScore(riskLabel) > this.getRiskScore(existing.riskLabel) ? nextRow.description : existing.description,
                amount: existing.amount ?? nextRow.amount,
                riskLabel: this.getRiskScore(riskLabel) > this.getRiskScore(existing.riskLabel) ? riskLabel : existing.riskLabel,
                riskTone: this.getRiskScore(riskLabel) > this.getRiskScore(existing.riskLabel) ? nextRow.riskTone : existing.riskTone,
                aiStatus: existing.aiStatus === nextRow.aiStatus ? existing.aiStatus : 'Multi-agent Review',
                actionLabel: existing.actionLabel === nextRow.actionLabel ? existing.actionLabel : 'Open Findings',
            });
        });
    }

    private selectPrimaryFinding(id: AgentFieldId, findings: AgentFinding[]): AgentFinding | null {
        if (!findings.length) {
            return null;
        }

        if (id === 'financialVarianceResult') {
            return findings.find((finding) => this.normalizeToken(finding.type) === 'TARIFF_DEVIATION')
                ?? this.findHighestRiskFinding(findings);
        }

        return this.findHighestRiskFinding(findings);
    }

    private findHighestRiskFinding(findings: AgentFinding[]): AgentFinding {
        return [...findings].sort((left, right) => {
            const rightRisk = this.getRiskScore(right.riskLevel ?? right.severity);
            const leftRisk = this.getRiskScore(left.riskLevel ?? left.severity);

            return rightRisk - leftRisk;
        })[0];
    }

    private getHighestRiskScore(sources: Array<AgentSource<AgentResult>>): number {
        return Math.max(
            0,
            ...sources.flatMap((source) => [
                this.getRiskScore(source.result?.overallRiskLevel),
                ...this.getFindings(source.result).map((finding) => this.getRiskScore(finding.riskLevel ?? finding.severity)),
            ])
        );
    }

    private buildRiskSummary(sources: Array<AgentSource<AgentResult>>, missingAgentLabels: string[]): string {
        const invalidAgentLabels = sources
            .filter((source) => source.parseError)
            .map((source) => this.agentLabels[source.id]);

        if (invalidAgentLabels.length) {
            return `Invalid JSON received from ${invalidAgentLabels.join(', ')}. Review the unified widget payload before approval.`;
        }

        if (missingAgentLabels.length) {
            return `Waiting for ${missingAgentLabels.join(', ')} before approval can proceed.`;
        }

        const highRiskSummary = sources
            .map((source) => source.result)
            .filter((result): result is AgentResult => Boolean(result))
            .sort((left, right) => this.getRiskScore(right.overallRiskLevel) - this.getRiskScore(left.overallRiskLevel))[0]?.summary;

        return highRiskSummary ?? 'Agents did not return blocking analysis details.';
    }

    private getAnalyzedClaims(coding: CodingIntegrityResult | null): number {
        return coding?.codingSummary?.serviceItemsAnalyzed
            ?? coding?.codingSummary?.procedureCodesDetected
            ?? this.getFindings(coding).length;
    }

    private getMissingDocumentsCount(compliance: ComplianceAlertResult): number {
        return compliance.complianceSummary?.missingRequiredDocuments
            ?? compliance.missingDocuments?.length
            ?? 0;
    }

    private getFindings(result: AgentResult | null): AgentFinding[] {
        return Array.isArray(result?.findings) ? result.findings : [];
    }

    private getFindingTitle(finding: AgentFinding): string {
        return finding.title
            ?? this.humanizeToken(finding.type)
            ?? finding.findingId
            ?? 'Analysis finding';
    }

    private getFindingDescription(finding: AgentFinding, result?: AgentResult): string {
        return finding.description
            ?? finding.reason
            ?? finding.recommendation
            ?? result?.summary
            ?? 'Agent returned a finding without descriptive text.';
    }

    private getMetricHelper<T extends AgentResult>(source: AgentSource<T>, readyHelper: string): string {
        if (source.parseError) {
            return 'Invalid agent JSON';
        }

        return source.result ? readyHelper : 'Pending agent result';
    }

    private isPending<T extends AgentResult>(source: AgentSource<T>): boolean {
        return !source.result && !source.parseError;
    }

    private isInvalid<T extends AgentResult>(source: AgentSource<T>): boolean {
        return Boolean(source.parseError);
    }

    private getActionIcon(id: AgentFieldId): string {
        if (id === 'codingIntegrityResult') {
            return 'sell';
        }

        if (id === 'complianceAlertResult') {
            return 'mail';
        }

        return 'plagiarism';
    }

    private getRiskLabelFromScore(score: number): string {
        if (score >= 95) {
            return 'Critical Risk';
        }

        if (score >= 82) {
            return 'High Risk';
        }

        if (score >= 58) {
            return 'Medium Risk';
        }

        if (score >= 28) {
            return 'Low Risk';
        }

        return 'Pending Agents';
    }

    private getRiskToneFromScore(score: number): RiskTone {
        if (score >= 95) {
            return 'critical';
        }

        if (score >= 82) {
            return 'high';
        }

        if (score >= 58) {
            return 'medium';
        }

        if (score >= 28) {
            return 'low';
        }

        return 'pending';
    }

    private humanizeRisk(value: string | undefined): string {
        const normalized = this.normalizeToken(value);

        if (!normalized) {
            return 'Pending';
        }

        return `${this.humanizeToken(normalized.replace(/_RISK$/, ''))} Risk`;
    }

    private getRiskTone(value: string | undefined): RiskTone {
        const normalized = this.normalizeToken(value);

        if (normalized === 'CRITICAL' || normalized === 'CRITICAL_RISK') {
            return 'critical';
        }

        if (normalized === 'HIGH' || normalized === 'HIGH_RISK') {
            return 'high';
        }

        if (normalized === 'MEDIUM' || normalized === 'MEDIUM_RISK') {
            return 'medium';
        }

        if (normalized === 'LOW' || normalized === 'LOW_RISK') {
            return 'low';
        }

        return 'pending';
    }

    private getRiskScore(value: string | undefined): number {
        const normalized = this.normalizeToken(value);

        if (normalized === 'CRITICAL' || normalized === 'CRITICAL_RISK') {
            return 95;
        }

        if (normalized === 'HIGH' || normalized === 'HIGH_RISK') {
            return 82;
        }

        if (normalized === 'MEDIUM' || normalized === 'MEDIUM_RISK') {
            return 58;
        }

        if (normalized === 'LOW' || normalized === 'LOW_RISK') {
            return 28;
        }

        return 0;
    }

    private humanizeToken(value: string | undefined): string {
        const normalized = this.normalizeToken(value);
        if (!normalized) {
            return '';
        }

        return normalized
            .toLowerCase()
            .split('_')
            .filter(Boolean)
            .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
            .join(' ');
    }

    private normalizeToken(value: string | undefined): string {
        return (value ?? '').trim().replace(/\s+/g, '_').toUpperCase();
    }

    private normalizeSearchText(value: unknown): string {
        return String(value ?? '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    private formatCount(value: number): string {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
    }

    private truncatePreview(value: string, maxLength = 96): string {
        return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
    }

    private isPlainObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}
