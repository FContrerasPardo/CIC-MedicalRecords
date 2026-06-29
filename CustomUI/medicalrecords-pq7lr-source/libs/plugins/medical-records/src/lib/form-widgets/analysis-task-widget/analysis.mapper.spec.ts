import {
    AgentSource,
    buildAnalysisDashboardModel,
    filterFindings,
    getUniqueFindingTypes,
    getUniqueServiceCodes,
    groupFindingsByType,
    groupRecommendedActionsByPriority,
    RecommendedActionView,
} from './analysis.mapper';

const codingFixture = {
    agentName: 'Coding Integrity Agent',
    overallRiskLevel: 'HIGH',
    findings: [
        {
            findingId: 'F-001',
            type: 'MISSING_CODING_DATA',
            riskLevel: 'HIGH',
            description: 'No ICD-10 codes present.',
        },
        {
            findingId: 'F-002',
            type: 'DUPLICATED_CHARGE',
            riskLevel: 'MEDIUM',
            serviceCode: '30305',
            description: 'GLICEMIA billed 3 times.',
        },
    ],
    recommendedActions: [{ action: 'Assign ICD-10 codes', priority: 'HIGH', owner: 'Coding Specialist' }],
    readyForApproval: false,
    requiresManualReview: true,
    codingSummary: { serviceItemsAnalyzed: 120, procedureCodesDetected: 66 },
};

const complianceFixture = {
    agentName: 'Compliance Alert Agent',
    overallRiskLevel: 'HIGH',
    findings: [
        {
            findingId: 'F-001',
            type: 'DOCUMENT_REVIEW_REQUIRED',
            riskLevel: 'HIGH',
            description: 'Formulario de Objeciones requires manual review.',
        },
        {
            findingId: 'F-002',
            type: 'MISSING_AUTHORIZATION_DOCUMENT',
            riskLevel: 'HIGH',
            serviceCode: '71010',
            procedureCode: '903895',
        },
    ],
    recommendedActions: [{ action: 'Obtain prior authorization document', priority: 'HIGH', owner: 'Authorization Team' }],
    readyForApproval: false,
    requiresManualReview: true,
};

const financialFixture = {
    agentName: 'Financial Variance Agent',
    overallRiskLevel: 'HIGH',
    findings: [
        {
            findingId: 'FV-001',
            type: 'TOTAL_MISMATCH',
            riskLevel: 'HIGH',
            description: 'Invoice total mismatch.',
            billedAmount: 114846,
        },
        {
            findingId: 'FV-003',
            type: 'DUPLICATED_CHARGE',
            riskLevel: 'MEDIUM',
            serviceCode: '30305',
            procedureCode: '97',
            billedAmount: 622.74,
        },
    ],
    tariffSummary: { tariffDeviations: 0, totalBilledServicesAnalyzed: 136 },
    analyzedTotals: { invoiceTotal: 114846, detectedCurrency: 'DOP', variancePercentage: 22.91 },
    recommendedActions: [{ action: 'Verify invoice breakdown', priority: 'HIGH', owner: 'Billing Team' }],
    readyForApproval: false,
    requiresManualReview: true,
};

function buildSources(): Array<AgentSource> {
    return [
        { id: 'codingIntegrityResult', result: codingFixture, parseError: null },
        { id: 'complianceAlertResult', result: complianceFixture, parseError: null },
        { id: 'financialVarianceResult', result: financialFixture, parseError: null },
    ];
}

describe('analysis.mapper', () => {
    it('builds findings-based metrics', () => {
        const model = buildAnalysisDashboardModel(buildSources());

        expect(model.metrics[0].value).toBe('2');
        expect(model.metrics[1].value).toBe('2');
        expect(model.metrics[2].value).toBe('2');
        expect(model.metrics[1].labelKey).toBe('MEDICAL_RECORDS.ANALYSIS_WIDGET.METRICS.COMPLIANCE_GAPS');
    });

    it('enriches findings with code, amount and scope', () => {
        const model = buildAnalysisDashboardModel(buildSources());

        expect(model.allFindings.length).toBe(6);

        const serviceFinding = model.allFindings.find((finding) => finding.code === '30305');
        expect(serviceFinding).toBeDefined();
        expect(serviceFinding?.isAccountLevel).toBe(false);

        const accountFinding = model.allFindings.find((finding) => finding.type === 'TOTAL_MISMATCH');
        expect(accountFinding?.isAccountLevel).toBe(true);
        expect(accountFinding?.code).toBeUndefined();
        expect(accountFinding?.amount).toBe(114846);
    });

    it('counts financial issues beyond tariff deviation', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const financialFindings = model.allFindings.filter((finding) => finding.agentId === 'financialVarianceResult');

        expect(financialFindings.length).toBe(2);
        expect(financialFindings.some((finding) => finding.type === 'TOTAL_MISMATCH')).toBe(true);
    });

    it('filters findings by agent and risk', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const filtered = filterFindings(model.allFindings, {
            agentId: 'complianceAlertResult',
            riskTone: 'high',
        });

        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every((finding) => finding.agentId === 'complianceAlertResult')).toBe(true);
    });

    it('returns unique finding types for filter dropdown', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const types = getUniqueFindingTypes(model.allFindings);

        expect(types).toContain('TOTAL_MISMATCH');
        expect(types).toContain('DOCUMENT_REVIEW_REQUIRED');
    });

    it('filters findings by service scope', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const serviceOnly = filterFindings(model.allFindings, { scope: 'service' });

        expect(serviceOnly.length).toBeGreaterThan(0);
        expect(serviceOnly.every((finding) => !finding.isAccountLevel)).toBe(true);
    });

    it('filters findings by account scope', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const accountOnly = filterFindings(model.allFindings, { scope: 'account' });

        expect(accountOnly.length).toBeGreaterThan(0);
        expect(accountOnly.every((finding) => finding.isAccountLevel)).toBe(true);
    });

    it('filters findings by a specific service code', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const byCode = filterFindings(model.allFindings, { serviceCode: '30305' });

        expect(byCode.length).toBeGreaterThan(0);
        expect(byCode.every((finding) => finding.code === '30305')).toBe(true);
    });

    it('lists unique service codes excluding account-level findings', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const codes = getUniqueServiceCodes(model.allFindings);

        expect(codes).toContain('30305');
        expect(codes).toContain('71010');
        expect(codes).not.toContain('ACCOUNT');
    });

    it('includes all recommended actions without a six-item cap', () => {
        const sources = buildSources();
        sources[0].result = {
            ...codingFixture,
            recommendedActions: Array.from({ length: 4 }, (_, index) => ({
                action: `Action ${index + 1}`,
                priority: 'MEDIUM',
                owner: 'Coding Specialist',
            })),
        };

        const model = buildAnalysisDashboardModel(sources);

        expect(model.recommendedActions.length).toBe(6);
    });

    it('marks approval as blocked when manual review is required', () => {
        const model = buildAnalysisDashboardModel(buildSources());

        expect(model.approvalStateLabelKey).toBe('MEDICAL_RECORDS.ANALYSIS_WIDGET.APPROVAL_STATE.BLOCKED');
    });
});

