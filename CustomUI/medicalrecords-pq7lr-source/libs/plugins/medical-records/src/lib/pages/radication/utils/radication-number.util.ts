/**
 * Radication number (número de radicación) of a medical account: the single identifier the
 * provider sends to the ARS for the whole account, in the `MedRecNum` start-form field.
 *
 * Aligned with the application number of CIC-Fin's loan application
 * (`AB-${year}-${5 digits}`, generated when the form opens and shown read only):
 * here `RAD-<YYYY>-<NNNNN>`, e.g. `RAD-2026-48213`. The user never types it and it never
 * carries patient data.
 */

export const RADICATION_NUMBER_PREFIX = 'RAD';
export const RADICATION_NUMBER_PATTERN = /^RAD-(\d{4})-(\d{5})$/;

export interface RadicationNumberInput {
    date: Date;
    /** Injectable for tests; defaults to `crypto.getRandomValues` when available. */
    random?: () => number;
}

export interface ParsedRadicationNumber {
    year: number;
    serial: string;
}

export function generateRadicationNumber(input: RadicationNumberInput): string {
    const random = input.random ?? secureRandom;
    const serial = 10000 + Math.min(89999, Math.floor(random() * 90000));
    return `${RADICATION_NUMBER_PREFIX}-${input.date.getFullYear()}-${serial}`;
}

/** `null` when the value is not a well-formed radication number. */
export function parseRadicationNumber(value: string | null | undefined): ParsedRadicationNumber | null {
    const match = RADICATION_NUMBER_PATTERN.exec((value ?? '').trim().toUpperCase());
    return match ? { year: Number(match[1]), serial: match[2] } : null;
}

export function isValidRadicationNumber(value: string | null | undefined): boolean {
    return parseRadicationNumber(value) !== null;
}

function secureRandom(): number {
    const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }).crypto;
    if (cryptoApi?.getRandomValues) {
        return cryptoApi.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    }
    return Math.random();
}
