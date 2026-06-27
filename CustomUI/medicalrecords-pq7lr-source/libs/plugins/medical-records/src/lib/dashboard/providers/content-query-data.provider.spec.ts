import { readFileSync } from 'fs';
import { join } from 'path';

describe('ContentQueryDataProvider', () => {
    const source = readFileSync(join(__dirname, 'content-query-data.provider.ts'), 'utf8');

    it('queries native Content through SearchService', () => {
        expect(source).toContain('SearchService');
        expect(source).toContain('getDocumentsByQuery');
        expect(source).toContain('totalCount');
        expect(source).toContain('catchError');
    });
});
