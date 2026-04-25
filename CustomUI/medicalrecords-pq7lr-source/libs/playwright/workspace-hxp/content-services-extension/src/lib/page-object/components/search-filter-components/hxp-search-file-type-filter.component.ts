/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { HxpSearchFilterBaseComponent } from './hxp-search-filter.base.component';

export class HxpSearchFileTypeFilterComponent extends HxpSearchFilterBaseComponent {
    static rootElement = '.hxp-file-type-search-filter-container';

    constructor(page: Page) {
        super(page, HxpSearchFileTypeFilterComponent.rootElement);
    }

    searchInput = this.getChild('.hxp-search-filter-input input');

    getFileMimeTypeParent = (labelName: string): Locator => this.getChild('.hxp-mime-type-parent-label', { hasText: labelName });
    getFileMimeTypeTreeItem = (itemName: string): Locator => this.getChild('.hxp-mime-type-description-title', { hasText: itemName });
    searchWithinFilter = async (query: string): Promise<void> => this.searchInput.pressSequentially(query);
}
