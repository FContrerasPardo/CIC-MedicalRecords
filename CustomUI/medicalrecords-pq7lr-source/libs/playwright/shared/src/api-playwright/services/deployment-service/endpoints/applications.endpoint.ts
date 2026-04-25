/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ApplicationsListResponse, Security, CustomAPIRequest } from '../../../';
import { BaseService, RequestResponse } from '../../base.service';
import { getApplicationNameWithEnv, getEnvironmentIdForApp } from '../../../../resources';

export class ApplicationsEndpoint extends BaseService {
    private endpoint: string;
    static managePermissionEndpointRegex = /\/deployment-service\/v1\/applications\/[^/]+\/security(?:\?environmentId=.*)?$/;

    constructor(context: CustomAPIRequest, serviceUrl: string) {
        super(context);
        this.endpoint = `${serviceUrl}/v1/applications`;
    }

    async getDeployedApplicationsList(): Promise<ApplicationsListResponse | RequestResponse> {
        return this.get(`${this.endpoint}`);
    }

    async getApplicationByName(applicationName: string): Promise<any> {
        return this.get(`${this.endpoint}/${applicationName}`);
    }

    async getApplicationByDisplayName(displayName: string): Promise<any> {
        const applicationsList = await this.getDeployedApplicationsList();
        return applicationsList.list.entries.find((app) => app.entry.displayName === displayName).entry;
    }

    async getApplicationUiVariables(appDisplayName: string): Promise<Record<string, string>> {
        const app = await this.getApplicationByDisplayName(appDisplayName);
        return this.get(`${this.endpoint}/${app.descriptor.name}/variables/ui`);
    }

    async setPermissions(
        appName: string,
        usersPermissions: Security,
        adminsPermissions: Security,
        managersPermissions: Security
    ): Promise<RequestResponse> {
        const body: Security[] = [
            {
                role: 'ACTIVITI_USER',
                groups: usersPermissions.groups,
                users: usersPermissions.users,
            },
            {
                role: 'ACTIVITI_ADMIN',
                groups: adminsPermissions.groups,
                users: adminsPermissions.users,
            },
            {
                role: 'APPLICATION_MANAGER',
                groups: managersPermissions.groups,
                users: managersPermissions.users,
            },
        ];

        return this.post(`${this.endpoint}/${getApplicationNameWithEnv(appName)}/security?environmentId=${getEnvironmentIdForApp(appName)}`, {
            data: body,
        });
    }
}
