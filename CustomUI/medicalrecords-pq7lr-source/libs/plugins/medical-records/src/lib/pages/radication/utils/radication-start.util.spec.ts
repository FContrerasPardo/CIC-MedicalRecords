import {
    buildRadicationStartPayload,
    classifyStartError,
    isAcceptedLocalFile,
    isValidEmail,
    radicationProcessName,
    RADICATION_MAX_FILE_BYTES,
    RadicationUploadItem,
    resolveStartOutcome,
    validateRadicationDraft, pickRadicationDefinition, selectRadicationDefinition } from './radication-start.util';

const upload = (name: string, overrides: Partial<RadicationUploadItem> = {}): RadicationUploadItem => ({
    name,
    size: 1000,
    source: 'local',
    status: 'uploaded',
    ...overrides,
});

const draft = {
    providerName: 'Clínica Santa Nube',
    email: 'radicacion@example.org',
    uploads: [upload('factura-paciente-a.pdf'), upload('factura-paciente-b.pdf', { source: 'repository', size: null })],
};

describe('radication start form', () => {
    it('accepts a provider, an email and several uploaded customer invoices', () => {
        expect(validateRadicationDraft(draft)).toEqual([]);
    });

    it('asks only for the provider, the email and the documents', () => {
        expect(validateRadicationDraft({ providerName: ' ', email: 'no-at-sign', uploads: [] })).toEqual([
            'PROVIDER_REQUIRED',
            'EMAIL_INVALID',
            'DOCUMENTS_REQUIRED',
        ]);
    });

    it('reports invalid local files and duplicates', () => {
        expect(
            validateRadicationDraft({
                ...draft,
                uploads: [upload('notes.docx'), upload('big.pdf', { size: RADICATION_MAX_FILE_BYTES + 1 }), upload('BIG.PDF')],
            })
        ).toEqual(['FILE_TYPE', 'FILE_SIZE', 'FILE_DUPLICATE']);
        expect(validateRadicationDraft({ ...draft, uploads: [upload('scan.docx', { source: 'repository', size: null })] })).toEqual([]);
    });

    it('waits for uploads in progress and blocks on failed ones', () => {
        expect(validateRadicationDraft({ ...draft, uploads: [upload('a.pdf', { status: 'uploading' }), upload('b.pdf', { status: 'error' })] })).toEqual([
            'UPLOADS_PENDING',
            'UPLOADS_FAILED',
        ]);
    });

    it('filters local files before queueing them', () => {
        expect(isAcceptedLocalFile({ name: 'factura.PDF', size: 10 })).toBe(true);
        expect(isAcceptedLocalFile({ name: 'factura.docx', size: 10 })).toBe(false);
        expect(isAcceptedLocalFile({ name: 'factura.pdf', size: RADICATION_MAX_FILE_BYTES + 1 })).toBe(false);
    });

    it('validates the contact email', () => {
        expect(isValidEmail(' radicacion@example.org ')).toBe(true);
        expect(isValidEmail('radicacion@example')).toBe(false);
        expect(isValidEmail(undefined)).toBe(false);
    });

    it('sends MedRecNum, Email and the document references in the start form values', () => {
        const documents = [{ sys_id: 'doc-1' }, { id: 'pending-2' }];
        const payload = buildRadicationStartPayload({
            processDefinitionKey: 'medical-records',
            radicationNumber: 'RAD-2026-48213',
            providerName: ' Clínica Santa Nube ',
            email: ' radicacion@example.org ',
            documents,
            outcome: null,
        });
        expect(payload).toEqual({
            processName: 'RAD-2026-48213 · Clínica Santa Nube',
            processDefinitionKey: 'medical-records',
            variables: {},
            values: {
                MedRecNum: 'RAD-2026-48213',
                Email: 'radicacion@example.org',
                Attachfile0ou9kk: documents,
            },
        });
        expect(buildRadicationStartPayload({ ...draft, processDefinitionKey: 'k', radicationNumber: 'R', documents: [], outcome: 'Send' }).outcome).toBe('Send');
    });

    it('names the process without patient or payer data', () => {
        expect(radicationProcessName('RAD-2026-10000', 'Prestador')).toBe('RAD-2026-10000 · Prestador');
        expect(radicationProcessName('RAD-2026-10000', ' ')).toBe('RAD-2026-10000');
    });

    it('picks the first custom outcome of the deployed start form, or none', () => {
        expect(resolveStartOutcome({ formRepresentation: { formDefinition: { outcomes: [] } } })).toBeNull();
        expect(resolveStartOutcome({ formRepresentation: { formDefinition: { outcomes: [{ name: 'Start', isSystem: true }, { name: 'Radicar' }] } } })).toBe(
            'Radicar'
        );
        expect(resolveStartOutcome(null)).toBeNull();
    });

    it('classifies start errors for the user', () => {
        expect(classifyStartError(new Error('radication-definition-not-found'))).toBe('DEFINITION_NOT_FOUND');
        expect(classifyStartError(new Error('upload-folder-not-found'))).toBe('UPLOAD_FAILED');
        expect(classifyStartError({ error: { message: 'form-validation: MedRecNum is required' } })).toBe('FORM_VALIDATION');
        expect(classifyStartError('boom')).toBe('UNKNOWN');
        expect(classifyStartError(Object.assign(new Error('x'), { code: 'FIELDS_MISSING' }))).toBe('FIELDS_MISSING');
        expect(classifyStartError(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe('UNKNOWN');
    });
});

describe('start language', () => {
    it('sends the UI language only when given', () => {
        const base = { processDefinitionKey: 'k', radicationNumber: 'R', providerName: 'P', email: 'a@b.co', documents: [], outcome: null };
        expect(buildRadicationStartPayload({ ...base, language: 'es' }).values['Text0aiukv']).toBe('es');
        expect('Text0aiukv' in buildRadicationStartPayload({ ...base, language: null }).values).toBe(false);
    });
});

describe('pickRadicationDefinition', () => {
    const formKey = 'form-dff85f23-5d64-4f3c-944d-d0762d52e4c7';

    it('prefers the medical-records process when several processes share the start form', () => {
        const picked = pickRadicationDefinition([
            { key: 'Process_1767797409502', name: 'Document AI Process', formKey, version: 4 },
            { key: 'Process_1777481415500', name: 'medical-records', formKey, version: 2 },
        ]);
        expect(picked?.key).toBe('Process_1777481415500');
    });

    it('takes the latest version of the medical-records process', () => {
        const picked = pickRadicationDefinition([
            { key: 'P', name: 'medical-records', formKey, version: 1 },
            { key: 'P', name: 'medical-records', formKey, version: 3 },
        ]);
        expect(picked?.version).toBe(3);
    });

    it('never falls back to another process that shares the start form', () => {
        expect(pickRadicationDefinition([{ key: 'Other', name: 'Other', formKey, version: 1 }])).toBeNull();
        expect(pickRadicationDefinition([{ key: 'X', name: 'X', formKey: 'form-x', version: 1 }])).toBeNull();
        expect(pickRadicationDefinition([])).toBeNull();
        expect(pickRadicationDefinition(null)).toBeNull();
    });
});

describe('selectRadicationDefinition', () => {
    const formKey = 'form-dff85f23-5d64-4f3c-944d-d0762d52e4c7';
    const documentAi = (version: number) => ({ key: 'Process_1767797409502', name: 'Document AI Process', formKey, version });
    const root = (version: number, key = 'Process_1777481415500') => ({ key, name: 'medical-records', formKey, version });

    it('chooses the latest medical-records version whatever the order, newer subprocesses with the start form included', () => {
        const lists = [
            [documentAi(9), root(2), root(5), root(3)],
            [root(5), documentAi(9), root(3), root(2)],
            [root(3), root(2), documentAi(9), root(5)],
        ];
        for (const list of lists) {
            const selection = selectRadicationDefinition(list);
            expect(selection.definition?.name).toBe('medical-records');
            expect(selection.definition?.version).toBe(5);
            expect(selection.matchedBy).toBe('key');
        }
    });

    it('excludes every catalog subprocess explicitly, even with a start form', () => {
        const selection = selectRadicationDefinition([
            { key: 'AgentMesh', name: 'AgentMesh', formKey, version: 7 },
            { key: 'Process_init', name: 'initialize-batch', formKey, version: 8 },
            documentAi(10),
            { key: 'Process_pre', name: 'Preanalysis', formKey, version: 11 },
            root(1),
        ]);
        expect(selection.definition?.key).toBe('Process_1777481415500');
        expect(selection.candidates.map((candidate) => candidate.verdict)).toEqual(['SUBPROCESS', 'SUBPROCESS', 'SUBPROCESS', 'SUBPROCESS', 'CHOSEN']);
    });

    it('returns no definition when only subprocesses or similar names are deployed', () => {
        const selection = selectRadicationDefinition([
            documentAi(4),
            { key: 'Process_x', name: 'medical-records-copy', formKey, version: 6 },
            { key: 'Process_y', name: 'Medical Records', formKey, version: 6 },
        ]);
        expect(selection.definition).toBeNull();
        expect(selection.matchedBy).toBeNull();
        expect(selection.candidates.map((candidate) => candidate.verdict)).toEqual(['SUBPROCESS', 'OTHER_PROCESS', 'OTHER_PROCESS']);
    });

    it('matches the exact key too, and skips a medical-records definition without a start form', () => {
        const byKey = selectRadicationDefinition([documentAi(3), { key: 'medical-records', name: '', formKey, version: 1 }]);
        expect(byKey.definition?.key).toBe('medical-records');
        expect(byKey.matchedBy).toBe('key');

        const noForm = selectRadicationDefinition([documentAi(3), { key: 'P', name: 'medical-records', formKey: null, version: 4 }, root(2)]);
        expect(noForm.definition?.version).toBe(2);
        expect(noForm.candidates.map((candidate) => candidate.verdict)).toEqual(['SUBPROCESS', 'NO_START_FORM', 'CHOSEN']);
    });

    it('marks older versions and reads string versions as numbers', () => {
        const selection = selectRadicationDefinition([
            { ...root(0), version: '10' },
            { ...root(0), version: '9' },
        ]);
        expect(selection.definition?.version).toBe('10');
        expect(selection.candidates.map((candidate) => candidate.verdict)).toEqual(['CHOSEN', 'OLDER_VERSION']);
    });
});

describe('selectRadicationDefinition with a renamed root process', () => {
    it('chooses the root by its stable key when Automate shows another display name', () => {
        const selection = selectRadicationDefinition([
            { name: 'Document AI Process', key: 'Process_1767797409502', version: 14, formKey: 'form-x' },
            { name: 'Radicación', key: 'Process_1777481415500', version: 14, formKey: 'form-x' },
        ]);
        expect(selection.definition?.key).toBe('Process_1777481415500');
        expect(selection.matchedBy).toBe('key');
    });
});

describe('selectRadicationDefinition through the process mapping', () => {
    const formKey = 'form-dff85f23-5d64-4f3c-944d-d0762d52e4c7';
    const deployed = [
        { name: 'Radicación', key: 'Process_1777481415500', version: 104, formKey },
        { name: 'Document AI Process', key: 'Process_1767797409502', version: 40, formKey },
        { name: 'AgentMesh', key: 'Process_1777579089863', version: 30, formKey },
        { name: 'initialize-batch', key: 'Process_1753464285348', version: 12, formKey },
        { name: 'Preanalysis', key: 'Process_1794866470316', version: 9, formKey },
        { name: 'Provider Agreement', key: 'Process_1795105416112', version: 5, formKey },
    ];

    it('chooses the root by key while it is named «Radicación» and never a subprocess', () => {
        const selection = selectRadicationDefinition(deployed);
        expect(selection.definition?.key).toBe('Process_1777481415500');
        expect(selection.matchedBy).toBe('key');
        expect(selection.candidates.map((candidate) => candidate.verdict)).toEqual([
            'CHOSEN',
            'SUBPROCESS',
            'SUBPROCESS',
            'SUBPROCESS',
            'SUBPROCESS',
            'OTHER_PROCESS',
        ]);
    });

    it('prefers a key match over a name-only match, and falls back to the name without key matches', () => {
        const selection = selectRadicationDefinition([
            { name: 'medical-records', key: 'Process_copy', version: 200, formKey },
            { name: 'medical-records', key: 'Process_1777481415500', version: 105, formKey },
        ]);
        expect(selection.definition?.version).toBe(105);
        expect(selection.candidates.map((candidate) => candidate.verdict)).toEqual(['NAME_ONLY', 'CHOSEN']);

        const byName = selectRadicationDefinition([{ name: 'Radicación', key: 'Process_renamed', version: 3, formKey }]);
        expect(byName.definition?.key).toBe('Process_renamed');
        expect(byName.matchedBy).toBe('name');
    });

    it('returns no definition when only subprocesses are deployed', () => {
        expect(selectRadicationDefinition(deployed.slice(1)).definition).toBeNull();
    });
});
