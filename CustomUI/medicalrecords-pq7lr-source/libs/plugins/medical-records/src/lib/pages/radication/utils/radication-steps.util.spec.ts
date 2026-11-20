import { canVisitRadicationStep, furthestStep, radicationStepState, RadicationStepperState } from './radication-steps.util';

const state = (overrides: Partial<RadicationStepperState> = {}): RadicationStepperState => ({
    current: 'review',
    reached: 'review',
    radicated: false,
    busy: false,
    ...overrides,
});

describe('radication stepper', () => {
    it('opens every reached step and keeps future steps disabled', () => {
        const current = state();
        expect(canVisitRadicationStep('upload', current)).toBe(true);
        expect(canVisitRadicationStep('processing', current)).toBe(true);
        expect(canVisitRadicationStep('review', current)).toBe(false);
        expect(canVisitRadicationStep('summary', current)).toBe(false);
    });

    it('lets the user go back to the summary after looking at an earlier step', () => {
        const back = state({ current: 'upload', reached: 'summary' });
        expect(canVisitRadicationStep('summary', back)).toBe(true);
        expect(canVisitRadicationStep('review', back)).toBe(true);
    });

    it('blocks navigation while a request runs', () => {
        expect(canVisitRadicationStep('upload', state({ busy: true }))).toBe(false);
    });

    it('shows passed, current, reached and pending steps', () => {
        const back = state({ current: 'upload', reached: 'review' });
        expect(radicationStepState('upload', back)).toBe('active');
        expect(radicationStepState('processing', back)).toBe('done');
        expect(radicationStepState('review', back)).toBe('visited');
        expect(radicationStepState('summary', back)).toBe('pending');
    });

    it('marks the summary done once radicated and reached', () => {
        expect(radicationStepState('summary', state({ current: 'review', reached: 'summary', radicated: true }))).toBe('done');
        expect(radicationStepState('summary', state({ current: 'review', reached: 'review', radicated: true }))).toBe('pending');
    });

    it('keeps the furthest step', () => {
        expect(furthestStep('review', 'processing')).toBe('review');
        expect(furthestStep('upload', 'summary')).toBe('summary');
    });
});
