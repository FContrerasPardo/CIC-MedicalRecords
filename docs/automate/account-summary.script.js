// Automate script task: build a light `accountSummary` from the IDP batchState.
//
// Why: the Control Center (provider cards, account table, patient sub-cards) and the patient view
// only need a few fields per medical account and per customer invoice. Reading them from
// `batchState` means downloading and parsing the whole IDP output (hundreds of KB per account).
//
// Where: after IDP classification/extraction, again after a manual review that edits fields, and
// after each validation stage that updates a patient's `validations`. Declare a process variable
// `accountSummary` (type json) and map it as an OUTPUT of this script task (and batchState plus the
// previous accountSummary as inputs).
//
// Version 3 (2026-11-15), for the IDP output with tables:
// - Key-value tables ("Datos Demograficos del Paciente", "Información de Facturación",
//   "resumen de Pagos"): the label is in the `Nombre` cell and the value in `Valor` / `Monto`.
// - Line items in "Tabla de Servicios facturados" (only counted and totalled here).
// - One customer invoice ("Factura y Desglose") per patient; supporting documents join the
//   patient by medical record, identification or name; with a single invoice, all of them.
// - Same mapping as the plugin: `libs/plugins/medical-records/src/lib/idp/idp-account-mapping.util.ts`.
//   Keep both in sync.
// - By user decision, each patient carries demographics (name, identification) for the patient
//   view. They live only in this Automate process variable, next to the batchState that already
//   holds them; never copy them into the repository.
// - `validations` per patient are preserved between runs: each validation stage updates its own
//   entry (`pending | ok | attention | blocking`).

const raw = variables.batchState;
const batch = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {};
const documents = Array.isArray(batch.documents) ? batch.documents.filter(Boolean) : [];

const previousRaw = variables.accountSummary;
const previous = typeof previousRaw === 'string' ? JSON.parse(previousRaw || '{}') : previousRaw || {};

const DEMOGRAPHICS = 'Datos Demograficos del Paciente';
const BILLING = 'Información de Facturación';

const MAPPING = {
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
    serviceTables: ['Tabla de Servicios facturados'],
};

const VALIDATION_STEPS = ['documents', 'rules', 'analysis'];
const PLACEHOLDERS = ['NULL', 'NA', 'NONE', 'NIL', 'UNKNOWN', 'UNDEFINED', 'NOTEXTRACTED'];

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
    return text && PLACEHOLDERS.indexOf(normalize(text).replace(/ /g, '')) < 0 ? text : null;
}

function cellName(cell) {
    return normalize(cell.recordName || cell.name);
}

function parseAmount(value) {
    if (!value) {
        return null;
    }
    let text = String(value).replace(/[^\d.,-]/g, '');
    if (text.indexOf(',') >= 0 && text.indexOf('.') >= 0) {
        text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    } else if (text.indexOf(',') >= 0) {
        text = /,\d{1,2}$/.test(text) ? text.replace(',', '.') : text.replace(/,/g, '');
    }
    const amount = Number(text);
    return text && isFinite(amount) ? amount : null;
}

function readValues(doc) {
    const fields = {};
    (Array.isArray(doc.fields) ? doc.fields : []).forEach((field) => {
        const key = normalize(field.name || field.id);
        const value = clean(field.value);
        if (key && value && !(key in fields)) {
            fields[key] = value;
        }
    });
    const labels = {};
    let currency = null;
    let serviceLines = 0;
    let servicesTotal = 0;
    const serviceTables = MAPPING.serviceTables.map(normalize);
    (Array.isArray(doc.tables) ? doc.tables : []).forEach((table) => {
        const tableKey = normalize(table.name);
        (Array.isArray(table.records) ? table.records : []).forEach((row) => {
            const cells = Array.isArray(row.records) ? row.records : [];
            if (serviceTables.indexOf(tableKey) >= 0) {
                const total = cells.find((cell) => cellName(cell) === 'TOTAL');
                const code = cells.find((cell) => cellName(cell) === 'CUP CUM');
                if ((total && clean(total.value)) || (code && clean(code.value))) {
                    serviceLines += 1;
                    servicesTotal += parseAmount(total && total.value) || 0;
                }
                return;
            }
            const label = cells.find((cell) => cellName(cell) === 'NOMBRE');
            const valueCell = cells.find((cell) => ['VALOR', 'MONTO'].indexOf(cellName(cell)) >= 0);
            if (!label || !valueCell) {
                return;
            }
            const key = normalize(label.value);
            const value = clean(valueCell.value);
            if (!key || !value) {
                return;
            }
            if (!(key in labels)) {
                labels[key] = value;
            }
            labels[tableKey + '|' + key] = value;
            const money = cells.find((cell) => cellName(cell) === 'MONEDA');
            currency = currency || clean(money && money.value);
        });
    });
    return { fields: fields, labels: labels, currency: currency, serviceLines: serviceLines, servicesTotal: servicesTotal };
}

function pick(values, sources) {
    for (const source of sources) {
        const value = source.field
            ? values.fields[normalize(source.field)]
            : values.labels[source.table ? normalize(source.table) + '|' + normalize(source.label) : normalize(source.label)];
        if (value) {
            return value;
        }
    }
    return null;
}

function pickAll(values, sources) {
    const out = {};
    Object.keys(sources).forEach((key) => {
        out[key] = pick(values, sources[key]);
    });
    return out;
}

