import { contractFileValidity, agreementContractFiles, withContractFiles, withoutContractFile } from '../documents/agreement-documents.util';
import { agreementTemplateFile } from '../store/agreement-templates';
import { agreementContacts, contactInitials, createContact, executionBars } from './agreement-general.util';

describe('agreement general data and documents', () => {
    it('reads the demo contacts of both templates, with translated roles only', () => {
        for (const agreementId of ['centro-medico-latam', 'hospital-general-hyland-latam']) {
            const contacts = agreementContacts(agreementTemplateFile(agreementId, 'agreement'));
            expect(contacts.map((contact) => `${contact.name} <${contact.email}> ${contact.role}`)).toEqual([
                'Fernando Contreras <fernando.contreras@hyland.com> Agreement coordination',
                'Mauricio Valdez <mauricio.valdez@hyland.com> Medical audit',
                'Larissa Trentin <larissa.trentin@hyland.com> Billing',
            ]);
            const es = agreementContacts(agreementTemplateFile(agreementId, 'agreement', 'es'));
            expect(es.map((contact) => `${contact.name}|${contact.role}`)).toEqual(['Fernando Contreras|Coordinación del convenio', 'Mauricio Valdez|Auditoría médica', 'Larissa Trentin|Facturación']);
        }
        expect(agreementContacts({ contacts: [{ name: '' }, { name: 'Alex Demo' }] }).map((contact) => contact.name)).toEqual(['Alex Demo']);
        expect(agreementContacts({})).toEqual([]);
    });

    it('builds avatar initials and new contact ids', () => {
        expect(contactInitials('Alex Demo')).toBe('AD');
        expect(contactInitials('  kim  ')).toBe('K');
        expect(contactInitials('')).toBe('?');
        expect(createContact('x', [{ id: 'x-contact-2', name: 'a', role: '', email: '', phone: '' }]).id).toBe('x-contact-3');
    });

    it('computes the execution bars as shares of the budget', () => {
        expect(executionBars({ budgetTotal: 1000, billedYtd: 250, pendingApproval: 2000 }).map((bar) => bar.percent)).toEqual([100, 25, 100]);
        expect(executionBars({}).map((bar) => bar.percent)).toEqual([0, 0, 0]);
    });

    it('lists, adds and removes contract files of agreement.json', () => {
        const template = agreementTemplateFile('centro-medico-latam', 'agreement');
        const declared = agreementContractFiles(template);
        expect(declared.map((file) => file.type)).toEqual(['CONTRACT', 'TARIFF_ANNEX', 'ANNEX']);
        expect(declared.every((file) => file.declared)).toBe(true);
        const file = { documentId: 'node-1', name: 'contrato.pdf', type: 'CONTRACT' as const, validFrom: '2026-01-01', validTo: '2026-12-31', mimeType: 'application/pdf', addedAt: 'now' };
        const added = withContractFiles(template, [file, file]);
        expect(agreementContractFiles(added).filter((item) => !item.declared)).toEqual([file]);
        expect(agreementContractFiles(withoutContractFile(added, 'node-1')).filter((item) => !item.declared)).toEqual([]);
    });

    it('computes the validity of a contract file', () => {
        const today = new Date('2026-06-01T00:00:00Z');
        expect(contractFileValidity({ validFrom: '2026-01-01', validTo: '2026-12-31' }, today)).toBe('valid');
        expect(contractFileValidity({ validFrom: '', validTo: '2026-01-31' }, today)).toBe('expired');
        expect(contractFileValidity({ validFrom: '2026-07-01', validTo: '' }, today)).toBe('upcoming');
        expect(contractFileValidity({ validFrom: '', validTo: '' }, today)).toBe('unknown');
    });
});
