/**
 * Script: BuildFinancialAgentBatchPayload
 *
 * Purpose:
 * Slim batchState before the Financial Variance Agent to avoid token/timeouts.
 * Raw IDP batchState often includes bounding boxes, OCR metadata, and table
 * geometry that inflate the payload 10-50x without helping tariff analysis.
 *
 * Inputs:
 * - variables.batchState   (json or string)
 *
 * Outputs:
 * - variables.financialBatchState        string (JSON.stringify of slim payload; agent input type string)
 * - variables.financialBatchStateSummary json (size metrics for event log)
 *
 * BPMN placement:
 *   batchState -> [Script: BuildFinancialAgentBatchPayload] -> Financial Variance Agent
 *
 * Agent mapping:
 * - Input name: batchState (or financialBatchState)
 * - Input type: string
 * - Value: $financialBatchState
 *
 * Do not use return in Automate script runtime.
 */

var FINANCIAL_FIELD_NAMES = {
    Record: true,
    "Numero de Factura": true,
    "Nombre del Paciente": true,
    "Nombre del Prestador": true,
    "Monto total Facturado": true,
    "Monto Facturado al Paciente": true,
    "Monto Facturado a ARS": true,
    "Balance del Paciente": true,
    "Balance ARS": true,
    "Esta Firmado por la ARS?": true,
    "Esta Firmado por el Centro Médico?": true,
    "Valor Total Glosado": true
};

var SERVICE_TABLE_NAMES = {
    "Tabla de Servicios facturados": true
};

function isEmpty(value) {
    return value === null || value === undefined || value === "";
}

function parseJson(value) {
    if (isEmpty(value)) {
        return null;
    }

    if (typeof value === "object") {
        return value;
    }

    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    return null;
}

function trimOrNull(value) {
    if (value === null || value === undefined) {
        return null;
    }

    var text = String(value).trim();
    return text.length ? text : null;
}

function parseAmount(value) {
    var text = trimOrNull(value);
    if (!text) {
        return null;
    }

    var normalized = text.replace(/,/g, "");
    var parsed = Number(normalized);
    return isNaN(parsed) ? text : parsed;
}

function pickFinancialFields(fields) {
    var result = [];

    if (!Array.isArray(fields)) {
        return result;
    }

    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        if (!field || !field.name || !FINANCIAL_FIELD_NAMES[field.name]) {
            continue;
        }

        result.push({
            name: field.name,
            value: field.value,
            extractionReviewStatus: field.extractionReviewStatus || null
        });
    }

    return result;
}

function mapServiceRow(records) {
    var map = {};

    if (!Array.isArray(records)) {
        return map;
    }

    for (var i = 0; i < records.length; i++) {
        var cell = records[i];
        if (!cell || !cell.recordName) {
            continue;
        }
        map[cell.recordName] = cell.value;
    }

    return {
        date: trimOrNull(map.Fecha),
        serviceCode: trimOrNull(map.Servicio),
        procedureCode: trimOrNull(map.CUP),
        description: trimOrNull(map["Descripción"] || map.Descripcion),
        quantity: parseAmount(map.Cantidad),
        unitPrice: parseAmount(map.Precio),
        lineTotal: parseAmount(map.Total),
        patientName: trimOrNull(map.Paciente)
    };
}

function extractBilledServices(tables) {
    var services = [];

    if (!Array.isArray(tables)) {
        return services;
    }

    for (var t = 0; t < tables.length; t++) {
        var table = tables[t];
        if (!table || !SERVICE_TABLE_NAMES[table.name]) {
            continue;
        }

        var rows = Array.isArray(table.records) ? table.records : [];
        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var mapped = mapServiceRow(row && row.records ? row.records : row);
            if (
                mapped.serviceCode ||
                mapped.procedureCode ||
                mapped.description ||
                mapped.unitPrice ||
                mapped.lineTotal
            ) {
                services.push(mapped);
            }
        }
    }

    return services;
}

