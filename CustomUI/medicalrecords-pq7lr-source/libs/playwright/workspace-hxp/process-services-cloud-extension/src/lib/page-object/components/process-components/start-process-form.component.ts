/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { TaskFormComponent } from '@hxp/playwright/workspace-hxp/shared';

export class StartProcessTaskFormComponent extends TaskFormComponent {
    private static rootElement = 'adf-cloud-start-process';

    constructor(page: Page, rootElement = StartProcessTaskFormComponent.rootElement) {
        super(page, rootElement);
    }
}
