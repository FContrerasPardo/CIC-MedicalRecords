/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SearchFilterHarness } from '../search-filter-container/search-filter-container-harness.mock';
import { MatChipSetHarness } from '@angular/material/chips/testing';
import { MatSelectionListHarness } from '@angular/material/list/testing';

export class DocumentCategorySearchFilterHarness extends SearchFilterHarness {
    getSummary = this.documentRootLocatorFactory().locatorForOptional(
        MatChipSetHarness.with({ selector: '.hxp-document-category-filter-summary-list' })
    );

    getNoResults = this.documentRootLocatorFactory().locatorForOptional('.hxp-document-category-filter-no-results');

    protected getSelectionList = this.documentRootLocatorFactory().locatorForOptional(
        MatSelectionListHarness.with({ selector: '.hxp-document-category-filter-list' })
    );

    async getSelection() {
        const selectionList = await this.getSelectionList();
        return selectionList?.getItems();
    }
}
