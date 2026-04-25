/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { HxpSearchFilterBaseComponent } from './hxp-search-filter.base.component';

export class HxpSearchDocumentLocationFilterComponent extends HxpSearchFilterBaseComponent {
    static rootElement = '.hxp-document-location-search-filter-container';

    constructor(page: Page) {
        super(page, HxpSearchDocumentLocationFilterComponent.rootElement);
    }

    private searchInput = this.getChild('.hxp-search-filter-input input');
    private searchButton = this.getChild('.hxp-search-filter-input-search');
    private searchResultsList = this.getChild('.hxp-document-location-search-filter-list');

    getTreeItem = (itemName: string): Locator => this.getChild('.hxp-document-location-search-filter-tree [role="treeitem"]', { hasText: itemName });
    getSearchResultsListItem = (itemName: string): Locator =>
        this.getChild('.hxp-document-location-search-filter-list-option', { hasText: itemName });
    getSearchResultsListItemTitle = (itemName: string): Locator =>
        this.getChild('.hxp-document-location-search-filter-list-option-title', { hasText: itemName });

    expandNode = (folderName: string): Promise<void> => this.getTreeItem(folderName).locator('button[aria-label^="DOCUMENT_TREE.TOGGLE"]').click();
    searchWithinFilter = async (query: string): Promise<void> => {
        await this.searchInput.fill(query);
        await this.searchButton.click();
        await this.searchResultsList.waitFor();
    };
}
