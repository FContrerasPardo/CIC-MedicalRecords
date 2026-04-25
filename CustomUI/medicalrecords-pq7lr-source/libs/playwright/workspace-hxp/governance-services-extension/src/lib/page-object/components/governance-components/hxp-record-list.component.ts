/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { BaseComponent, timeouts } from '@alfresco-dbp/playwright/shared';
import { logger } from '@alfresco-dbp/playwright/shared/utils/node-logger';
import { HxpGovernanceSearchResultsComponent } from './hxp-governance-search-results.component';

export class HxpRecordListComponent extends BaseComponent {
    static readonly rootElement = '.hxp-record-list';
    searchResultComponent = new HxpGovernanceSearchResultsComponent(this.page);

    constructor(page: Page) {
        super(page, HxpRecordListComponent.rootElement);
    }

    getRowByName = (name: string | number): Locator => this.getChild('.hxp-record-list-row', { hasText: name.toString() });
    getStatusCellByRow = (name: string | number): Locator => this.getRowByName(name).locator('.hxp-governance-record-status');
    getCategoryCellByRow = (name: string | number): Locator => this.getRowByName(name).locator('.cdk-column-categoryId');
    getCheckboxByRow = (name: string | number): Locator => this.getRowByName(name).locator('.cdk-column-select');

    async findRecordAcrossPages(recordName: string | number): Promise<{ found: boolean; page: number }> {
        let currentPage = 1;
        const maxPages = 10;
        const recordNameStr = recordName.toString();

        logger.info(`🔍 Searching for record: "${recordNameStr}"`);

        while (currentPage <= maxPages) {
            logger.info(`📄 Checking page ${currentPage}...`);

            // Check if record exists on current page
            await this.searchResultComponent.tableSkeletonLoader.waitFor({ state: 'hidden' });
            const recordRow = this.getRowByName(recordNameStr);

            try {
                await recordRow.waitFor({ state: 'visible', timeout: timeouts.medium });
                logger.info(`✅ Record "${recordNameStr}" found on page ${currentPage}`);
                return { found: true, page: currentPage };
            } catch {
                logger.info(`Record not found on page ${currentPage}`);
            }

            // Try to navigate to next page
            const nextPageButton = this.searchResultComponent.nextPageButtonLocator;
            const isNextEnabled = await nextPageButton.isEnabled().catch(() => false);

            if (!isNextEnabled) {
                logger.info(`📍 Reached last page (${currentPage})`);
                break;
            }

            logger.info(`➡️ Moving to page ${currentPage + 1}`);
            const searchComplete = this.searchResultComponent.waitForSearchResponse();
            await nextPageButton.click();
            await searchComplete;
            currentPage++;
        }

        logger.info(`❌ Record "${recordNameStr}" not found after checking ${currentPage} pages`);
        return { found: false, page: currentPage };
    }

    async isRecordVisibleAcrossPages(recordName: string | number): Promise<boolean> {
        const result = await this.findRecordAcrossPages(recordName);
        return result.found;
    }
}
