import { deriveRadicationProgress, RadicationRuntimeSnapshot } from './radication-progress.util';

const states = (snapshot: RadicationRuntimeSnapshot) => deriveRadicationProgress(snapshot).stages.map((stage) => `${stage.key}:${stage.state}`);

describe('radication progress', () => {
    it('shows the IDP extraction as active right after the process starts', () => {
        expect(states({ processStatus: 'RUNNING', childProcesses: [], tasks: [] })).toEqual([
            'radicated:done',
            'extraction:active',
            'preanalysis:pending',
            'intake:pending',
            'analysis:pending',
        ]);
    });

    it('is ready for the pre-analysis once the Intake task is open', () => {
        const progress = deriveRadicationProgress({
            processStatus: 'RUNNING',
            childProcesses: [{ name: 'Document AI Process', status: 'COMPLETED' }],
            tasks: [{ name: 'Nueva Cuenta', status: 'ASSIGNED' }],
        });
        expect(progress.stages.map((stage) => stage.state)).toEqual(['done', 'done', 'done', 'active', 'pending']);
        expect(progress.intakeReady).toBe(true);
        expect(progress.afterIntake).toBe(false);
    });

    it('is not ready while new documents are being processed again', () => {
        const progress = deriveRadicationProgress({
            processStatus: 'RUNNING',
            childProcesses: [
                { name: 'Document AI Process', status: 'COMPLETED' },
                { name: 'Document AI Process', status: 'RUNNING' },
            ],
            tasks: [{ name: 'Nueva Cuenta', status: 'COMPLETED' }],
        });
        expect(progress.intakeReady).toBe(false);
        expect(progress.stages.map((stage) => stage.state)).toEqual(['done', 'active', 'pending', 'pending', 'pending']);
    });

    it('moves on to the ARS analysis after Intake', () => {
        const progress = deriveRadicationProgress({
            processStatus: 'RUNNING',
            childProcesses: [
                { name: 'Document AI Process', status: 'COMPLETED' },
                { name: 'AgentMesh', status: 'RUNNING' },
            ],
            tasks: [{ name: 'Nueva Cuenta', status: 'COMPLETED' }],
        });
        expect(progress.stages.map((stage) => stage.state)).toEqual(['done', 'done', 'done', 'done', 'active']);
        expect(progress.afterIntake).toBe(true);
        expect(progress.intakeReady).toBe(false);
    });

    it('keeps the radication active while initialize-batch prepares the batch', () => {
        expect(states({ processStatus: 'RUNNING', childProcesses: [{ name: 'initialize-batch', status: 'RUNNING' }], tasks: [] })).toEqual([
            'radicated:active',
            'extraction:pending',
            'preanalysis:pending',
            'intake:pending',
            'analysis:pending',
        ]);
        expect(states({ processStatus: 'RUNNING', childProcesses: [{ name: 'initialize-batch', status: 'COMPLETED' }], tasks: [] }).slice(0, 2)).toEqual([
            'radicated:done',
            'extraction:active',
        ]);
    });

    it('drives the IDP sub-steps from the service tasks of the running Document AI Process', () => {
        const substeps = (serviceTasks: Array<{ activityName: string; status: string }> | null) =>
            deriveRadicationProgress({
                processStatus: 'RUNNING',
                childProcesses: [
                    { name: 'initialize-batch', status: 'COMPLETED' },
                    { name: 'Document AI Process', status: 'RUNNING' },
                ],
                tasks: [],
                serviceTasks,
            }).idpSubsteps?.map((step) => `${step.key}:${step.state}`) ?? null;

        expect(substeps([{ activityName: 'Separate', status: 'STARTED' }])).toEqual(['separation:active', 'classification:pending', 'extraction:pending']);
        expect(
            substeps([
                { activityName: 'Separate', status: 'COMPLETED' },
                { activityName: 'Classify', status: 'COMPLETED' },
            ])
        ).toEqual(['separation:done', 'classification:done', 'extraction:pending']);
        expect(substeps([{ activityName: 'Extract', status: 'STARTED' }])).toEqual(['separation:done', 'classification:done', 'extraction:active']);
        expect(
            substeps([
                { activityName: 'Extract', status: 'COMPLETED' },
                { activityName: 'Package', status: 'STARTED' },
            ])
        ).toEqual(['separation:done', 'classification:done', 'extraction:active']);
        expect(
            substeps([
                { activityName: 'Extract', status: 'COMPLETED' },
                { activityName: 'Package', status: 'COMPLETED' },
            ])
        ).toEqual(['separation:done', 'classification:done', 'extraction:done']);
        expect(substeps([{ activityName: 'Classify', status: 'ERROR' }])).toEqual(['separation:done', 'classification:error', 'extraction:pending']);
    });

    it('falls back to the three animated sub-steps without service tasks', () => {
        const progress = deriveRadicationProgress({
            processStatus: 'RUNNING',
            childProcesses: [{ name: 'Document AI Process', status: 'RUNNING' }],
            tasks: [],
            serviceTasks: null,
        });
        expect(progress.idpSubsteps).toBeNull();
        expect(deriveRadicationProgress({ processStatus: 'RUNNING', childProcesses: [{ name: 'Document AI Process', status: 'RUNNING' }], tasks: [], serviceTasks: [] }).idpSubsteps).toBeNull();
    });

    it('marks the first unfinished stage as failed when the process is cancelled', () => {
        const progress = deriveRadicationProgress({
            processStatus: 'CANCELLED',
            childProcesses: [{ name: 'Document AI Process', status: 'COMPLETED' }],
            tasks: [],
        });
        expect(progress.stages.map((stage) => stage.state)).toEqual(['done', 'done', 'error', 'pending', 'pending']);
        expect(progress.failed).toBe(true);
    });

    describe('pre-analysis (child process "Preanalysis")', () => {
        const withPreanalysis = (preanalysisStatus: string | null, tasks: RadicationRuntimeSnapshot['tasks'] = []) =>
            deriveRadicationProgress({
                processStatus: 'RUNNING',
                childProcesses: [
                    { name: 'initialize-batch', status: 'COMPLETED' },
                    { name: 'Document AI Process', status: 'COMPLETED' },
                    ...(preanalysisStatus ? [{ name: 'Preanalysis', status: preanalysisStatus }] : []),
                ],
                tasks,
            });

        it('is active while the Preanalysis process runs and Intake is not ready', () => {
            const progress = withPreanalysis('RUNNING');
            expect(progress.stages.map((stage) => `${stage.key}:${stage.state}`)).toEqual([
                'radicated:done',
                'extraction:done',
                'preanalysis:active',
                'intake:pending',
                'analysis:pending',
            ]);
            expect(progress.intakeReady).toBe(false);
            expect(progress.idpSubsteps).toBeNull();
        });

        it('is active right after IDP finishes, before the child process is visible', () => {
            expect(withPreanalysis(null).stages.map((stage) => stage.state)).toEqual(['done', 'done', 'active', 'pending', 'pending']);
        });

        it('is done once it completes, and Intake is ready only when "Nueva Cuenta" opens', () => {
            const waiting = withPreanalysis('COMPLETED');
            expect(waiting.stages.map((stage) => stage.state)).toEqual(['done', 'done', 'done', 'pending', 'pending']);
            expect(waiting.intakeReady).toBe(false);

            const ready = withPreanalysis('COMPLETED', [{ name: 'Nueva Cuenta', status: 'ASSIGNED' }]);
            expect(ready.stages.map((stage) => stage.state)).toEqual(['done', 'done', 'done', 'active', 'pending']);
            expect(ready.intakeReady).toBe(true);
        });

        it('shows an error when the Preanalysis process fails', () => {
            expect(withPreanalysis('FAILED').stages.map((stage) => stage.state)).toEqual(['done', 'done', 'error', 'pending', 'pending']);
        });

        it('matches the child process by its definition id too', () => {
            const progress = deriveRadicationProgress({
                processStatus: 'RUNNING',
                childProcesses: [
                    { name: 'Document AI Process', status: 'COMPLETED' },
                    { name: 'Process_1794866470316', status: 'RUNNING' },
                ],
                tasks: [],
            });
            expect(progress.stages[2].state).toBe('active');
        });

        it('is not repeated while new documents are processed again', () => {
            const progress = deriveRadicationProgress({
                processStatus: 'RUNNING',
                childProcesses: [
                    { name: 'Document AI Process', status: 'COMPLETED' },
                    { name: 'Preanalysis', status: 'COMPLETED' },
                    { name: 'Document AI Process', status: 'RUNNING' },
                ],
                tasks: [{ name: 'Nueva Cuenta', status: 'COMPLETED' }],
            });
            expect(progress.stages.map((stage) => stage.state)).toEqual(['done', 'active', 'pending', 'pending', 'pending']);
            expect(progress.intakeReady).toBe(false);
        });
    });
});