function needsReview(doc) {
    return (
        doc.extractionReviewStatus === 'ReviewRequired' ||
        doc.classificationReviewStatus === 'ReviewRequired' ||
        doc.separationReviewStatus === 'ReviewRequired'
    );
}

const invoiceClasses = MAPPING.invoiceClasses.map(normalize);
const mapped = documents.map((doc) => {
    const values = readValues(doc);
    const totals = pickAll(values, MAPPING.totals);
    Object.keys(totals).forEach((key) => {
        totals[key] = parseAmount(totals[key]);
    });
    return {
        doc: doc,
        isInvoice: invoiceClasses.indexOf(normalize(doc.className)) >= 0,
        invoice: pickAll(values, MAPPING.invoice),
        patient: pickAll(values, MAPPING.patient),
        totals: totals,
        currency: values.currency,
        serviceLines: values.serviceLines,
        servicesTotal: Math.round(values.servicesTotal * 100) / 100,
    };
});

// Invoices create the groups; other documents may also print an invoice number (e.g. pathology).
let invoiceDocs = mapped.filter((entry) => entry.isInvoice);
if (!invoiceDocs.length) {
    invoiceDocs = mapped.filter((entry) => entry.invoice.invoiceNumber);
}
const groups = invoiceDocs.map((entry, index) => ({
    key: entry.invoice.invoiceNumber ? 'invoice:' + normalize(entry.invoice.invoiceNumber) : 'document:' + (entry.doc.id || index),
    main: entry,
    patient: Object.assign({}, entry.patient),
    docs: [entry],
}));

const LINK_KEYS = ['medicalRecord', 'identification', 'name'];
const unassigned = [];
mapped
    .filter((entry) => invoiceDocs.indexOf(entry) < 0)
    .forEach((entry) => {
        let target = null;
        for (const key of LINK_KEYS) {
            const value = entry.patient[key];
            if (value) {
                target = groups.find((group) => group.patient[key] && normalize(group.patient[key]) === normalize(value)) || null;
                if (target) {
                    break;
                }
            }
        }
        if (!target && groups.length === 1) {
            target = groups[0];
        }
        if (!target) {
            unassigned.push(entry.doc.id);
            return;
        }
        target.docs.push(entry);
        Object.keys(entry.patient).forEach((key) => {
            if (!target.patient[key] && entry.patient[key]) {
                target.patient[key] = entry.patient[key];
            }
        });
    });

const previousPatients = {};
(Array.isArray(previous.patients) ? previous.patients : []).forEach((patient) => {
    previousPatients[patient.key] = patient;
});

const patients = groups.map((group) => {
    const old = previousPatients[group.key] || {};
    const validations = {};
    VALIDATION_STEPS.forEach((step) => {
        validations[step] = (old.validations && old.validations[step]) || 'pending';
    });
    const documentClasses = {};
    group.docs.forEach((entry) => {
        const className = entry.doc.className || 'unclassified';
        documentClasses[className] = (documentClasses[className] || 0) + 1;
    });
    return {
        key: group.key,
        invoice: group.main.invoice,
        totals: group.main.totals,
        currency: group.main.currency,
        serviceLines: group.main.serviceLines,
        servicesTotal: group.main.servicesTotal,
        patient: group.patient,
        documentIds: group.docs.map((entry) => entry.doc.id),
        documentCount: group.docs.length,
        documentClasses: documentClasses,
        reviewRequired: group.docs.some((entry) => needsReview(entry.doc)),
        rejected: group.docs.some((entry) => entry.doc.markAsRejected === true),
        validations: validations,
    };
});

const documentClasses = {};
documents.forEach((doc) => {
    const className = doc.className || 'unclassified';
    documentClasses[className] = (documentClasses[className] || 0) + 1;
});

const progress = {};
VALIDATION_STEPS.forEach((step) => {
    progress[step] = {
        done: patients.filter((patient) => patient.validations[step] !== 'pending').length,
        total: patients.length,
        blocking: patients.filter((patient) => patient.validations[step] === 'blocking').length,
    };
});

function firstOf(key) {
    const found = patients.find((patient) => patient.invoice[key]);
    return found ? found.invoice[key] : null;
}

const billed = patients.reduce((sum, patient) => sum + (patient.totals.billed || 0), 0);

// Account-level billing fields by label: the dashboard groups and counts by them without
// parsing batchState (e.g. "Nombre del Prestador"). Patient data stays under patients[].
const fields = {};
const provider = firstOf('provider');
if (provider) {
    fields['Nombre del Prestador'] = provider;
}
const payer = firstOf('payer');
if (payer) {
    fields['ARS'] = payer;
}

variables.accountSummary = {
    version: 3,
    provider: provider,
    providerTaxId: firstOf('providerTaxId'),
    payer: payer,
    invoiceNumber: patients.length === 1 ? patients[0].invoice.invoiceNumber : null,
    invoiceCount: patients.length,
    patientCount: patients.length,
    totalBilled: Math.round(billed * 100) / 100,
    currency: patients.length ? patients[0].currency : null,
    reviewRequired: documents.some(needsReview),
    documentCount: documents.length,
    documentClasses: documentClasses,
    unassignedDocumentIds: unassigned,
    fields: fields,
    progress: progress,
    patients: patients,
};
