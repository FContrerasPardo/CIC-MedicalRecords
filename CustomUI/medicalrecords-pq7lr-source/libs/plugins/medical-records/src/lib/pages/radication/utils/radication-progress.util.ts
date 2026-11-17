/**
 * Progress of a radicated account, read from the runtime. Stages follow the deployed BPMN
 * (`medical-records`): start form → "initialize-batch" in parallel with "Document IA" (calls Document
 * AI Process, IDP) → "Preanalysis Agent" (calls "Preanalysis": checklist from Appdata, Agent Builder
 * "Preanalysis Documental Agent", `preanalysisResult`) → user task "Nueva Cuenta" (Intake) →
 * "Agentic Mesh Analysis" → user task "Analysis" (ARS).
 *
 * The provider's pre-radication waits at Intake: once the "Nueva Cuenta" task is open the page moves
 * on to the review, and only the provider's decision completes it. Loading more documents goes
 * through "Document IA New Docs" (the same IDP process) and back to Intake.
 *
 * While IDP runs, its sub-steps (separation, classification, extraction) follow the service tasks
 * of the running "Document AI Process" instance (`Separate`, `Classify`, `Extract`, then `Package` /
 * `Normalize batchState` / `Send to CF Repository` as finishing). Without service tasks the three
 * sub-steps are shown together, as before.
 */

export type RadicationStageKey = 'radicated' | 'extraction' | 'preanalysis' | 'intake' | 'analysis';
export type RadicationStageState = 'done' | 'active' | 'pending' | 'error';

export const RADICATION_STAGES: readonly RadicationStageKey[] = ['radicated', 'extraction', 'preanalysis', 'intake', 'analysis'];
/** Stages shown while processing: up to the moment the review can start. */
export const RADICATION_PROCESSING_STAGES: readonly RadicationStageKey[] = ['radicated', 'extraction', 'preanalysis', 'intake'];

/** Called process names and task names as deployed in Automate. */
export const RADICATION_PROCESS_NAMES = {
    root: 'medical-records',
    initialize: 'initialize-batch',
    extraction: 'Document AI Process',
    analysis: 'AgentMesh',
} as const;
/** Child process "Preanalysis" (export `preanalysis-p6gj3.bpmn20.xml`), by definition name or id. */
export const RADICATION_PREANALYSIS_PROCESS: readonly string[] = ['Preanalysis', 'Process_1794866470316'];
export const RADICATION_TASK_NAMES = {
    intake: 'Nueva Cuenta',
    analysis: 'Analysis',
} as const;

export type RadicationIdpSubstep = 'separation' | 'classification' | 'extraction';
export const RADICATION_IDP_SUBSTEPS: readonly RadicationIdpSubstep[] = ['separation', 'classification', 'extraction'];

/**
 * Service tasks of "Document AI Process" (export `document-ai-process-ffenu.bpmn20.xml`), matched
 * by activity name or element id.
 */
export const RADICATION_IDP_ACTIVITIES = {
    separation: ['Separate', 'hxpIdpConnector_17yqov9'],
    classification: ['Classify', 'hxpIdpConnector_08fi51r'],
    extraction: ['Extract', 'hxpIdpConnector_0y9aqg6'],
    finishing: ['Package', 'hxpIdpConnector_1dn0bpt', 'Normalize batchState', 'Send to CF Repository', 'contentFederatedConnector_04x9bsa'],
} as const;

export interface RadicationRuntimeItem {
    id?: string | null;
    name: string | null | undefined;
    status: string | null | undefined;
}

/** One row of `query/admin/v1/service-tasks` for the running IDP instance. */
export interface RadicationServiceTask {
    activityId?: string | null;
    activityName?: string | null;
    status?: string | null;
    processInstanceId?: string | null;
}

export interface RadicationRuntimeSnapshot {
    processStatus: string | null | undefined;
    childProcesses: readonly RadicationRuntimeItem[];
    tasks: readonly RadicationRuntimeItem[];
    /** Service tasks of the running IDP instance; `null`/absent when they could not be read. */
    serviceTasks?: readonly RadicationServiceTask[] | null;
}

