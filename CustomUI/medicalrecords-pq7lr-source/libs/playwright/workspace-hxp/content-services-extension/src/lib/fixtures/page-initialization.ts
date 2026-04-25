/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { test as base, HxprApi } from '@alfresco-dbp/playwright/shared';
import { ContentBrowserPage, SearchPage } from '../page-object/pages';
import { DocumentMock } from '../mocks';

interface Pages {
    contentBrowserPage: ContentBrowserPage;
    searchPage: SearchPage;
}

interface Api {
    hxprApi: HxprApi;
    documentMock: DocumentMock;
}

export const test = base.extend<Pages & Api>({
    contentBrowserPage: async ({ page }, use) => {
        await use(new ContentBrowserPage(page));
    },
    searchPage: async ({ page }, use) => {
        await use(new SearchPage(page));
    },
    hxprApi: async ({}, use) => {
        await use(await new HxprApi().initialize());
    },
    documentMock: async ({ page }, use) => {
        await use(new DocumentMock(page));
    },
});

export { expect } from '@playwright/test';
