import {
    agreementDocumentsPlaceId,
    buildKnowledgeDiscoveryPlaceConfig,
    isValidKnowledgeDiscoveryPlaceId,
    knowledgeDiscoveryPlacePath,
    parseKnowledgeDiscoveryPlaceConfig,
    resolveKnowledgeDiscoveryLink,
    serializeKnowledgeDiscoveryPlaceConfig,
    validateKnowledgeDiscoveryInput,
} from './knowledge-discovery-place.util';

describe('knowledge discovery per place', () => {
    const now = new Date('2026-11-18T10:00:00Z');

    it('builds one path per place id', () => {
        expect(knowledgeDiscoveryPlacePath('case.audit')).toBe('/MedRec/Appdata/KnowledgeDiscovery/case.audit.json');
        expect(knowledgeDiscoveryPlacePath('radication.review')).toBe('/MedRec/Appdata/KnowledgeDiscovery/radication.review.json');
        expect(agreementDocumentsPlaceId('centro-medico-latam')).toBe('agreements.centro-medico-latam.documents');
        expect(knowledgeDiscoveryPlacePath(agreementDocumentsPlaceId('centro-medico-latam'))).toBe('/MedRec/Appdata/KnowledgeDiscovery/agreements.centro-medico-latam.documents.json');
    });

    it('rejects place ids that are not a safe file name', () => {
        for (const placeId of ['', 'Case.Audit', '../config', 'a/b', '.hidden', 'a..b', 'with space']) {
            expect(`${placeId}:${isValidKnowledgeDiscoveryPlaceId(placeId)}`).toBe(`${placeId}:false`);
            expect(knowledgeDiscoveryPlacePath(placeId)).toBeNull();
        }
        expect(isValidKnowledgeDiscoveryPlaceId('agreements.hospital-general-hyland-latam.documents')).toBe(true);
    });

    it('accepts only https URLs, and an empty URL to clear', () => {
        expect(validateKnowledgeDiscoveryInput({ url: 'https://kd.example.com/agent/1' })).toBeNull();
        expect(validateKnowledgeDiscoveryInput({ url: '   ' })).toBeNull();
        expect(validateKnowledgeDiscoveryInput({ url: 'http://kd.example.com' })).toBe('URL_INVALID');
        expect(validateKnowledgeDiscoveryInput({ url: 'https://user:pass@kd.example.com' })).toBe('URL_INVALID');
        expect(validateKnowledgeDiscoveryInput({ url: 'kd.example.com' })).toBe('URL_INVALID');
    });

    it('builds, serializes and parses the place file', () => {
        const config = buildKnowledgeDiscoveryPlaceConfig({ url: ' https://kd.example.com/a ', label: ' Ask ', description: ' Contract ' }, now);
        expect(config).toEqual({ url: 'https://kd.example.com/a', label: 'Ask', description: 'Contract', updatedAt: '2026-11-18T10:00:00.000Z' });
        const text = serializeKnowledgeDiscoveryPlaceConfig('case.audit', config);
        expect(parseKnowledgeDiscoveryPlaceConfig(text)).toEqual(config);
        expect(parseKnowledgeDiscoveryPlaceConfig('not json')).toBeNull();
        expect(parseKnowledgeDiscoveryPlaceConfig('[]')).toBeNull();
    });

    it('clears the link and its texts with an empty URL', () => {
        expect(buildKnowledgeDiscoveryPlaceConfig({ url: '', label: 'Ask', description: 'x' }, now)).toEqual({ url: '', label: '', description: '', updatedAt: '2026-11-18T10:00:00.000Z' });
    });

    it('uses the place file first, then the fallback', () => {
        const fallback = { url: 'https://kd.example.com/fallback', label: 'Old' };
        const stored = { url: 'https://kd.example.com/place', label: 'New', description: '', updatedAt: null };
        expect(resolveKnowledgeDiscoveryLink(stored, fallback)).toEqual({ link: { url: 'https://kd.example.com/place', label: 'New', description: '' }, source: 'place' });
        expect(resolveKnowledgeDiscoveryLink(null, fallback)).toEqual({ link: { url: 'https://kd.example.com/fallback', label: 'Old', description: '' }, source: 'fallback' });
        expect(resolveKnowledgeDiscoveryLink(null, { url: 'http://kd.example.com' })).toEqual({ link: null, source: 'none' });
        expect(resolveKnowledgeDiscoveryLink(null, null)).toEqual({ link: null, source: 'none' });
    });

    it('does not bring the fallback back once the place was cleared', () => {
        const cleared = buildKnowledgeDiscoveryPlaceConfig({ url: '' }, now);
        expect(resolveKnowledgeDiscoveryLink(cleared, { url: 'https://kd.example.com/fallback' })).toEqual({ link: null, source: 'none' });
    });
});
