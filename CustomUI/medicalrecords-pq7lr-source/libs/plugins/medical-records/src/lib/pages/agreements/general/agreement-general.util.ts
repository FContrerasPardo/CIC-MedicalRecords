import type { AgreementGeneralViewModel } from '../../../form-widgets/agent-rules-widget/agent-rules-widget.model';

/** A key contact of the agreement (`agreement.json` → `contacts`). Synthetic data only. */
export interface AgreementContact {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
}

export interface ExecutionBar {
    /** i18n key suffix under `GENERAL`. */
    labelKey: 'FIELD_BUDGET' | 'FIELD_BILLED_YTD' | 'FIELD_PENDING_APPROVAL';
    amount: number;
    /** Share of the total budget, 0-100. */
    percent: number;
    tone: 'primary' | 'ok' | 'warn';
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
}

function amount(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Contacts of an `agreement.json` document (rows without a name, email or phone are dropped). */
export function agreementContacts(agreement: unknown): AgreementContact[] {
    const list = (agreement as { contacts?: unknown } | null)?.contacts;
    return (Array.isArray(list) ? list : [])
        .map((raw, index) => {
            const item = (raw ?? {}) as Record<string, unknown>;
            return { id: text(item['id']) || `contact-${index + 1}`, name: text(item['name']), role: text(item['role']), email: text(item['email']), phone: text(item['phone']) };
        })
        .filter((contact) => !!(contact.name || contact.email || contact.phone));
}

/** Up to two initials for the avatar (`Alex Demo` → `AD`). */
export function contactInitials(name: string): string {
    const words = text(name)
        .split(/\s+/)
        .filter((word) => /[\p{L}\p{N}]/u.test(word));
    return (
        words
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase() || '?'
    );
}

export function createContact(agreementId: string, existing: readonly AgreementContact[]): AgreementContact {
    const used = new Set(existing.map((contact) => contact.id));
    let index = existing.length + 1;
    while (used.has(`${agreementId}-contact-${index}`)) {
        index += 1;
    }
    return { id: `${agreementId}-contact-${index}`, name: '', role: '', email: '', phone: '' };
}

/** «Execution status»: total budget, billed this year and pending approval, as shares of the budget. */
export function executionBars(general: Partial<AgreementGeneralViewModel>): ExecutionBar[] {
    const total = amount(general.budgetTotal);
    const share = (value: number) => (total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0);
    const billed = amount(general.billedYtd);
    const pending = amount(general.pendingApproval);
    return [
        { labelKey: 'FIELD_BUDGET', amount: total, percent: total > 0 ? 100 : 0, tone: 'primary' },
        { labelKey: 'FIELD_BILLED_YTD', amount: billed, percent: share(billed), tone: 'ok' },
        { labelKey: 'FIELD_PENDING_APPROVAL', amount: pending, percent: share(pending), tone: 'warn' },
    ];
}
