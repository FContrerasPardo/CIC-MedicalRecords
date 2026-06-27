export type AgentFieldId = 'codingIntegrityResult' | 'complianceAlertResult' | 'financialVarianceResult';
export type AgentTone = 'coding' | 'compliance' | 'financial';
export type RiskTone = 'critical' | 'high' | 'medium' | 'low' | 'pending';

export interface AgentParseError {
    parseError: true;
    rawValue?: string;
    errorMessage?: string;
}

export interface AgentFinding {
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

export interface AgentAction {
    action?: string;
    priority?: string;
    owner?: string;
}

export interface AgentResult {
    agentName?: string;
    overallRiskLevel?: string;
    summary?: string;
    findings?: AgentFinding[];
    recommendedActions?: AgentAction[];
    readyForApproval?: boolean;
    requiresManualReview?: boolean;
}

export interface CodingIntegrityResult extends AgentResult {
    codingSummary?: {
        procedureCodesDetected?: number;
        serviceItemsAnalyzed?: number;
        incompatibilitiesDetected?: number;
        duplicatesDetected?: number;
        missingDiagnosisSupport?: number;
    };
}

export interface ComplianceAlertResult extends AgentResult {
    complianceSummary?: {
        missingRequiredDocuments?: number;
        reviewRequiredDocuments?: number;
        servicesBlockedByMissingSupport?: number;
        payerPolicyValidationAvailable?: boolean;
    };
    missingDocuments?: Array<{
        documentType?: string;
        requiredFor?: string;
        priority?: string;
        reason?: string;
    }>;
}

export interface FinancialVarianceResult extends AgentResult {
    analyzedTotals?: {
        invoiceTotal?: number;
        itemizedTotal?: number;
        payerAmount?: number;
        detectedCurrency?: string;
        totalsMatch?: boolean;
        varianceAmount?: number;
        variancePercentage?: number;
    };
    tariffSummary?: {
        tariffValidationAvailable?: boolean;
        totalBilledServicesAnalyzed?: number;
        servicesWithMatchingTariff?: number;
        servicesWithoutMatchingTariff?: number;
        tariffDeviations?: number;
        missingSupportDocuments?: number;
    };
}

export interface AgentSource<T extends AgentResult = AgentResult> {
    id: AgentFieldId;
    result: T | null;
    parseError: AgentParseError | null;
}

export interface AnalysisMetric {
    id: string;
    labelKey: string;
    value: string;
    helper: string;
    pending: boolean;
    invalid: boolean;
}

export interface AgentCard {
    id: AgentFieldId;
    label: string;
    icon: string;
    tone: AgentTone;
    actionLabelKey: string;
    actionIcon: string;
    pending: boolean;
    invalid: boolean;
    riskLabel: string;
    riskTone: RiskTone;
    findingTitle: string;
    findingDescription: string;
    summary: string;
    meta: string[];
    findingsCount: number;
}

export interface RecommendedActionView {
    id: string;
    label: string;
    owner: string;
    priority: string;
    tone: RiskTone;
    icon: string;
    agentId: AgentFieldId;
}

export interface BilledItemRow {
    id: string;
    code: string;
    description: string;
    amount: number | null;
    riskLabel: string;
    riskTone: RiskTone;
    aiStatus: string;
    actionLabelKey: string;
    isAccountLevel: boolean;
}

export interface FindingRow {
    id: string;
    agentId: AgentFieldId;
    agentLabel: string;
    agentTone: AgentTone;
    type: string;
    typeLabel: string;
    riskLevel: RiskTone;
    riskLabel: string;
    title: string;
    reason: string;
    recommendation: string;
    serviceCode?: string;
    sourceDocument?: string;
    sourceField?: string;
    isAccountLevel: boolean;
}

export interface AnalysisDashboardModel {
    metrics: AnalysisMetric[];
    agentCards: AgentCard[];
    recommendedActions: RecommendedActionView[];
    billedItemsByService: BilledItemRow[];
    accountLevelItems: BilledItemRow[];
    allFindings: FindingRow[];
    currencyCode: string;
    riskScore: number;
    riskLabel: string;
    riskTone: RiskTone;
    riskSummary: string;
    analyzedClaims: string;
    totalValue: number | null;
    approvalStateLabelKey: string;
    missingAgentLabels: string[];
}

export const AGENT_FIELD_IDS: AgentFieldId[] = [
    'codingIntegrityResult',
    'complianceAlertResult',
    'financialVarianceResult',
];

export const AGENT_LABELS: Record<AgentFieldId, string> = {
    codingIntegrityResult: 'Coding Integrity',
    complianceAlertResult: 'Compliance Alert',
    financialVarianceResult: 'Financial Variance',
};

const AGENT_TONES: Record<AgentFieldId, AgentTone> = {
    codingIntegrityResult: 'coding',
    complianceAlertResult: 'compliance',
    financialVarianceResult: 'financial',
};

export function isAnalysisApprovalBlocked(sources: Array<AgentSource<AgentResult>>): boolean {
    return !sources.every(
        (source) => source.result?.readyForApproval === true && source.result?.requiresManualReview !== true
    );
}

export function isAnalysisReadyForApproval(sources: Array<AgentSource<AgentResult>>): boolean {
    if (!sources.length) {
        return false;
    }

    if (sources.some((source) => source.parseError)) {
        return false;
    }

    if (sources.some((source) => !source.result)) {
        return false;
    }

    return !isAnalysisApprovalBlocked(sources);
}

export function buildAnalysisDashboardModel(sources: Array<AgentSource<AgentResult>>): AnalysisDashboardModel {
    const coding = sources.find((source) => source.id === 'codingIntegrityResult') as AgentSource<CodingIntegrityResult>;
    const compliance = sources.find((source) => source.id === 'complianceAlertResult') as AgentSource<ComplianceAlertResult>;
    const financial = sources.find((source) => source.id === 'financialVarianceResult') as AgentSource<FinancialVarianceResult>;

    const missingAgentLabels = sources
        .filter((source) => !source.result && !source.parseError)
        .map((source) => AGENT_LABELS[source.id]);

    const approvalBlocked = isAnalysisApprovalBlocked(sources);

    const allFindings = buildAllFindings(sources);
    const billedSplit = splitBilledItems(coding?.result ?? null, compliance?.result ?? null, financial?.result ?? null);

    return {
        metrics: buildMetrics(coding, compliance, financial),
        agentCards: [
            buildAgentCard(coding, 'code', 'coding', 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.UPDATE_CUPS', 'sell'),
            buildAgentCard(compliance, 'assignment_late', 'compliance', 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.REQUEST_AUTHORIZATION', 'mail'),
            buildAgentCard(financial, 'request_quote', 'financial', 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.REVIEW_CONTRACT', 'plagiarism'),
        ],
        recommendedActions: buildRecommendedActions(sources),
        billedItemsByService: billedSplit.byService,
        accountLevelItems: billedSplit.accountLevel,
        allFindings,
        currencyCode: financial?.result?.analyzedTotals?.detectedCurrency ?? 'COP',
        riskScore: getHighestRiskScore(sources),
        riskLabel: getRiskLabelFromScore(getHighestRiskScore(sources)),
        riskTone: getRiskToneFromScore(getHighestRiskScore(sources)),
        riskSummary: buildRiskSummary(sources, missingAgentLabels),
        analyzedClaims: formatCount(getAnalyzedClaims(coding?.result ?? null)),
        totalValue: financial?.result?.analyzedTotals?.invoiceTotal ?? financial?.result?.analyzedTotals?.itemizedTotal ?? null,
        approvalStateLabelKey: approvalBlocked
            ? 'MEDICAL_RECORDS.ANALYSIS_WIDGET.APPROVAL_STATE.BLOCKED'
            : 'MEDICAL_RECORDS.ANALYSIS_WIDGET.APPROVAL_STATE.READY',
        missingAgentLabels,
    };
}

export function filterFindings(
    findings: FindingRow[],
    filters: { agentId?: AgentFieldId | null; riskTone?: RiskTone | null; type?: string | null }
): FindingRow[] {
    return findings.filter((finding) => {
        if (filters.agentId && finding.agentId !== filters.agentId) {
            return false;
        }

        if (filters.riskTone && finding.riskLevel !== filters.riskTone) {
            return false;
        }

        if (filters.type && normalizeToken(finding.type) !== normalizeToken(filters.type)) {
            return false;
        }

        return true;
    });
}

export function getUniqueFindingTypes(findings: FindingRow[]): string[] {
    const types = new Set(findings.map((finding) => normalizeToken(finding.type)).filter(Boolean));
    return Array.from(types).sort();
}

function buildAllFindings(sources: Array<AgentSource<AgentResult>>): FindingRow[] {
    return sources.flatMap((source) => {
        if (source.parseError || !source.result) {
            return [];
        }

        return getFindings(source.result).map((finding, index) => mapFindingRow(source.id, finding, index));
    }).sort((left, right) => getRiskScoreFromTone(right.riskLevel) - getRiskScoreFromTone(left.riskLevel));
}

function mapFindingRow(agentId: AgentFieldId, finding: AgentFinding, index: number): FindingRow {
    const type = finding.type ?? 'OTHER';
    const riskTone = getRiskTone(finding.riskLevel ?? finding.severity);
    const serviceCode = finding.serviceCode ?? finding.procedureCode ?? undefined;

    return {
        id: finding.findingId ?? `${agentId}-${index}`,
        agentId,
        agentLabel: AGENT_LABELS[agentId],
        agentTone: AGENT_TONES[agentId],
        type,
        typeLabel: humanizeToken(type),
        riskLevel: riskTone,
        riskLabel: humanizeRisk(finding.riskLevel ?? finding.severity),
        title: getFindingTitle(finding),
        reason: finding.reason ?? finding.description ?? '',
        recommendation: finding.recommendation ?? '',
        serviceCode,
        sourceDocument: finding.sourceDocument ?? undefined,
        sourceField: finding.sourceField ?? undefined,
        isAccountLevel: !serviceCode && !finding.diagnosisCode,
    };
}

function buildMetrics(
    codingSource: AgentSource<CodingIntegrityResult>,
    complianceSource: AgentSource<ComplianceAlertResult>,
    financialSource: AgentSource<FinancialVarianceResult>
): AnalysisMetric[] {
    const coding = codingSource?.result;
    const compliance = complianceSource?.result;
    const financial = financialSource?.result;

    return [
        {
            id: 'inconsistencies',
            labelKey: 'MEDICAL_RECORDS.ANALYSIS_WIDGET.METRICS.INCONSISTENCIES',
            value: coding ? formatCount(getFindings(coding).length) : '--',
            helper: getMetricHelper(codingSource, 'Coding findings detected'),
            pending: isPending(codingSource),
            invalid: isInvalid(codingSource),
        },
        {
            id: 'compliance-gaps',
            labelKey: 'MEDICAL_RECORDS.ANALYSIS_WIDGET.METRICS.COMPLIANCE_GAPS',
            value: compliance ? formatCount(getFindings(compliance).length) : '--',
            helper: getMetricHelper(complianceSource, 'Payer compliance findings'),
            pending: isPending(complianceSource),
            invalid: isInvalid(complianceSource),
        },
        {
            id: 'financial-issues',
            labelKey: 'MEDICAL_RECORDS.ANALYSIS_WIDGET.METRICS.FINANCIAL_ISSUES',
            value: financial ? formatCount(getFindings(financial).length) : '--',
            helper: getMetricHelper(financialSource, 'Financial variance findings'),
            pending: isPending(financialSource),
            invalid: isInvalid(financialSource),
        },
    ];
}

function buildAgentCard<T extends AgentResult>(
    source: AgentSource<T>,
    icon: string,
    tone: AgentTone,
    actionLabelKey: string,
    actionIcon: string
): AgentCard {
    const result = source.result;
    const parseError = source.parseError;
    const findings = getFindings(result);
    const finding = result ? selectPrimaryFinding(source.id, findings) : null;
    const riskLabel = humanizeRisk(finding?.riskLevel ?? finding?.severity ?? result?.overallRiskLevel);
    const invalid = Boolean(parseError);
    const pending = !result && !parseError;

    return {
        id: source.id,
        label: AGENT_LABELS[source.id],
        icon,
        tone,
        actionLabelKey,
        actionIcon,
        pending,
        invalid,
        riskLabel: invalid ? 'Invalid JSON' : riskLabel,
        riskTone: invalid ? 'high' : getRiskTone(finding?.riskLevel ?? finding?.severity ?? result?.overallRiskLevel),
        findingTitle: invalid ? 'Invalid agent JSON' : finding ? getFindingTitle(finding) : result ? 'No blocking findings' : 'Pending agent result',
        findingDescription: invalid
            ? parseError?.errorMessage ?? 'The agent output could not be parsed as JSON.'
            : finding ? getFindingDescription(finding, result) : result?.summary ?? 'Waiting for Automate to populate this local variable.',
        summary: invalid ? 'The widget received a value, but it was not valid JSON.' : result?.summary ?? 'No structured JSON was found for this agent output.',
        meta: invalid
            ? [`Variable: ${source.id}`, parseError?.rawValue ? `Raw: ${parseError.rawValue}` : 'Invalid JSON']
            : buildAgentMeta(source.id, result, finding, findings.length),
        findingsCount: findings.length,
    };
}

function buildAgentMeta(id: AgentFieldId, result: AgentResult | null, finding: AgentFinding | null, findingsCount: number): string[] {
    if (!result) {
        return [`Variable: ${id}`, 'JSON string expected'];
    }

    const countLabel = `${formatCount(findingsCount)} findings`;

    if (id === 'codingIntegrityResult') {
        const coding = result as CodingIntegrityResult;
        return [
            countLabel,
            `${formatCount(coding.codingSummary?.serviceItemsAnalyzed ?? 0)} services`,
        ];
    }

    if (id === 'complianceAlertResult') {
        return [countLabel, 'Payer readiness review'];
    }

    const financial = result as FinancialVarianceResult;
    return [
        countLabel,
        financial.analyzedTotals?.variancePercentage !== undefined
            ? `${financial.analyzedTotals.variancePercentage}% variance`
            : 'Variance pending',
    ];
}

function buildRecommendedActions(sources: Array<AgentSource<AgentResult>>): RecommendedActionView[] {
    const actions = sources.flatMap((source) => {
        if (source.parseError) {
            return [{
                id: `${source.id}-invalid-json`,
                label: `${AGENT_LABELS[source.id]} returned invalid JSON`,
                owner: 'Automate',
                priority: 'INVALID',
                tone: 'high' as RiskTone,
                icon: 'error',
                agentId: source.id,
            }];
        }

        if (!source.result) {
            return [{
                id: `${source.id}-pending`,
                label: `${AGENT_LABELS[source.id]} result is pending`,
                owner: 'Automate',
                priority: 'PENDING',
                tone: 'pending' as RiskTone,
                icon: 'hourglass_empty',
                agentId: source.id,
            }];
        }

        return (source.result.recommendedActions ?? []).map((action, index) => ({
            id: `${source.id}-${index}`,
            label: action.action ?? `${AGENT_LABELS[source.id]} review required`,
            owner: action.owner ?? 'Review Team',
            priority: action.priority ?? source.result?.overallRiskLevel ?? 'MEDIUM',
            tone: getRiskTone(action.priority ?? source.result?.overallRiskLevel),
            icon: getActionIcon(source.id),
            agentId: source.id,
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
            agentId: 'codingIntegrityResult',
        }];
    }

    return actions;
}

function splitBilledItems(
    coding: CodingIntegrityResult | null,
    compliance: ComplianceAlertResult | null,
    financial: FinancialVarianceResult | null
): { byService: BilledItemRow[]; accountLevel: BilledItemRow[] } {
    const byService = new Map<string, BilledItemRow>();
    const accountLevel: BilledItemRow[] = [];

    const addFindings = (
        sourceId: AgentFieldId,
        findings: AgentFinding[],
        statusKey: string,
        actionLabelKey: string
    ): void => {
        findings.forEach((finding, index) => {
            const row = mapBilledItemRow(sourceId, finding, index, statusKey, actionLabelKey);
            if (row.isAccountLevel) {
                accountLevel.push(row);
                return;
            }

            const existing = byService.get(row.id);
            if (!existing) {
                byService.set(row.id, row);
                return;
            }

            byService.set(row.id, mergeBilledRows(existing, row));
        });
    };

    addFindings('codingIntegrityResult', getFindings(coding), 'Coding Review', 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.UPDATE_CUPS');
    addFindings('complianceAlertResult', getFindings(compliance), 'Compliance Review', 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.REQUEST_AUTHORIZATION');
    addFindings('financialVarianceResult', getFindings(financial), humanizeToken('FINANCIAL_REVIEW'), 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.REVIEW_CONTRACT');

    return {
        byService: Array.from(byService.values()).sort(
            (left, right) => getRiskScoreFromLabel(right.riskLabel) - getRiskScoreFromLabel(left.riskLabel)
        ),
        accountLevel: accountLevel.sort(
            (left, right) => getRiskScoreFromLabel(right.riskLabel) - getRiskScoreFromLabel(left.riskLabel)
        ),
    };
}

function mapBilledItemRow(
    sourceId: AgentFieldId,
    finding: AgentFinding,
    index: number,
    defaultStatus: string,
    actionLabelKey: string
): BilledItemRow {
    const serviceCode = finding.serviceCode ?? finding.procedureCode;
    const isAccountLevel = !serviceCode && !finding.diagnosisCode;
    const id = serviceCode ?? finding.findingId ?? `${sourceId}-account-${index}`;
    const riskLabel = humanizeRisk(finding.riskLevel ?? finding.severity);
    const typeLabel = humanizeToken(finding.type);

    return {
        id,
        code: serviceCode ?? finding.diagnosisCode ?? finding.findingId ?? 'ACCOUNT',
        description: getFindingDescription(finding),
        amount: finding.billedAmount ?? finding.expectedAmount ?? finding.approvedAmount ?? null,
        riskLabel,
        riskTone: getRiskTone(finding.riskLevel ?? finding.severity),
        aiStatus: typeLabel || defaultStatus,
        actionLabelKey,
        isAccountLevel,
    };
}

function mergeBilledRows(existing: BilledItemRow, nextRow: BilledItemRow): BilledItemRow {
    const existingScore = getRiskScoreFromLabel(existing.riskLabel);
    const nextScore = getRiskScoreFromLabel(nextRow.riskLabel);

    return {
        ...existing,
        description: nextScore > existingScore ? nextRow.description : existing.description,
        amount: existing.amount ?? nextRow.amount,
        riskLabel: nextScore > existingScore ? nextRow.riskLabel : existing.riskLabel,
        riskTone: nextScore > existingScore ? nextRow.riskTone : existing.riskTone,
        aiStatus: existing.aiStatus === nextRow.aiStatus ? existing.aiStatus : 'Multi-agent Review',
        actionLabelKey: existing.actionLabelKey === nextRow.actionLabelKey
            ? existing.actionLabelKey
            : 'MEDICAL_RECORDS.ANALYSIS_WIDGET.ACTIONS.OPEN_FINDINGS',
    };
}

function selectPrimaryFinding(id: AgentFieldId, findings: AgentFinding[]): AgentFinding | null {
    if (!findings.length) {
        return null;
    }

    if (id === 'financialVarianceResult') {
        return findings.find((finding) => normalizeToken(finding.type) === 'TARIFF_DEVIATION')
            ?? findHighestRiskFinding(findings);
    }

    return findHighestRiskFinding(findings);
}

function findHighestRiskFinding(findings: AgentFinding[]): AgentFinding {
    return [...findings].sort((left, right) => {
        return getRiskScore(right.riskLevel ?? right.severity) - getRiskScore(left.riskLevel ?? left.severity);
    })[0];
}

function getHighestRiskScore(sources: Array<AgentSource<AgentResult>>): number {
    return Math.max(
        0,
        ...sources.flatMap((source) => [
            getRiskScore(source.result?.overallRiskLevel),
            ...getFindings(source.result).map((finding) => getRiskScore(finding.riskLevel ?? finding.severity)),
        ])
    );
}

function buildRiskSummary(sources: Array<AgentSource<AgentResult>>, missingAgentLabels: string[]): string {
    const invalidAgentLabels = sources
        .filter((source) => source.parseError)
        .map((source) => AGENT_LABELS[source.id]);

    if (invalidAgentLabels.length) {
        return `Invalid JSON received from ${invalidAgentLabels.join(', ')}. Review the unified widget payload before approval.`;
    }

    if (missingAgentLabels.length) {
        return `Waiting for ${missingAgentLabels.join(', ')} before approval can proceed.`;
    }

    const highRiskAgents = sources
        .map((source) => source.result)
        .filter((result): result is AgentResult => Boolean(result))
        .filter((result) => getRiskScore(result.overallRiskLevel) >= 82);

    if (highRiskAgents.length > 1) {
        return `${highRiskAgents.length} high-risk areas across coding, compliance, and financial analysis. Review all findings before completing the task.`;
    }

    const topSummary = sources
        .map((source) => source.result)
        .filter((result): result is AgentResult => Boolean(result))
        .sort((left, right) => getRiskScore(right.overallRiskLevel) - getRiskScore(left.overallRiskLevel))[0]?.summary;

    return topSummary ?? 'Agents did not return blocking analysis details.';
}

function getAnalyzedClaims(coding: CodingIntegrityResult | null): number {
    return coding?.codingSummary?.serviceItemsAnalyzed
        ?? coding?.codingSummary?.procedureCodesDetected
        ?? getFindings(coding).length;
}

function getFindings(result: AgentResult | null | undefined): AgentFinding[] {
    return Array.isArray(result?.findings) ? result.findings : [];
}

function getFindingTitle(finding: AgentFinding): string {
    return finding.title
        ?? humanizeToken(finding.type)
        ?? finding.findingId
        ?? 'Analysis finding';
}

function getFindingDescription(finding: AgentFinding, result?: AgentResult | null): string {
    return finding.description
        ?? finding.reason
        ?? finding.recommendation
        ?? result?.summary
        ?? 'Agent returned a finding without descriptive text.';
}

function getMetricHelper<T extends AgentResult>(source: AgentSource<T>, readyHelper: string): string {
    if (source.parseError) {
        return 'Invalid agent JSON';
    }

    return source.result ? readyHelper : 'Pending agent result';
}

function isPending<T extends AgentResult>(source: AgentSource<T>): boolean {
    return !source.result && !source.parseError;
}

function isInvalid<T extends AgentResult>(source: AgentSource<T>): boolean {
    return Boolean(source.parseError);
}

function getActionIcon(id: AgentFieldId): string {
    if (id === 'codingIntegrityResult') {
        return 'sell';
    }

    if (id === 'complianceAlertResult') {
        return 'mail';
    }

    return 'plagiarism';
}

export function getRiskLabelFromScore(score: number): string {
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

export function getRiskToneFromScore(score: number): RiskTone {
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

function humanizeRisk(value: string | undefined): string {
    const normalized = normalizeToken(value);

    if (!normalized) {
        return 'Pending';
    }

    return `${humanizeToken(normalized.replace(/_RISK$/, ''))} Risk`;
}

export function getRiskTone(value: string | undefined): RiskTone {
    const normalized = normalizeToken(value);

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

function getRiskScore(value: string | undefined): number {
    const normalized = normalizeToken(value);

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

function getRiskScoreFromTone(tone: RiskTone): number {
    if (tone === 'critical') {
        return 95;
    }

    if (tone === 'high') {
        return 82;
    }

    if (tone === 'medium') {
        return 58;
    }

    if (tone === 'low') {
        return 28;
    }

    return 0;
}

function getRiskScoreFromLabel(label: string): number {
    if (label.includes('Critical')) {
        return 95;
    }

    if (label.includes('High')) {
        return 82;
    }

    if (label.includes('Medium')) {
        return 58;
    }

    if (label.includes('Low')) {
        return 28;
    }

    return 0;
}

export function humanizeToken(value: string | undefined): string {
    const normalized = normalizeToken(value);
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

export function normalizeToken(value: string | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, '_').toUpperCase();
}

function formatCount(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}
