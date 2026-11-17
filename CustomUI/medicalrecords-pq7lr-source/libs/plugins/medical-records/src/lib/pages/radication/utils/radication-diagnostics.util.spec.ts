import {
    blockingFieldIssues,
    buildProgressDiagnosticTables,
    checkStartFormFields,
    describeAutomateError,
    ExpectedStartField,
    extractStartFormFields,
    maskStartPayload,
} from './radication-diagnostics.util';

/** Same structure as the exported "Document Upload" form (section with a column map). */
const exportedForm = {
    formRepresentation: {
        id: 'form-dff85f23',
        formDefinition: {
            fields: [
                {
                    id: 'section-1',
                    type: 'section',
                    fields: {
                        '1': [{ id: 'Attachfile0ou9kk', name: 'Attach file', type: 'hxp-upload', required: false, readOnly: false }],
                    },
                },
            ],
            outcomes: [],
        },
    },
};

const updatedForm = {
    formRepresentation: {
        formDefinition: {
            fields: [
                {
                    id: 'container-1',
                    type: 'container',
                    fields: {
                        '1': [{ id: 'MedRecNum', name: 'Medical Record', type: 'text', required: true, readOnly: true }],
                        '2': [{ id: 'Email', name: 'Email', type: 'text', required: true, readOnly: true }],
                    },
                },
                {
                    id: 'section-1',
                    type: 'section',
                    fields: { '1': [{ id: 'Attachfile0ou9kk', name: 'Attach file', type: 'hxp-upload' }] },
                },
            ],
        },
    },
};

const expected: ExpectedStartField[] = [
    { id: 'MedRecNum', kind: 'text' },
    { id: 'Email', kind: 'text' },
    { id: 'Attachfile0ou9kk', kind: 'upload' },
];

describe('radication diagnostics', () => {
    it('reads the leaf fields of the exported start form', () => {
        expect(extractStartFormFields(exportedForm)).toEqual([
            { id: 'Attachfile0ou9kk', type: 'hxp-upload', name: 'Attach file', required: false, readOnly: false },
        ]);
        expect(extractStartFormFields(null)).toEqual([]);
    });

    it('reports MedRecNum and Email as missing when the deployed form does not have them', () => {
        const fields = extractStartFormFields(exportedForm);
        const checks = checkStartFormFields(fields, expected);
        expect(checks.map((check) => `${check.id}:${check.status}`)).toEqual(['MedRecNum:missing', 'Email:missing', 'Attachfile0ou9kk:ok']);
        expect(blockingFieldIssues(checks, fields.length).map((check) => check.id)).toEqual(['MedRecNum', 'Email']);
    });

    it('accepts the updated form and keeps required and read-only flags', () => {
        const checks = checkStartFormFields(extractStartFormFields(updatedForm), expected);
        expect(checks.every((check) => check.status === 'ok')).toBe(true);
        expect(checks[0]).toEqual({ id: 'MedRecNum', status: 'ok', actualId: 'MedRecNum', actualType: 'text', required: true, readOnly: true });
    });

    it('detects ids in another case or format and wrong field types', () => {
        const fields = [
            { id: 'medrecnum', type: 'text', name: 'Medical Record', required: true, readOnly: true },
            { id: 'Email', type: 'hxp-upload', name: 'Email', required: true, readOnly: false },
        ];
        const checks = checkStartFormFields(fields, expected);
        expect(checks.map((check) => check.status)).toEqual(['id-mismatch', 'type-mismatch', 'missing']);
        expect(checks[0].actualId).toBe('medrecnum');
    });

    it('does not block when the form definition could not be read', () => {
        const checks = checkStartFormFields([], expected);
        expect(blockingFieldIssues(checks, 0)).toEqual([]);
    });

    it('describes the payload by field name and shape only', () => {
        const masked = maskStartPayload({
            MedRecNum: 'RAD-2026-48213',
            Email: 'radicacion@example.org',
            Attachfile0ou9kk: [{ sys_id: 'doc-1', sys_name: 'factura.pdf' }],
        });
        expect(masked).toEqual([
            { name: 'MedRecNum', shape: 'string(14)' },
            { name: 'Email', shape: 'string(22)' },
            { name: 'Attachfile0ou9kk', shape: 'array(1)<{sys_id,sys_name}>' },
        ]);
        expect(JSON.stringify(masked)).not.toContain('example.org');
    });

    it('extracts status, code and message from Automate errors and masks emails', () => {
        expect(
            describeAutomateError({
                status: 400,
                error: { code: 'form-validation', message: 'Field MedRecNum is required for radicacion@example.org', fieldErrors: [{ field: 'MedRecNum' }] },
            })
        ).toEqual({ status: 400, code: 'form-validation', message: 'Field MedRecNum is required for <email>', fields: ['MedRecNum'] });
        expect(describeAutomateError({ response: { status: 404, body: { error: { errorKey: 'form-not-found', briefSummary: 'No form' } } } })).toEqual({
            status: 404,
            code: 'form-not-found',
            message: 'No form',
            fields: [],
        });
        expect(describeAutomateError(new Error('{"code":"required-outcome","message":"An outcome is required"}'))).toEqual({
            status: null,
            code: 'required-outcome',
            message: 'An outcome is required',
            fields: [],
        });
        expect(describeAutomateError('boom')).toEqual({ status: null, code: null, message: 'boom', fields: [] });
    });
});

describe('radication progress diagnostic tables', () => {
    const tables = buildProgressDiagnosticTables({
        processInstanceId: 'root-1',
        process: { status: 'RUNNING', name: 'Synthetic name', businessKey: 'RAD-1', processDefinitionKey: 'medical-records', startDate: '2026-11-16T10:00:00Z' },
        children: [{ id: 'idp-1', processDefinitionName: 'Document AI Process', status: 'RUNNING', startDate: '2026-11-16T10:00:05Z' }],
        tasks: [{ id: 't-1', name: 'Nueva Cuenta', status: 'ASSIGNED', processInstanceId: 'root-1', assignee: 'someone' }],
        idpProcessInstanceId: 'idp-1',
        serviceTasks: { ok: true, rows: [{ elementId: 'hxpIdpConnector_17yqov9', activityName: 'Separate', status: 'COMPLETED' }] },
    });

    it('keeps only technical process fields and never the name or business key', () => {
        expect(tables[0].rows).toEqual([
            ['status', 'RUNNING', 'root-1'],
            ['processDefinitionKey', 'medical-records', 'root-1'],
            ['startDate', '2026-11-16T10:00:00Z', 'root-1'],
        ]);
    });

    it('fills the process instance cell in every table', () => {
        for (const table of tables) {
            for (const row of table.rows) {
                expect(row.length).toBe(table.columns.length);
            }
        }
        expect(tables[2].rows).toEqual([['t-1', 'Nueva Cuenta', 'ASSIGNED', 'root-1']]);
        expect(tables[3].rows).toEqual([['hxpIdpConnector_17yqov9', 'Separate', 'COMPLETED', 'idp-1']]);
    });

    it('reports a failed or skipped service-task query', () => {
        const failed = buildProgressDiagnosticTables({
            processInstanceId: 'root-1',
            process: null,
            children: null,
            tasks: null,
            idpProcessInstanceId: null,
            serviceTasks: null,
        });
        expect(failed[0].error).toBe('process instance query failed');
        expect(failed[3].note).toContain('Not requested');
        expect(failed[3].rows).toEqual([]);
    });
});
