import { agreementKnowledgeDiscovery, isHttpsUrl, knowledgeDiscoveryUrl, withKnowledgeDiscovery } from './agreement-knowledge-discovery.util';

describe('agreement Knowledge Discovery link', () => {
    it('accepts only absolute https URLs', () => {
        expect(isHttpsUrl('https://kd.example.invalid/agents/contract')).toBe(true);
        expect(isHttpsUrl(' https://kd.example.invalid ')).toBe(true);
        expect(isHttpsUrl('http://kd.example.invalid')).toBe(false);
        expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
        expect(isHttpsUrl('kd.example.invalid')).toBe(false);
        expect(isHttpsUrl('')).toBe(false);
        expect(isHttpsUrl(null)).toBe(false);
    });

    it('reads the link of agreement.json and opens it only when valid', () => {
        expect(agreementKnowledgeDiscovery({})).toEqual({ url: '', label: '' });
        expect(agreementKnowledgeDiscovery({ knowledgeDiscovery: { url: ' https://a.invalid ', label: 'KD' } })).toEqual({ url: 'https://a.invalid', label: 'KD' });
        expect(knowledgeDiscoveryUrl({ knowledgeDiscovery: { url: 'https://a.invalid/x' } })).toBe('https://a.invalid/x');
        expect(knowledgeDiscoveryUrl({ knowledgeDiscovery: { url: 'http://a.invalid/x' } })).toBeNull();
        expect(knowledgeDiscoveryUrl({ knowledgeDiscovery: { url: '' } })).toBeNull();
    });

    it('writes the link keeping the rest of the file', () => {
        const next = withKnowledgeDiscovery({ agreementId: 'x', contacts: [] }, { url: ' https://a.invalid ', label: ' Contract ' });
        expect(next).toEqual({ agreementId: 'x', contacts: [], knowledgeDiscovery: { url: 'https://a.invalid', label: 'Contract' } });
    });
});
