/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Configuration, DocumentApi, DownloadApi } from '@hylandsoftware/hxcs-js-client/cjs/index';
import { DocumentServiceApi } from './services/content-service/document-service-api';
import { UploadServiceApi } from './services/content-service/upload-service-api';
import { QueryServiceApi } from './services/content-service/query-service-api';
import { GroupServiceApi } from './services/content-service/group-service-api';
import { CheckInServiceApi } from './services/content-service/check-in-service-api';
import { HxPDownloadServiceApi } from './services/content-service/download-service-api';
import { UserServiceApi } from './services/content-service/user-service-api';
import { Page } from '@playwright/test';
import { getAuthToken } from 'scripts/utils/get-auth-token';
import { ApiUtils } from '../api-playwright/utils/api-utils';
import { logger } from '../utils/node-logger';
import { CustomAPIRequest } from '../api-playwright';

export const validateResponse = async (page: Page, endpoint: string, expectedStatus: number) => {
    const response = await page.waitForResponse((resp) => resp.url().endsWith(endpoint));
    const status = response.status();
    const responseText = await response.text();

    if (status !== expectedStatus) {
        const statusText = response.statusText();
        throw new Error(`Request to "${endpoint}" failed with status ${status} (${statusText}): ${responseText}`);
    }

    return JSON.parse(responseText);
};

export class HxprApi {
    configuration: Configuration;
    documentApi: DocumentApi;
    downloadApi: DownloadApi;
    downloadServiceApi!: HxPDownloadServiceApi;
    documentServiceApi!: DocumentServiceApi;
    queryServiceApi!: QueryServiceApi;
    uploadServiceApi!: UploadServiceApi;
    groupServiceApi!: GroupServiceApi;
    checkInServiceApi!: CheckInServiceApi;
    userServiceApi!: UserServiceApi;
    accessToken = '';

    async initialize(): Promise<HxprApi> {
        this.configuration = new Configuration({
            basePath: process.env['APP_CONFIG_ECM_HOST'],
            accessToken: await getAuthToken(),
        });
        this.downloadApi = new DownloadApi(this.configuration);
        this.documentServiceApi = new DocumentServiceApi(this.configuration);
        this.queryServiceApi = new QueryServiceApi(this.configuration);
        this.uploadServiceApi = new UploadServiceApi(this.configuration);
        this.groupServiceApi = new GroupServiceApi(this.configuration);
        this.checkInServiceApi = new CheckInServiceApi(this.configuration);
        this.userServiceApi = new UserServiceApi(this.configuration);
        return this;
    }

    async waitForDocumentToBeIndexed(documents: Record<string, string | undefined>[]): Promise<void> {
        if (documents.length === 0) {
            return;
        }

        const perDocQueries = documents.map((doc) => {
            const definedEntries = Object.entries(doc).filter((entry): entry is [string, string] => entry[1] !== undefined);
            if (definedEntries.length === 0) {
                throw new Error(`Cannot query for a document with no defined properties: ${JSON.stringify(doc)}`);
            }
            const escaped = (value: string) => value.replaceAll("'", "\\'");
            return `(${definedEntries.map(([key, value]) => `${key} = '${escaped(value)}'`).join(' AND ')})`;
        });
        const query = perDocQueries.join(' OR ');
        const documentsSummary = JSON.stringify(documents);
        return ApiUtils.waitForApi(
            () => this.queryServiceApi.getDocumentsByQuery(query),
            (results) => {
                const resultList = results ?? [];
                const missingDocs = documents.filter((doc) => {
                    const definedEntries = Object.entries(doc).filter((entry): entry is [string, string] => entry[1] !== undefined);
                    return !resultList.some((result) => definedEntries.every(([key, value]) => result[key] === value));
                });
                if (missingDocs.length === 0) {
                    logger.info('All Docs have been indexed');
                    return true;
                }
                logger.info(`Documents not indexed yet: ${JSON.stringify(missingDocs)}`);
                return false;
            },
            {
                waitingMessage: `Waiting for documents to be indexed: ${documentsSummary}`,
                errorMessage: `Documents were not indexed within the expected time: ${documentsSummary}`,
            }
        );
    }

    async waitForFullTextSearchIndexing(refresh?: boolean, timeout?: number): Promise<void> {
        return this.queryServiceApi.waitForFullTextSearchIndexing(refresh, timeout);
    }

    async initializeWithContext(apiContext: CustomAPIRequest): Promise<HxprApi> {
        this.configuration = new Configuration({
            basePath: process.env['APP_CONFIG_ECM_HOST'],
            accessToken: apiContext.token,
        });
        this.downloadServiceApi = new HxPDownloadServiceApi(apiContext);
        this.documentServiceApi = new DocumentServiceApi(this.configuration);
        return this;
    }
}
