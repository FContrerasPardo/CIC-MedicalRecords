import {
    buildDiagnosticDownload,
    buildVariablesDownload,
    CapturedProcessVariables,
    capturedVariableNames,
    expandJsonValue,
    mergeCapturedVariables,
    DiagnosticProbe,
    summarizeDiagnosticRows,
    upsertDiagnosticProbe,
} from './dashboard-diagnostics.util';

describe('dashboard diagnostics (keyed probes)', () => {
    const probe = (id: number, key?: string, label = 'x'): DiagnosticProbe => ({ id, at: '2026-11-16T10:00:00Z', kind: 'radication', label, durationMs: 1, key });

    it('adds unkeyed probes at the top and caps the list', () => {
        const probes = upsertDiagnosticProbe([probe(1), probe(2)], probe(3), 2);
        expect(probes.map((item) => item.id)).toEqual([3, 1]);
    });

    it('replaces a keyed probe in place, keeping its id', () => {
        const probes = upsertDiagnosticProbe([probe(1), probe(2, 'progress:a', 'old')], probe(9, 'progress:a', 'new'), 10);
        expect(probes.map((item) => `${item.id}:${item.label}`)).toEqual(['1:x', '2:new']);
    });

    it('adds a keyed probe that was not recorded yet', () => {
        const probes = upsertDiagnosticProbe([probe(1, 'progress:a')], probe(2, 'progress:b'), 10);
        expect(probes.map((item) => item.key)).toEqual(['progress:b', 'progress:a']);
    });
});

describe('dashboard diagnostics (masked)', () => {
    const rows = [
        { id: 'p-1', status: 'RUNNING', startDate: '2026-11-01', name: 'Synthetic Patient', var_batchState: '{"x":1}', var_total: 10 },
        { id: 'p-2', status: 'COMPLETED', startDate: '2026-11-02', name: '', var_batchState: null },
    ];

    it('reports names, types and presence counts', () => {
        const fields = summarizeDiagnosticRows(rows);
        const batch = fields.find((field) => field.name === 'var_batchState');
        expect(batch?.present).toBe(1);
        expect(batch?.types).toEqual(['null', 'string']);
        expect(fields.find((field) => field.name === 'var_total')?.types).toEqual(['number']);
    });

    it('keeps values only for technical fields, never for variables or names', () => {
        const fields = summarizeDiagnosticRows(rows);
        expect(fields.find((field) => field.name === 'status')?.samples).toEqual(['RUNNING', 'COMPLETED']);
        expect(fields.find((field) => field.name === 'startDate')?.samples).toEqual(['2026-11-01', '2026-11-02']);
        expect(fields.find((field) => field.name === 'name')?.samples).toBeUndefined();
        expect(fields.find((field) => field.name === 'var_batchState')?.samples).toBeUndefined();
        expect(fields.find((field) => field.name === 'id')?.samples).toBeUndefined();
    });

    it('builds a download without any row values', () => {
        const text = buildDiagnosticDownload(
            [{ id: 1, at: '2026-11-13T00:00:00.000Z', kind: 'process-list', label: 'RUNNING', durationMs: 5, fields: summarizeDiagnosticRows(rows) }],
            new Date('2026-11-13T00:00:00.000Z')
        );
        expect(text).toContain('"kind": "medical-records.dashboard.diagnostics"');
        expect(text).not.toContain('Synthetic Patient');
        expect(text).not.toContain('{\\"x\\":1}');
    });
});

describe('dashboard diagnostics (process variables read on screen)', () => {
    const capture = (source: CapturedProcessVariables['source'], variables: Record<string, unknown>): CapturedProcessVariables => ({
        processInstanceId: 'p-1',
        source,
        at: '2026-11-15T10:00:00.000Z',
        variables,
    });

    it('accumulates inline reads of the same instance', () => {
        const merged = mergeCapturedVariables(capture('inline', { a: 1 }), capture('inline', { b: 2 }));
        expect(merged.variables).toEqual({ a: 1, b: 2 });
    });

    it('lets a full read win over earlier inline values', () => {
        const merged = mergeCapturedVariables(capture('inline', { a: 'old', b: 2 }), capture('instance', { a: 'new' }));
        expect(merged.source).toBe('instance');
        expect(merged.variables).toEqual({ a: 'new', b: 2 });
    });

    it('keeps full-read values when an inline read comes later', () => {
        const merged = mergeCapturedVariables(capture('instance', { a: 'full' }), capture('inline', { a: 'inline', c: 3 }));
        expect(merged.source).toBe('instance');
        expect(merged.variables).toEqual({ a: 'full', c: 3 });
    });

    it('parses JSON strings and leaves other values as they are', () => {
        expect(expandJsonValue('{"x":1}')).toEqual({ x: 1 });
        expect(expandJsonValue('[1]')).toEqual([1]);
        expect(expandJsonValue('{broken')).toBe('{broken');
        expect(expandJsonValue('text')).toBe('text');
        expect(expandJsonValue(5)).toBe(5);
    });

    it('downloads the variables with their values and names', () => {
        const payload = JSON.parse(buildVariablesDownload([capture('instance', { accountSummary: '{"version":2}', total: 10 })]));
        expect(payload.instances).toBe(1);
        expect(payload.processes[0].variableNames).toEqual(['accountSummary', 'total']);
        expect(payload.processes[0].variables.accountSummary).toEqual({ version: 2 });
        expect(payload.processes[0].variables.total).toBe(10);
    });

    it('lists the captured variable names and downloads only the chosen ones', () => {
        const captures = [capture('instance', { batchState: '{"big":true}', accountSummary: '{}' }), capture('inline', { total: 1 })];
        expect(capturedVariableNames(captures)).toEqual(['accountSummary', 'batchState', 'total']);
        const payload = JSON.parse(buildVariablesDownload(captures, new Date(), ['total']));
        expect(payload.variables).toEqual(['total']);
        expect(payload.instances).toBe(1);
        expect(payload.processes[0].variableNames).toEqual(['total']);
    });
});
