/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SearchFilterHarness } from '../search-filter-container/search-filter-container-harness.mock';
import { MatChipSetHarness } from '@angular/material/chips/testing';

export class FileTypeSearchFilterHarness extends SearchFilterHarness {
    protected getFilterSummary = this.documentRootLocatorFactory().locatorForOptional(
        MatChipSetHarness.with({ selector: '.hxp-file-type-search-filter-summary-list' })
    );

    async getSummaryItems() {
        const chipList = await this.getFilterSummary();
        return chipList?.getChips();
    }
}
