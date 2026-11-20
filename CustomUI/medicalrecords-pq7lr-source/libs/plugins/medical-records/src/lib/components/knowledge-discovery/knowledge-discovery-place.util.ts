import { knowledgeDiscoveryUrl } from '../../pages/case-detail/audit-assistant/audit-assistant.util';
import { APPDATA_ROOT_PATH } from '../../pages/agreements/store/agreement-store.util';

/**
 * Knowledge Discovery (KD) per place of the app. Each place (`placeId`, e.g.
 * `agreements.<agreementId>.documents`, `case.audit`, `radication.review`) may open a different KD
 * agent; its link is kept in `/MedRec/Appdata/KnowledgeDiscovery/<placeId>.json` as
 * `{ url, label, description?, updatedAt }`. Only `https` URLs (host, no credentials) are accepted,
 * with the same rule as the audit assistant (`knowledgeDiscoveryUrl`). Saving an empty URL clears
 * the place: the file stays with `url: ''`, so an older fallback (e.g. `agreement.json →
 * knowledgeDiscovery`) does not come back. Pure module.
 */

export const KNOWLEDGE_DISCOVERY_FOLDER_NAME = 'KnowledgeDiscovery';
export const KNOWLEDGE_DISCOVERY_FOLDER_PATH = `${APPDATA_ROOT_PATH}/${KNOWLEDGE_DISCOVERY_FOLDER_NAME}`;
export const KNOWLEDGE_DISCOVERY_PLACE_KIND = 'medical-records.knowledge-discovery-place';

/** Lower-case letters, digits, dots, hyphens and underscores; starts with a letter or digit; no `..`. */
const PLACE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,159}$/;

export interface KnowledgeDiscoveryLink {
    url: string;
    label: string;
    description: string;
}

export interface KnowledgeDiscoveryPlaceConfig extends KnowledgeDiscoveryLink {
    updatedAt: string | null;
}

/** Where the link shown comes from: the place file, the fallback of the caller, or nowhere. */
export type KnowledgeDiscoveryLinkSource = 'place' | 'fallback' | 'none';

export interface ResolvedKnowledgeDiscoveryLink {
    /** Link to open (valid https), or null: the place must be configured first. */
    link: KnowledgeDiscoveryLink | null;
    source: KnowledgeDiscoveryLinkSource;
}

export type KnowledgeDiscoveryInputError = 'URL_INVALID';

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function isValidKnowledgeDiscoveryPlaceId(placeId: unknown): placeId is string {
    return typeof placeId === 'string' && PLACE_ID_PATTERN.test(placeId) && !placeId.includes('..');
}

/** Place of the Documents tab of an agreement. */
export function agreementDocumentsPlaceId(agreementId: string): string {
    return `agreements.${agreementId}.documents`;
}

export function knowledgeDiscoveryPlaceFileName(placeId: string): string | null {
    return isValidKnowledgeDiscoveryPlaceId(placeId) ? `${placeId}.json` : null;
}

/** Path of the place file; null for an invalid place id (nothing is read or written). */
export function knowledgeDiscoveryPlacePath(placeId: string): string | null {
    const fileName = knowledgeDiscoveryPlaceFileName(placeId);
    return fileName ? `${KNOWLEDGE_DISCOVERY_FOLDER_PATH}/${fileName}` : null;
}

/** The URL to open, or null when it is empty or not a valid https address. */
export function knowledgeDiscoveryLinkUrl(value: unknown): string | null {
    return knowledgeDiscoveryUrl(value);
}

/** Checks the dialog fields: an empty URL is accepted (it clears the place); otherwise https only. */
export function validateKnowledgeDiscoveryInput(input: Partial<KnowledgeDiscoveryLink>): KnowledgeDiscoveryInputError | null {
    const url = text(input.url);
    return !url || knowledgeDiscoveryLinkUrl(url) ? null : 'URL_INVALID';
}

/** The place file content to save (an empty URL clears the link and its texts). */
export function buildKnowledgeDiscoveryPlaceConfig(input: Partial<KnowledgeDiscoveryLink>, now = new Date()): KnowledgeDiscoveryPlaceConfig {
    const url = text(input.url);
    return {
        url,
        label: url ? text(input.label) : '',
        description: url ? text(input.description) : '',
        updatedAt: now.toISOString(),
    };
}

/** File text saved in Appdata. */
export function serializeKnowledgeDiscoveryPlaceConfig(placeId: string, config: KnowledgeDiscoveryPlaceConfig): string {
    const payload: Record<string, unknown> = { kind: KNOWLEDGE_DISCOVERY_PLACE_KIND, placeId, url: config.url, label: config.label };
    if (config.description) {
        payload['description'] = config.description;
    }
    payload['updatedAt'] = config.updatedAt;
    return `${JSON.stringify(payload, null, 2)}\n`;
}

/** The place file (text or object); null when it is not a JSON object. */
export function parseKnowledgeDiscoveryPlaceConfig(value: unknown): KnowledgeDiscoveryPlaceConfig | null {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }
    const raw = record(parsed);
    return { url: text(raw['url']), label: text(raw['label']), description: text(raw['description']), updatedAt: text(raw['updatedAt']) || null };
}

/**
 * The link of a place. The place file wins when it exists (also when cleared or not https: the place
 * then needs configuring). Without a place file, the caller's fallback is used when it is https.
 */
export function resolveKnowledgeDiscoveryLink(stored: KnowledgeDiscoveryPlaceConfig | null, fallback?: Partial<KnowledgeDiscoveryLink> | null): ResolvedKnowledgeDiscoveryLink {
    if (stored) {
        const url = knowledgeDiscoveryLinkUrl(stored.url);
        return url ? { link: { url, label: stored.label, description: stored.description }, source: 'place' } : { link: null, source: 'none' };
    }
    const url = knowledgeDiscoveryLinkUrl(fallback?.url);
    return url ? { link: { url, label: text(fallback?.label), description: text(fallback?.description) }, source: 'fallback' } : { link: null, source: 'none' };
}
