/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, materialLocators, timeouts } from '@alfresco-dbp/playwright/shared';
import { HxpSearchResultsHeaderComponent } from './hxp-search-results-header.component';

export class HxpSearchInputComponent extends BaseComponent {
    static rootElement = '.hxp-search-input';

    header = new HxpSearchResultsHeaderComponent(this.page);

    constructor(page: Page) {
        super(page, HxpSearchInputComponent.rootElement);
    }

    searchInput = this.getChild(materialLocators.Input.class);

    search = async (fileNamePrefix: string) => {
        await this.searchInput.fill(fileNamePrefix);
        await this.header.searchButton.click({ timeout: timeouts.medium });
    };
}
