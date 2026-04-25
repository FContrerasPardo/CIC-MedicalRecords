/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { test } from '@playwright/test';
import { ProcessInstanceData, RequestResponse, RuntimeBundleService } from '@alfresco-dbp/playwright/shared';

export class IdpRuntimeBundleService extends RuntimeBundleService {
    async waitForUserTask(processInstance: ProcessInstanceData | RequestResponse): Promise<any> {
        const tasks = await this.processInstance.waitAndGetTasksByProcessInstanceId(processInstance.entry.id, { retry: 30 });
        const value = await this.processInstance.getProcessVariable(processInstance.entry.id, 'batchState');
        await test.info().attach('batchState.json', { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
        return tasks;
    }
}
