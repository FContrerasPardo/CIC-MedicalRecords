/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { ProcessManagementPage } from './';
import { DataTableComponent } from '@alfresco-dbp/playwright/shared';

export class ProcessPage extends ProcessManagementPage {
    private static pageUrl = '/process-list-cloud';

    dataTable = new DataTableComponent(this.page);

    constructor(page: Page) {
        super(page, ProcessPage.pageUrl);
    }
}
