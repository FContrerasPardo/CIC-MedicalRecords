/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, materialLocators } from '@alfresco-dbp/playwright/shared';

export class HxpDocumentListPaginatorComponent extends BaseComponent {
    static rootElement = '.hxp-document-list-paginator';

    constructor(page: Page) {
        super(page, HxpDocumentListPaginatorComponent.rootElement);
    }

    dropdownTrigger = this.getChild(materialLocators.Paginator.dropdownTrigger);

    getItemsPerPage = (itemsPage: string) => this.getChild(materialLocators.Select.value.class, { hasText: itemsPage });
    getPanelListNumber = (panelNumber: string) => this.page.getByRole('option', { name: panelNumber, exact: true });
    getPaginationRangeAction = (rangeAction: string) => this.getChild(materialLocators.Paginator.navigation(rangeAction));
}
