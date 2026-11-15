import { normalizeKey } from '../form-widgets/intake-account-widget/batch-state-billing-fields';

/**
 * Maps the IDP batchState of a medical account to account, invoice and patient data.
 *
 * Since 2026-11 IDP returns most invoice data in TABLES with the document's own labels:
 * - key-value tables ("Datos Demograficos del Paciente", "Información de Facturación",
 *   "resumen de Pagos"): the label is in the `Nombre` cell and the value in `Valor` / `Monto`;
 * - line-item tables ("Tabla de Servicios facturados"): one row per billed service;
 * - a few plain fields remain (provider, invoice number, NCF, history, signatures).
 *
 * The mapping is data (sources by priority), so it can later move to an Appdata file like the
 * documentary checklist. Keep `docs/automate/account-summary.script.js` in sync.
 * Pure module: no Angular imports.
 */

/** A plain document field, or a label of a key-value table (any table when `table` is omitted). */
export type IdpSource = { field: string } | { label: string; table?: string };

export type InvoiceKey =
    | 'provider'
    | 'providerTaxId'
    | 'invoiceNumber'
    | 'fiscalNumber'
    | 'invoiceDate'
    | 'validUntil'
    | 'episode'
    | 'authorization'
    | 'authorizedBy'
    | 'payer'
    | 'plan'
    | 'policy'
    | 'signedByProvider'
    | 'payerStamp';

export type PatientKey =
    | 'name'
    | 'identification'
    | 'medicalRecord'
    | 'dateOfBirth'
    | 'age'
    | 'sex'
    | 'affiliateNumber'
    | 'socialSecurity'
    | 'admissionDate'
    | 'dischargeDate'
    | 'diagnosis'
    | 'origin'
    | 'dischargeReason';

export type TotalKey = 'billed' | 'patient' | 'insurer' | 'coverage' | 'patientDifference' | 'discount';

export type ServiceColumn = 'date' | 'service' | 'code' | 'description' | 'quantity' | 'unitPrice' | 'total' | 'patientAmount' | 'coverage' | 'comment';

export interface IdpAccountMapping {
    /** Document classes that are customer invoices (one per patient). */
    invoiceClasses: string[];
    invoice: Record<InvoiceKey, IdpSource[]>;
    patient: Record<PatientKey, IdpSource[]>;
    totals: Record<TotalKey, IdpSource[]>;
    services: { tables: string[]; columns: Record<ServiceColumn, string[]> };
}

const DEMOGRAPHICS = 'Datos Demograficos del Paciente';
const BILLING = 'Información de Facturación';

