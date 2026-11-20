import {
    autoAdvanceStage,
    autoApproveCleanPatients,
    emptyCaseProgress,
    isCleanIntakePatient,
    markPatientsReviewed,
    parseCaseProgress,
    patientStatus,
    reopenStage,
    restoreCaseProgress,
    serializeCaseProgress,
} from './case-progress.util';

// Synthetic data only.
const T0 = '2026-11-18T08:00:00.000Z';
const T1 = '2026-11-18T09:00:00.000Z';
const ORDER = ['inv-1', 'inv-2', 'inv-3'];

describe('case-progress.util restore and bulk review', () => {
    describe('restoreCaseProgress (reopen)', () => {
        it('moves a file left in intake up to the stage Automate reached, so it is written', () => {
            const file = emptyCaseProgress('proc-1', '2_INTAKE', T0);
            const restored = restoreCaseProgress(file, { inferred: '5_AUDIT', invoiceKey: 'inv-2', tab: 'audit' }, T1);
            expect(restored).not.toBe(file);
            expect(restored.currentStage).toBe('5_AUDIT');
            expect(restored.stages['2_INTAKE'].status).toBe('completed');
            expect(restored.stages['4_AGENTS'].status).toBe('completed');
            expect(restored.lastInvoiceKey).toBe('inv-2');
            expect(restored.lastTab).toBe('audit');
            // What is written is read back the same way.
            expect(parseCaseProgress(serializeCaseProgress(restored))?.lastInvoiceKey).toBe('inv-2');
        });

        it('never moves the file back when Automate is behind it', () => {
            const file = { ...emptyCaseProgress('proc-1', '5_AUDIT', T0), lastTab: 'audit' as const, lastInvoiceKey: 'inv-3' };
            const restored = restoreCaseProgress(file, { inferred: '2_INTAKE', invoiceKey: 'inv-3', tab: 'audit' }, T1);
            expect(restored).toBe(file);
        });

        it('records the patient on screen and keeps the last one when none is shown', () => {
            const file = { ...emptyCaseProgress('proc-1', '2_INTAKE', T0), lastTab: 'intake' as const, lastInvoiceKey: 'inv-3' };
            expect(restoreCaseProgress(file, { inferred: '2_INTAKE', invoiceKey: 'inv-1', tab: 'intake' }, T1).lastInvoiceKey).toBe('inv-1');
            expect(restoreCaseProgress(file, { inferred: '2_INTAKE', invoiceKey: null, tab: 'intake' }, T1)).toBe(file);
        });
    });

    describe('clean patients in the intake', () => {
        it('is clean only with services, no warning and no open finding', () => {
            const clean = new Map<string, string[]>([
                ['s1', []],
                ['s2', []],
            ]);
            const warned = new Map<string, string[]>([
                ['s1', []],
                ['s2', ['unsupported']],
            ]);
            expect(isCleanIntakePatient({ warnings: clean, openFindings: 0 })).toBe(true);
            expect(isCleanIntakePatient({ warnings: warned, openFindings: 0 })).toBe(false);
            expect(isCleanIntakePatient({ warnings: clean, openFindings: 1 })).toBe(false);
            expect(isCleanIntakePatient({ warnings: new Map(), openFindings: 0 })).toBe(false);
        });

        it('does not count the warnings of reviewed or remediated services', () => {
            const warned = new Map<string, string[]>([
                ['s1', ['subtotalMismatch']],
                ['s2', ['unsupported']],
            ]);
            expect(isCleanIntakePatient({ warnings: warned, resolved: new Set(['s1']), openFindings: 0 })).toBe(false);
            expect(isCleanIntakePatient({ warnings: warned, resolved: new Set(['s1', 's2']), openFindings: 0 })).toBe(true);
        });

        it('approves clean patients as completed in the intake stage, once', () => {
            const file = emptyCaseProgress('proc-1', '2_INTAKE', T0);
            const approved = autoApproveCleanPatients(file, ['inv-1', 'inv-3'], T1);
            expect(approved.patientStages['2_INTAKE']?.patients['inv-1']).toEqual({ status: 'completed', updatedAt: T1 });
            expect(patientStatus(approved, '2_INTAKE', 'inv-3', 2)).toBe('completed');
            expect(patientStatus(approved, '2_INTAKE', 'inv-2')).toBe('pending');
            expect(autoApproveCleanPatients(approved, ['inv-1', 'inv-3'], T1)).toBe(approved);
        });

        it('leaves a reopened intake to the analyst', () => {
            const reopened = reopenStage(emptyCaseProgress('proc-1', '4_AGENTS', T0), '2_INTAKE', T0);
            expect(autoApproveCleanPatients(reopened, ['inv-1'], T1)).toBe(reopened);
        });

        it('lets the account advance on its own once no patient is pending', () => {
            const approved = autoApproveCleanPatients(emptyCaseProgress('proc-1', '2_INTAKE', T0), ['inv-1', 'inv-2'], T1);
            const blocked = autoAdvanceStage(approved, '2_INTAKE', ORDER, { 'inv-1': 0, 'inv-2': 0, 'inv-3': 1 }, T1);
            expect(blocked.advanced).toBe(false);
            const moved = autoAdvanceStage(approved, '2_INTAKE', ORDER, { 'inv-1': 0, 'inv-2': 0, 'inv-3': 0 }, T1);
            expect(moved.advanced).toBe(true);
            expect(moved.progress.currentStage).toBe('4_AGENTS');
        });
    });

    describe('markPatientsReviewed (bulk action)', () => {
        it('completes the patients in the stage and marks their services reviewed', () => {
            const file = emptyCaseProgress('proc-1', '2_INTAKE', T0);
            const next = markPatientsReviewed(file, '2_INTAKE', { 'inv-1': ['s-1', 's-2'], 'inv-3': ['s-9'] }, T1);
            expect(next.patientStages['2_INTAKE']?.patients['inv-1']?.status).toBe('completed');
            expect(next.patientStages['2_INTAKE']?.patients['inv-3']?.status).toBe('completed');
            expect(next.reviewedServices.map((entry) => entry.invoiceKey + '/' + entry.serviceId)).toEqual(['inv-1/s-1', 'inv-1/s-2', 'inv-3/s-9']);
            // Persisted: the file keeps the statuses and the reviewed services.
            const read = parseCaseProgress(serializeCaseProgress(next));
            expect(read?.patientStages['2_INTAKE']?.patients['inv-3']?.status).toBe('completed');
            expect(read?.reviewedServices.length).toBe(3);
        });

        it('changes nothing when everything is already done', () => {
            const once = markPatientsReviewed(emptyCaseProgress('proc-1', '2_INTAKE', T0), '2_INTAKE', { 'inv-1': ['s-1'] }, T1);
            expect(markPatientsReviewed(once, '2_INTAKE', { 'inv-1': ['s-1'] }, T1)).toBe(once);
            expect(markPatientsReviewed(once, '2_INTAKE', {}, T1)).toBe(once);
        });
    });
});
