import { caseProgressFilePath, contentReferenceIds, findCaseFolderInSources, patientFolderFromDocument, patientFolderFromPath } from './case-folder.util';

/** Synthetic folder names and ids; no real data. */
const FOLDER = '/MedRec/Patients/2026-11-17_batch-0001';

describe('case-folder.util', () => {
    describe('patientFolderFromPath', () => {
        it('returns the patient folder of a batch file or anything deeper', () => {
            expect(patientFolderFromPath(`${FOLDER}/batch_batch-0001.json`)).toBe(FOLDER);
            expect(patientFolderFromPath(`${FOLDER}/pages/page-1.pdf`)).toBe(FOLDER);
            expect(patientFolderFromPath(FOLDER)).toBe(FOLDER);
        });

        it('normalises separators and case of the root', () => {
            expect(patientFolderFromPath('\\medrec\\patients\\2026-11-17_batch-0001\\x.json')).toBe(FOLDER);
        });

        it('ignores other paths and files directly under the root', () => {
            expect(patientFolderFromPath('/MedRec/Appdata/Agreements/x.json')).toBeNull();
            expect(patientFolderFromPath('/MedRec/Patients/readme.json')).toBeNull();
            expect(patientFolderFromPath(42)).toBeNull();
        });
    });

    describe('findCaseFolderInSources', () => {
        it('finds the folder in a process variable (object or JSON text)', () => {
            const found = findCaseFolderInSources({ federatedContent: JSON.stringify({ sys_path: `${FOLDER}/batch_batch-0001.json` }) }, null);
            expect(found).toEqual({ folderPath: FOLDER, source: 'variables', hint: 'federatedContent.sys_path' });
        });

        it('finds the folder in the batchState content references', () => {
            const batchState = { documents: [{ id: 'd1' }], contentFileReferences: [{ sys_id: 'n1', sys_parentPath: FOLDER }] };
            const found = findCaseFolderInSources({ batchState }, null);
            expect(found?.folderPath).toBe(FOLDER);
            expect(found?.source).toBe('batchState');
        });

        it('returns null when no path is known', () => {
            expect(findCaseFolderInSources({ batchState: { contentFileReferences: [{ sys_id: 'n1' }] } }, null)).toBeNull();
            expect(findCaseFolderInSources(null, null)).toBeNull();
        });
    });

    it('lists distinct content reference ids for the repository lookup', () => {
        const batchState = { contentFileReferences: [{ sys_id: 'n1' }, { sys_id: 'n1' }, { sys_id: ' n2 ' }, {}, { sys_id: 'n3' }, { sys_id: 'n4' }] };
        expect(contentReferenceIds(batchState)).toEqual(['n1', 'n2', 'n3']);
        expect(contentReferenceIds(JSON.stringify(batchState), 1)).toEqual(['n1']);
        expect(contentReferenceIds(null)).toEqual([]);
    });

    it('reads the folder of a repository document by its path or parent path', () => {
        expect(patientFolderFromDocument({ sys_path: `${FOLDER}/page.pdf` })).toBe(FOLDER);
        expect(patientFolderFromDocument({ sys_parentPath: FOLDER })).toBe(FOLDER);
        expect(patientFolderFromDocument({ sys_path: '/MedRec/Uploads/page.pdf' })).toBeNull();
    });

    it('builds the progress file path', () => {
        expect(caseProgressFilePath(`${FOLDER}/`)).toBe(`${FOLDER}/case-progress.json`);
    });
});
