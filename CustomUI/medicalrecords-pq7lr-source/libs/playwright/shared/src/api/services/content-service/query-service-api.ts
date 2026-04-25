/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Configuration, QueryApi, Document } from '@hylandsoftware/hxcs-js-client/cjs/index';
import { logError } from '../../utils/axios-utils';
import { logger } from '../../../utils/node-logger';

export class QueryServiceApi {
    private queryApi: QueryApi;

    constructor(private configuration: Configuration) {
        this.queryApi = new QueryApi(this.configuration);
    }

    async getDocumentsByQuery(query: string): Promise<Document[]> {
        return this.queryApi
            .getDocumentsByQuery({ query })
            .then((res: any) => res.data.documents)
            .catch((error: any) => logError('Error in getDocumentsByQuery()', error));
    }

    async waitForFullTextSearchIndexing(refresh?: boolean, timeout?: number): Promise<void> {
        logger.info('Waiting for full text search indexing to complete');
        return this.queryApi
            .waitForFullTextSearchIndexing(refresh, timeout)
            .then(() => logger.info('Full text search indexing completed successfully'))
            .catch((error: any) => logError('Error in waitForFullTextSearchIndexing()', error));
    }
}
