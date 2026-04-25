/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { ProcessInstanceDataEntry } from '@alfresco-dbp/playwright/shared';
import { ProcessManagementPage } from './process-management.page';

export class ProcessDetailsPage extends ProcessManagementPage {
    private static pageUrl = 'process-details-cloud?processInstanceId=';

    constructor(page: Page) {
        super(page, ProcessDetailsPage.pageUrl);
    }

    async openProcessTaskByName(processInstance: ProcessInstanceDataEntry, taskName: string) {
        await this.navigate({ query: processInstance.id });
        await this.dataTable.waitForRootElement();
        await this.dataTable.getRowByName(taskName).first().click();
    }
}