export interface RadicationStageView {
    key: RadicationStageKey;
    state: RadicationStageState;
}

export interface RadicationSubstepView {
    key: RadicationIdpSubstep;
    state: RadicationStageState;
}

export interface RadicationProgress {
    stages: RadicationStageView[];
    /** IDP sub-steps from the service tasks while extraction runs; `null` = no runtime detail (all animated). */
    idpSubsteps: RadicationSubstepView[] | null;
    /** The Intake task ("Nueva Cuenta") is open: the review can start. */
    intakeReady: boolean;
    /** The account left Intake towards the ARS analysis (or the process ended). */
    afterIntake: boolean;
    /** The process was cancelled or failed. */
    failed: boolean;
}

const RUNNING = new Set(['RUNNING', 'ACTIVE', 'CREATED', 'ASSIGNED', 'SUSPENDED', 'STARTED']);
const FINISHED = new Set(['COMPLETED']);
const FAILED = new Set(['CANCELLED', 'TERMINATED', 'FAILED', 'ERROR']);

const normalize = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
const status = (value: string | null | undefined) => (value ?? '').trim().toUpperCase();

type ItemState = 'running' | 'finished' | 'failed' | 'absent';

function stateOf(statuses: readonly string[]): ItemState {
    if (statuses.some((value) => RUNNING.has(value))) {
        return 'running';
    }
    if (statuses.some((value) => FINISHED.has(value))) {
        return 'finished';
    }
    if (statuses.some((value) => FAILED.has(value))) {
        return 'failed';
    }
    return statuses.length ? 'running' : 'absent';
}

function itemState(items: readonly RadicationRuntimeItem[], name: string | readonly string[]): ItemState {
    const wanted = new Set((typeof name === 'string' ? [name] : name).map(normalize));
    return stateOf(items.filter((item) => wanted.has(normalize(item.name))).map((item) => status(item.status)));
}

function serviceTaskState(tasks: readonly RadicationServiceTask[], names: readonly string[]): ItemState {
    const wanted = new Set(names.map(normalize));
    return stateOf(tasks.filter((task) => wanted.has(normalize(task.activityName)) || wanted.has(normalize(task.activityId))).map((task) => status(task.status)));
}

function stageState(done: boolean, state: ItemState): RadicationStageState {
    if (done) {
        return 'done';
    }
    return state === 'failed' ? 'error' : state === 'running' ? 'active' : 'pending';
}

/**
 * IDP sub-steps from the service tasks of the running Document AI Process; `null` without rows
 * (endpoint unavailable or nothing indexed yet), so the page keeps animating the three together.
 */
export function deriveIdpSubsteps(serviceTasks: readonly RadicationServiceTask[] | null | undefined): RadicationSubstepView[] | null {
    if (!serviceTasks?.length) {
        return null;
    }
    const separation = serviceTaskState(serviceTasks, RADICATION_IDP_ACTIVITIES.separation);
    const classification = serviceTaskState(serviceTasks, RADICATION_IDP_ACTIVITIES.classification);
    const extract = serviceTaskState(serviceTasks, RADICATION_IDP_ACTIVITIES.extraction);
    const finishing = serviceTaskState(serviceTasks, RADICATION_IDP_ACTIVITIES.finishing);

    let extraction: RadicationStageState;
    if (extract === 'failed' || finishing === 'failed') {
        extraction = 'error';
    } else if (extract === 'running' || finishing === 'running') {
        extraction = 'active';
    } else if (finishing === 'finished') {
        extraction = 'done';
    } else {
        // Extract finished, waiting for Package: still finishing the extraction.
        extraction = extract === 'finished' ? 'active' : 'pending';
    }
    const raw: RadicationStageState[] = [stageState(separation === 'finished', separation), stageState(classification === 'finished', classification), extraction];

    // A later sub-step that started means the earlier ones are done, even when their rows are missing.
    for (let index = raw.length - 2; index >= 0; index--) {
        if (raw[index] === 'pending' && raw.slice(index + 1).some((state) => state !== 'pending')) {
            raw[index] = 'done';
        }
    }
    return RADICATION_IDP_SUBSTEPS.map((key, index) => ({ key, state: raw[index] }));
}

