import { RuleAssistantRequest } from './rule-assistant.model';
import { documentClassOf, extractProcedureCodes, interpretRuleRequest, kindOfRow, parseCsv, parseRuleAmount, splitRuleSentences } from './rule-assistant.util';
import { validateAgreementFile } from '../store/agreement-store.util';
import { parseDocumentationChecklist } from '../checklist/documentation-checklist.util';

const CLASSES = ['Factura y Desglose', 'Informe quirúrgico', 'Nota de Enfermería', 'Orden o autorización de procedimiento'];

function request(extra: Partial<RuleAssistantRequest>): RuleAssistantRequest {
    return {
        agreementId: 'centro-medico-latam',
        existingIds: { documentationChecklist: ['SIF-001', 'SIF-002'], payerCompliancePolicy: ['COMP-001', 'COMP-002', 'COMP-003'], codingRules: ['CR-001'] },
        documentClasses: CLASSES,
        ...extra,
    };
}

describe('simulated rules assistant (keyword parser)', () => {
    it('parses amounts in Dominican, English and shorthand formats', () => {
        expect(parseRuleAmount('más de RD$ 80.000')).toBe(80000);
        expect(parseRuleAmount('above RD$ 80,000')).toBe(80000);
        expect(parseRuleAmount('RD$ 2.800,50')).toBe(2800.5);
        expect(parseRuleAmount('RD$80k')).toBe(80000);
        expect(parseRuleAmount('cuesta 1500 pesos')).toBe(1500);
        expect(parseRuleAmount('sin monto')).toBeNull();
    });

    it('finds procedure codes and document classes', () => {
        expect(extractProcedureCodes('El 99213 no se factura con el 99214 ni SRG-4921')).toEqual(['99213', '99214', 'SRG-4921']);
        expect(documentClassOf('requieren la nota de enfermería', CLASSES)).toBe('Nota de Enfermería');
        expect(documentClassOf('must attach the surgical report', [])).toBe('Informe quirúrgico');
        expect(documentClassOf('nada que ver', [])).toBeNull();
    });

    it('turns the prior-authorization example into a compliance threshold rule', () => {
        const result = interpretRuleRequest(request({ text: 'Las cirugías de más de RD$ 80.000 requieren autorización previa' }));
        expect(result.simulated).toBe(true);
        expect(result.proposals.length).toBe(1);
        const [proposal] = result.proposals;
        expect(proposal.kind).toBe('payerCompliancePolicy');
        expect(proposal.reason).toBe('REASON_PRIOR_AUTH_AMOUNT');
        expect(proposal.row).toEqual({
            policyRuleId: 'COMP-004',
            type: 'PRIOR_AUTH_AMOUNT_THRESHOLD',
            amountThreshold: 80000,
            currency: 'DOP',
            serviceCategory: 'surgery',
            description: 'Las cirugías de más de RD$ 80.000 requieren autorización previa',
            requiredDocuments: ['Orden o autorización de procedimiento'],
            riskLevelIfViolated: 'HIGH',
        });
        expect(validateAgreementFile('payerCompliancePolicy', { rules: [proposal.row] })).toEqual([]);
    });

    it('proposes a conditional checklist rule for a required document', () => {
        const [proposal] = interpretRuleRequest(request({ text: 'Las hospitalizaciones de más de 3 noches requieren la nota de enfermería' })).proposals;
        expect(proposal.kind).toBe('documentationChecklist');
        expect(proposal.row['ruleId']).toBe('SIF-003');
        expect(proposal.row['requiredDocuments']).toEqual(['Nota de Enfermería']);
        expect(proposal.row['appliesTo']).toEqual({ procedureCodes: [], serviceCategories: ['hospitalization'] });
        expect(proposal.row['condition']).not.toBe('');
        expect(parseDocumentationChecklist({ rules: [proposal.row] })?.rules[0].ruleId).toBe('SIF-003');
    });

    it('proposes tariff, incompatibility, bundle and diagnosis rows', () => {
        const result = interpretRuleRequest(
            request({
                text: [
                    'La tarifa del 890201 es RD$ 2.800 con 5% de variación',
                    'El 99213 no se factura junto con el 99214',
                    'El paquete SRG-4921 incluye AN-883 y RM-102',
                    'The 903895 requires diagnosis J18.9 or R91.8',
                ].join('\n'),
            })
        );
        expect(result.proposals.map((proposal) => proposal.kind)).toEqual(['tariffAgreement', 'codingRules', 'payerCodingPolicy', 'codingRules']);
        const [tariff, incompatible, bundle, diagnosis] = result.proposals.map((proposal) => proposal.row);
        expect([tariff['serviceCode'], tariff['expectedAmount'], tariff['minAmount'], tariff['maxAmount'], tariff['allowedVariancePercentage']]).toEqual(['890201', 2800, 2660, 2940, 5]);
        expect([incompatible['ruleId'], incompatible['procedureCode'], incompatible['incompatibleWith']]).toEqual(['CR-002', '99213', ['99214']]);
        expect([bundle['type'], bundle['primaryProcedureCode'], bundle['bundledCodes']]).toEqual(['BUNDLED_SERVICE', 'SRG-4921', ['AN-883', 'RM-102']]);
        expect([diagnosis['ruleId'], diagnosis['allowedDiagnosisCodes']]).toEqual(['CR-003', ['J18.9', 'R91.8']]);
        expect(validateAgreementFile('tariffAgreement', { tariffRules: [tariff] })).toEqual([]);
    });

    it('reports what it cannot interpret, without inventing rules', () => {
        const result = interpretRuleRequest(request({ text: 'Hola, ¿qué tal?' }));
        expect(result.proposals).toEqual([]);
        expect(result.unrecognized).toEqual(['Hola, ¿qué tal?']);
    });

    it('imports JSON rows, whole agreement files and the agent output shape', () => {
        const rows = interpretRuleRequest(
            request({ file: { name: 'rules.json', content: JSON.stringify([{ ruleId: '', requiredDocuments: ['Factura y Desglose'], riskLevelIfMissing: 'high' }, 'El 99213 no se factura junto con el 99214']) } })
        );
        expect(rows.proposals.map((proposal) => proposal.kind)).toEqual(['documentationChecklist', 'codingRules']);
        expect(rows.proposals[0].row['ruleId']).toBe('SIF-003');
        expect(rows.proposals[0].row['riskLevelIfMissing']).toBe('HIGH');

        const file = interpretRuleRequest(request({ file: { name: 'tariff.json', content: JSON.stringify({ tariffRules: [{ serviceCode: '890201', expectedAmount: 2500 }] }) } }));
        expect(file.proposals[0].kind).toBe('tariffAgreement');
        expect(file.proposals[0].row['procedureCode']).toBe('890201');

        const agent = interpretRuleRequest(request({ file: { name: 'agent.json', content: JSON.stringify({ proposals: [{ kind: 'codingRules', row: { ruleId: 'CR-001', type: 'X', riskLevelIfViolated: 'LOW' } }] }) } }));
        expect(agent.proposals[0].row['ruleId']).toBe('CR-002');

        expect(interpretRuleRequest(request({ file: { name: 'broken.json', content: '{' } })).unrecognized).toEqual(['broken.json']);
    });

    it('imports CSV (file columns or a text column) and TXT (one rule per line)', () => {
        expect(parseCsv('a;b\n"x;1";"say ""hi"""')).toEqual([
            ['a', 'b'],
            ['x;1', 'say "hi"'],
        ]);
        const csv = interpretRuleRequest(
            request({ file: { name: 'rules.csv', content: 'serviceCode,description,expectedAmount\n903895,Rayos X,10800\n' } })
        );
        expect(csv.proposals[0].kind).toBe('tariffAgreement');
        expect(csv.proposals[0].row['expectedAmount']).toBe(10800);
        const text = interpretRuleRequest(request({ file: { name: 'rules.csv', content: 'text\nLas cirugías de más de RD$ 80.000 requieren autorización previa\n' } }));
        expect(text.proposals[0].kind).toBe('payerCompliancePolicy');
        const txt = interpretRuleRequest(request({ file: { name: 'rules.txt', content: '# comentario\nEl 99213 no se factura junto con el 99214\n\nalgo sin regla' } }));
        expect(txt.proposals.length).toBe(1);
        expect(txt.unrecognized).toEqual(['algo sin regla']);
    });

    it('splits several sentences and keeps thousands separators inside a sentence', () => {
        expect(splitRuleSentences('Las cirugías de más de RD$ 80.000 requieren autorización. El 99213 no se factura con el 99214.')).toEqual([
            'Las cirugías de más de RD$ 80.000 requieren autorización',
            'El 99213 no se factura con el 99214',
        ]);
        expect(splitRuleSentences('- uno\n- dos')).toEqual(['uno', 'dos']);
    });

    it('classifies rows by their keys', () => {
        expect(kindOfRow({ serviceCode: '1' })).toBe('tariffAgreement');
        expect(kindOfRow({ ruleId: 'SIF-1', requiredDocuments: [] })).toBe('documentationChecklist');
        expect(kindOfRow({ policyRuleId: 'COMP-9', type: 'PRIOR_AUTH_REQUIRED' })).toBe('payerCompliancePolicy');
        expect(kindOfRow({ policyRuleId: 'PCP-9', type: 'BUNDLED_SERVICE' })).toBe('payerCodingPolicy');
        expect(kindOfRow({ ruleId: 'CR-9', type: 'X' })).toBe('codingRules');
        expect(kindOfRow({ foo: 1 })).toBeNull();
    });
});
