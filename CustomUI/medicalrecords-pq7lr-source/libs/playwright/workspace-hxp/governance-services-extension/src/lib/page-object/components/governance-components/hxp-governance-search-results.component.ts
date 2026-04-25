/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page, Response } from '@playwright/test';
import { BaseComponent, DropdownListComponent, timeouts } from '@alfresco-dbp/playwright/shared';

export class HxpGovernanceSearchResultsComponent extends BaseComponent {
    static readonly rootElement = 'hxp-governance-records-management';
    private static readonly SEARCH_API_PATH = '/api/records/query';

    constructor(page: Page) {
        super(page, HxpGovernanceSearchResultsComponent.rootElement);
    }

    private readonly dropdown = new DropdownListComponent(this.page, '.cdk-overlay-container');

    searchButtonLocator = this.getChild('#hxp-governance-search-results-search-button');
    resetButtonLocator = this.getChild('#hxp-governance-search-results-reset-button');

    recordListLocator = this.getChild('div.hxp-record-list');
    searchResultsContainerLocator = this.getChild('.hxp-governance-search-results-container');
    searchResultsCountLocator = this.getChild('.hxp-governance-search-results-count');

    deleteActionLocator = this.getChild('[aria-label="Delete Action"]');
    selectAllButtonLocator = this.getChild('.hxp-toggle-select-all-button');
    selectionCountLocator = this.getChild('.hxp-governance-search-results-selected-count');

    paginationButtonLocator = this.getChild('.hxp-governance-table-paginator-select');

    recordListRowsLocator = this.getChild('.hxp-record-list-row');
    noSearchResultsLabel = this.getChild('.hxp-governance-search-results-no-results_label');
    tableSkeletonLoader = this.getChild('hxp-table-skeleton-loader');
    searchInitialLabel = this.getChild('.hxp-governance-search-results-initial-state_label');
    nextPageButtonLocator = this.getChild('[data-testid="next-page-button"]');

    waitForSearchResponse(): Promise<Response> {
        return this.page
            .waitForResponse((response) => response.url().includes(HxpGovernanceSearchResultsComponent.SEARCH_API_PATH), {
                timeout: timeouts.extraLarge,
            })
            .then((response) => {
                if (!response.ok()) {
                    throw new Error(`Search API returned ${response.status()} ${response.statusText()}: ${response.url()}`);
                }
                return response;
            });
    }

    async changePageSize(pageSize: string) {
        const currentText = await this.paginationButtonLocator.textContent();
        if (currentText?.trim() === pageSize) {
            return;
        }
        await this.tableSkeletonLoader.waitFor({ state: 'hidden' });
        await this.paginationButtonLocator.click();
        const searchComplete = this.waitForSearchResponse();
        await this.dropdown.getOptionLocator(pageSize).click();
        await searchComplete;
        await this.tableSkeletonLoader.waitFor({ state: 'hidden' });
    }
}
