import { mapBatchStateToIntakeForDocuments } from './batch-state.mapper';
import { BatchStateSource } from './batch-state.model';
import { createEmbeddedFormField } from '../shared/embedded-form-field';

/** Synthetic two-invoice account with the 2026-11 IDP table shape. No real data. */
function account(): BatchStateSource {
    const serviceTable = (rows: Array<[string, string, string]>) => ({
        name: 'Tabla de Servicios facturados',
        records: rows.map(([code, description, total]) => ({
            records: [
                { recordName: 'CUP/CUM', value: code },
                { recordName: 'Descripción', value: description },
                { recordName: 'Cantidad', value: '1' },
                { recordName: 'Total', value: total },
            ],
        })),
    });
    return {
        documents: [
            {
                id: 'inv-1',
                name: 'Invoice one',
                className: 'Factura y Desglose',
                fields: [{ name: 'Numero de Factura', value: 'F-1' }],
                tables: [serviceTable([['S-1', 'Synthetic consult', '100.00'], ['S-2', 'Synthetic lab', '50.00']])],
            },
            {
                id: 'auth-1',
                name: 'Authorization one',
                className: 'Formato de Autorización',
                fields: [{ name: 'No. Autorización', value: 'A-1' }],
            },
            {
                id: 'inv-2',
                name: 'Invoice two',
                className: 'Factura y Desglose',
                fields: [{ name: 'Numero de Factura', value: 'F-2' }],
                tables: [serviceTable([['S-9', 'Other patient service', '75.00']])],
            },
        ],
    };
}

describe('intake embedded in the case view', () => {
    it('maps only the documents of one customer invoice, without a patient selector', () => {
        const view = mapBatchStateToIntakeForDocuments(account(), ['inv-1', 'auth-1']);
        expect(view.patientSelector.visible).toBe(false);
        expect(view.services.map((service) => service.cup)).toEqual(['S-1', 'S-2']);
        expect(view.documents.map((document) => document.id).sort()).toEqual(['auth-1', 'inv-1']);
        expect(view.meta.emptyState).toBe(false);
    });

    it('returns the empty state when the invoice documents are not in batchState', () => {
        const view = mapBatchStateToIntakeForDocuments(account(), ['missing']);
        expect(view.services).toEqual([]);
        expect(view.meta.emptyState).toBe(true);
    });

    it('exposes process variables as form fields and keeps writes in memory', () => {
        const variables = { batchState: '{"documents":[]}', unifiedWidgetPayloadText: null };
        const field = createEmbeddedFormField('batchState', variables);
        expect(field.value).toBe('{"documents":[]}');
        expect(field.form.getFieldById('batchState')).toBe(field);
        expect(field.form.getFieldById('codingIntegrityResult').value).toBeNull();

        field.form.getFieldById('batchState').value = '{"documents":[{}]}';
        expect(field.value).toBe('{"documents":[{}]}');
        expect(variables.batchState).toBe('{"documents":[]}');
    });
});
