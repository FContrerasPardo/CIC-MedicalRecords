/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseService, CustomAPIRequest } from '@alfresco-dbp/playwright/shared/api-playwright';

export class HxPDownloadServiceApi extends BaseService {
    private endpoint: string;

    constructor(context: CustomAPIRequest) {
        super(context);
        this.endpoint = '/api/download';
    }

    async getDocumentBlob(id: string): Promise<Buffer> {
        return this.getBinary(`${this.endpoint}/${id}/sysfile_blob?inline=false`);
    }
}
