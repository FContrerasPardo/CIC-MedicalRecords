import { ACCOUNT_STAGES, accountStage, AccountStage, accountStageLabelKey, normalizeAccountStage } from '../../../dashboard/utils/dashboard-audit-fields.util';
import { WorkspaceTabId } from './case-navigation.util';

/**
 * Persistent progress of an account in the case view (stepper), pure. The stages are the same the
 * Control Center infers per account (`accountStage`, `calc_stage`), so the case view and the
 * dashboard speak of one progression. The case view adds what the analyst did on top of the
 * inferred stage (stage completed, services reviewed, findings and remediations, comments) and
 * stores it as `case-progress.json` in the batch folder of the account (see case-folder.util).
 *
 * Progress is per ACCOUNT, not per patient (2026-11-17): inside a work stage each patient (customer
 * invoice) is pending, reviewed or completed, and the account stage moves only when every patient
 * is done (see continuePatient / autoAdvanceStage). One file per account: the folder is the batch
 * folder IDP creates for the whole account (`/MedRec/Patients/<date>_<batchId>`), shared by all its
 * invoices; when the content files of an account sit in several folders, the first one resolved
 * holds the account file, so every invoice reads and writes the same index.
 */

export type CaseStageStatus = 'pending' | 'in_progress' | 'completed' | 'error';
export const CASE_STAGE_STATUSES: readonly CaseStageStatus[] = ['pending', 'in_progress', 'completed', 'error'];

/** Workspace phase where a stage is worked on; null for stages owned by the process (received, closed). */
export type CasePhase = 'INTAKE' | 'ANALYSIS' | 'AUDIT';

const STAGE_PHASE: Record<AccountStage, CasePhase | null> = {
    '1_RECEIVED': null,
    '2_INTAKE': 'INTAKE',
    '4_AGENTS': 'ANALYSIS',
    '5_AUDIT': 'AUDIT',
    '6_CLOSED': null,
};

const PHASE_STAGE: Record<CasePhase, AccountStage> = { INTAKE: '2_INTAKE', ANALYSIS: '4_AGENTS', AUDIT: '5_AUDIT' };
const PHASE_TAB: Record<CasePhase, WorkspaceTabId> = { INTAKE: 'intake', ANALYSIS: 'analysis', AUDIT: 'audit' };

export interface CaseStageState {
    status: CaseStageStatus;
    updatedAt: string | null;
    /** Short technical reason when the status is `error`. */
    note?: string | null;
}

export interface CaseReviewedService {
    serviceId: string;
    invoiceKey: string;
    at: string;
}

export type CaseRegistrationKind = 'finding' | 'remediation';

/** Services registered together in the audit from the intake (finding or manual remediation). */
export interface CaseRegistration {
    id: string;
    kind: CaseRegistrationKind;
    invoiceKey: string;
    serviceIds: string[];
    /** Audit findings created or matched (InvoiceAuditRecord ids). */
    findingIds: string[];
    comment: string | null;
    at: string;
}

export interface CaseComment {
    id: string;
    invoiceKey: string | null;
    text: string;
    /** Registration the comment belongs to, when any. */
    registrationId: string | null;
    at: string;
}

/** Stages worked on per patient (the ones with a workspace phase). */
export type CaseWorkStage = '2_INTAKE' | '4_AGENTS' | '5_AUDIT';
export const CASE_WORK_STAGES: readonly CaseWorkStage[] = ['2_INTAKE', '4_AGENTS', '5_AUDIT'];

/**
 * Status of one patient (customer invoice) inside a work stage:
 * - `pending`: it still has review items in the stage (unsupported services not reviewed, agent
 *   observations without a decision, findings without a decision);
 * - `reviewed`: nothing left to review, not confirmed by the analyst yet (counts as done);
 * - `completed`: the analyst pressed Continue on it (or the account advanced automatically).
 */
export type CasePatientStatus = 'pending' | 'reviewed' | 'completed';
export const CASE_PATIENT_STATUSES: readonly CasePatientStatus[] = ['pending', 'reviewed', 'completed'];

