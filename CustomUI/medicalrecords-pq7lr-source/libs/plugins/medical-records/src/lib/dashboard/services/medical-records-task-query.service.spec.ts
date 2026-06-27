import { readFileSync } from 'fs';
import { join } from 'path';

describe('MedicalRecordsTaskQueryService', () => {
    const source = readFileSync(join(__dirname, 'medical-records-task-query.service.ts'), 'utf8');

    it('queries open tasks through TaskListCloudService with CREATED and ASSIGNED statuses', () => {
        expect(source).toContain('TaskListCloudService');
        expect(source).toContain('TaskListRequestModel');
        expect(source).toContain('fetchTaskList');
        expect(source).toContain("status: ['ASSIGNED']");
        expect(source).toContain("status: ['CREATED']");
        expect(source).toContain('IdentityUserService');
        expect(source).toContain('assignee');
        expect(source).not.toContain('processDefinitionName: [this.processDefinitionKey]');
        expect(source).toContain("processDefinitionKey = 'medical-records'");
    });

    it('resolves medical-records roots and filters subprocess tasks client-side', () => {
        expect(source).toContain('ProcessListCloudService');
        expect(source).toContain('fetchProcessList');
        expect(source).toContain('fetchMedicalRecordsRootIds');
        expect(source).toContain('matchesMedicalRecordsTask(entry, rootIds)');
    });

    it('loads process variables from rootProcessInstanceId when present', () => {
        expect(source).toContain('AdfHttpClient');
        expect(source).toContain('AppConfigService');
        expect(source).toContain('rootProcessInstanceId');
        expect(source).toContain('/process-instances/');
        expect(source).toContain('/variables');
        expect(source).toContain('mapTaskToAttentionItem');
        expect(source).toContain('matchesMedicalRecordsTask');
    });
});
