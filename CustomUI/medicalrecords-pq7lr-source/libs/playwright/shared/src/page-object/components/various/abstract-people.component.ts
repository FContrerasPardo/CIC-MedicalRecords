/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { timeouts } from '../../../utils/timeouts';
import { BaseComponent } from '../';

export abstract class AbstractPeopleComponent extends BaseComponent {
    constructor(page: Page, rootElement: string) {
        super(page, rootElement);
    }

    abstract getUsersInputLocator: Locator;
    abstract getUserOptionLocator: Locator;

    getUserByFullNameLocator = (userFullName: string) => this.getUserOptionLocator.filter({ hasText: userFullName });
    getRemoveButtonForUserLocator = (userName: string) => this.getUserByFullNameLocator(userName).locator('[data-automation-id*="-remove-"]');
    getUserChipByUsernameLocator = (username: string) => this.getElementByAutomationId(`ama-identity-people-chip-${username}`);
    getRemoveButtonByUsernameLocator = (userName: string) => this.getUserChipByUsernameLocator(userName).locator('[data-automation-id*="-remove-"]');

    async setUser(user: string): Promise<void> {
        await this.getUsersInputLocator.pressSequentially(user, { delay: timeouts.typingDelay });
    }
}
