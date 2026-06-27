import {
    AgentSource,
    buildAnalysisDashboardModel,
    filterFindings,
    getUniqueFindingTypes,
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

    it('exposes all findings and account-level rows', () => {
        const model = buildAnalysisDashboardModel(buildSources());

        expect(model.allFindings.length).toBe(6);
        expect(model.accountLevelItems.some((row) => row.code === 'FV-001')).toBe(true);
        expect(model.billedItemsByService.some((row) => row.code === '30305')).toBe(true);
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
