/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { AbstractGroupComponent } from './abstract-group.component';

export class StaticGroupComponent extends AbstractGroupComponent {
    private static rootElement = '[data-automation-id="ama-static-groups-chip-list"]';

    constructor(page: Page, parentRootElement?: string) {
        super(page, parentRootElement ? `${parentRootElement} ${StaticGroupComponent.rootElement}` : StaticGroupComponent.rootElement);
    }

    groupsInputLocator = this.getChild('[data-automation-id="ama-assignment-static-candidate-groups-input"]');
    getGroupOptionLocator = this.getChild('[data-automation-id*="ama-candidate-group-chip"][role="option"]');
}