function buildDocumentSummary(document) {
    if (!document) {
        return null;
    }

    return {
        id: document.id || null,
        className: document.className || null,
        classificationConfidence: document.classificationConfidence || null,
        extractionReviewStatus: document.extractionReviewStatus || null,
        financialFields: pickFinancialFields(document.fields),
        billedServices: extractBilledServices(document.tables)
    };
}

function buildAccountSummary(documents) {
    var summary = {
        record: null,
        patientName: null,
        providerName: null,
        invoiceNumber: null,
        invoiceTotal: null,
        patientAmount: null,
        payerAmount: null,
        patientBalance: null,
        payerBalance: null,
        glosaTotal: null,
        signedByPayer: null,
        signedByProvider: null
    };

    if (!Array.isArray(documents)) {
        return summary;
    }

    for (var i = 0; i < documents.length; i++) {
        var doc = documents[i];
        var fields = Array.isArray(doc.fields) ? doc.fields : [];

        for (var f = 0; f < fields.length; f++) {
            var field = fields[f];
            if (!field || !field.name) {
                continue;
            }

            switch (field.name) {
                case "Record":
                    summary.record = summary.record || trimOrNull(field.value);
                    break;
                case "Nombre del Paciente":
                    summary.patientName = summary.patientName || trimOrNull(field.value);
                    break;
                case "Nombre del Prestador":
                    summary.providerName = summary.providerName || trimOrNull(field.value);
                    break;
                case "Numero de Factura":
                    summary.invoiceNumber = summary.invoiceNumber || trimOrNull(field.value);
                    break;
                case "Monto total Facturado":
                    summary.invoiceTotal = summary.invoiceTotal || parseAmount(field.value);
                    break;
                case "Monto Facturado al Paciente":
                    summary.patientAmount = summary.patientAmount || parseAmount(field.value);
                    break;
                case "Monto Facturado a ARS":
                    summary.payerAmount = summary.payerAmount || parseAmount(field.value);
                    break;
                case "Balance del Paciente":
                    summary.patientBalance = summary.patientBalance || parseAmount(field.value);
                    break;
                case "Balance ARS":
                    summary.payerBalance = summary.payerBalance || parseAmount(field.value);
                    break;
                case "Valor Total Glosado":
                    summary.glosaTotal = summary.glosaTotal || trimOrNull(field.value);
                    break;
                case "Esta Firmado por la ARS?":
                    summary.signedByPayer = summary.signedByPayer || trimOrNull(field.value);
                    break;
                case "Esta Firmado por el Centro Médico?":
                    summary.signedByProvider = summary.signedByProvider || trimOrNull(field.value);
                    break;
                default:
                    break;
            }
        }
    }

    return summary;
}

var source = parseJson(variables.batchState);
var sourceDocuments = source && Array.isArray(source.documents) ? source.documents : [];
var slimDocuments = [];

for (var d = 0; d < sourceDocuments.length; d++) {
    var slimDoc = buildDocumentSummary(sourceDocuments[d]);
    if (slimDoc) {
        slimDocuments.push(slimDoc);
    }
}

var billedServiceCount = 0;
for (var s = 0; s < slimDocuments.length; s++) {
    billedServiceCount = billedServiceCount + slimDocuments[s].billedServices.length;
}

var slimPayload = {
    schemaVersion: "financial-agent-batch/v1",
    generatedAt: new Date().toISOString(),
    extractionStatus: source ? source.extractionStatus || null : null,
    classificationStatus: source ? source.classificationStatus || null : null,
    separationStatus: source ? source.separationStatus || null : null,
    accountSummary: buildAccountSummary(sourceDocuments),
    documents: slimDocuments
};

var slimJson = JSON.stringify(slimPayload);

variables.financialBatchState = slimJson;
variables.financialBatchStateSummary = {
    sourceDocumentCount: sourceDocuments.length,
    slimDocumentCount: slimDocuments.length,
    billedServiceCount: billedServiceCount,
    sourceApproxChars: JSON.stringify(source || {}).length,
    slimApproxChars: slimJson.length
};
