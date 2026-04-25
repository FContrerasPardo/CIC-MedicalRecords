/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { expect, Locator, Page } from '@playwright/test';
import {
    HxpGovernanceSearchResultsComponent,
    HxpGovernanceSearchDataSourceFilterComponent,
    HxpGovernanceSearchCategoryFilterComponent,
    HxpGovernanceSearchCutoffDateFilterComponent,
    HxpGovernanceSearchDispositionDateFilterComponent,
    HxpGovernanceSearchStatusFilterComponent,
    HxpGovernanceSearchModifierFilterComponent,
    HxpGovernanceSearchCreatorFilterComponent,
    HxpGovernanceSearchContentIdFilterComponent,
    HxpGovernanceMultiSelectionFilterComponent,
    HxpGovernanceSearchFilterOverlayComponent,
    HxpRecordListComponent,
    HxpGovernanceSearchRecordNameFilterComponent,
    HxpGovernanceSearchResultsActionsComponent,
    HxpRecordPropertiesSidebarComponent,
    HxpDatepickerActionsContainerComponent,
    HxpGovernanceManagementTabsComponent,
    HxpDashboardManagementComponent,
} from '../components/governance-components';
import { HomePage } from '@hxp/playwright/workspace-hxp/shared';
import { timeouts } from '@alfresco-dbp/playwright/shared';
import { logger } from '@alfresco-dbp/playwright/shared/utils/node-logger';

export class GovernancePage extends HomePage {
    private static readonly pageUrl = 'governance/dashboard';

    constructor(page: Page) {
        super(page, GovernancePage.pageUrl);
    }

    searchResults = new HxpGovernanceSearchResultsComponent(this.page);
    dataSourceSearchFilter = new HxpGovernanceSearchDataSourceFilterComponent(this.page);
    categoryFilter = new HxpGovernanceSearchCategoryFilterComponent(this.page);
    cutoffDateFilter = new HxpGovernanceSearchCutoffDateFilterComponent(this.page);
    dispositionDateFilter = new HxpGovernanceSearchDispositionDateFilterComponent(this.page);
    statusFilter = new HxpGovernanceSearchStatusFilterComponent(this.page);
    modifierFilter = new HxpGovernanceSearchModifierFilterComponent(this.page);
    creatorFilter = new HxpGovernanceSearchCreatorFilterComponent(this.page);
    contentIdFilter = new HxpGovernanceSearchContentIdFilterComponent(this.page);
    multiSelectionFilter = new HxpGovernanceMultiSelectionFilterComponent(this.page);
    overlayActions = new HxpGovernanceSearchFilterOverlayComponent(this.page);
    recordList = new HxpRecordListComponent(this.page);
    recordNameFilter = new HxpGovernanceSearchRecordNameFilterComponent(this.page);
    searchResultsActions = new HxpGovernanceSearchResultsActionsComponent(this.page);
    recordPropertiesSidebar = new HxpRecordPropertiesSidebarComponent(this.page);
    datePickerActions = new HxpDatepickerActionsContainerComponent(this.page);
    governanceManagementTabs = new HxpGovernanceManagementTabsComponent(this.page);
    dashboardManagement = new HxpDashboardManagementComponent(this.page);

    async checkForRecord(recordName: string, timeout: number = timeouts.extraLarge): Promise<boolean> {
        const recordNameStr = recordName.toString();

        try {
            await expect
                .poll(
                    async () => {
                        try {
                            // Apply record name filter
                            if (await this.searchResults.resetButtonLocator.isEnabled()) {
                                await this.searchResults.resetButtonLocator.click();
                            }
                            await this.recordNameFilter.recordNameFilterLocator.click();
                            await this.overlayActions.recordNameInputLocator.fill(recordNameStr);
                            const searchComplete = this.searchResults.waitForSearchResponse();
                            await this.overlayActions.applyButton.click();
                            await searchComplete;
                            const recordRow = this.recordList.getRowByName(recordNameStr);
                            await recordRow.waitFor({ state: 'visible', timeout: timeouts.default });
                            return true;
                        } catch {
                            return false;
                        }
                    },
                    {
                        timeout: timeout,
                        intervals: [timeouts.medium],
                    }
                )
                .toBe(true);

            return true;
        } catch {
            logger.info(`❌ Record "${recordNameStr}" not found within ${timeout}ms`);
            return false;
        }
    }

    /**
     * Applies a search filter and waits for the search results to update.
     *
     * @param filterLocator - Locator for the filter trigger element to open the overlay.
     * @param optionLabel - Visible label of the option to select within the filter overlay.
     * @param useListItem - When true, selects via mat-selection-list item (date-based filters).
     *                      When false (default), selects via checkbox (category, status, etc.).
     */
    async applySearchFilter(filterLocator: Locator, optionLabel: string, useListItem = false) {
        await filterLocator.click();
        const selector = useListItem
            ? this.multiSelectionFilter.matSelectionList.getListItemByLabel(optionLabel)
            : this.multiSelectionFilter.matSelectionList.getCheckboxByLabel(optionLabel);
        await selector.click();
        const searchComplete = this.searchResults.waitForSearchResponse();
        await this.overlayActions.applyButton.click();
        await searchComplete;
    }

    async applyRecordNameFilter(recordName: string) {
        await this.recordNameFilter.recordNameFilterLocator.click();
        await this.overlayActions.recordNameInputLocator.fill(recordName);
        const searchComplete = this.searchResults.waitForSearchResponse();
        await this.overlayActions.applyButton.click();
        await searchComplete;
    }

    async navigateToRecordsManagement() {
        await this.navigate();
        await this.governanceManagementTabs.recordsManagementTab.click();
        await this.searchResults.searchInitialLabel.waitFor();
    }

    async resetFilters() {
        await this.searchResults.resetButtonLocator.click();
        await this.searchResults.searchInitialLabel.waitFor();
    }
}
