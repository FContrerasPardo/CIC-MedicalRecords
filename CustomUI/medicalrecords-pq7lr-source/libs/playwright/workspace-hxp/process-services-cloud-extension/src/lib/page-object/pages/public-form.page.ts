/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BasePage } from '@alfresco-dbp/playwright/shared';
import { PublicFormComponent } from '../components/public-form.component';
import { Page } from '@playwright/test';

export class PublicFormPage extends BasePage {
    private static pageUrl = '';

    form = new PublicFormComponent(this.page);

    constructor(page: Page) {
        super(page, PublicFormPage.pageUrl);
    }
}
