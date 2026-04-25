/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { test as base, HxprApi } from '@alfresco-dbp/playwright/shared';
import { GovernancePage } from '../page-object/pages';

interface Pages {
    governancePage: GovernancePage;
}

interface Api {
    hxprApi: HxprApi;
}

export const test = base.extend<Pages & Api>({
    governancePage: async ({ page }, use) => {
        await use(new GovernancePage(page));
    },
    hxprApi: async ({}, use) => {
        await use(await new HxprApi().initialize());
    },
});

export { expect } from '@playwright/test';
