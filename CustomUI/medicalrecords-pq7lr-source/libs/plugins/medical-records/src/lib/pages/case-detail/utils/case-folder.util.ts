/**
 * Where the case progress of an account lives: the patient folder IDP creates when it saves the
 * batch (`/MedRec/Patients/<date>_<batchId>/batch_<batchId>.json`, connector `targetFolderPath`
 * in the Document AI subprocess). Pure module: no Angular imports.
 *
 * The root process does not carry the folder as a variable (the connector output `cfBatch` stays
 * in the subprocess), so the folder is searched, in order:
 * 1. in the process variables: any string or `sys_path` / `sys_parentPath` under the patients root;
 * 2. in batchState: top-level paths and the content file references (`sys_path`, `sys_parentPath`);
 * 3. in the repository: the parent of each content file reference (`sys_id`), read by the service.
 */

export const PATIENTS_ROOT_PATH = '/MedRec/Patients';
export const CASE_PROGRESS_FILE_NAME = 'case-progress.json';

export type CaseFolderSource = 'variables' | 'batchState' | 'repository';

export interface CaseFolderResolution {
    /** `/MedRec/Patients/<folder>`. */
    folderPath: string;
    source: CaseFolderSource;
    /** Where it was found (variable name or JSON path); technical, no values. */
    hint: string;
}

const MAX_DEPTH = 6;
const MAX_NODES = 4000;
/** batchState branches that never hold paths and can weigh MBs. */
const SKIPPED_KEYS = new Set(['documents', 'pages', 'fields', 'tables', 'records']);

/**
 * Patient folder (`/MedRec/Patients/<segment>`) contained in a repository path, or null. Accepts
 * the folder itself, a file inside it (e.g. `batch_<id>.json`) or anything deeper.
 */
export function patientFolderFromPath(path: unknown): string | null {
    if (typeof path !== 'string') {
        return null;
    }
    const normalized = path.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    const index = normalized.toLowerCase().indexOf(`${PATIENTS_ROOT_PATH.toLowerCase()}/`);
    if (index < 0) {
        return null;
    }
    const rest = normalized.slice(index + PATIENTS_ROOT_PATH.length + 1);
    const segment = rest.split('/')[0]?.trim();
    // A segment with a file extension is a file directly under the root, not a patient folder.
    if (!segment || /\.[a-z0-9]{2,5}$/i.test(segment)) {
        return null;
    }
    return `${PATIENTS_ROOT_PATH}/${segment}`;
}

function parseMaybeJson(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }
    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
        return value;
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

/** First patient folder found walking a value (strings, arrays, objects), with its JSON path. */
function findFolderIn(value: unknown, path: string, budget: { nodes: number }, depth = 0): { folderPath: string; hint: string } | null {
    if (budget.nodes-- <= 0 || depth > MAX_DEPTH) {
        return null;
    }
    const parsed = depth === 0 ? parseMaybeJson(value) : value;
    if (typeof parsed === 'string') {
        const folderPath = patientFolderFromPath(parsed);
        return folderPath ? { folderPath, hint: path } : null;
    }
    if (Array.isArray(parsed)) {
        for (let index = 0; index < parsed.length; index++) {
            const found = findFolderIn(parsed[index], `${path}[${index}]`, budget, depth + 1);
            if (found) {
                return found;
            }
        }
        return null;
    }
    if (parsed && typeof parsed === 'object') {
        for (const [key, child] of Object.entries(parsed as Record<string, unknown>)) {
            if (SKIPPED_KEYS.has(key)) {
                continue;
            }
            const found = findFolderIn(child, `${path}.${key}`, budget, depth + 1);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * Patient folder found in the process variables (batchState excluded: it is searched apart) or in
 * batchState (top-level paths and content file references). Null when only the repository can tell.
 */
export function findCaseFolderInSources(variables: Record<string, unknown> | null | undefined, batchState: unknown): CaseFolderResolution | null {
    const budget = { nodes: MAX_NODES };
    for (const [name, value] of Object.entries(variables ?? {})) {
        if (name === 'batchState') {
            continue;
        }
        const found = findFolderIn(value, name, budget);
        if (found) {
            return { ...found, source: 'variables' };
        }
    }
    const batch = parseMaybeJson(batchState ?? variables?.['batchState'] ?? null);
    const found = findFolderIn(batch, 'batchState', budget);
    return found ? { ...found, source: 'batchState' } : null;
}

/** Repository ids of the batch content files (`contentFileReferences[].sys_id`), to ask for their parent. */
export function contentReferenceIds(batchState: unknown, max = 3): string[] {
    const batch = parseMaybeJson(batchState) as { contentFileReferences?: unknown } | null;
    const references = Array.isArray(batch?.contentFileReferences) ? batch.contentFileReferences : [];
    const ids = references
        .map((reference) => (reference && typeof reference === 'object' ? (reference as { sys_id?: unknown }).sys_id : null))
        .filter((id): id is string => typeof id === 'string' && !!id.trim())
        .map((id) => id.trim());
    return [...new Set(ids)].slice(0, max);
}

/** Folder of a repository document read by id: its own path, else its parent path. */
export function patientFolderFromDocument(document: { sys_path?: string | null; sys_parentPath?: string | null } | null | undefined): string | null {
    return patientFolderFromPath(document?.sys_path) ?? patientFolderFromPath(document?.sys_parentPath);
}

export function caseProgressFilePath(folderPath: string): string {
    return `${folderPath.replace(/\/+$/, '')}/${CASE_PROGRESS_FILE_NAME}`;
}
