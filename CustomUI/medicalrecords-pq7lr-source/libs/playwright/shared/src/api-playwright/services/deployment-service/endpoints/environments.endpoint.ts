/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CustomAPIRequest } from '../../..';
import { BaseService, RequestResponse } from '../../base.service';

export class EnvironmentsEndpoint extends BaseService {
    private readonly endpoint: string;

    constructor(context: CustomAPIRequest, serviceUrl: string) {
        super(context);
        this.endpoint = `${serviceUrl}/v1/hxp/environments`;
    }

    async getEnvironments(): Promise<RequestResponse> {
        return this.get(`${this.endpoint}`);
    }

    async getEnvironmentsList(): Promise<string[]> {
        const response = await this.getEnvironments();
        const environments = await response.list?.entries;
        return environments.map((env: any) => env.entry.name);
    }

    async getEnvironmentIdByName(envName: string): Promise<string> {
        const response = await this.getEnvironments();
        const environments = await response.list?.entries;
        const environment = environments.find((env: any) => env?.entry?.name === envName);
        return environment?.entry?.id ?? null;
    }

    async getEnvironmentIds(): Promise<string[]> {
        const response = await this.getEnvironments();
        const environments = await response.list?.entries;
        return environments.map((env: any) => env.entry.id);
    }
}
