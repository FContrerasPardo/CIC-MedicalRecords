/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpPageListItemComponent extends BaseComponent {
    constructor(page: Page, index: number) {
        const rootElement = `[data-automation-id=idp-list-item-page__${index}]`;
        super(page, rootElement);
    }
}
