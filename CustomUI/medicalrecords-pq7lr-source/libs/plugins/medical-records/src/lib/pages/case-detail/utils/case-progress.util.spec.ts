import {
    addRegistration,
    autoAdvanceStage,
    continuePatient,
    intakePendingCount,
    reopenStage,
    stageAvailability,
    syncPatientStage,
    buildCaseStepper,
    completeStage,
    emptyCaseProgress,
    inferCaseStage,
    parseCaseProgress,
    reconcileCaseProgress,
    rememberPosition,
    removeRegistration,
    serializeCaseProgress,
    setCurrentStage,
    setServicesReviewed,
    workPhaseOfStage,
} from './case-progress.util';

const T0 = '2026-11-17T10:00:00.000Z';
const T1 = '2026-11-17T11:00:00.000Z';

/** Synthetic agent result; no real data. */
const agent = JSON.stringify({ overallRiskLevel: 'LOW', findings: [] });

describe('case-progress.util', () => {
    describe('inferCaseStage (same rule as the Control Center)', () => {
        it('is received without IDP output', () => {
            expect(inferCaseStage({})).toBe('1_RECEIVED');
        });

        it('is agents with some agent results and audit with all three', () => {
            expect(inferCaseStage({ batchState: { documents: [] }, codingIntegrityResult: agent })).toBe('4_AGENTS');
            expect(inferCaseStage({ codingIntegrityResult: agent, complianceAlertResult: agent, financialVarianceResult: agent })).toBe('5_AUDIT');
        });

        it('is closed when the process is completed', () => {
            expect(inferCaseStage({}, 'COMPLETED')).toBe('6_CLOSED');
        });
    });

    describe('emptyCaseProgress', () => {
        it('starts at the inferred stage with earlier stages completed', () => {
            const progress = emptyCaseProgress('pi-1', '4_AGENTS', T0);
            expect(progress.currentStage).toBe('4_AGENTS');
            expect(progress.stages['2_INTAKE'].status).toBe('completed');
            expect(progress.stages['4_AGENTS'].status).toBe('in_progress');
            expect(progress.stages['5_AUDIT'].status).toBe('pending');
        });
    });

    describe('stage transitions', () => {
        it('completes the intake and moves to the next stage', () => {
            const next = completeStage(emptyCaseProgress('pi-1', '2_INTAKE', T0), '2_INTAKE', T1);
            expect(next.stages['2_INTAKE']).toEqual({ status: 'completed', updatedAt: T1 });
            expect(next.currentStage).toBe('4_AGENTS');
            expect(next.stages['4_AGENTS'].status).toBe('in_progress');
        });

        it('does not move into closed when the audit is completed', () => {
            const next = completeStage(emptyCaseProgress('pi-1', '5_AUDIT', T0), '5_AUDIT', T1);
            expect(next.currentStage).toBe('5_AUDIT');
            expect(next.stages['5_AUDIT'].status).toBe('completed');
            expect(next.stages['6_CLOSED'].status).toBe('pending');
        });

        it('reopens an earlier stage', () => {
            const ahead = emptyCaseProgress('pi-1', '5_AUDIT', T0);
            const back = setCurrentStage(ahead, '2_INTAKE', T1);
            expect(back.currentStage).toBe('2_INTAKE');
            expect(back.stages['2_INTAKE'].status).toBe('in_progress');
            expect(back.stages['5_AUDIT'].status).toBe('pending');
        });

        it('never stays behind the stage the Control Center infers', () => {
            const saved = emptyCaseProgress('pi-1', '2_INTAKE', T0);
            expect(reconcileCaseProgress(saved, '5_AUDIT', T1).currentStage).toBe('5_AUDIT');
            expect(reconcileCaseProgress(saved, '1_RECEIVED', T1)).toBe(saved);
        });
    });

    describe('reviewed services and registrations', () => {
        it('marks and unmarks reviewed services', () => {
            const marked = setServicesReviewed(emptyCaseProgress(null, null, T0), 'inv-1', ['s1', 's2'], true, T1);
            expect(marked.reviewedServices.map((entry) => entry.serviceId)).toEqual(['s1', 's2']);
            expect(setServicesReviewed(marked, 'inv-1', ['s1'], false, T1).reviewedServices.map((entry) => entry.serviceId)).toEqual(['s2']);
        });

        it('records a remediation with its comment and reviews its services', () => {
            const next = addRegistration(
                emptyCaseProgress(null, '2_INTAKE', T0),
                { kind: 'remediation', invoiceKey: 'inv-1', serviceIds: ['s1', 's2'], findingIds: ['f1', 'f1'], comment: '  Missing synthetic support  ' },
                T1
            );
            expect(next.registrations.length).toBe(1);
            expect(next.registrations[0].kind).toBe('remediation');
            expect(next.registrations[0].findingIds).toEqual(['f1']);
            expect(next.registrations[0].comment).toBe('Missing synthetic support');
            expect(next.comments[0].registrationId).toBe(next.registrations[0].id);
            expect(next.reviewedServices.length).toBe(2);
        });
    });

    describe('removeRegistration', () => {
        const build = () => {
            let progress = emptyCaseProgress(null, '2_INTAKE', T0);
            progress = addRegistration(progress, { kind: 'finding', invoiceKey: 'inv-1', serviceIds: ['s1'], findingIds: ['f1', 'f2'], comment: 'First synthetic note' }, T0);
            progress = addRegistration(progress, { kind: 'remediation', invoiceKey: 'inv-1', serviceIds: ['s2'], findingIds: ['f2'], comment: 'Second synthetic note' }, T0);
            return progress;
        };

        it('removes the registration and its comments, keeping the others', () => {
            const progress = build();
            const [first, second] = progress.registrations;
            const result = removeRegistration(progress, first.id, T1);
            expect(result.removed?.id).toBe(first.id);
            expect(result.progress.registrations.map((entry) => entry.id)).toEqual([second.id]);
            expect(result.progress.comments.map((comment) => comment.registrationId)).toEqual([second.id]);
            expect(result.progress.updatedAt).toBe(T1);
        });

        it('releases only the findings no remaining registration references', () => {
            const progress = build();
            expect(removeRegistration(progress, progress.registrations[0].id, T1).releasedFindingIds).toEqual(['f1']);
            expect(removeRegistration(progress, progress.registrations[1].id, T1).releasedFindingIds).toEqual([]);
        });

        it('keeps the reviewed marks of the services', () => {
            const progress = build();
            const result = removeRegistration(progress, progress.registrations[0].id, T1);
            expect(result.progress.reviewedServices.map((entry) => entry.serviceId)).toEqual(['s1', 's2']);
        });

        it('leaves the progress unchanged for an unknown id', () => {
            const progress = build();
            const result = removeRegistration(progress, 'reg-unknown', T1);
            expect(result.removed).toBeNull();
            expect(result.progress).toBe(progress);
            expect(result.releasedFindingIds).toEqual([]);
        });

        it('does not reuse an id after a deletion', () => {
            const progress = build();
            const pruned = removeRegistration(progress, progress.registrations[0].id, T0).progress;
            const next = addRegistration(pruned, { kind: 'finding', invoiceKey: 'inv-1', serviceIds: ['s3'], findingIds: ['f3'], comment: null }, T0);
            const ids = next.registrations.map((entry) => entry.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('parse and serialize', () => {
        it('round-trips a progress file', () => {
            let progress = emptyCaseProgress('pi-1', '2_INTAKE', T0);
            progress = rememberPosition(progress, 'analysis', 'inv-1', T1);
            progress = addRegistration(progress, { kind: 'finding', invoiceKey: 'inv-1', serviceIds: ['s1'], findingIds: ['f1'], comment: null }, T1);
            expect(parseCaseProgress(serializeCaseProgress(progress))).toEqual(progress);
        });

        it('rejects other files and unknown stages', () => {
            expect(parseCaseProgress('{"kind":"other","version":1}')).toBeNull();
            expect(parseCaseProgress({ kind: 'medical-records.case-progress', version: 1, currentStage: 'X' })).toBeNull();
            expect(parseCaseProgress('not json')).toBeNull();
        });

        it('ignores an unknown last tab', () => {
            const raw = { ...emptyCaseProgress(null, null, T0), lastTab: 'elsewhere' };
            expect(parseCaseProgress(raw)?.lastTab).toBeNull();
        });
    });

    describe('buildCaseStepper', () => {
        it('shows the Control Center stages with status and percent', () => {
            const stepper = buildCaseStepper(emptyCaseProgress(null, '4_AGENTS', T0), '4_AGENTS');
            expect(stepper.steps.map((step) => step.status)).toEqual(['completed', 'completed', 'in_progress', 'pending', 'pending']);
            expect(stepper.percent).toBe(40);
            expect(stepper.steps[1].phase).toBe('INTAKE');
            expect(stepper.steps[0].phase).toBeNull();
        });

        it('flags a stage with error and uses the inferred stage without progress', () => {
            const stepper = buildCaseStepper(null, '4_AGENTS', { '4_AGENTS': true });
            expect(stepper.current).toBe('4_AGENTS');
            expect(stepper.steps[2].status).toBe('error');
        });

        it('keeps the analyst ahead of the inferred stage', () => {
            const progress = completeStage(emptyCaseProgress(null, '2_INTAKE', T0), '2_INTAKE', T1);
            expect(buildCaseStepper(progress, '2_INTAKE').current).toBe('4_AGENTS');
        });
    });

    it('maps process-owned stages to the nearest work phase', () => {
        expect(workPhaseOfStage('1_RECEIVED')).toBe('INTAKE');
        expect(workPhaseOfStage('4_AGENTS')).toBe('ANALYSIS');
        expect(workPhaseOfStage('6_CLOSED')).toBe('AUDIT');
    });
    describe('legacy version 1 files', () => {
        it('reads a version-1 file and shows the removed rules stage as agent analysis', () => {
            const v1 = {
                kind: 'medical-records.case-progress',
                version: 1,
                processInstanceId: 'pi-1',
                currentStage: '3_RULES',
                stages: { '2_INTAKE': { status: 'completed', updatedAt: T0 }, '3_RULES': { status: 'in_progress', updatedAt: T0 } },
                createdAt: T0,
                updatedAt: T0,
            };
            const parsed = parseCaseProgress(JSON.stringify(v1));
            expect(parsed?.version).toBe(2);
            expect(parsed?.currentStage).toBe('4_AGENTS');
            expect(parsed?.stages['2_INTAKE'].status).toBe('completed');
            expect(Object.keys(parsed?.stages ?? {})).not.toContain('3_RULES');
            expect(parsed?.patientStages).toEqual({});
        });

        it('round-trips the per-patient state of version 2', () => {
            const progress = syncPatientStage(emptyCaseProgress('pi-1', '2_INTAKE', T0), '2_INTAKE', { a: 2, b: 0 }, T1);
            const parsed = parseCaseProgress(serializeCaseProgress(progress));
            expect(parsed?.patientStages['2_INTAKE']?.patients).toEqual({ a: { status: 'pending', updatedAt: T1 }, b: { status: 'reviewed', updatedAt: T1 } });
        });
    });

    describe('Automate gate (stageAvailability)', () => {
        it('locks a stage Automate has not reached unless it is the analyst stage', () => {
            expect(stageAvailability('5_AUDIT', '2_INTAKE', '2_INTAKE')).toBe('locked');
            expect(stageAvailability('4_AGENTS', '2_INTAKE', '4_AGENTS')).toBe('processing');
            expect(stageAvailability('2_INTAKE', '2_INTAKE', '2_INTAKE')).toBe('ready');
        });

        it('shows processing while Automate still works on a reached stage', () => {
            expect(stageAvailability('4_AGENTS', '4_AGENTS', '4_AGENTS', { '4_AGENTS': true })).toBe('processing');
            expect(stageAvailability('4_AGENTS', '5_AUDIT', '4_AGENTS')).toBe('ready');
        });

        it('shows locked steps as pending in the stepper', () => {
            const stepper = buildCaseStepper(emptyCaseProgress(null, '2_INTAKE', T0), '2_INTAKE');
            const audit = stepper.steps.find((step) => step.stage === '5_AUDIT');
            expect(audit?.availability).toBe('locked');
            expect(audit?.status).toBe('pending');
        });
    });

    describe('account progress by patient', () => {
        const order = ['a', 'b', 'c'];

        it('continue moves to the next patient with pending items without advancing the account', () => {
            const move = continuePatient(emptyCaseProgress(null, '2_INTAKE', T0), '2_INTAKE', 'a', order, { a: 1, b: 0, c: 3 }, T1);
            expect(move.nextInvoiceKey).toBe('c');
            expect(move.advanced).toBe(false);
            expect(move.progress.currentStage).toBe('2_INTAKE');
            expect(move.progress.patientStages['2_INTAKE']?.patients['a'].status).toBe('completed');
            expect(move.progress.patientStages['2_INTAKE']?.patients['b'].status).toBe('reviewed');
        });

        it('continue on the last pending patient advances the account stage', () => {
            let progress = emptyCaseProgress(null, '2_INTAKE', T0);
            progress = continuePatient(progress, '2_INTAKE', 'a', order, { a: 1, b: 0, c: 3 }, T1).progress;
            const move = continuePatient(progress, '2_INTAKE', 'c', order, { a: 1, b: 0, c: 3 }, T1);
            expect(move.advanced).toBe(true);
            expect(move.nextInvoiceKey).toBeNull();
            expect(move.progress.currentStage).toBe('4_AGENTS');
            expect(Object.values(move.progress.patientStages['2_INTAKE']?.patients ?? {}).every((entry) => entry.status === 'completed')).toBe(true);
        });

        it('a single-patient account advances on continue', () => {
            const move = continuePatient(emptyCaseProgress(null, '4_AGENTS', T0), '4_AGENTS', 'a', ['a'], { a: 2 }, T1);
            expect(move.advanced).toBe(true);
            expect(move.progress.currentStage).toBe('5_AUDIT');
        });

        it('advances automatically, once, when no patient has review items', () => {
            const result = autoAdvanceStage(emptyCaseProgress(null, '2_INTAKE', T0), '2_INTAKE', order, { a: 0, b: 0, c: 0 }, T1);
            expect(result.advanced).toBe(true);
            expect(result.progress.currentStage).toBe('4_AGENTS');
            expect(result.progress.patientStages['2_INTAKE']?.autoAdvancedAt).toBe(T1);
            const reopened = reopenStage(result.progress, '2_INTAKE', T1);
            expect(autoAdvanceStage(reopened, '2_INTAKE', order, { a: 0, b: 0, c: 0 }, T1).advanced).toBe(false);
        });

        it('is blocked while some patient has review items', () => {
            const result = autoAdvanceStage(emptyCaseProgress(null, '2_INTAKE', T0), '2_INTAKE', order, { a: 0, b: 1, c: 0 }, T1);
            expect(result.advanced).toBe(false);
            expect(result.progress.currentStage).toBe('2_INTAKE');
            expect(result.progress.patientStages['2_INTAKE']?.patients['b'].status).toBe('pending');
        });

        it('does not advance the audit on its own nor a stage that is not the current one', () => {
            expect(autoAdvanceStage(emptyCaseProgress(null, '5_AUDIT', T0), '5_AUDIT', order, { a: 0, b: 0, c: 0 }, T1).advanced).toBe(false);
            expect(autoAdvanceStage(emptyCaseProgress(null, '4_AGENTS', T0), '2_INTAKE', order, { a: 0, b: 0, c: 0 }, T1).advanced).toBe(false);
        });

        it('counts unsupported services the analyst has not reviewed', () => {
            const services = [
                { id: 's1', missingDocuments: ['Synthetic support'] },
                { id: 's2', missingDocuments: [] },
                { id: 's3', missingDocuments: ['Synthetic support'] },
            ];
            expect(intakePendingCount(services, new Set(['s3']))).toBe(1);
        });
    });
});