export function deriveRadicationProgress(snapshot: RadicationRuntimeSnapshot): RadicationProgress {
    const processStatus = status(snapshot.processStatus);
    const initialize = itemState(snapshot.childProcesses, RADICATION_PROCESS_NAMES.initialize);
    const extraction = itemState(snapshot.childProcesses, RADICATION_PROCESS_NAMES.extraction);
    const preanalysis = itemState(snapshot.childProcesses, RADICATION_PREANALYSIS_PROCESS);
    const intake = itemState(snapshot.tasks, RADICATION_TASK_NAMES.intake);
    const mesh = itemState(snapshot.childProcesses, RADICATION_PROCESS_NAMES.analysis);
    const analysisTask = itemState(snapshot.tasks, RADICATION_TASK_NAMES.analysis);
    const failed = FAILED.has(processStatus);
    const finished = FINISHED.has(processStatus);

    // "Document IA New Docs" runs the same IDP process again: while it runs, Intake is not open.
    const reprocessing = extraction === 'running';
    const intakeOpen = intake === 'running' && !reprocessing;
    const afterIntake = finished || mesh !== 'absent' || analysisTask !== 'absent';
    const intakeDone = afterIntake;
    const extractionDone = !reprocessing && (extraction === 'finished' || preanalysis !== 'absent' || intake !== 'absent' || afterIntake);
    // "Preanalysis" runs once, before the first Intake; new documents go straight back to Intake.
    const preanalysisDone = !reprocessing && (preanalysis === 'finished' || intake !== 'absent' || afterIntake);
    // "initialize-batch" prepares the IDP batch right after the start: part of the radication.
    const initializing = initialize === 'running' && extraction === 'absent' && intake === 'absent' && !afterIntake;

    const raw: Record<RadicationStageKey, RadicationStageState> = {
        radicated: !processStatus || initializing ? 'active' : initialize === 'failed' && extraction === 'absent' ? 'error' : 'done',
        extraction: stageState(extractionDone, extraction),
        preanalysis: reprocessing ? 'pending' : stageState(preanalysisDone, preanalysis),
        intake: intakeDone ? 'done' : intakeOpen ? 'active' : intake === 'failed' ? 'error' : 'pending',
        analysis: stageState(finished || analysisTask === 'finished', mesh === 'absent' ? analysisTask : mesh === 'failed' ? 'failed' : 'running'),
    };

    // A started (and initialized) process with nothing visible yet is waiting for the first service step (IDP).
    if (processStatus && !failed && raw.radicated === 'done' && raw.extraction === 'pending' && raw.intake === 'pending' && !afterIntake) {
        raw.extraction = 'active';
    }
    // IDP finished and Intake is not open yet: the account is on its way to (or in) the pre-analysis.
    if (processStatus && !failed && raw.extraction === 'done' && raw.preanalysis === 'pending' && raw.intake === 'pending' && !afterIntake) {
        raw.preanalysis = 'active';
    }
    // A failed process marks the first stage it did not finish.
    if (failed) {
        const firstOpen = RADICATION_STAGES.find((key) => raw[key] === 'active' || raw[key] === 'pending');
        if (firstOpen) {
            raw[firstOpen] = 'error';
        }
    }

    return {
        stages: RADICATION_STAGES.map((key) => ({ key, state: raw[key] })),
        idpSubsteps: raw.extraction === 'active' && reprocessing ? deriveIdpSubsteps(snapshot.serviceTasks) : null,
        intakeReady: intakeOpen && !failed,
        afterIntake,
        failed,
    };
}