export const DEFAULT_IDP_ACCOUNT_MAPPING: IdpAccountMapping = {
    invoiceClasses: ['Factura y Desglose'],
    invoice: {
        provider: [{ field: 'Nombre del Prestador' }, { label: 'NOMBRE HOSPITAL' }],
        providerTaxId: [{ field: 'RNC' }, { label: 'RNC HOSPITAL' }, { label: 'NIT', table: BILLING }],
        invoiceNumber: [{ field: 'Numero de Factura' }, { label: 'NUMERO DE DOCUMENTO' }, { label: 'Factura No.' }],
        fiscalNumber: [{ field: 'NCF' }, { label: 'NCF' }, { label: 'Factura NF' }],
        invoiceDate: [{ label: 'FECHA DE EMISION' }, { label: 'Fecha Factura' }],
        validUntil: [{ label: 'FEC VALIDA' }, { label: 'Fecha Valida Hasta' }],
        episode: [{ field: 'EPISODIO' }, { label: 'EPISODIO' }],
        authorization: [{ label: 'AUTORIZACION' }, { field: 'No. Autorización' }, { field: 'Numero de Autorización' }],
        authorizedBy: [{ label: 'AUTORIZADO POR' }],
        payer: [{ label: 'CLIENTE / SEGURO' }, { label: 'SEGURO' }, { label: 'Nombre de la ARS o Cliente' }],
        plan: [{ label: 'TIPO DE PLAN' }],
        policy: [{ label: 'Poliza/Núm de Contracto' }],
        signedByProvider: [{ field: 'Esta Firmado por el Centro Médico?' }],
        payerStamp: [{ field: 'Tiene Sello de la ARS?' }],
    },
    patient: {
        name: [{ label: 'NOMBRE O RAZON SOCIAL', table: DEMOGRAPHICS }, { label: 'Nombre/Dirección Paciente' }, { field: 'Nombre del Paciente' }],
        identification: [{ label: 'CEDULA/RNC CLIENTE', table: DEMOGRAPHICS }, { label: 'Cedula', table: DEMOGRAPHICS }, { field: 'Cedula' }],
        medicalRecord: [{ field: 'HISTORIA' }, { label: 'HISTORIA' }, { field: 'Record' }, { label: 'Record No.' }, { label: 'Record' }],
        dateOfBirth: [{ label: 'FECHA NACIMIENTO' }, { label: 'Fecha Nac.' }],
        age: [{ label: 'EDAD' }],
        sex: [{ label: 'SEXO' }],
        affiliateNumber: [{ label: 'No. AFILIADO' }],
        socialSecurity: [{ label: 'NSS' }],
        admissionDate: [{ label: 'FECHA DE INGRESO' }, { label: 'Fecha de Adm./Hora' }, { field: 'Fecha Admision' }],
        dischargeDate: [{ label: 'FECHA DE EGRESO' }, { label: 'Fecha/Hora de Alta' }],
        diagnosis: [{ label: 'DIAGNOSTICO' }, { field: 'Diagnostico' }],
        origin: [{ label: 'ORIGEN' }],
        dischargeReason: [{ label: 'Motivo de Alta' }],
    },
    totals: {
        billed: [{ label: 'TOTAL FACTURADO' }, { label: 'Monto Facturado' }, { label: 'Total General' }],
        patient: [{ label: 'TOTAL PACIENTE' }, { label: 'Monto Paciente' }],
        insurer: [{ label: 'TOTAL SEGURO' }, { label: 'Monto Seguro-ARS' }],
        coverage: [{ label: 'TOTAL COBERTURA DEL SEGURO' }],
        patientDifference: [{ label: 'TOTAL DIFERENCIA DEL PACIENTE' }],
        discount: [{ label: 'DESCUENTO' }],
    },
    services: {
        tables: ['Tabla de Servicios facturados'],
        columns: {
            date: ['Fecha'],
            service: ['Servicio'],
            code: ['CUP/CUM', 'CUPS', 'Codigo'],
            description: ['Descripción'],
            quantity: ['Cantidad'],
            unitPrice: ['Precio'],
            total: ['Total'],
            patientAmount: ['Paciente'],
            coverage: ['Cobertura'],
            comment: ['Comentario'],
        },
    },
};

/** Minimal shape of the IDP batchState this module reads. */
interface IdpCell {
    recordName?: string;
    name?: string;
    value?: unknown;
}
interface IdpTable {
    name?: string;
    records?: Array<{ records?: IdpCell[] }>;
}
export interface IdpDocument {
    id?: string;
    className?: string;
    fields?: Array<{ name?: string; value?: unknown; extractionConfidence?: number }>;
    tables?: IdpTable[];
    extractionReviewStatus?: string;
    classificationReviewStatus?: string;
    separationReviewStatus?: string;
    markAsRejected?: boolean;
}

const LABEL_COLUMN = 'NOMBRE';
const VALUE_COLUMNS = ['VALOR', 'MONTO'];
const CURRENCY_COLUMN = 'MONEDA';
const PLACEHOLDERS = new Set(['NULL', 'NA', 'NONE', 'NIL', 'UNKNOWN', 'UNDEFINED', 'NOTEXTRACTED']);

function clean(value: unknown): string | null {
    if (value === null || value === undefined || typeof value === 'object') {
        return null;
    }
    const text = String(value).trim();
    return text && !PLACEHOLDERS.has(normalizeKey(text).replace(/ /g, '')) ? text : null;
}

