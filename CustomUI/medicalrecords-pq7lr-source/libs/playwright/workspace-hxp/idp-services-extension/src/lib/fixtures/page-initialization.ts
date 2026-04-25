/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { test as base, getDeployedApp, HxprApi, IdpService, QueryService } from '@alfresco-dbp/playwright/shared';
import { ClassificationPage, FieldVerificationPage } from '../page-object/pages';
import { IdpRuntimeBundleService } from '../services';
import { IdpBatchStateSnapshotInitializer } from '../utils/idp-batch-state-snapshots';
import { TemporaryUploadFolder } from '../utils/temporary-upload-folder';
import { TaskDetailsPage } from '@hxp/playwright/workspace-hxp/shared';
import { TaskSearchMock } from '../mocks';

interface Pages {
    idpClassificationPage: ClassificationPage;
    fieldVerificationPage: FieldVerificationPage;
    taskDetailsPage: TaskDetailsPage;
}

interface Api {
    hxprApi: HxprApi;
    idpServiceHrUser: IdpService;
    idpBatchStateSnapshotInitializer: IdpBatchStateSnapshotInitializer;
    runtimeBundleServiceHrUser: IdpRuntimeBundleService;
    queryServiceHrUser: QueryService;
    taskSearchMock: TaskSearchMock;
}

interface Resources {
    uploadStore: TemporaryUploadFolder;
}

export const test = base.extend<Pages & Api & Resources>({
    taskDetailsPage: async ({ page }, use) => {
        await use(new TaskDetailsPage(page));
    },
    fieldVerificationPage: async ({ page }, use) => {
        await use(new FieldVerificationPage(page));
    },
    idpClassificationPage: async ({ page }, use) => {
        await use(new ClassificationPage(page));
    },
    hxprApi: async ({}, use) => {
        await use(await new HxprApi().initialize());
    },
    uploadStore: [
        async ({}, use) => {
            const hxprApi = await new HxprApi().initialize();
            const uploadStore = await TemporaryUploadFolder.create(hxprApi);
            await use(uploadStore)
                .finally(() => hxprApi.initialize()) // In case of token expiration before disposing
                .finally(() => uploadStore[Symbol.asyncDispose]()); // eslint doesn't seem to understand `await using` yet...
        },
        { scope: 'worker' },
    ],
    idpServiceHrUser: async ({ hrUserApiContext }, use) => {
        const idpService = new IdpService(hrUserApiContext);
        await use(idpService);
    },
    idpBatchStateSnapshotInitializer: async ({ uploadStore, idpServiceHrUser: idpService, hxprApi }, use) => {
        const batchStateSnapshotInitializer = new IdpBatchStateSnapshotInitializer(uploadStore, idpService, hxprApi);
        await use(batchStateSnapshotInitializer);
    },
    runtimeBundleServiceHrUser: async ({ hrUserApiContext }, use, workerInfo) => {
        const { appName } = getDeployedApp(workerInfo);
        await use(new IdpRuntimeBundleService(hrUserApiContext, appName));
    },
    queryServiceHrUser: async ({ hrUserApiContext }, use, workerInfo) => {
        const { appName } = getDeployedApp(workerInfo);
        await use(new QueryService({ context: hrUserApiContext, appName: appName }));
    },
    taskSearchMock: async ({ page }, use) => {
        await use(new TaskSearchMock(page));
    },
});

export { expect } from '@playwright/test';
