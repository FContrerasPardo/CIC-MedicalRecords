/**
 * Field-name aliases used to read billing data out of an IDP batchState, shared by the intake
 * widget and the dashboard. Pure module: no Angular imports.
 */
export const BILLING_FIELDS = {
    patientName: ['Nombre del Paciente', 'Paciente'],
    patientId: ['Cedula', 'No. Carnet', 'Numero de Carnet', 'Document Number'],
    mrn: ['Record', 'MRN', 'Historia Clinica'],
    dob: ['Fecha Nacimiento', 'Fecha de Nacimiento'],
    ageLabel: ['Edad'],
    provider: ['Nombre del Prestador', 'Prestador', 'IPS', 'Institucion', 'Hospital', 'Centro Medico'],
    invoiceNumber: ['Numero de Factura', 'Factura', 'No. Factura'],
    admissionDate: ['Fecha Admision', 'Fecha de Admision', 'Fecha Ingreso'],
    dischargeDate: ['Fecha De Alta', 'Fecha de Alta', 'Fecha Egreso'],
    insurancePlan: ['Plan', 'Contratante', 'ARS', 'Aseguradora'],
} as const;

export const PLACEHOLDER_FIELD_TOKENS = new Set(['NULL', 'NA', 'NONE', 'NIL', 'UNKNOWN', 'UNDEFINED']);

/** Accent-insensitive, upper-cased key with non-alphanumerics collapsed to single spaces. */
export function normalizeKey(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toUpperCase();
}

/** Like normalizeKey but with no separators at all. */
export function normalizeIdentifier(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '')
        .trim()
        .toUpperCase();
}
