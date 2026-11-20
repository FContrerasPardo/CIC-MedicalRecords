/** The four steps of the pre-radication, as CIC-Fin's loan application (upload → processing → review → confirmation). */
export type RadicationStep = 'upload' | 'processing' | 'review' | 'summary';
export const RADICATION_STEPS: readonly RadicationStep[] = ['upload', 'processing', 'review', 'summary'];

/** How a step shows in the stepper: passed, current, reached but not passed, or not reached yet. */
export type RadicationStepState = 'done' | 'active' | 'visited' | 'pending';

export interface RadicationStepperState {
    current: RadicationStep;
    /** Furthest step reached so far (visited, or made available by the flow). */
    reached: RadicationStep;
    /** The account left Intake (radicated by the provider or already past Intake in Automate). */
    radicated: boolean;
    /** A start, an Intake save or a decision is running: navigation waits. */
    busy: boolean;
}

export function radicationStepIndex(step: RadicationStep): number {
    return RADICATION_STEPS.indexOf(step);
}

/** The furthest of two steps. */
export function furthestStep(a: RadicationStep, b: RadicationStep): RadicationStep {
    return radicationStepIndex(a) >= radicationStepIndex(b) ? a : b;
}

export function radicationStepState(step: RadicationStep, state: RadicationStepperState): RadicationStepState {
    if (step === state.current) {
        return 'active';
    }
    const index = radicationStepIndex(step);
    const reached = radicationStepIndex(state.reached);
    if (index < reached || (step === 'summary' && state.radicated && index <= reached)) {
        return 'done';
    }
    return index === reached ? 'visited' : 'pending';
}

/**
 * The stepper only opens steps already reached (visited or made available by the flow), never a
 * future one, and nothing while a request runs. The current step is not a navigation target.
 */
export function canVisitRadicationStep(step: RadicationStep, state: RadicationStepperState): boolean {
    return !state.busy && step !== state.current && radicationStepIndex(step) <= radicationStepIndex(state.reached);
}
