/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContextFactory, DeploymentService } from '../api-playwright';
import { getUsers } from '../config';
import { getApplicationNameWithEnv, getDeployedApp } from '../resources';
import { logger } from '../utils/node-logger';

export class CheckEnvBeforeTesting {
    private static checkerPrefix = '\n\n[ 🎭 Playwright Env-checker ]';
    private static formatError(message: string) {
        return `\n\n[ 🎭 Playwright Env-checker ] \u001B[31m${message}\u001B[0m`;
    }

    static async checkEnvironmentIsUp(): Promise<void> {
        try {
            const { superadmin } = getUsers();
            await ContextFactory.getContextByUser(superadmin);
        } catch {
            const errorMessage = 'Check the env! Looks like it\'s down!';
            throw new Error(this.formatError(errorMessage));
        }
    }

    static async getDeployedAppsStatus(appName: string): Promise<string | number> {
        const { superadmin } = getUsers();
        const superadminApiContext = await ContextFactory.getContextByUser(superadmin);
        const deploymentServiceSuperadmin = new DeploymentService(superadminApiContext);
        const defaultAppName = getApplicationNameWithEnv(appName);
        const deployedApp = await deploymentServiceSuperadmin.applications.getApplicationByName(defaultAppName);

        return deployedApp.status;
    }

    static async checkAppsAreDeployed(projectConfig: any): Promise<void> {
        const defaultApp = getDeployedApp(projectConfig);
        const deployedAppStatus = await this.getDeployedAppsStatus(defaultApp.appName);

        if (deployedAppStatus === 404) {
            const errorMessage = `App "${defaultApp.appName}" is missing on env. Playwright stopped tests execution! Check the env!`;
            throw new Error(this.formatError(errorMessage));
        } else if (deployedAppStatus === 'DeploymentFailed') {
            const errorMessage = `App "${defaultApp.appName}" is in Deployment Failed status. Playwright stopped tests execution! Check the env!`;
            throw new Error(this.formatError(errorMessage));
        } else if (deployedAppStatus !== 'Deployed') {
            logger.warn(
                `${this.checkerPrefix} App ${defaultApp.appName} is present in the environment, but it's in status ${deployedAppStatus}, it might affect test results`
            );
        }
    }
}