export interface CasePatientState {
    status: CasePatientStatus;
    updatedAt: string | null;
}

export interface CaseStagePatients {
    /** By invoice key (one customer invoice per patient). */
    patients: Record<string, CasePatientState>;
    /** When the account advanced on its own because no patient had review items; it happens once. */
    autoAdvancedAt: string | null;
    /** When the analyst reopened the stage; a reopened stage never advances on its own. */
    reopenedAt?: string | null;
}

/** `case-progress.json`, schema version 2; version 1 files (no per-patient state, legacy rules stage) are still read. */
export interface CaseProgress {
    kind: 'medical-records.case-progress';
    version: 2;
    processInstanceId: string | null;
    /** Stage reached by the analyst (it never goes below the stage the Control Center infers). */
    currentStage: AccountStage;
    stages: Record<AccountStage, CaseStageState>;
    /** Per-patient status inside each work stage (version 2). */
    patientStages: Partial<Record<CaseWorkStage, CaseStagePatients>>;
    /** Where the analyst was, so the case reopens there. */
    lastTab: WorkspaceTabId | null;
    lastInvoiceKey: string | null;
    reviewedServices: CaseReviewedService[];
    registrations: CaseRegistration[];
    comments: CaseComment[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Whether a phase can be shown: `ready`; `processing` (Automate is working on it, or the analyst
 * is already there and Automate has not reached it: loading animation instead of the content);
 * `locked` (Automate has not reached it and it is not the analyst's stage: disabled, pending).
 */
export type CasePhaseAvailability = 'ready' | 'processing' | 'locked';

export interface CaseStep {
    stage: AccountStage;
    labelKey: string;
    status: CaseStageStatus;
    /** Workspace phase opened by the step; null when the step is informative only. */
    phase: CasePhase | null;
    current: boolean;
    availability: CasePhaseAvailability;
}

export interface CaseStepper {
    steps: CaseStep[];
    current: AccountStage;
    /** Completed stages over all stages, 0-100. */
    percent: number;
    /** Stage the Control Center shows for the account (inferred from the process). */
    inferred: AccountStage | null;
}

const KNOWN_TABS: readonly WorkspaceTabId[] = ['intake', 'analysis', 'codingIntegrity', 'complianceAlert', 'financialVariance', 'audit'];

export function stageIndex(stage: AccountStage | null | undefined): number {
    return stage ? ACCOUNT_STAGES.indexOf(stage) : -1;
}

export function phaseOfStage(stage: AccountStage): CasePhase | null {
    return STAGE_PHASE[stage];
}

export function stageOfPhase(phase: CasePhase): AccountStage {
    return PHASE_STAGE[phase];
}

export function tabOfPhase(phase: CasePhase): WorkspaceTabId {
    return PHASE_TAB[phase];
}

/** Phase where the account should be worked on for a stage: process-owned stages map to the nearest phase. */
export function workPhaseOfStage(stage: AccountStage): CasePhase {
    const index = stageIndex(stage);
    if (index <= stageIndex('2_INTAKE')) {
        return 'INTAKE';
    }
    return index <= stageIndex('4_AGENTS') ? 'ANALYSIS' : 'AUDIT';
}

/**
 * Stage the Control Center infers for the account, from the process variables as the case view
 * read them (same function as the dashboard `calc_stage`, on a row with `var_<name>` columns).
 * The process status is not part of the variables; pass it when known (COMPLETED → closed).
 */
export function inferCaseStage(variables: Record<string, unknown> | null | undefined, processStatus: string | null = null): AccountStage | null {
    const row: Record<string, unknown> = { status: processStatus ?? '' };
    for (const [name, value] of Object.entries(variables ?? {})) {
        row[`var_${name}`] = value;
    }
    return accountStage(row);
}

export function emptyCaseProgress(processInstanceId: string | null, inferred: AccountStage | null, now: string): CaseProgress {
    const current = inferred ?? '1_RECEIVED';
    return {
        kind: 'medical-records.case-progress',
        version: 2,
        processInstanceId,
        currentStage: current,
        stages: Object.fromEntries(ACCOUNT_STAGES.map((stage) => [stage, { status: defaultStatus(stage, current), updatedAt: null }])) as Record<AccountStage, CaseStageState>,
        patientStages: {},
        lastTab: null,
        lastInvoiceKey: null,
        reviewedServices: [],
        registrations: [],
        comments: [],
        createdAt: now,
        updatedAt: now,
    };
}

function defaultStatus(stage: AccountStage, current: AccountStage): CaseStageStatus {
    const delta = stageIndex(stage) - stageIndex(current);
    if (delta < 0 || (delta === 0 && stage === '6_CLOSED')) {
        return 'completed';
    }
    return delta === 0 ? 'in_progress' : 'pending';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function str(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Current or legacy stage id (the removed rules stage reads as agent analysis). */
function asStage(value: unknown): AccountStage | null {
    return normalizeAccountStage(value);
}

function parsePatientStages(value: unknown): Partial<Record<CaseWorkStage, CaseStagePatients>> {
    const out: Partial<Record<CaseWorkStage, CaseStagePatients>> = {};
    if (!isRecord(value)) {
        return out;
    }
    for (const stage of CASE_WORK_STAGES) {
        const entry = value[stage];
        if (!isRecord(entry)) {
            continue;
        }
        const patients: Record<string, CasePatientState> = {};
        for (const [key, raw] of Object.entries(isRecord(entry['patients']) ? entry['patients'] : {})) {
            if (isRecord(raw) && (CASE_PATIENT_STATUSES as readonly string[]).includes(String(raw['status']))) {
                patients[key] = { status: raw['status'] as CasePatientStatus, updatedAt: str(raw['updatedAt']) };
            }
        }
        const reopenedAt = str(entry['reopenedAt']);
        out[stage] = { patients, autoAdvancedAt: str(entry['autoAdvancedAt']), ...(reopenedAt ? { reopenedAt } : {}) };
    }
    return out;
}

function list<T>(value: unknown, map: (item: Record<string, unknown>) => T | null): T[] {
    return Array.isArray(value) ? value.filter(isRecord).map(map).filter((item): item is T => item !== null) : [];
}

function strings(value: unknown): string[] {
    return Array.isArray(value) ? value.map(str).filter((item): item is string => !!item) : [];
}

/** Reads `case-progress.json` (object or text), version 1 or 2; null when it is not a usable progress file. */
export function parseCaseProgress(value: unknown): CaseProgress | null {
    let raw: unknown = value;
    if (typeof value === 'string') {
        try {
            raw = JSON.parse(value);
        } catch {
            return null;
        }
    }
    if (!isRecord(raw) || raw['kind'] !== 'medical-records.case-progress' || (raw['version'] !== 1 && raw['version'] !== 2)) {
        return null;
    }
    const current = asStage(raw['currentStage']);
    if (!current) {
        return null;
    }
    const createdAt = str(raw['createdAt']) ?? new Date(0).toISOString();
    const base = emptyCaseProgress(str(raw['processInstanceId']), current, createdAt);
    const stages = isRecord(raw['stages']) ? raw['stages'] : {};
    // Legacy stage entries (3_RULES) are dropped: that stage is no longer part of the stepper.
    for (const stage of ACCOUNT_STAGES) {
        const entry = stages[stage];
        if (isRecord(entry) && (CASE_STAGE_STATUSES as readonly string[]).includes(String(entry['status']))) {
            base.stages[stage] = { status: entry['status'] as CaseStageStatus, updatedAt: str(entry['updatedAt']), ...(str(entry['note']) ? { note: str(entry['note']) } : {}) };
        }
    }
    const lastTab = str(raw['lastTab']);
    return {
        ...base,
        patientStages: parsePatientStages(raw['patientStages']),
        lastTab: lastTab && (KNOWN_TABS as readonly string[]).includes(lastTab) ? (lastTab as WorkspaceTabId) : null,
        lastInvoiceKey: str(raw['lastInvoiceKey']),
        reviewedServices: list(raw['reviewedServices'], (item) => {
            const serviceId = str(item['serviceId']);
            return serviceId ? { serviceId, invoiceKey: str(item['invoiceKey']) ?? '', at: str(item['at']) ?? createdAt } : null;
        }),
        registrations: list(raw['registrations'], (item) => {
            const id = str(item['id']);
            const kind = item['kind'] === 'remediation' ? 'remediation' : item['kind'] === 'finding' ? 'finding' : null;
            return id && kind
                ? { id, kind, invoiceKey: str(item['invoiceKey']) ?? '', serviceIds: strings(item['serviceIds']), findingIds: strings(item['findingIds']), comment: str(item['comment']), at: str(item['at']) ?? createdAt }
                : null;
        }),
        comments: list(raw['comments'], (item) => {
            const id = str(item['id']);
            const text = str(item['text']);
            return id && text ? { id, invoiceKey: str(item['invoiceKey']), text, registrationId: str(item['registrationId']), at: str(item['at']) ?? createdAt } : null;
        }),
        updatedAt: str(raw['updatedAt']) ?? createdAt,
    };
}

export function serializeCaseProgress(progress: CaseProgress): string {
    return `${JSON.stringify(progress, null, 2)}\n`;
}

/**
 * The persisted progress never sits below what the Control Center infers: when the process moved
 * ahead (agents answered, process completed), the stages before it are completed.
 */
export function reconcileCaseProgress(progress: CaseProgress, inferred: AccountStage | null, now: string): CaseProgress {
    if (!inferred || stageIndex(inferred) <= stageIndex(progress.currentStage)) {
        return progress;
    }
    return setCurrentStage(progress, inferred, now);
}

/** Moves the analyst to a stage: earlier stages completed (errors kept), the stage in progress. */
export function setCurrentStage(progress: CaseProgress, stage: AccountStage, now: string): CaseProgress {
    const target = stageIndex(stage);
    const stages = { ...progress.stages };
    for (const candidate of ACCOUNT_STAGES) {
        const index = stageIndex(candidate);
        const previous = stages[candidate];
        if (index < target && previous.status !== 'completed' && previous.status !== 'error') {
            stages[candidate] = { status: 'completed', updatedAt: now };
        } else if (index === target && previous.status !== 'in_progress') {
            stages[candidate] = { status: candidate === '6_CLOSED' ? 'completed' : 'in_progress', updatedAt: now };
        } else if (index > target && previous.status === 'in_progress') {
            stages[candidate] = { status: 'pending', updatedAt: now };
        }
    }
    return { ...progress, currentStage: stage, stages, updatedAt: now };
}

/**
 * Completes a stage and moves to the next one. Closing belongs to the process (the Control Center
 * shows "Closed" only for completed instances), so completing the audit does not move to it.
 */
export function completeStage(progress: CaseProgress, stage: AccountStage, now: string): CaseProgress {
    const next = ACCOUNT_STAGES[Math.min(stageIndex(stage) + 1, ACCOUNT_STAGES.length - 1)];
    const moves = next !== '6_CLOSED' && stageIndex(next) > stageIndex(progress.currentStage);
    const moved = moves ? setCurrentStage(progress, next, now) : progress;
    return { ...moved, stages: { ...moved.stages, [stage]: { status: 'completed', updatedAt: now } }, updatedAt: now };
}

export function markStageError(progress: CaseProgress, stage: AccountStage, note: string, now: string): CaseProgress {
    return { ...progress, stages: { ...progress.stages, [stage]: { status: 'error', updatedAt: now, note } }, updatedAt: now };
}

export function rememberPosition(progress: CaseProgress, tab: WorkspaceTabId, invoiceKey: string | null, now: string): CaseProgress {
    if (progress.lastTab === tab && progress.lastInvoiceKey === invoiceKey) {
        return progress;
    }
    return { ...progress, lastTab: tab, lastInvoiceKey: invoiceKey, updatedAt: now };
}

export function isServiceReviewed(progress: CaseProgress | null, serviceId: string): boolean {
    return !!progress?.reviewedServices.some((entry) => entry.serviceId === serviceId);
}

/** Marks (or unmarks) services as reviewed by the analyst. */
export function setServicesReviewed(progress: CaseProgress, invoiceKey: string, serviceIds: readonly string[], reviewed: boolean, now: string): CaseProgress {
    const ids = new Set(serviceIds);
    const kept = progress.reviewedServices.filter((entry) => !ids.has(entry.serviceId));
    const added = reviewed ? serviceIds.map((serviceId) => ({ serviceId, invoiceKey, at: now })) : [];
    return { ...progress, reviewedServices: [...kept, ...added], updatedAt: now };
}

/**
 * Records a registration of intake services in the audit (finding or manual remediation) and its
 * comment; the services count as reviewed.
 */
export function addRegistration(
    progress: CaseProgress,
    input: { kind: CaseRegistrationKind; invoiceKey: string; serviceIds: readonly string[]; findingIds: readonly string[]; comment: string | null },
    now: string
): CaseProgress {
    // Registrations can be deleted: skip any sequence already taken so ids stay unique.
    let sequence = progress.registrations.length + 1;
    const stamp = now.replace(/\D/g, '').slice(0, 14);
    while (progress.registrations.some((entry) => entry.id === `reg-${stamp}-${sequence}`)) {
        sequence++;
    }
    const id = `reg-${stamp}-${sequence}`;
    const comment = input.comment?.trim() || null;
    const registration: CaseRegistration = {
        id,
        kind: input.kind,
        invoiceKey: input.invoiceKey,
        serviceIds: [...input.serviceIds],
        findingIds: [...new Set(input.findingIds)],
        comment,
        at: now,
    };
    const withReviewed = setServicesReviewed(progress, input.invoiceKey, input.serviceIds, true, now);
    return {
        ...withReviewed,
        registrations: [...withReviewed.registrations, registration],
        comments: comment ? [...withReviewed.comments, { id: `${id}-c`, invoiceKey: input.invoiceKey, text: comment, registrationId: id, at: now }] : withReviewed.comments,
        updatedAt: now,
    };
}

export interface RemovedRegistration {
    progress: CaseProgress;
    /** The deleted registration; null when the id was not found (progress unchanged). */
    removed: CaseRegistration | null;
    /** Audit findings of the deleted registration that no remaining registration references. */
    releasedFindingIds: string[];
}

/**
 * Deletes a registration of the analyst and its comments. The services keep their reviewed mark
 * (the analyst unmarks them apart). The caller removes the released findings from the audit.
 */
export function removeRegistration(progress: CaseProgress, registrationId: string, now: string): RemovedRegistration {
    const removed = progress.registrations.find((entry) => entry.id === registrationId) ?? null;
    if (!removed) {
        return { progress, removed: null, releasedFindingIds: [] };
    }
    const registrations = progress.registrations.filter((entry) => entry !== removed);
    const stillReferenced = new Set(registrations.flatMap((entry) => entry.findingIds));
    return {
        progress: { ...progress, registrations, comments: progress.comments.filter((comment) => comment.registrationId !== registrationId), updatedAt: now },
        removed,
        releasedFindingIds: removed.findingIds.filter((id) => !stillReferenced.has(id)),
    };
}

/** Registrations that include a service (latest first). */
export function registrationsForService(progress: CaseProgress | null, serviceId: string): CaseRegistration[] {
    return (progress?.registrations ?? []).filter((entry) => entry.serviceIds.includes(serviceId)).reverse();
}

// Availability (Automate gate) ---------------------------------------------------------------

/**
 * Whether a stage can be opened, from the stage Automate reached (`automate`, inferred from the
 * process variables) and the analyst's current stage:
 * - reached by Automate → `ready`, or `processing` while Automate still works on it (`busy`, e.g.
 *   no agent result yet in agent analysis);
 * - not reached, but it is the analyst's current stage (the analyst finished the previous one
 *   first) → `processing`: a loading animation, never empty content;
 * - not reached otherwise → `locked`: pending and disabled.
 */
export function stageAvailability(
    stage: AccountStage,
    automate: AccountStage | null,
    current: AccountStage,
    busy: Partial<Record<AccountStage, boolean>> = {}
): CasePhaseAvailability {
    if (stageIndex(automate ?? '1_RECEIVED') >= stageIndex(stage)) {
        return busy[stage] ? 'processing' : 'ready';
    }
    return stage === current ? 'processing' : 'locked';
}

/**
 * Stepper shown in the workspace: the Control Center stages with the status persisted by the
 * analyst, never behind the inferred stage. `errors` flags stages whose source failed (e.g. an
 * agent result that cannot be read); `busy` the stages Automate is still processing. A stage
 * Automate has not reached is shown pending (see stageAvailability).
 */
export function buildCaseStepper(
    progress: CaseProgress | null,
    inferred: AccountStage | null,
    errors: Partial<Record<AccountStage, boolean>> = {},
    busy: Partial<Record<AccountStage, boolean>> = {}
): CaseStepper {
    const fallback = inferred ?? '1_RECEIVED';
    const current = progress && stageIndex(progress.currentStage) >= stageIndex(fallback) ? progress.currentStage : fallback;
    const steps = ACCOUNT_STAGES.map((stage): CaseStep => {
        const persisted = progress?.stages[stage]?.status ?? null;
        const availability = stageAvailability(stage, inferred, current, busy);
        let status: CaseStageStatus = defaultStatus(stage, current);
        if (persisted === 'completed' || persisted === 'error') {
            status = persisted;
        }
        if (errors[stage]) {
            status = 'error';
        }
        if (availability === 'locked') {
            status = 'pending';
        }
        return { stage, labelKey: accountStageLabelKey(stage), status, phase: STAGE_PHASE[stage], current: stage === current, availability };
    });
    const completed = steps.filter((step) => step.status === 'completed').length;
    return { steps, current, percent: Math.round((completed / steps.length) * 100), inferred };
}

// Per-patient progress inside a stage (the account advances, not the patient) ----------------

/** Review items still open per patient (invoice key → count) in one stage. */
export type CasePatientPending = Readonly<Record<string, number>>;

export interface CasePatientMove {
    progress: CaseProgress;
    /** Next patient to work on in the same stage; null when the account stage advanced. */
    nextInvoiceKey: string | null;
    /** The account stage was completed (every patient done). */
    advanced: boolean;
}

/** Stages that advance on their own when nothing is pending (audit closing stays a human decision). */
const AUTO_ADVANCE_STAGES: readonly CaseWorkStage[] = ['2_INTAKE', '4_AGENTS'];

export function isWorkStage(stage: AccountStage): stage is CaseWorkStage {
    return (CASE_WORK_STAGES as readonly string[]).includes(stage);
}

function stagePatients(progress: CaseProgress, stage: CaseWorkStage): CaseStagePatients {
    return progress.patientStages[stage] ?? { patients: {}, autoAdvancedAt: null };
}

function withStagePatients(progress: CaseProgress, stage: CaseWorkStage, block: CaseStagePatients, now: string): CaseProgress {
    return { ...progress, patientStages: { ...progress.patientStages, [stage]: block }, updatedAt: now };
}

/**
 * Status of a patient in a stage: completed stays completed; otherwise the open review items say
 * pending or reviewed. Without a count, the stored status (pending when there is none).
 */
export function patientStatus(progress: CaseProgress, stage: CaseWorkStage, invoiceKey: string, pending?: number): CasePatientStatus {
    const stored = progress.patientStages[stage]?.patients[invoiceKey]?.status;
    if (stored === 'completed') {
        return 'completed';
    }
    if (pending === undefined) {
        return stored ?? 'pending';
    }
    return pending > 0 ? 'pending' : 'reviewed';
}

/** Stores the pending / reviewed status of each patient of the stage; returns the same object when nothing changed. */
export function syncPatientStage(progress: CaseProgress, stage: CaseWorkStage, pending: CasePatientPending, now: string): CaseProgress {
    const block = stagePatients(progress, stage);
    const patients = { ...block.patients };
    let changed = false;
    for (const [key, count] of Object.entries(pending)) {
        const status = patientStatus(progress, stage, key, count);
        if (patients[key]?.status !== status) {
            patients[key] = { status, updatedAt: now };
            changed = true;
        }
    }
    return changed ? withStagePatients(progress, stage, { ...block, patients }, now) : progress;
}

function completeAllPatients(progress: CaseProgress, stage: CaseWorkStage, order: readonly string[], now: string, auto: boolean): CaseProgress {
    const block = stagePatients(progress, stage);
    const patients = { ...block.patients };
    for (const key of order) {
        if (patients[key]?.status !== 'completed') {
            patients[key] = { status: 'completed', updatedAt: now };
        }
    }
    const marked = withStagePatients(progress, stage, { ...block, patients, autoAdvancedAt: auto ? now : block.autoAdvancedAt }, now);
    return completeStage(marked, stage, now);
}

/**
 * Continue on a patient: the patient is completed in the stage and the analyst moves to the next
 * patient of the account (in `order`, wrapping) that still has review items. Patients with nothing
 * pending count as done. When no patient is left, the ACCOUNT stage is completed and moves on.
 */
export function continuePatient(
    progress: CaseProgress,
    stage: CaseWorkStage,
    invoiceKey: string,
    order: readonly string[],
    pending: CasePatientPending,
    now: string
): CasePatientMove {
    const synced = syncPatientStage(progress, stage, pending, now);
    const block = stagePatients(synced, stage);
    const marked = withStagePatients(synced, stage, { ...block, patients: { ...block.patients, [invoiceKey]: { status: 'completed', updatedAt: now } } }, now);
    const start = order.indexOf(invoiceKey);
    for (let step = 1; step <= order.length; step++) {
        const key = order[(start + step) % order.length];
        if (key !== invoiceKey && patientStatus(marked, stage, key, pending[key]) === 'pending') {
            return { progress: marked, nextInvoiceKey: key, advanced: false };
        }
    }
    return { progress: completeAllPatients(marked, stage, order, now, false), nextInvoiceKey: null, advanced: true };
}

/**
 * Automatic advance: when the account is in an intake or agent-analysis stage and NO patient has
 * review items (every count is 0, or the patient is already completed), the account stage is
 * completed on its own, once (a reopened stage does not jump again). Otherwise the patient
 * statuses are only synced and the account waits (blocked by the pending items).
 */
export function autoAdvanceStage(
    progress: CaseProgress,
    stage: CaseWorkStage,
    order: readonly string[],
    pending: CasePatientPending,
    now: string
): { progress: CaseProgress; advanced: boolean } {
    const synced = syncPatientStage(progress, stage, pending, now);
    const block = stagePatients(synced, stage);
    const eligible =
        AUTO_ADVANCE_STAGES.includes(stage) &&
        synced.currentStage === stage &&
        !block.autoAdvancedAt &&
        !block.reopenedAt &&
        order.length > 0 &&
        order.every((key) => pending[key] === 0 || patientStatus(synced, stage, key) === 'completed');
    if (!eligible) {
        return { progress: synced, advanced: false };
    }
    return { progress: completeAllPatients(synced, stage, order, now, true), advanced: true };
}

/** Reopens a stage of the account: back to work on it, patients to be reviewed again, no automatic jump. */
export function reopenStage(progress: CaseProgress, stage: AccountStage, now: string): CaseProgress {
    const moved = setCurrentStage(progress, stage, now);
    if (!isWorkStage(stage)) {
        return moved;
    }
    const block = stagePatients(moved, stage);
    return withStagePatients(moved, stage, { ...block, patients: {}, reopenedAt: now }, now);
}

/**
 * Intake review items of a patient: services without support (missing documents) that the analyst
 * has not reviewed yet; registering a service in the audit also marks it reviewed.
 */
export function intakePendingCount(services: ReadonlyArray<{ id: string; missingDocuments: readonly string[] }>, reviewed: ReadonlySet<string>): number {
    return services.filter((service) => service.missingDocuments.length > 0 && !reviewed.has(service.id)).length;
}

/** One icon per account stage (Control Center account row); the state is the stepper status. */
export const ACCOUNT_STAGE_ICONS: Readonly<Record<AccountStage, string>> = {
    '1_RECEIVED': 'inbox',
    '2_INTAKE': 'fact_check',
    '4_AGENTS': 'insights',
    '5_AUDIT': 'gavel',
    '6_CLOSED': 'task_alt',
};

// Restore on open and bulk review (2026-11-18) -------------------------------------------------

/**
 * Progress as the workspace opens it: never behind the stage Automate inferred (the file is
 * moved forward and written) and positioned on the patient and tab actually shown, so the next
 * open restores them. Returns the same object when nothing changes (no write needed).
 */
export function restoreCaseProgress(
    progress: CaseProgress,
    input: { inferred: AccountStage | null; invoiceKey: string | null; tab: WorkspaceTabId | null },
    now: string
): CaseProgress {
    const reconciled = reconcileCaseProgress(progress, input.inferred, now);
    return input.tab ? rememberPosition(reconciled, input.tab, input.invoiceKey ?? reconciled.lastInvoiceKey, now) : reconciled;
}

/**
 * A patient is clean in the intake when it has services and none of them carries an intake
 * warning (subtotal mismatch or no support; an assumed quantity or a computed total is not one)
 * and it has no open finding. `warnings` is the map of `intakeWarningsById` (one entry per
 * service); a service in `resolved` (reviewed or remediated) does not count even if its list
 * still has warnings.
 */
export function isCleanIntakePatient(input: { warnings: ReadonlyMap<string, readonly unknown[]>; resolved?: ReadonlySet<string>; openFindings: number }): boolean {
    const warned = [...input.warnings.entries()].filter(([id, list]) => list.length > 0 && !input.resolved?.has(id)).length;
    return input.warnings.size > 0 && warned === 0 && input.openFindings === 0;
}

/**
 * Clean patients are approved on their own in the intake stage: `completed` in
 * `patientStages['2_INTAKE']`, so they never show as pending. A reopened intake is left to the
 * analyst. Returns the same object when nothing changes.
 */
export function autoApproveCleanPatients(progress: CaseProgress, cleanKeys: readonly string[], now: string): CaseProgress {
    const block = stagePatients(progress, '2_INTAKE');
    if (block.reopenedAt) {
        return progress;
    }
    const missing = cleanKeys.filter((key) => block.patients[key]?.status !== 'completed');
    if (!missing.length) {
        return progress;
    }
    const patients = { ...block.patients };
    missing.forEach((key) => (patients[key] = { status: 'completed', updatedAt: now }));
    return withStagePatients(progress, '2_INTAKE', { ...block, patients }, now);
}

/**
 * Analyst action "mark as reviewed": the given patients are completed in the stage and their
 * services (by invoice key) marked as reviewed. Returns the same object when nothing changes.
 */
export function markPatientsReviewed(
    progress: CaseProgress,
    stage: CaseWorkStage,
    servicesByPatient: Readonly<Record<string, readonly string[]>>,
    now: string
): CaseProgress {
    const keys = Object.keys(servicesByPatient);
    if (!keys.length) {
        return progress;
    }
    let next = progress;
    for (const key of keys) {
        const unreviewed = servicesByPatient[key].filter((id) => !isServiceReviewed(next, id));
        if (unreviewed.length) {
            next = setServicesReviewed(next, key, unreviewed, true, now);
        }
    }
    const block = stagePatients(next, stage);
    const patients = { ...block.patients };
    let changed = next !== progress;
    for (const key of keys) {
        if (patients[key]?.status !== 'completed') {
            patients[key] = { status: 'completed', updatedAt: now };
            changed = true;
        }
    }
    return changed ? withStagePatients(next, stage, { ...block, patients }, now) : progress;
}
