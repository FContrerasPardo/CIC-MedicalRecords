/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseComponent } from '@alfresco-dbp/playwright/shared';
import { Page } from '@playwright/test';

export class RadioButtonComponent extends BaseComponent {
    private static rootElement = 'radio-buttons-cloud-widget';

    constructor(page: Page) {
        super(page, RadioButtonComponent.rootElement);
    }

    getRadioButtonComponentById = (id: string) => this.getChild(`#${id}`);
    getRadioButtonOptionsById = (id: string) => this.getRadioButtonComponentById(id).locator('input');
}
