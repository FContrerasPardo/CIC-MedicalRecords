/**
 * Knowledge Discovery link of an agreement: `agreement.json` → `knowledgeDiscovery: { url, label }`.
 * The Documents tab and «Ask the contract» open that URL (the KD agent that knows the contract and
 * its annexes) in a new tab, like CIC-Fin. Only `https` URLs are accepted. Pure module.
 */

export interface AgreementKnowledgeDiscovery {
    url: string;
    label: string;
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
}

/** True for an absolute `https://` URL with a host. */
export function isHttpsUrl(value: unknown): boolean {
    const raw = text(value);
    if (!raw) {
        return false;
    }
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' && !!url.hostname;
    } catch {
        return false;
    }
}

/** The link of an `agreement.json` document (empty fields when absent). */
export function agreementKnowledgeDiscovery(agreement: unknown): AgreementKnowledgeDiscovery {
    const config = record(record(agreement)['knowledgeDiscovery']);
    return { url: text(config['url']), label: text(config['label']) };
}

/** The URL to open, or null when it is missing or not https. */
export function knowledgeDiscoveryUrl(agreement: unknown): string | null {
    const { url } = agreementKnowledgeDiscovery(agreement);
    return isHttpsUrl(url) ? url : null;
}

/** A copy of `agreement.json` with the link (an empty URL clears it). */
export function withKnowledgeDiscovery(agreement: Record<string, unknown>, link: AgreementKnowledgeDiscovery): Record<string, unknown> {
    return { ...agreement, knowledgeDiscovery: { url: text(link.url), label: text(link.label) } };
}
