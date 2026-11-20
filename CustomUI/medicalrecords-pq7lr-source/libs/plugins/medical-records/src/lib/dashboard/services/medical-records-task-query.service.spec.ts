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
        // Roots by the central process mapping: every known root name to the Query service, key checked on the client.
        expect(source).toContain('processDefinitionName: [definitionName]');
        expect(source).toContain('matchProcessIdentity(record, scope.root)');
    });

    it('resolves medical-records roots and filters subprocess tasks client-side', () => {
        expect(source).toContain('ProcessListCloudService');
        expect(source).toContain('fetchProcessList');
        expect(source).toContain('fetchMedicalRecordsRootIds');
        expect(source).toContain('classifyMedicalRecordsTask(task, roots.ids, scope)');
        // One shared state per scope: the cache key depends on the widget configuration.
        expect(source).toContain('stateFor');
        expect(source).toContain('taskQueryScopeKey');
    });

    it('loads process variables from rootProcessInstanceId when present', () => {
        // Variables come from the shared (cached) ProcessVariablesService, so each instance downloads once.
        expect(source).toContain('ProcessVariablesService');
        expect(source).toContain('fetchVariables');
        expect(source).toContain('AppConfigService');
        expect(source).toContain('rootProcessInstanceId');
        expect(source).toContain('mapTaskToAttentionItem');
        expect(source).toContain('classifyMedicalRecordsTask');
    });
});