function cellName(cell: IdpCell): string {
    return normalizeKey(cell.recordName ?? cell.name);
}

/** Values of one document indexed by plain field name and by key-value table label. */
export interface DocumentValues {
    fields: Map<string, string>;
    /** label → value, from any key-value table; `table|label` for table-specific lookups. */
    labels: Map<string, string>;
    currency: string | null;
}

export function readDocumentValues(doc: IdpDocument): DocumentValues {
    const fields = new Map<string, string>();
    for (const field of doc.fields ?? []) {
        const key = normalizeKey(field.name);
        const value = clean(field.value);
        if (key && value && !fields.has(key)) {
            fields.set(key, value);
        }
    }
    const labels = new Map<string, string>();
    let currency: string | null = null;
    for (const table of doc.tables ?? []) {
        const tableKey = normalizeKey(table.name);
        for (const row of table.records ?? []) {
            const cells = row.records ?? [];
            const label = cells.find((cell) => cellName(cell) === LABEL_COLUMN);
            const valueCell = cells.find((cell) => VALUE_COLUMNS.includes(cellName(cell)));
            if (!label || !valueCell) {
                continue;
            }
            const key = normalizeKey(label.value);
            const value = clean(valueCell.value);
            if (!key || !value) {
                continue;
            }
            if (!labels.has(key)) {
                labels.set(key, value);
            }
            labels.set(`${tableKey}|${key}`, value);
            currency ??= clean(cells.find((cell) => cellName(cell) === CURRENCY_COLUMN)?.value);
        }
    }
    return { fields, labels, currency };
}

export function pickValue(values: DocumentValues, sources: readonly IdpSource[]): string | null {
    for (const source of sources) {
        const value =
            'field' in source
                ? values.fields.get(normalizeKey(source.field))
                : values.labels.get(source.table ? `${normalizeKey(source.table)}|${normalizeKey(source.label)}` : normalizeKey(source.label));
        if (value) {
            return value;
        }
    }
    return null;
}

/** "36,993.25" / "RD$ 1.500,00"-like texts → number; null when it is not an amount. */
export function parseAmount(value: string | null | undefined): number | null {
    if (!value) {
        return null;
    }
    let text = value.replace(/[^\d.,-]/g, '');
    if (text.includes(',') && text.includes('.')) {
        text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    } else if (text.includes(',')) {
        text = /,\d{1,2}$/.test(text) ? text.replace(',', '.') : text.replace(/,/g, '');
    }
    const amount = Number(text);
    return text && Number.isFinite(amount) ? amount : null;
}

export type ServiceLine = Record<ServiceColumn, string | null>;

function readServiceLines(doc: IdpDocument, mapping: IdpAccountMapping): ServiceLine[] {
    const tables = new Set(mapping.services.tables.map(normalizeKey));
    const columns = Object.entries(mapping.services.columns).map(([key, names]) => [key, names.map(normalizeKey)] as const);
    const lines: ServiceLine[] = [];
    for (const table of doc.tables ?? []) {
        if (!tables.has(normalizeKey(table.name))) {
            continue;
        }
        for (const row of table.records ?? []) {
            const cells = row.records ?? [];
            const line = Object.fromEntries(
                columns.map(([key, names]) => [key, clean(cells.find((cell) => names.includes(cellName(cell)))?.value)])
            ) as ServiceLine;
            if (line.code || line.description || line.total) {
                lines.push(line);
            }
        }
    }
    return lines;
}

function pickAll<K extends string>(values: DocumentValues, sources: Record<K, IdpSource[]>): Record<K, string | null> {
    return Object.fromEntries(Object.entries(sources).map(([key, list]) => [key, pickValue(values, list as IdpSource[])])) as Record<K, string | null>;
}

export interface MappedDocument {
    id: string;
    className: string;
    isInvoice: boolean;
    reviewRequired: boolean;
    rejected: boolean;
    invoice: Record<InvoiceKey, string | null>;
    patient: Record<PatientKey, string | null>;
    totals: Record<TotalKey, number | null>;
    currency: string | null;
    services: ServiceLine[];
}

