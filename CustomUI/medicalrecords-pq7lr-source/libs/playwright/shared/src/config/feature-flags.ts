/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ReportingApi } from '@reportportal/agent-js-playwright';
import { UtilFile, paths } from '../utils';
import { logger } from '../utils/node-logger';

const DEFAULT_OPTIONS: FeatureFlagOptions = {
    allFlagsMustBeOn: true,
};

export type FeatureFlagName = string;
export type TestType = 'old-functionality' | 'new-functionality';
export interface FeatureFlagOptions {
    allFlagsMustBeOn: boolean;
}

export interface TestObject {
    skip(condition: boolean, reason?: string): void;
}

export class FeatureFlags {
    /**
     * Skips or executes a test based on feature flag status
     * @param testObject - The Playwright test object
     * @param featureFlagNames - Single flag or array of flags to check. Use application-specific constants:
     *   - StudioHxpFeatureFlagNames from '@alfresco-dbp/playwright/shared-studio'
     *   - AdminHxpFeatureFlagNames from '@alfresco-dbp/playwright/shared-admin'
     *   - WorkspaceHxpFeatureFlagNames from '@alfresco-dbp/playwright/workspace-hxp'
     * @param testType - Whether testing old or new functionality
     * @param options - Configuration options for flag evaluation
     */
    static async skipOrExecuteTestBasedOnFlagStatus<TFeatureFlag extends FeatureFlagName>(
        testObject: TestObject,
        featureFlagNames: TFeatureFlag[] | TFeatureFlag,
        testType: TestType,
        options: FeatureFlagOptions = DEFAULT_OPTIONS
    ): Promise<void> {
        const flagsArray = Array.isArray(featureFlagNames) ? featureFlagNames : [featureFlagNames];

        if (flagsArray.length === 0) {
            throw new Error('No feature flags provided for test evaluation');
        }

        const featureFlagStatuses = await Promise.all(flagsArray.map((flag) => FeatureFlags.getFeatureFlagStatus(flag)));
        const information = FeatureFlags.getFlagsInfoMessage(flagsArray, testType, featureFlagStatuses, options);
        logger.info(information);
        ReportingApi.setDescription(information);

        const shouldSkip = FeatureFlags.shouldSkipTest(testType, featureFlagStatuses, options);

        if (shouldSkip) {
            await FeatureFlags.skipTestBasedOnFlagStatus(testObject, information);
        }
    }

    /**
     * Determines whether a test should be skipped based on flag statuses and test type
     */
    private static shouldSkipTest(testType: TestType, featureFlagStatuses: boolean[], options: FeatureFlagOptions): boolean {
        if (testType === 'old-functionality') {
            return featureFlagStatuses.includes(true);
        }

        if (testType === 'new-functionality') {
            return options.allFlagsMustBeOn ? featureFlagStatuses.includes(false) : featureFlagStatuses.every((status) => status === false);
        }

        return false;
    }

    /**
     * Retrieves the status of a feature flag from the configuration file
     * @param featureFlagName - The name of the feature flag to check
     * @returns Promise resolving to boolean status
     * @throws Error if flag is not found, invalid, or configuration is corrupted
     */
    private static async getFeatureFlagStatus(featureFlagName: FeatureFlagName): Promise<boolean> {
        const featureFlagJsonData = await UtilFile.readJsonFile(`${paths.rootFolder}/feature-flags.json`);

        if (!featureFlagJsonData || typeof featureFlagJsonData !== 'object') {
            throw new Error('Feature flag configuration is not a valid object');
        }

        if (Object.keys(featureFlagJsonData).length === 0) {
            throw new Error('Feature flag data list is empty');
        }

        const featureFlagStatus = featureFlagJsonData[featureFlagName];

        if (featureFlagStatus === undefined) {
            throw new Error(`Feature flag '${featureFlagName}' is not present in the Feature Flag response. Check if it's not already retired.`);
        }

        return featureFlagStatus;
    }

    private static async skipTestBasedOnFlagStatus(testObject: TestObject, information: string): Promise<void> {
        const description = `${information}`;
        testObject.skip(true, description);
    }

    private static getFlagsInfoMessage<TFeatureFlag extends FeatureFlagName>(
        featureFlagNames: TFeatureFlag[],
        testType: TestType,
        featureFlagStatuses: boolean[],
        options: FeatureFlagOptions
    ): string {
        const flagRequirement = `${options.allFlagsMustBeOn ? 'ALL' : 'AT LEAST ONE'} of the following feature flags must be ${
            testType === 'new-functionality' ? 'ON' : 'OFF'
        }`;
        const flagsState = featureFlagNames.map((flagName, index) => `${flagName}: ${featureFlagStatuses[index]}`);

        return `Test is for verifying '${testType}' and ${flagRequirement}. Flags status: [ ${flagsState.join(', ')} ]`;
    }
}
