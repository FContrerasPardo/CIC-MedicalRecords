/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { APIResponse } from '@playwright/test';
import { CustomAPIRequest } from '../..';
import { BaseService } from '../base.service';

export class FeatureFlagsEndpoint extends BaseService {
    private endpoint: string;

    constructor(context: CustomAPIRequest, serviceUrl: string) {
        super(context);
        this.endpoint = `${serviceUrl}/v1/feature-flags`;
    }

    async getFeatureFlags(): Promise<any> {
        const response: APIResponse = await this.context.get(this.endpoint);

        if (!response.ok()) {
            throw new Error(`[Precondition] Failed to GET information about feature flags. Response: ${JSON.stringify(response, undefined, 2)}`);
        }

        return response.json();
    }
}
