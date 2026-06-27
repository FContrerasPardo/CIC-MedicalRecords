import { evaluateTaskEligibility } from './task-eligibility';

describe('evaluateTaskEligibility', () => {
    it('marks intake tasks as eligible when batchState is ready for analysis', () => {
        const result = evaluateTaskEligibility(
            {
                batchState: JSON.stringify({
                    documents: [
                        {
                            id: 'doc-1',
                            name: 'Invoice.pdf',
                            fields: [{ name: 'Patient Name', value: 'Maria Martinez' }],
                            extractionReviewStatus: 'Complete',
                            classificationReviewStatus: 'Complete',
                            separationReviewStatus: 'Complete',
                            tables: [
                                {
                                    name: 'Services',
                                    rows: [
                                        {
                                            cells: [
                                                { name: 'Code', value: '001' },
                                                { name: 'Description', value: 'Consultation' },
                                                { name: 'Price', value: '100' },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }),
            },
            'Nueva Cuenta'
        );

        expect(result.taskType).toBe('intake');
        expect(result.eligible).toBe(true);
    });

    it('blocks intake tasks when batchState is missing support', () => {
        const result = evaluateTaskEligibility(
            {
                batchState: JSON.stringify({
                    documents: [
                        {
                            id: 'doc-1',
                            name: 'Invoice.pdf',
                            fields: [{ name: 'Patient Name', value: 'Maria Martinez' }],
                            extractionReviewStatus: 'Complete',
                            classificationReviewStatus: 'Complete',
                            separationReviewStatus: 'Complete',
                            tables: [
                                {
                                    name: 'Services',
                                    rows: [
                                        {
                                            cells: [
                                                { name: 'Code', value: '001' },
                                                { name: 'Description', value: 'Consultation' },
                                                { name: 'Price', value: '100' },
                                            ],
                                            requiredDocuments: ['Order.pdf'],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }),
            },
            'Nueva Cuenta'
        );

        expect(result.eligible).toBe(false);
        expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('marks analysis tasks as eligible when all agents are ready for approval', () => {
        const readyAgent = {
            readyForApproval: true,
            requiresManualReview: false,
            findings: [],
            recommendedActions: [],
        };

        const result = evaluateTaskEligibility(
            {
                codingIntegrityResult: JSON.stringify(readyAgent),
                complianceAlertResult: JSON.stringify(readyAgent),
                financialVarianceResult: JSON.stringify(readyAgent),
            },
            'Analysis'
        );

        expect(result.taskType).toBe('analysis');
        expect(result.eligible).toBe(true);
    });

    it('blocks validate rules tasks when agent sections have issues', () => {
        const result = evaluateTaskEligibility(
            {
                agentRulesWidget: [
                    {
                        id: 'payerCodingPolicy',
                        label: 'Coding policy',
                        group: 'Coding',
                        value: [{ riskLevel: 'HIGH', fields: [{ key: 'description', value: '' }] }],
                        valueType: 'list',
                    },
                ],
            },
            'Validate Rules'
        );

        expect(result.taskType).toBe('validateRules');
        expect(result.eligible).toBe(false);
    });
});
