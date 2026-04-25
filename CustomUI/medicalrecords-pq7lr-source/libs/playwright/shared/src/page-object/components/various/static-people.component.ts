/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { AbstractPeopleComponent } from './abstract-people.component';

export class StaticPeopleComponent extends AbstractPeopleComponent {
    private static rootElement = '[data-automation-id="ama-static-people-chip-list"]';

    constructor(page: Page, parentRootElement?: string) {
        super(page, parentRootElement ? `${parentRootElement} ${StaticPeopleComponent.rootElement}` : StaticPeopleComponent.rootElement);
    }

    getUsersInputLocator = this.getChild('[data-automation-id="ama-assignment-static-candidate-users-input"]');
    getUserOptionLocator = this.getChild('[data-automation-id*="ama-candidate-user-chip-"][role="option"]');
}
