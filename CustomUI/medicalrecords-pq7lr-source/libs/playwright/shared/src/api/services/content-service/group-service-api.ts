/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Configuration, GroupApi, Group } from '@hylandsoftware/hxcs-js-client/cjs/index';
import { logError } from '../../utils/axios-utils';
export class GroupServiceApi {
    private groupApi: GroupApi;

    constructor(private configuration: Configuration) {
        this.groupApi = new GroupApi(this.configuration);
    }

    async getGroupId(groupName: string): Promise<string> {
        const response = await this.groupApi.searchGroups(groupName).catch((error) => {
            logError('Error in searchGroups()', error);
            throw error;
        });

        const match = response.data.find((group: Group) => group.name === groupName);
        if (!match?.id) {
            throw new Error(`Group with name "${groupName}" not found`);
        }
        return match.id;
    }
}
