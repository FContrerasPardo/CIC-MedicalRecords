import { readFileSync } from 'fs';
import { join } from 'path';

describe('MedicalRecordsBulkTaskService', () => {
    const source = readFileSync(join(__dirname, 'medical-records-bulk-task.service.ts'), 'utf8');

    it('evaluates selection and completes eligible tasks serially', () => {
        expect(source).toContain('MedicalRecordsBulkTaskService');
        expect(source).toContain('evaluateSelection');
        expect(source).toContain('evaluateSelectionFresh');
        expect(source).toContain('completeEligible');
        expect(source).toContain('evaluateTaskEligibility');
        expect(source).toContain('concatMap');
    });

    it('claims CREATED tasks and completes with CompleteTaskPayload', () => {
        expect(source).toContain('TaskCloudService');
        expect(source).toContain('FormCloudService');
        expect(source).toContain('claimTask');
        expect(source).toContain("payloadType: 'CompleteTaskPayload'");
        expect(source).toContain('completeTaskForm');
        expect(source).toContain('loadAttentionItems');
    });
});
