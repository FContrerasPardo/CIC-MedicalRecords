import {
    agentReviewStatus,
    agentRuleViews,
    agentRowsAsFindings,
    annotateReviewRow,
    findReviewArray,
    isDeliveredRow,
    matchInvoiceKey,
    parseAgentReview,
    receivedDocumentRows,
    reviewTableRows,
    sameReviewFinding,
    segmentFindingComment,
} from './radication-agent-review.util';

// Synthetic agent output (no real patients or invoices).
const rows = [
    { ClassName: 'Autorizacion', Status: '✅ Pass', Comment: 'Verificado: autorizacion vigente.', DocumentIDs: ['d-2'], InvoiceNumber: 'F-1', RuleId: 'R-ALL', Risk: 'LOW', UserComment: '', Attended: false },
    {
        ClassName: 'Informe Quirurgico',
        Status: '❌ Missing',
        Comment: 'Verificado: factura presente. Pendiente: informe quirurgico. Acción: adjuntar el informe.',
        DocumentIDs: [],
        InvoiceNumber: 'F-1',
        RuleId: 'R-SURG',
        Risk: 'HIGH',
        UserComment: '',
        Attended: false,
    },
    { ClassName: 'Orden Medica', Status: '⚠️ Needs Attention', Comment: 'Pending: date mismatch.', DocumentIDs: ['d-9', 'd-8'], InvoiceNumber: '', RuleId: 'R-GEN', UserComment: 'ok', Attended: true },
];

describe('radication agent review', () => {
    it('finds the review array in fenced strings and wrapper objects', () => {
        expect(findReviewArray('```json\n' + JSON.stringify(rows) + '\n```')?.length).toBe(3);
        expect(findReviewArray({ output: { findings: rows } })?.length).toBe(3);
        expect(findReviewArray(JSON.stringify({ result: JSON.stringify(rows) }))?.length).toBe(3);
        expect(findReviewArray('not json')).toBeUndefined();
        expect(findReviewArray(null)).toBeUndefined();
    });

    it('parses rows, ordered by invoice and status, with segmented comments', () => {
        const parsed = parseAgentReview(JSON.stringify(rows), ['F-1']);
        expect(parsed?.map((row) => `${row.className}:${row.status}:${row.risk}`)).toEqual(['Informe Quirurgico:missing:HIGH', 'Autorizacion:pass:LOW', 'Orden Medica:attention:MEDIUM']);
        expect(parsed?.[0].sections?.map((section) => section.kind)).toEqual(['verified', 'pending', 'action']);
        expect(parsed?.[0].sections?.[2].text).toBe('adjuntar el informe.');
        expect(parsed?.[2].attended).toBe(true);
        expect(parsed?.[2].userComment).toBe('ok');
        expect(parseAgentReview(undefined)).toBeNull();
        expect(parseAgentReview('[]')).toBeNull();
    });

    it('summarizes the status and maps rows to findings and invoices', () => {
        const parsed = parseAgentReview(rows, ['F-1']) ?? [];
        expect(agentReviewStatus(parsed)).toBe('missing');
        expect(agentReviewStatus(parsed.filter((row) => row.status === 'pass'))).toBe('complete');
        const invoices = [{ key: 'invoice:F 1', invoiceNumber: 'f-1' }];
        expect(matchInvoiceKey('F-1', invoices)).toBe('invoice:F 1');
        expect(matchInvoiceKey('', invoices)).toBeNull();
        const findings = agentRowsAsFindings(parsed, invoices);
        expect(findings.map((finding) => `${finding.kind}:${finding.invoiceKey}`)).toEqual([
            'MISSING_DOCUMENTS:invoice:F 1',
            'REVIEW_REQUIRED:invoice:F 1',
            'REVIEW_REQUIRED:null',
        ]);
    });

    it('returns null for comments without markers', () => {
        expect(segmentFindingComment('Plain comment')).toBeNull();
        expect(segmentFindingComment('')).toBeNull();
    });

    it('annotates exactly the matching row, regardless of document id order', () => {
        const table = reviewTableRows(JSON.stringify(rows));
        const target = { ...rows[2], DocumentIDs: ['d-8', 'd-9'] };
        expect(sameReviewFinding(table[2], target)).toBe(true);
        const result = annotateReviewRow(table, target, '  Attached later  ');
        expect(result?.row['UserComment']).toBe('Attached later');
        expect(result?.row['Attended']).toBe(true);
        expect(result?.rows[0]['Attended']).toBe(false);
        expect(annotateReviewRow(table, { ...rows[2], Comment: 'changed' }, 'x')).toBeNull();
        expect(annotateReviewRow([...table, table[2]], target, 'x')).toBeNull();
    });
});

describe('received documents and agent rules', () => {
    const agentRows = parseAgentReview(rows) ?? [];

    it('adds one received row per invoice and class the agent did not cite', () => {
        const received = receivedDocumentRows(agentRows, [
            { id: 'd-2', className: 'Autorizacion', invoiceNumber: 'F-1' },
            { id: 'lab-1', className: 'Laboratorios', invoiceNumber: 'F-1' },
            { id: 'lab-2', className: 'Laboratorios', invoiceNumber: 'F-1' },
            { id: 'pat-1', className: 'Reporte de Patologia', invoiceNumber: '' },
        ]);
        expect(received.length).toBe(2);
        expect(received[0].className).toBe('Laboratorios');
        expect(received[0].documentIds).toEqual(['lab-1', 'lab-2']);
        expect(received[0].status).toBe('pass');
        expect(received[0].received).toBe(true);
        expect(received[1].invoiceNumber).toBe('');
    });

    it('treats page "received" rows and agent DELIVERED rows as delivered', () => {
        expect(isDeliveredRow({ received: true, ruleId: null })).toBe(true);
        expect(isDeliveredRow({ ruleId: ' delivered ' })).toBe(true);
        expect(isDeliveredRow({ ruleId: 'SIF-001' })).toBe(false);
        expect(isDeliveredRow({ ruleId: null })).toBe(false);
    });

    it('groups the agent rows by rule, missing when any class is missing', () => {
        const views = agentRuleViews(agentRows, new Map([['R-ALL', 'General rule']]));
        const all = views.find((view) => view.ruleId === 'R-ALL');
        expect(all?.description).toBe('General rule');
        expect(views.every((view) => view.present.length + view.missing.length > 0)).toBe(true);
        expect(views.some((view) => view.status === 'missing') || views.every((view) => view.status === 'ok')).toBe(true);
    });
});
