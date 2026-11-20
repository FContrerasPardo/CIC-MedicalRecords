import {
    addFinding,
    advanceCommunication,
    AuditFinding,
    availableToObject,
    commentsForInvoice,
    emptyAuditRecord,
    fromAgentFinding,
    fromIntakeService,
    fromProviderComment,
    parseAuditState,
    parseProviderComments,
    proposeGlosa,
    removeIntakeFindings,
    responsesForFinding,
    setFindingStatus,
    sortAuditQueue,
    summarizeFinancials,
    withRecord,
    emptyAuditState,
} from './audit-findings.util';

// Synthetic data only.
const INVOICE = 'inv-A';

function finding(overrides: Partial<AuditFinding> = {}): AuditFinding {
    return {
        id: 'f1',
        origin: 'intake',
        alsoReportedBy: [],
        invoiceKey: INVOICE,
        serviceCode: 'S-100',
        document: null,
        description: 'Missing support',
        evidence: null,
        severity: null,
        status: 'open',
        comment: null,
        amount: 1000,
        sourceRef: 's1',
        ...overrides,
    };
}

describe('audit-findings.util', () => {
    describe('fromAgentFinding', () => {
        it('maps description, service, evidence and severity from the agent', () => {
            const result = fromAgentFinding('financialVariance', INVOICE, {
                findingId: 'FV-1',
                riskLevel: 'HIGH',
                description: 'Tariff deviation',
                reason: 'Billed above contract',
                serviceCode: 'S-100',
                sourceDocument: 'invoice.pdf',
                billedAmount: 500,
            }, 0);
            expect(result.id).toBe('financialVariance:inv-A:FV-1');
            expect(result.severity).toBe('high');
            expect(result.serviceCode).toBe('S-100');
            expect(result.evidence).toBe('Billed above contract · invoice.pdf');
            expect(result.amount).toBe(500);
        });

        it('leaves severity empty when the agent does not provide a known level', () => {
            expect(fromAgentFinding('codingIntegrity', INVOICE, { description: 'x', riskLevel: 'UNKNOWN' }, 2).severity).toBeNull();
            expect(fromAgentFinding('codingIntegrity', INVOICE, { description: 'x' }, 2).sourceRef).toBe('#3');
        });
    });

    describe('fromIntakeService', () => {
        it('uses missing documents as evidence and no severity', () => {
            const result = fromIntakeService(INVOICE, {
                id: 'svc-1',
                serviceCode: 'S-200',
                description: 'MRI',
                total: '2,500.00',
                supportStatus: 'Missing Support',
                missingDocuments: ['Medical order'],
                alerts: [],
            });
            expect(result.origin).toBe('intake');
            expect(result.document).toBe('Medical order');
            expect(result.severity).toBeNull();
            expect(result.amount).toBe(2500);
            expect(result.description).toBe('MRI — Missing Support');
        });

        it('takes Price x Quantity as amount when the row has no Total', () => {
            const result = fromIntakeService(INVOICE, { id: 'svc-2', serviceCode: 'S-201', description: 'Synthetic lab', quantity: '3', price: '1.200,50', total: null, supportStatus: 'Supported', missingDocuments: [], alerts: [] });
            expect(result.amount).toBe(3601.5);
        });
    });

    describe('addFinding', () => {
        it('adds new findings and ignores the same source item twice', () => {
            const first = addFinding(emptyAuditRecord(), finding());
            expect(first.added).toBe(true);
            const again = addFinding(first.record, finding({ description: 'changed text' }));
            expect(again.added).toBe(false);
            expect(again.record.findings.length).toBe(1);
        });

        it('merges the same observation from another origin', () => {
            const first = addFinding(emptyAuditRecord(), finding()).record;
            const dup = addFinding(first, finding({ id: 'other', origin: 'complianceAlert', sourceRef: 'C-1', description: 'missing  SUPPORT' }));
            expect(dup.added).toBe(false);
            expect(dup.existingId).toBe('f1');
            expect(dup.record.findings[0].alsoReportedBy).toEqual(['complianceAlert']);
        });

        it('keeps different observations on the same service', () => {
            const first = addFinding(emptyAuditRecord(), finding()).record;
            const other = addFinding(first, finding({ id: 'f2', origin: 'codingIntegrity', sourceRef: 'CI-1', description: 'Invalid code' }));
            expect(other.added).toBe(true);
            expect(other.record.findings.length).toBe(2);
        });
    });

    describe('removeIntakeFindings', () => {
        const record = () => ({
            ...emptyAuditRecord(),
            findings: [finding(), finding({ id: 'f2', origin: 'codingIntegrity', sourceRef: 'CI-1', description: 'Invalid code' }), finding({ id: 'f3', sourceRef: 's3', description: 'Other gap' })],
            glosas: [
                { findingId: 'f1', invoiceKey: INVOICE, reason: 'Synthetic reason', serviceCode: 'S-100', objectedAmount: 100, comment: null },
                { findingId: 'f2', invoiceKey: INVOICE, reason: 'Synthetic reason', serviceCode: 'S-100', objectedAmount: 50, comment: null },
            ],
        });

        it('removes intake findings and their proposed glosas', () => {
            const next = removeIntakeFindings(record(), ['f1']);
            expect(next.findings.map((item) => item.id)).toEqual(['f2', 'f3']);
            expect(next.glosas.map((glosa) => glosa.findingId)).toEqual(['f2']);
        });

        it('never removes agent findings', () => {
            const base = record();
            const next = removeIntakeFindings(base, ['f2']);
            expect(next).toBe(base);
            expect(removeIntakeFindings(base, ['f2', 'f3']).findings.map((item) => item.id)).toEqual(['f1', 'f2']);
        });

        it('returns the same record when nothing matches', () => {
            const base = record();
            expect(removeIntakeFindings(base, [])).toBe(base);
            expect(removeIntakeFindings(base, ['unknown'])).toBe(base);
        });
    });

    describe('proposeGlosa', () => {
        const base = () => addFinding(emptyAuditRecord(), finding()).record;

        it('creates a glosa within the service amount and marks the finding', () => {
            const result = proposeGlosa(base(), 'f1', { reason: 'No support', objectedAmount: '400', comment: 'see order' }, 5000);
            expect(result.ok).toBe(true);
            expect(result.record?.glosas[0].objectedAmount).toBe(400);
            expect(result.record?.findings[0].status).toBe('glosa');
        });

        it('rejects amounts above the service, empty reasons and non-positive amounts', () => {
            const over = proposeGlosa(base(), 'f1', { reason: 'r', objectedAmount: 1500 }, 5000);
            expect(over.ok).toBe(false);
            expect(over.error).toBe('EXCEEDS_SERVICE');
            expect(over.available).toBe(1000);
            const noReason = proposeGlosa(base(), 'f1', { reason: ' ', objectedAmount: 10 }, 5000);
            expect(noReason.error).toBe('REASON_REQUIRED');
            const zero = proposeGlosa(base(), 'f1', { reason: 'r', objectedAmount: 0 }, 5000);
            expect(zero.error).toBe('AMOUNT_INVALID');
        });

        it('does not double count two glosas on the same service', () => {
            let record = addFinding(base(), finding({ id: 'f2', origin: 'financialVariance', sourceRef: 'FV-2', description: 'Over tariff' })).record;
            const first = proposeGlosa(record, 'f1', { reason: 'r', objectedAmount: 700 }, 5000);
            expect(first.ok).toBe(true);
            record = first.record ?? record;
            expect(availableToObject(record, record.findings[1], 5000)).toBe(300);
            const second = proposeGlosa(record, 'f2', { reason: 'r', objectedAmount: 400 }, 5000);
            expect(second.error).toBe('EXCEEDS_SERVICE');
        });

        it('caps findings without amount at the invoice total', () => {
            const record = addFinding(emptyAuditRecord(), finding({ amount: null })).record;
            const result = proposeGlosa(record, 'f1', { reason: 'r', objectedAmount: 6000 }, 5000);
            expect(result.error).toBe('EXCEEDS_INVOICE');
        });

        it('drops the glosa when the finding leaves the glosa status', () => {
            const result = proposeGlosa(base(), 'f1', { reason: 'r', objectedAmount: 100 }, 5000);
            const record = setFindingStatus(result.record ?? base(), 'f1', 'dismissed', 'duplicate');
            expect(record.glosas.length).toBe(0);
            expect(record.findings[0].comment).toBe('duplicate');
        });
    });

    describe('summarizeFinancials', () => {
        it('counts each service once and excludes dismissed findings', () => {
            let record = addFinding(emptyAuditRecord(), finding()).record;
            record = addFinding(record, finding({ id: 'f2', origin: 'financialVariance', sourceRef: 'x', description: 'Over tariff', amount: 800 })).record;
            record = addFinding(record, finding({ id: 'f3', sourceRef: 'y', serviceCode: 'S-300', description: 'Other', amount: 200, status: 'dismissed' })).record;
            const glosa = proposeGlosa(record, 'f1', { reason: 'r', objectedAmount: 600 }, 5000);
            const summary = summarizeFinancials(glosa.record ?? record, 5000);
            expect(summary).toEqual({ billed: 5000, observed: 1000, glosado: 600, notObjected: 4400 });
        });

        it('handles an unknown billed total', () => {
            expect(summarizeFinancials(emptyAuditRecord(), null)).toEqual({ billed: null, observed: 0, glosado: 0, notObjected: null });
        });
    });

    describe('communication', () => {
        it('moves draft → reviewed → notified only with glosas', () => {
            const reviewed = advanceCommunication(emptyAuditRecord());
            expect(reviewed.communication).toBe('reviewed');
            expect(advanceCommunication(reviewed).communication).toBe('reviewed');
            const withGlosa = proposeGlosa(addFinding(emptyAuditRecord(), finding()).record, 'f1', { reason: 'r', objectedAmount: 1 }, null);
            const ready = advanceCommunication(advanceCommunication(withGlosa.record ?? reviewed));
            expect(ready.communication).toBe('notified');
        });
    });

    describe('provider comments', () => {
        it('parses arrays, envelopes and JSON strings and filters by invoice', () => {
            const raw = JSON.stringify({
                comments: [
                    { id: 'p1', invoiceNumber: 'F-001', serviceCode: 'S-100', comment: 'Order attached late' },
                    { id: 'p2', text: 'General note for the account' },
                    { id: 'p3', invoiceKey: 'inv-B', comment: 'Other invoice' },
                    { id: 'p4' },
                ],
            });
            const comments = parseProviderComments(raw);
            expect(comments.length).toBe(3);
            expect(commentsForInvoice(comments, INVOICE, 'F-001').map((c) => c.id)).toEqual(['p1', 'p2']);
            expect(fromProviderComment(INVOICE, comments[0]).origin).toBe('provider');
            expect(parseProviderComments('not json')).toEqual([]);
        });
    });

    describe('parseAuditState', () => {
        it('round-trips a serialized state and drops invalid entries', () => {
            const record = addFinding(emptyAuditRecord(), finding()).record;
            const state = withRecord(emptyAuditState(), INVOICE, record);
            const raw = JSON.parse(JSON.stringify(state));
            raw.invoices[INVOICE].findings.push({ id: 'bad' });
            const parsed = parseAuditState(JSON.stringify(raw));
            expect(parsed.invoices[INVOICE].findings).toEqual(record.findings);
            expect(parsed.invoices[INVOICE].communication).toBe('draft');
            expect(parseAuditState('{oops').invoices).toEqual({});
        });
    });

    describe('provider communication', () => {
        const comments = parseProviderComments([
            { id: 'p1', serviceCode: 's-100', comment: 'Support attached later' },
            { id: 'p2', serviceCode: 'S-200', comment: 'Tariff agreed' },
            { id: 'p3', comment: 'General note on the account' },
        ]);

        it('matches responses by service code, or the comment a finding came from', () => {
            expect(responsesForFinding(finding(), comments).map((c) => c.id)).toEqual(['p1']);
            expect(responsesForFinding(finding({ serviceCode: null }), comments).map((c) => c.id)).toEqual(['p3']);
            expect(responsesForFinding(finding({ origin: 'provider', serviceCode: null, sourceRef: 'p2' }), comments).map((c) => c.id)).toEqual(['p2', 'p3']);
        });

        it('orders the audit queue by decision stage, then severity', () => {
            const queue = sortAuditQueue([
                finding({ id: 'a', status: 'glosa', severity: 'critical' }),
                finding({ id: 'b', status: 'open', severity: 'low' }),
                finding({ id: 'c', status: 'review', severity: 'high' }),
                finding({ id: 'd', status: 'open', severity: 'critical' }),
            ]);
            expect(queue.map((f) => f.id)).toEqual(['d', 'b', 'c', 'a']);
        });
    });
});
