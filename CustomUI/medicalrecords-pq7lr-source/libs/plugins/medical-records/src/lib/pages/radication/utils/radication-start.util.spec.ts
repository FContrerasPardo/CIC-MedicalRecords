import {
    buildRadicationStartPayload,
    classifyStartError,
    isAcceptedLocalFile,
    isValidEmail,
    radicationProcessName,
    RADICATION_MAX_FILE_BYTES,
    RadicationUploadItem,
    resolveStartOutcome,
    validateRadicationDraft, pickRadicationDefinition } from './radication-start.util';

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

    it('falls back to the start form key and returns null when nothing matches', () => {
        expect(pickRadicationDefinition([{ key: 'Other', name: 'Other', formKey, version: 1 }])?.key).toBe('Other');
        expect(pickRadicationDefinition([{ key: 'X', name: 'X', formKey: 'form-x', version: 1 }])).toBeNull();
    });
});
