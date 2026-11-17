import {
    AuditAssistantContext,
    composeKnowledgeDiscoveryPrompt,
    hasAuditContext,
    knowledgeDiscoveryUrl,
    parseKnowledgeDiscoveryConfig,
    PromptLabels,
    providerCommentList,
    suggestedQuestions,
} from './audit-assistant.util';

const LABELS: PromptLabels = {
    context: 'Context',
    radication: 'Filing',
    invoice: 'Invoice',
    patient: 'Patient',
    provider: 'Provider',
    agreement: 'Agreement',
    findings: 'Findings',
    providerComments: 'Provider comments',
    question: 'Question',
};

const CONTEXT: AuditAssistantContext = {
    radicationId: 'RAD-0001',
    invoiceNumber: 'FV-1001',
    patientRef: 'MRN-0042',
    findings: [
        { id: 'f1', code: 'COD-01', title: 'CUPS code not in agreement', source: 'Coding Integrity', amount: 120 },
        { id: 'f2', code: 'FIN-02', title: 'Rate above agreement', amount: 80.5 },
        { id: 'f3', code: 'DOC-03', title: 'Missing epicrisis' },
    ],
    providerComments: ['The procedure was authorized by phone.'],
};

describe('knowledgeDiscoveryUrl', () => {
    it('accepts https URLs and trims them', () => {
        expect(knowledgeDiscoveryUrl('  https://kd.example.com/agent/1 ')).toBe('https://kd.example.com/agent/1');
    });

    it('rejects http, credentials, empty and non-string values', () => {
        expect(knowledgeDiscoveryUrl('http://kd.example.com')).toBeNull();
        expect(knowledgeDiscoveryUrl('https://user:pass@kd.example.com')).toBeNull();
        expect(knowledgeDiscoveryUrl('   ')).toBeNull();
        expect(knowledgeDiscoveryUrl(42)).toBeNull();
        expect(knowledgeDiscoveryUrl('not a url')).toBeNull();
    });
});

describe('parseKnowledgeDiscoveryConfig', () => {
    it('reports not-configured when the file or the url is missing', () => {
        expect(parseKnowledgeDiscoveryConfig(null)).toEqual({ status: 'not-configured' });
        expect(parseKnowledgeDiscoveryConfig('')).toEqual({ status: 'not-configured' });
        expect(parseKnowledgeDiscoveryConfig('{"schemaVersion":1}')).toEqual({ status: 'not-configured' });
        expect(parseKnowledgeDiscoveryConfig('{"knowledgeDiscovery":{}}')).toEqual({ status: 'not-configured' });
        expect(parseKnowledgeDiscoveryConfig('{"knowledgeDiscovery":{"url":" "}}')).toEqual({ status: 'not-configured' });
    });

    it('returns the url when configured', () => {
        const text = JSON.stringify({ schemaVersion: 1, other: true, knowledgeDiscovery: { url: 'https://kd.example.com' } });
        expect(parseKnowledgeDiscoveryConfig(text)).toEqual({ status: 'configured', url: 'https://kd.example.com' });
    });

    it('reports invalid for broken JSON, unknown schema or unsafe url', () => {
        expect(parseKnowledgeDiscoveryConfig('{oops')).toEqual({ status: 'invalid' });
        expect(parseKnowledgeDiscoveryConfig('[]')).toEqual({ status: 'invalid' });
        expect(parseKnowledgeDiscoveryConfig('{"schemaVersion":2}')).toEqual({ status: 'invalid' });
        expect(parseKnowledgeDiscoveryConfig('{"knowledgeDiscovery":"x"}')).toEqual({ status: 'invalid' });
        expect(parseKnowledgeDiscoveryConfig('{"knowledgeDiscovery":{"url":"http://kd.example.com"}}')).toEqual({ status: 'invalid' });
    });
});

describe('providerCommentList and hasAuditContext', () => {
    it('normalizes a single string or a list and drops blanks', () => {
        expect(providerCommentList(' one ')).toEqual(['one']);
        expect(providerCommentList(['a', ' ', 'b'])).toEqual(['a', 'b']);
        expect(providerCommentList(null)).toEqual([]);
    });

    it('detects whether any context was provided', () => {
        expect(hasAuditContext(null)).toBe(false);
        expect(hasAuditContext({ invoiceNumber: '  ', findings: [] })).toBe(false);
        expect(hasAuditContext({ invoiceNumber: 'FV-1' })).toBe(true);
        expect(hasAuditContext({ providerComments: 'appeal' })).toBe(true);
    });
});

describe('suggestedQuestions', () => {
    it('offers generic agreement and evidence questions without context', () => {
        expect(suggestedQuestions(null).map((q) => q.key)).toEqual(['AGREEMENT_TERMS', 'REQUIRED_EVIDENCE']);
    });

    it('puts finding questions first, limited to two findings, with lift questions when the provider commented', () => {
        const keys = suggestedQuestions(CONTEXT).map((q) => q.key);
        expect(keys).toEqual([
            'JUSTIFY_FINDING',
            'LIFT_FINDING',
            'JUSTIFY_FINDING',
            'LIFT_FINDING',
            'APPEAL_RESPONSE',
            'AGREEMENT_TERMS_INVOICE',
            'REQUIRED_EVIDENCE',
            'PRECEDENTS',
        ]);
        expect(suggestedQuestions(CONTEXT)[0].params).toEqual({ finding: 'COD-01 · CUPS code not in agreement' });
    });

    it('omits lift and appeal questions when there are no provider comments', () => {
        const keys = suggestedQuestions({ ...CONTEXT, providerComments: [] }).map((q) => q.key);
        expect(keys).not.toContain('LIFT_FINDING');
        expect(keys).not.toContain('APPEAL_RESPONSE');
    });

    it('gives unique ids', () => {
        const ids = suggestedQuestions(CONTEXT).map((q) => q.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('composeKnowledgeDiscoveryPrompt', () => {
    it('returns only the question when there is no context', () => {
        expect(composeKnowledgeDiscoveryPrompt('  Why? ', {}, LABELS)).toBe('Question: Why?');
    });

    it('appends a context block with findings and provider comments, omitting empty fields', () => {
        const prompt = composeKnowledgeDiscoveryPrompt('Can we lift COD-01?', { ...CONTEXT, patientRef: '' }, LABELS);
        expect(prompt).toBe(
            [
                'Question: Can we lift COD-01?',
                '',
                'Context:',
                '- Filing: RAD-0001',
                '- Invoice: FV-1001',
                '- Findings:',
                '  - COD-01 · CUPS code not in agreement [Coding Integrity] (120.00)',
                '  - FIN-02 · Rate above agreement (80.50)',
                '  - DOC-03 · Missing epicrisis',
                '- Provider comments:',
                '  - The procedure was authorized by phone.',
            ].join('\n')
        );
    });
});
