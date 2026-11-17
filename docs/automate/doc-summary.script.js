// Automate script task: build a compact `docSummary` from the IDP batchState for the pre-analysis agent.
//
// Why: same idea as CIC-Fin's docSummary. The agent needs every document's class, extracted fields,
// key-value tables and billed service lines, but not the IDP noise (confidences, bounding boxes,
// pages, review metadata). `accountSummary` is too thin for this (it keeps per-invoice totals and
// document ids only), and batchState is too heavy.
//
// Where: right after the accountSummary script (it reuses its invoice/patient grouping), before the
// "Preanálisis documental" agent; again after "Document IA New Docs" → "Append Documents".
// Inputs: batchState (json), accountSummary (json). Output: docSummary (json). Pass it to the agent
// through jsontostring as `SdocSummary` (agent input `docSummary`).
//
// Grouping: one entry per customer invoice/patient from accountSummary.patients (documentIds);
// documents in no group go to `accountLevelDocuments`.
// Runtime data (names, identifications) lives only in this process variable; never copy it into the
// repository.

const MAX_TEXT = 300;
const MAX_FIELDS = 60;
const MAX_LINES = 80;
const SERVICE_TABLES = ['TABLA DE SERVICIOS FACTURADOS'];
const PLACEHOLDERS = ['NULL', 'NA', 'NONE', 'NIL', 'UNKNOWN', 'UNDEFINED', 'NOTEXTRACTED'];

const parse = (raw) => (typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {});
const batch = parse(variables.batchState);
const account = parse(variables.accountSummary);
const documents = Array.isArray(batch.documents) ? batch.documents.filter(Boolean) : [];

function normalize(value) {
    return String(value === null || value === undefined ? '' : value)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toUpperCase();
}

function clean(value) {
    if (value === null || value === undefined || typeof value === 'object') {
        return null;
    }
    const text = String(value).trim();
    if (!text || PLACEHOLDERS.indexOf(normalize(text).replace(/ /g, '')) >= 0) {
        return null;
    }
    return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + '…' : text;
}

const cellName = (cell) => normalize(cell.recordName || cell.name);
const cellLabel = (cell) => String(cell.recordName || cell.name || '').trim();

function summarizeDocument(doc) {
    const fields = {};
    let fieldCount = 0;
    (Array.isArray(doc.fields) ? doc.fields : []).forEach((field) => {
        const name = String(field.name || field.id || '').trim();
        const value = clean(field.value);
        if (name && value && !(name in fields) && fieldCount < MAX_FIELDS) {
            fields[name] = value;
            fieldCount += 1;
        }
    });

    const tables = {};
    const serviceLines = [];
    (Array.isArray(doc.tables) ? doc.tables : []).forEach((table) => {
        const tableName = String(table.name || '').trim();
        const rows = Array.isArray(table.records) ? table.records : [];
        if (SERVICE_TABLES.indexOf(normalize(tableName)) >= 0) {
            rows.forEach((row) => {
                if (serviceLines.length >= MAX_LINES) {
                    return;
                }
                const line = {};
                (Array.isArray(row.records) ? row.records : []).forEach((cell) => {
                    const value = clean(cell.value);
                    if (value) {
                        line[cellLabel(cell)] = value;
                    }
                });
                if (Object.keys(line).length) {
                    serviceLines.push(line);
                }
            });
            return;
        }
        // Key-value tables: label in `Nombre`, value in `Valor` / `Monto`, optional `Moneda`.
        const pairs = {};
        rows.forEach((row) => {
            const cells = Array.isArray(row.records) ? row.records : [];
            const label = cells.find((cell) => cellName(cell) === 'NOMBRE');
            const valueCell = cells.find((cell) => ['VALOR', 'MONTO'].indexOf(cellName(cell)) >= 0);
            const key = label && clean(label.value);
            const value = valueCell && clean(valueCell.value);
            if (key && value && !(key in pairs)) {
                const money = cells.find((cell) => cellName(cell) === 'MONEDA');
                const currency = money && clean(money.value);
                pairs[key] = currency ? value + ' ' + currency : value;
            }
        });
        if (Object.keys(pairs).length) {
            tables[tableName || 'table'] = pairs;
        }
    });

    const summary = { id: doc.id, className: doc.className || 'unclassified', fields: fields };
    if (Object.keys(tables).length) {
        summary.tables = tables;
    }
    if (serviceLines.length) {
        summary.serviceLines = serviceLines;
    }
    if (
        doc.extractionReviewStatus === 'ReviewRequired' ||
        doc.classificationReviewStatus === 'ReviewRequired' ||
        doc.separationReviewStatus === 'ReviewRequired'
    ) {
        summary.reviewRequired = true;
    }
    return summary;
}

const byId = {};
documents.forEach((doc) => {
    byId[doc.id] = summarizeDocument(doc);
});

const assigned = {};
const invoices = (Array.isArray(account.patients) ? account.patients : []).map((patient) => {
    const ids = Array.isArray(patient.documentIds) ? patient.documentIds : [];
    ids.forEach((id) => {
        assigned[id] = true;
    });
    const invoice = patient.invoice || {};
    return {
        invoiceNumber: invoice.invoiceNumber || '',
        totals: patient.totals || {},
        currency: patient.currency || null,
        documents: ids.map((id) => byId[id]).filter(Boolean),
    };
});

variables.docSummary = {
    version: 1,
    provider: account.provider || null,
    payer: account.payer || null,
    documentCount: documents.length,
    documentClasses: account.documentClasses || {},
    invoices: invoices,
    accountLevelDocuments: documents.filter((doc) => !assigned[doc.id]).map((doc) => byId[doc.id]),
};
