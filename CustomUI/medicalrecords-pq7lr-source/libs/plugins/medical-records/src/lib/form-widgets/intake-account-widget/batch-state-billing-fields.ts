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

/**
 * Amount of a billed cell ("1,234.50", "1.234,50", "$ 300"). The last separator followed by 1-2
 * digits is the decimal one; the others are thousands separators. Null when not a number.
 */
export function parseAmount(value: string | null | undefined): number | null {
    const raw = String(value ?? '').replace(/[^\d.,-]/g, '');
    if (!/\d/.test(raw)) {
        return null;
    }
    const decimal = /[.,](\d{1,2})$/.exec(raw);
    const integer = (decimal ? raw.slice(0, decimal.index) : raw).replace(/[.,]/g, '');
    const parsed = Number(decimal ? `${integer}.${decimal[1]}` : integer);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Amounts of a billed item as the intake shows them, with what was assumed or computed. */
export interface BilledRowAmounts {
    /** Detected quantity, or 1 when IDP did not detect a valid (non-zero) number. */
    quantity: number;
    /** True when the quantity is the assumed 1. */
    quantityAssumed: boolean;
    /** Unit price; null when not a number. */
    price: number | null;
    /** Billed Total, else Price x Quantity; null when there is neither. */
    total: number | null;
    /** True when the total is Price x Quantity (the invoice row has no Total). */
    totalComputed: boolean;
}

/**
 * Amounts of a billed item: the invoice Total when present, else Price x Quantity (quantity 1 when
 * absent, not a number or zero); total null when there is neither Total nor Price.
 */
export function billedRowAmounts(row: { quantity?: string | null; price?: string | null; total?: string | null }): BilledRowAmounts {
    const parsedQuantity = parseAmount(row.quantity);
    const quantityAssumed = parsedQuantity === null || parsedQuantity === 0;
    const quantity = parsedQuantity === null || quantityAssumed ? 1 : parsedQuantity;
    const price = parseAmount(row.price);
    const billed = parseAmount(row.total);
    if (billed !== null) {
        return { quantity, quantityAssumed, price, total: billed, totalComputed: false };
    }
    if (price === null) {
        return { quantity, quantityAssumed, price, total: null, totalComputed: false };
    }
    return { quantity, quantityAssumed, price, total: Math.round(price * quantity * 100) / 100, totalComputed: true };
}

/** Amount of a billed item: its Total, or Price x Quantity (quantity 1 when absent); null when none. */
export function billedRowAmount(row: { quantity?: string | null; price?: string | null; total?: string | null }): number | null {
    return billedRowAmounts(row).total;
}

/** Tolerance when comparing an item sum with a billed subtotal: 0.5 % of the subtotal, at least 1.00. */
export function amountTolerance(amount: number): number {
    return Math.max(1, Math.abs(amount) * 0.005);
}

/** True when `sum` matches the billed `amount` within `amountTolerance(amount)`. */
export function amountsMatch(sum: number, amount: number): boolean {
    return Math.abs(sum - amount) <= amountTolerance(amount);
}
