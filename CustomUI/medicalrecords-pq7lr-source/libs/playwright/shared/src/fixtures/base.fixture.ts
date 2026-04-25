/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { test as base } from '@playwright/test';
import { getUsers, type Users } from '../config';
import { AlfrescoIdentityServiceLoginPage, HxpLoginPage } from '../page-object';
import { subscribeToLogErrors } from '../utils';
import { CustomConfig } from '../model';
import { FeatureFlagName, FeatureFlagOptions, FeatureFlags, TestType } from '../config/feature-flags';

export type TestPurpose = TestType;
export interface TestOptions {
    usersData: Users;
    skipOrExecuteTestBasedOnFlagStatus: <TFeatureFlag extends FeatureFlagName>(
        testObject: any,
        featureFlagNames: TFeatureFlag[] | TFeatureFlag,
        testPurpose: TestPurpose,
        options?: FeatureFlagOptions
    ) => Promise<void>;
}

export interface PageInitialization {
    alfrescoIdentityServiceLoginPage: AlfrescoIdentityServiceLoginPage;
    hxpIdpLoginPage: HxpLoginPage;
}

export const test = base.extend<TestOptions & PageInitialization & CustomConfig>({
    usersData: getUsers(),

    skipOrExecuteTestBasedOnFlagStatus: async ({}, use) => {
        await use(FeatureFlags.skipOrExecuteTestBasedOnFlagStatus);
    },
    alfrescoIdentityServiceLoginPage: async ({ page }, use) => {
        await use(new AlfrescoIdentityServiceLoginPage(page));
    },
    hxpIdpLoginPage: async ({ page }, use) => {
        await use(new HxpLoginPage(page));
    },
    page: async ({ page }, use) => {
        subscribeToLogErrors(page);
        await use(page);
    },
});

export { expect } from '@playwright/test';
