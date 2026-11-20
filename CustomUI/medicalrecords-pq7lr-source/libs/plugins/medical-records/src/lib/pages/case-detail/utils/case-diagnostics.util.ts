import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { DiagnosticFieldSummary, DiagnosticTable, summarizeDiagnosticRows } from '../../../dashboard/utils/dashboard-diagnostics.util';

/**
 * Probes of the case view for the floating technical view (DashboardDiagnosticsService), pure.
 * - the active invoice and its billed services as IDP extracted them (billing cells only: columns
 *   that identify the patient are left out);
 * - the process variables read, masked like the dashboard (names, types and presence, no values).
 */

export interface CaseServiceLike {
    id: string;
    sourceDocumentId?: string;
    extractedFields?: Array<{ label: string; value: string }>;
}

export interface CaseInvoiceLike {
    key: string;
    invoiceNumber: string | null;
    documentIds: readonly string[];
    totalBilled: number | null;
    currency: string | null;
}

/** Row cells that identify the patient: never copied into the trace. */
const PATIENT_COLUMNS = new Set(['PACIENTE', 'NOMBRE DEL PACIENTE', 'CEDULA', 'RECORD', 'MRN', 'HISTORIA CLINICA', 'NO CARNET', 'NUMERO DE CARNET', 'DOCUMENT NUMBER', 'AFILIADO']);

export function isPatientColumn(label: string): boolean {
    return PATIENT_COLUMNS.has(normalizeKey(label));
}

/** Active invoice and its billed services, one column per extracted label (union, first-seen order). */
export function buildInvoiceDiagnosticTables(invoice: CaseInvoiceLike, services: readonly CaseServiceLike[]): DiagnosticTable[] {
    const labels: string[] = [];
    for (const service of services) {
        for (const field of service.extractedFields ?? []) {
            if (!isPatientColumn(field.label) && !labels.includes(field.label)) {
                labels.push(field.label);
            }
        }
    }
    const invoiceTable: DiagnosticTable = {
        title: 'Active invoice',
        columns: ['key', 'invoiceNumber', 'documents', 'services', 'totalBilled', 'currency'],
        rows: [[invoice.key, invoice.invoiceNumber ?? '', String(invoice.documentIds.length), String(services.length), invoice.totalBilled === null ? '' : String(invoice.totalBilled), invoice.currency ?? '']],
    };
    const servicesTable: DiagnosticTable = {
        title: 'Billed services (raw IDP cells)',
        request: 'batchState.documents[].tables["Tabla de Servicios facturados"]',
        columns: ['id', 'document', ...labels],
        rows: services.map((service) => {
            const byLabel = new Map((service.extractedFields ?? []).map((field) => [field.label, field.value]));
            return [service.id, service.sourceDocumentId ?? '', ...labels.map((label) => byLabel.get(label) ?? '')];
        }),
    };
    return [invoiceTable, servicesTable];
}

/**
 * Variables read by the case view, masked: names, JSON types and presence only. Names get the
 * `var_` prefix so the masking never keeps sample values (same rule as the dashboard).
 */
export function summarizeCaseVariables(variables: Record<string, unknown> | null | undefined): DiagnosticFieldSummary[] {
    const row = Object.fromEntries(Object.entries(variables ?? {}).map(([name, value]) => [`var_${name}`, value]));
    return summarizeDiagnosticRows([row]);
}