export function mapIdpDocument(doc: IdpDocument, mapping: IdpAccountMapping = DEFAULT_IDP_ACCOUNT_MAPPING): MappedDocument {
    const values = readDocumentValues(doc);
    const invoiceClasses = new Set(mapping.invoiceClasses.map(normalizeKey));
    const totals = pickAll(values, mapping.totals);
    return {
        id: String(doc.id ?? ''),
        className: doc.className ?? '',
        isInvoice: invoiceClasses.has(normalizeKey(doc.className)),
        reviewRequired: [doc.extractionReviewStatus, doc.classificationReviewStatus, doc.separationReviewStatus].includes('ReviewRequired'),
        rejected: doc.markAsRejected === true,
        invoice: pickAll(values, mapping.invoice),
        patient: pickAll(values, mapping.patient),
        totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, parseAmount(value as string | null)])) as Record<TotalKey, number | null>,
        currency: values.currency,
        services: readServiceLines(doc, mapping),
    };
}

/** One customer invoice of the account with its patient and supporting documents. */
export interface MappedInvoice {
    key: string;
    invoice: MappedDocument;
    /** Patient data: the invoice's, completed with values found in the supporting documents. */
    patient: Record<PatientKey, string | null>;
    supporting: MappedDocument[];
}

export interface MappedAccount {
    invoices: MappedInvoice[];
    /** Supporting documents that could not be tied to a patient of a multi-invoice account. */
    unassigned: MappedDocument[];
}

const LINK_KEYS: PatientKey[] = ['medicalRecord', 'identification', 'name'];

/**
 * Invoices create the groups (one per patient). Supporting documents join by medical record,
 * identification or name; with a single invoice every document belongs to it.
 */
export function mapIdpAccount(batchState: { documents?: IdpDocument[] } | null, mapping: IdpAccountMapping = DEFAULT_IDP_ACCOUNT_MAPPING): MappedAccount {
    const documents = (batchState?.documents ?? []).filter(Boolean).map((doc) => mapIdpDocument(doc, mapping));
    // Invoice classes decide; other documents may also print an invoice number (e.g. pathology).
    // Only when no document has an invoice class, documents with an invoice number are used.
    const byClass = documents.filter((doc) => doc.isInvoice);
    const invoiceDocs = byClass.length ? byClass : documents.filter((doc) => !!doc.invoice.invoiceNumber && !!pickPatientLink(doc));
    const invoices: MappedInvoice[] = invoiceDocs.map((doc, index) => ({
        key: doc.invoice.invoiceNumber ? `invoice:${normalizeKey(doc.invoice.invoiceNumber)}` : `document:${doc.id || index}`,
        invoice: doc,
        patient: { ...doc.patient },
        supporting: [],
    }));
    const unassigned: MappedDocument[] = [];
    for (const doc of documents) {
        if (invoiceDocs.includes(doc)) {
            continue;
        }
        const target = findInvoiceFor(doc, invoices) ?? (invoices.length === 1 ? invoices[0] : null);
        if (!target) {
            unassigned.push(doc);
            continue;
        }
        target.supporting.push(doc);
        for (const [key, value] of Object.entries(doc.patient) as Array<[PatientKey, string | null]>) {
            target.patient[key] ??= value;
        }
    }
    return { invoices, unassigned };
}

function pickPatientLink(doc: MappedDocument): string | null {
    return doc.patient.medicalRecord ?? doc.patient.identification ?? doc.patient.name;
}

function findInvoiceFor(doc: MappedDocument, invoices: MappedInvoice[]): MappedInvoice | null {
    for (const key of LINK_KEYS) {
        const value = doc.patient[key];
        if (!value) {
            continue;
        }
        const match = invoices.find((invoice) => invoice.patient[key] && normalizeKey(invoice.patient[key]) === normalizeKey(value));
        if (match) {
            return match;
        }
    }
    return null;
}
