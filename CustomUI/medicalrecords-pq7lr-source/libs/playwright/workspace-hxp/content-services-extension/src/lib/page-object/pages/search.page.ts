/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BasePage, DatePicker, MatPaginatorComponent } from '@alfresco-dbp/playwright/shared';
import { Page } from '@playwright/test';
import {
    HxpSearchFiltersComponent,
    HxpSearchCreatedDateFilterComponent,
    HxpSearchResultsComponent,
    HxpSearchManageColumnsComponent,
    HxpSearchDocumentCategoryFilterComponent,
    HxpSearchDocumentLocationFilterComponent,
    HxpSearchFileTypeFilterComponent,
} from '../components';

export class SearchPage extends BasePage {
    private static pageUrl = '/search';

    searchResults = new HxpSearchResultsComponent(this.page);
    searchResultListPaginatorComponent = new MatPaginatorComponent(this.page);
    searchFilters = new HxpSearchFiltersComponent(this.page);
    createdDateFilter = new HxpSearchCreatedDateFilterComponent(this.page);
    manageColumns = new HxpSearchManageColumnsComponent(this.page);
    datePicker = new DatePicker(this.page);
    categoryFilter = new HxpSearchDocumentCategoryFilterComponent(this.page);
    locationFilter = new HxpSearchDocumentLocationFilterComponent(this.page);
    fileTypeFilter = new HxpSearchFileTypeFilterComponent(this.page);

    constructor(page: Page) {
        super(page, SearchPage.pageUrl);
    }
}