describe('groupFindingsByType', () => {
    it('clusters repeated finding types and keeps singles separate', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const clusters = groupFindingsByType(model.allFindings);

        const duplicated = clusters.find((cluster) => cluster.id === 'DUPLICATED_CHARGE');
        expect(duplicated).toBeDefined();
        expect(duplicated?.count).toBe(2);
        expect(duplicated?.isSingle).toBe(false);
        expect(duplicated?.findings.length).toBe(2);

        const totalMismatch = clusters.find((cluster) => cluster.id === 'TOTAL_MISMATCH');
        expect(totalMismatch?.isSingle).toBe(true);
        expect(totalMismatch?.count).toBe(1);
    });

    it('records every contributing agent tone in a cluster', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const clusters = groupFindingsByType(model.allFindings);
        const duplicated = clusters.find((cluster) => cluster.id === 'DUPLICATED_CHARGE');

        expect(duplicated?.agentTones).toContain('coding');
        expect(duplicated?.agentTones).toContain('financial');
    });

    it('orders clusters by highest risk first and pushes lower risk last', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const clusters = groupFindingsByType(model.allFindings);

        expect(clusters[0].topRiskTone).toBe('high');
        expect(clusters[clusters.length - 1].id).toBe('DUPLICATED_CHARGE');
    });

    it('returns an empty array when there are no findings', () => {
        expect(groupFindingsByType([])).toEqual([]);
    });
});

describe('groupRecommendedActionsByPriority', () => {
    it('groups actions by tone and drops empty buckets', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const groups = groupRecommendedActionsByPriority(model.recommendedActions);

        expect(groups.length).toBe(1);
        expect(groups[0].tone).toBe('high');
        expect(groups[0].count).toBe(3);
        expect(groups[0].labelKey).toBe('MEDICAL_RECORDS.ANALYSIS_WIDGET.FILTERS.RISK_HIGH');
    });

    it('orders groups critical before lower priorities', () => {
        const mixed: RecommendedActionView[] = [
            { id: 'a', label: 'a', owner: 'o', priority: 'LOW', tone: 'low', icon: 'x', agentId: 'codingIntegrityResult' },
            { id: 'b', label: 'b', owner: 'o', priority: 'CRITICAL', tone: 'critical', icon: 'x', agentId: 'codingIntegrityResult' },
            { id: 'c', label: 'c', owner: 'o', priority: 'MEDIUM', tone: 'medium', icon: 'x', agentId: 'codingIntegrityResult' },
        ];
        const groups = groupRecommendedActionsByPriority(mixed);

        expect(groups.map((group) => group.tone)).toEqual(['critical', 'medium', 'low']);
    });
});

describe('triage summary', () => {
    it('builds a severity distribution across all findings', () => {
        const model = buildAnalysisDashboardModel(buildSources());
        const byTone = Object.fromEntries(model.severityDistribution.map((bucket) => [bucket.tone, bucket.count]));

        expect(model.severityDistribution.map((bucket) => bucket.tone)).toEqual(['critical', 'high', 'medium', 'low']);
        expect(byTone['high']).toBe(4);
        expect(byTone['medium']).toBe(2);
        expect(byTone['critical']).toBe(0);
        expect(byTone['low']).toBe(0);
    });

    it('derives a top-priority insight from the highest-risk finding', () => {
        const model = buildAnalysisDashboardModel(buildSources());

        expect(model.topPriorityInsight).toBe('Missing Coding Data');
    });

    it('returns an empty insight and a zeroed distribution when there are no findings', () => {
        const empty = buildAnalysisDashboardModel([
            { id: 'codingIntegrityResult', result: null, parseError: null },
            { id: 'complianceAlertResult', result: null, parseError: null },
            { id: 'financialVarianceResult', result: null, parseError: null },
        ]);

        expect(empty.topPriorityInsight).toBe('');
        expect(empty.severityDistribution.every((bucket) => bucket.count === 0)).toBe(true);
    });
});
