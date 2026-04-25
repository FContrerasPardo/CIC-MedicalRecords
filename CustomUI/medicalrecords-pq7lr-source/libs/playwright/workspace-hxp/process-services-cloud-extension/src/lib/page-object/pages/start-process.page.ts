/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { StartProcessTaskFormComponent, StartProcessHeaderComponent, StartProcessFooterComponent } from '../components';
import { HomePage, HxpAttachFileDialogComponent } from '@hxp/playwright/workspace-hxp/shared';

export class StartProcessPage extends HomePage {
    private static pageUrl = 'start-process-cloud';

    taskForm = new StartProcessTaskFormComponent(this.page);
    startProcessHeader = new StartProcessHeaderComponent(this.page);
    startProcessFooter = new StartProcessFooterComponent(this.page);
    attachFileDialog = new HxpAttachFileDialogComponent(this.page);

    constructor(page: Page) {
        super(page, StartProcessPage.pageUrl);
    }

    async openAttachmentFormByName(labelName: string): Promise<void> {
        await this.taskForm.getFieldButton(labelName, 'Attach').click();
        await this.attachFileDialog.waitForRootElement();
    }
}
