/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import path from 'node:path';
import { paths, timeouts } from '../utils';
import { ReporterDescription } from '@playwright/test';
import { getReportPortalConfig } from './report-portal.config';
import { CustomConfig } from '../model';
import { getApplicationNameWithEnv } from '../resources';
import { logger } from './../utils/node-logger';

const { env } = process;

export const AppNames = {
    AdminHxp: 'admin-hxp',
    HxPStudio: 'studio-hxp',
    HxpStudioIdp: 'studio-hxp-idp',
    WorkspaceHxP: 'workspace-hxp',
    WorkspaceHxPIdp: 'workspace-hxp-idp',
    WorkspaceHxPGovernance: 'workspace-hxp-governance',
    WorkspaceHxPContent: 'workspace-hxp-content',
    HxViewer: 'hxviewer',
} as const;

export type AppNames = typeof AppNames[keyof typeof AppNames];

export const distPaths: Readonly<Record<AppNames, string>> = {
    'admin-hxp': process.env.ADMIN_HXP_DIST_PATH,
    'studio-hxp': process.env.HXP_STUDIO_DIST_PATH,
    'studio-hxp-idp': process.env.HXP_STUDIO_DIST_PATH,
    'workspace-hxp': process.env.WORKSPACE_HXP_DIST_PATH,
    'workspace-hxp-idp': process.env.WORKSPACE_HXP_DIST_PATH,
    'workspace-hxp-governance': process.env.WORKSPACE_HXP_DIST_PATH,
    'workspace-hxp-content': process.env.WORKSPACE_HXP_DIST_PATH,
    hxviewer: process.env.HXVIEWER_DIST_PATH,
};

export const DEFAULT_LOCALE = 'en-US';

export function reduceAppName(appName: AppNames): AppNames {
    if (appName === AppNames.WorkspaceHxPIdp || appName === AppNames.WorkspaceHxPGovernance || appName === AppNames.WorkspaceHxPContent) {
        return AppNames.WorkspaceHxP;
    }

    if (appName === AppNames.HxpStudioIdp) {
        return AppNames.HxPStudio;
    }

    return appName;
}

export const getBaseUrl = (use: Partial<CustomConfig>): string => {
    const isLocalhost = /localhost/.exec(env.PLAYWRIGHT_E2E_HOST || '');
    const isPortProvided = !!env.PLAYWRIGHT_E2E_PORT;

    if (isLocalhost && isPortProvided) {
        logger.debug(`💻 Using localhost app: ${env.PLAYWRIGHT_E2E_HOST}:${env.PLAYWRIGHT_E2E_PORT}`);
        return `${env.PLAYWRIGHT_E2E_HOST}:${env.PLAYWRIGHT_E2E_PORT}`;
    }

    if (use.remoteRoutePath) {
        const baseUrl = use.hxpModelingProjectName
            ? `${process.env.APP_CONFIG_BPM_HOST}/${getApplicationNameWithEnv(use.hxpModelingProjectName)}/${use.remoteRoutePath}`
            : `${process.env.APP_CONFIG_BPM_HOST}/${use.remoteRoutePath}`;
        logger.debug(`☁️ Using as a base, remote URL: ${baseUrl}`);
        return baseUrl;
    }

    logger.warn("❌ Missing remoteRoutePath in project playwright config! Add it, otherwise you won't be able to run the tests!");
    return '';
};

export const webServer = (appName: AppNames) => {
    return {
        command: getStartCommandServer(appName),
        // It's true, but watch on on localhost! If you'll have other app up and running then it'll use this app to run the tests.
        // It won't check what application is currently running.
        reuseExistingServer: true,
        timeout: timeouts.webServer,
        port: Number(env.PLAYWRIGHT_E2E_PORT),
        cwd: process.cwd(),
    };
};

export const getReporter = (appName: AppNames, isHxp: boolean): ReporterDescription[] =>
    env.CI
        ? [['@reportportal/agent-js-playwright', getReportPortalConfig(appName, isHxp)], ['github']]
        : [['html', { outputFolder: paths.report, open: 'on-failure' }]];

function getStartCommandServer(appName: AppNames): string {
    appName = reduceAppName(appName);
    const resolvePaths = (toFile: string) => path.resolve(process.cwd(), toFile);

    if (env.CI) {
        const applicationDistPath = resolvePaths(distPaths[appName]);
        return `http-server ${applicationDistPath} -p ${Number(env.PLAYWRIGHT_E2E_PORT)} -s`;
    }

    return `npm start ${appName}`;
}
