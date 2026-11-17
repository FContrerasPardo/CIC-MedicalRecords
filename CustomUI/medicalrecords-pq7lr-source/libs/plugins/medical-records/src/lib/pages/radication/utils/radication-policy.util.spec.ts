import * as policyModule from '../policy/default-preanalysis-policy.json';
import { buildPolicyView, MULTI_INVOICE_PROFILE, parsePreanalysisPolicy, policyClassStatus, selectPolicyProfileKey, SINGLE_INVOICE_PROFILE } from './radication-policy.util';

// Jest (no esModuleInterop) gives the JSON object itself; bundlers add a `default` export.
const defaultPolicy: unknown = (policyModule as { default?: unknown }).default ?? policyModule;

describe('radication policy', () => {
    const policy = parsePreanalysisPolicy(defaultPolicy);

    it('parses the bundled policy with both profiles', () => {
        expect(policy).not.toBeNull();
        expect(Object.keys(policy?.profiles ?? {}).sort()).toEqual([MULTI_INVOICE_PROFILE, SINGLE_INVOICE_PROFILE].sort());
        expect(policy?.profiles[SINGLE_INVOICE_PROFILE].alwaysRequired.length).toBe(4);
        expect(policy?.profiles[SINGLE_INVOICE_PROFILE].conditionallyRequired[0].condition).toBeTruthy();
    });

    it('parses the file text and rejects text without profiles', () => {
        expect(parsePreanalysisPolicy(JSON.stringify(defaultPolicy))?.policyId).toBe('ARS-PREANALYSIS-POLICY');
        expect(parsePreanalysisPolicy('not json')).toBeNull();
        expect(parsePreanalysisPolicy({ profiles: {} })).toBeNull();
    });

    it('selects the profile by invoice count', () => {
        if (!policy) {
            throw new Error('policy');
        }
        expect(selectPolicyProfileKey(policy, 1)).toBe(SINGLE_INVOICE_PROFILE);
        expect(selectPolicyProfileKey(policy, 3)).toBe(MULTI_INVOICE_PROFILE);
        expect(selectPolicyProfileKey(policy, 0)).toBe(SINGLE_INVOICE_PROFILE);
    });

    it('matches classes by normalized name, missing over attention over found', () => {
        const rows = [
            { className: 'Factura y desglose', status: 'pass' as const },
            { className: 'PLANILLA DE ADMISION', status: 'attention' as const },
            { className: 'Planilla de Admisión', status: 'pass' as const },
            { className: 'Carnet de Afiliación', status: 'missing' as const },
        ];
        expect(policyClassStatus('Factura y Desglose', rows)).toBe('found');
        expect(policyClassStatus('Planilla de Admisión', rows)).toBe('attention');
        expect(policyClassStatus('Carnet de Afiliacion', rows)).toBe('missing');
        expect(policyClassStatus('Laboratorios', rows)).toBe('none');
    });

    it('builds the view: unmentioned required classes are missing, conditional ones stay neutral', () => {
        if (!policy) {
            throw new Error('policy');
        }
        const view = buildPolicyView(policy, 1, [
            { className: 'Factura y Desglose', status: 'pass' },
            { className: 'Laboratorios', status: 'pass' },
        ]);
        expect(view.profileKey).toBe(SINGLE_INVOICE_PROFILE);
        expect(view.required.map((item) => item.status)).toEqual(['found', 'missing', 'missing', 'missing']);
        expect(view.conditional.find((item) => item.className === 'Laboratorios')?.status).toBe('found');
        expect(view.conditional.find((item) => item.className === 'Receta Médica')?.status).toBe('none');
        expect(view.crossChecks.length).toBe(6);

        const multi = buildPolicyView(policy, 2, []);
        expect(multi.profileKey).toBe(MULTI_INVOICE_PROFILE);
        expect(multi.required.length).toBe(1);
        expect(multi.conditional.length).toBe(0);
    });
});
