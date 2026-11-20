import { DEMO_PAYER_NAME } from './demo-payer';

/**
 * Safe migration of the values of an older demo template still saved in Appdata (agreement files,
 * their language versions and the index). Applied in memory when the files are read; nothing is
 * written until the user runs «Update the agreement files». Pure module.
 *
 * Same mapping as the bundled templates (`docs/automate/convenios-appdata.md`):
 * - payer «ARS Primera» → `DEMO_PAYER_NAME`;
 * - IDP class «Formulario de Reclamación (ARS Primera)» → «Formulario de Reclamación»;
 * - the `ARSP` token of contract, ruleset and policy ids → `HARS` (`CONV-DEMO-ARSP-CML-2026` →
 *   `CONV-DEMO-HARS-CML-2026`).
 */

const LEGACY_CLAIM_FORM = /Formulario de Reclamación\s*\(\s*ARS\s+Primera\s*\)/gi;
const LEGACY_PAYER = /\bARS\s+Primera\b/gi;
const LEGACY_ID_TOKEN = /(^|[^A-Za-z0-9])ARSP(?=[^A-Za-z0-9]|$)/g;

export const DEMO_CLAIM_FORM_CLASS = 'Formulario de Reclamación';

export interface DemoMigrationResult<T> {
    value: T;
    /** At least one value was replaced. */
    changed: boolean;
}

/** One text with the old demo values replaced (unchanged when it has none). */
export function migrateDemoText(text: string): string {
    return text.replace(LEGACY_CLAIM_FORM, DEMO_CLAIM_FORM_CLASS).replace(LEGACY_PAYER, DEMO_PAYER_NAME).replace(LEGACY_ID_TOKEN, '$1HARS');
}

function migrateValue(value: unknown, state: { changed: boolean }): unknown {
    if (typeof value === 'string') {
        const next = migrateDemoText(value);
        if (next !== value) {
            state.changed = true;
        }
        return next;
    }
    if (Array.isArray(value)) {
        return value.map((item) => migrateValue(item, state));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, migrateValue(item, state)]));
    }
    return value;
}

/**
 * A copy of a JSON value (agreement file, language version or index) with every string value
 * migrated. Keys, numbers and structure are kept; the input is not modified.
 */
export function migrateDemoValues<T>(value: T): DemoMigrationResult<T> {
    const state = { changed: false };
    const migrated = migrateValue(value, state) as T;
    return { value: state.changed ? migrated : value, changed: state.changed };
}

/** True when a JSON value still holds old demo values. */
export function hasLegacyDemoValues(value: unknown): boolean {
    return migrateDemoValues(value).changed;
}
