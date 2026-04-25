/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    test as base,
    getDeployedApp,
    HxpLoginPage,
    HxprApi,
    QueryService,
    RuntimeBundleService,
    PreferenceMock,
} from '@alfresco-dbp/playwright/shared';
import { TaskDetailsPage } from '@hxp/playwright/workspace-hxp/shared';
import { TasksPage, ProcessPage, StartProcessPage, CustomUiPage, ProcessDetailsPage, PublicFormPage } from '../page-object/pages';

interface Pages {
    tasksPage: TasksPage;
    processPage: ProcessPage;
    customUiPage: CustomUiPage;
    startProcessPage: StartProcessPage;
    taskDetailsPage: TaskDetailsPage;
    hxpIdpLoginPage: HxpLoginPage;
    processDetailsPage: ProcessDetailsPage;
    publicFormPage: PublicFormPage;
}

interface Api {
    hxprApi: HxprApi;
    hxprApiRepoAdmin: HxprApi;
    runtimeBundleServiceHrUser: RuntimeBundleService;
    runtimeBundleServiceRepoAdmin: RuntimeBundleService;
    queryServiceHrUser: QueryService;
    preferenceMock: PreferenceMock;
}

export const test = base.extend<Pages & Api>({
    tasksPage: async ({ page }, use) => {
        await use(new TasksPage(page));
    },
    processPage: async ({ page }, use) => {
        await use(new ProcessPage(page));
    },
    startProcessPage: async ({ page }, use) => {
        await use(new StartProcessPage(page));
    },
    taskDetailsPage: async ({ page }, use) => {
        await use(new TaskDetailsPage(page));
    },
    hxpIdpLoginPage: async ({ page }, use) => {
        await use(new HxpLoginPage(page));
    },
    customUiPage: async ({ page }, use) => {
        await use(new CustomUiPage(page));
    },
    processDetailsPage: async ({ page }, use) => {
        await use(new ProcessDetailsPage(page));
    },
    hxprApi: async ({}, use) => {
        await use(await new HxprApi().initialize());
    },
    hxprApiRepoAdmin: async ({ repoAdminContentApiContext }, use) => {
        const hxprApi = new HxprApi();
        await hxprApi.initializeWithContext(repoAdminContentApiContext);
        await use(hxprApi);
    },
    preferenceMock: async ({ page }, use) => {
        await use(new PreferenceMock(page));
    },
    publicFormPage: async ({ page }, use) => {
        await use(new PublicFormPage(page));
    },
    runtimeBundleServiceHrUser: async ({ hrUserApiContext }, use, workerInfo) => {
        const { appName } = getDeployedApp(workerInfo);
        await use(new RuntimeBundleService(hrUserApiContext, appName));
    },
    runtimeBundleServiceRepoAdmin: async ({ repoAdminApiContext }, use, workerInfo) => {
        const { appName } = getDeployedApp(workerInfo);
        await use(new RuntimeBundleService(repoAdminApiContext, appName));
    },
    queryServiceHrUser: async ({ hrUserApiContext }, use, workerInfo) => {
        const { appName } = getDeployedApp(workerInfo);
        await use(new QueryService({ context: hrUserApiContext, appName: appName }));
    },
});

export { expect } from '@playwright/test';
