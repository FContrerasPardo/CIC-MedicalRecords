import { IdpDocument, mapIdpAccount, mapIdpDocument, parseAmount, readDocumentValues } from './idp-account-mapping.util';

/** Synthetic documents with the 2026-11 IDP shape (key-value tables + line items). No real data. */
const kv = (name: string, rows: Array<[string, string, string?]>) => ({
    name,
    records: rows.map(([label, value, currency]) => ({
        records: [
            { recordName: 'Nombre', value: label },
            ...(currency !== undefined ? [{ recordName: 'Moneda', value: currency }, { recordName: 'Monto', value }] : [{ recordName: 'Valor', value }]),
        ],
    })),
});

const invoice = (id: string, number: string, history: string, patient: string): IdpDocument => ({
    id,
    className: 'Factura y Desglose',
    extractionReviewStatus: 'ReviewRequired',
    fields: [
        { name: 'Nombre del Prestador', value: 'Synthetic Hospital' },
        { name: 'Numero de Factura', value: number },
        { name: 'NCF', value: 'B01-TEST' },
        { name: 'HISTORIA', value: history },
    ],
    tables: [
        kv('Datos Demograficos del Paciente', [
            ['NOMBRE O RAZON SOCIAL', patient],
            ['CEDULA/RNC CLIENTE', `ID-${history}`],
            ['FECHA NACIMIENTO', '1990-01-01'],
            ['CLIENTE / SEGURO', 'Synthetic Payer'],
        ]),
        kv('Información de Facturación', [
            ['NUMERO DE DOCUMENTO', number],
            ['FECHA DE EMISION', '2026-11-01'],
        ]),
        kv('resumen de Pagos', [
            ['TOTAL FACTURADO', '36,993.25', 'RD'],
            ['TOTAL PACIENTE', '481.12', 'RD'],
        ]),
        {
            name: 'Tabla de Servicios facturados',
            records: [
                {
                    records: [
                        { recordName: 'CUP/CUM', value: 'S11202' },
                        { recordName: 'Descripción', value: 'Synthetic service' },
                        { recordName: 'Cantidad', value: '1' },
                        { recordName: 'Total', value: '2,415.00' },
                    ],
                },
                { records: [{ recordName: 'Comentario', value: '' }] },
            ],
        },
    ],
});

describe('IDP account mapping', () => {
    it('reads plain fields and key-value table labels', () => {
        const values = readDocumentValues(invoice('d1', 'F-1', 'H-1', 'Synthetic One'));
        expect(values.fields.get('NUMERO DE FACTURA')).toBe('F-1');
        expect(values.labels.get('NOMBRE O RAZON SOCIAL')).toBe('Synthetic One');
        expect(values.labels.get('DATOS DEMOGRAFICOS DEL PACIENTE|FECHA NACIMIENTO')).toBe('1990-01-01');
        expect(values.currency).toBe('RD');
    });

    it('maps invoice, patient, totals and service lines of an invoice', () => {
        const doc = mapIdpDocument(invoice('d1', 'F-1', 'H-1', 'Synthetic One'));
        expect(doc.isInvoice).toBe(true);
        expect(doc.reviewRequired).toBe(true);
        expect(doc.invoice.provider).toBe('Synthetic Hospital');
        expect(doc.invoice.invoiceNumber).toBe('F-1');
        expect(doc.invoice.invoiceDate).toBe('2026-11-01');
        expect(doc.invoice.payer).toBe('Synthetic Payer');
        expect(doc.patient.name).toBe('Synthetic One');
        expect(doc.patient.medicalRecord).toBe('H-1');
        expect(doc.patient.identification).toBe('ID-H-1');
        expect(doc.totals.billed).toBe(36993.25);
        expect(doc.totals.patient).toBe(481.12);
        expect(doc.services.length).toBe(1);
        expect(doc.services[0].code).toBe('S11202');
        expect(doc.services[0].total).toBe('2,415.00');
    });

    it('parses amounts in both decimal styles', () => {
        expect(parseAmount('36,993.25')).toBe(36993.25);
        expect(parseAmount('RD$ 1.500,50')).toBe(1500.5);
        expect(parseAmount('247')).toBe(247);
        expect(parseAmount('n/a')).toBeNull();
        expect(parseAmount(null)).toBeNull();
    });

    it('creates one invoice per patient and links supporting documents by medical record', () => {
        const lab: IdpDocument = { id: 'lab', className: 'Laboratorios', fields: [{ name: 'Record', value: 'H-2' }, { name: 'Nombre del Paciente', value: 'Synthetic Two' }] };
        const stray: IdpDocument = { id: 'x', className: 'Laboratorios', fields: [{ name: 'Record', value: 'H-9' }] };
        const account = mapIdpAccount({ documents: [invoice('d1', 'F-1', 'H-1', 'Synthetic One'), invoice('d2', 'F-2', 'H-2', 'Synthetic Two'), lab, stray] });
        expect(account.invoices.map((entry) => entry.key)).toEqual(['invoice:F 1', 'invoice:F 2']);
        expect(account.invoices[1].supporting.map((doc) => doc.id)).toEqual(['lab']);
        expect(account.unassigned.map((doc) => doc.id)).toEqual(['x']);
    });

    it('attaches every supporting document to a single invoice and completes the patient', () => {
        const pathology: IdpDocument = {
            id: 'pat',
            className: 'Reporte de Patología',
            fields: [{ name: 'Numero de Factura', value: 'OTHER' }, { name: 'Nombre del Paciente', value: 'Someone' }, { name: 'Diagnostico', value: 'Synthetic dx' }],
        };
        const bare = invoice('d1', 'F-1', 'H-1', 'Synthetic One');
        bare.tables = [];
        const account = mapIdpAccount({ documents: [bare, pathology] });
        expect(account.invoices.length).toBe(1);
        expect(account.invoices[0].supporting.map((doc) => doc.id)).toEqual(['pat']);
        expect(account.invoices[0].patient.diagnosis).toBe('Synthetic dx');
        expect(account.invoices[0].patient.name).toBe('Someone');
    });
});
