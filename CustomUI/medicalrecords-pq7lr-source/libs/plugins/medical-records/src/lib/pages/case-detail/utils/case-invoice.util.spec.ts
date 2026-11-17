import { buildCaseAccountView, CaseInvoiceOption, listCaseInvoices, resolveInvoiceSelection } from './case-invoice.util';

const option = (key: string): CaseInvoiceOption => ({
    key,
    patientName: `Synthetic ${key}`,
    invoiceNumber: `INV-${key}`,
    documentIds: [key],
    documentCount: 1,
    totalBilled: 10,
    currency: 'RD',
    needsReview: false,
    patient: {} as CaseInvoiceOption['patient'],
});

/** Synthetic invoice with the 2026-11 IDP shape (key-value tables). No real data. */
const invoice = (id: string, number: string, history: string, total: string) => ({
    id,
    className: 'Factura y Desglose',
    fields: [
        { name: 'Nombre del Prestador', value: 'Synthetic Hospital' },
        { name: 'Numero de Factura', value: number },
        { name: 'HISTORIA', value: history },
    ],
    tables: [
        { name: 'Datos Demograficos del Paciente', records: [{ records: [{ recordName: 'Nombre', value: 'NOMBRE O RAZON SOCIAL' }, { recordName: 'Valor', value: `Patient ${history}` }] }] },
        { name: 'resumen de Pagos', records: [{ records: [{ recordName: 'Nombre', value: 'TOTAL FACTURADO' }, { recordName: 'Moneda', value: 'RD' }, { recordName: 'Monto', value: total }] }] },
    ],
});

describe('case invoices', () => {
    it('has nothing to choose without invoices', () => {
        const selection = resolveInvoiceSelection([], 'a');
        expect(selection.mode).toBe('none');
        expect(selection.selected).toBeNull();
    });

    it('opens a single invoice directly, whatever the URL asks for', () => {
        const selection = resolveInvoiceSelection([option('a')], 'missing');
        expect(selection.mode).toBe('direct');
        expect(selection.selected?.key).toBe('a');
    });

    it('asks to choose when the account has several invoices and none is requested', () => {
        const selection = resolveInvoiceSelection([option('a'), option('b')], null);
        expect(selection.mode).toBe('select');
        expect(selection.selected).toBeNull();
    });

    it('shows the requested invoice of a multi-invoice account', () => {
        const selection = resolveInvoiceSelection([option('a'), option('b')], 'b');
        expect(selection.mode).toBe('select');
        expect(selection.selected?.key).toBe('b');
    });

    it('goes back to the selector when the requested invoice no longer exists', () => {
        expect(resolveInvoiceSelection([option('a'), option('b')], 'gone').selected).toBeNull();
    });

    it('lists no invoices without a batchState', () => {
        expect(listCaseInvoices(null)).toEqual([]);
    });

    it('builds the account identifier and one invoice per patient', () => {
        const lab = { id: 'lab', className: 'Laboratorios', fields: [{ name: 'Record', value: 'H-2' }] };
        const view = buildCaseAccountView({ documents: [invoice('d1', 'F-1', 'H-1', '1,000.50'), invoice('d2', 'F-2', 'H-2', '2,000.00'), lab] });
        expect(view.account.provider).toBe('Synthetic Hospital');
        expect(view.account.invoiceCount).toBe(2);
        expect(view.account.documentCount).toBe(3);
        expect(view.account.totalBilled).toBe(3000.5);
        expect(view.account.currency).toBe('RD');
        expect(view.account.unassignedCount).toBe(0);
        expect(view.invoices.map((entry) => entry.invoiceNumber)).toEqual(['F-1', 'F-2']);
        expect(view.invoices[1].patientName).toBe('Patient H-2');
        expect(view.invoices[1].documentIds).toEqual(['d2', 'lab']);
    });
});
