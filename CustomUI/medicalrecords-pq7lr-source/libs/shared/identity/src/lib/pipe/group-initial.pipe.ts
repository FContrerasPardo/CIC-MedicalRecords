/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';
import { IdentityGroupModel } from '../models/identity-group.model';

@Pipe({
    name: 'groupNameInitial',
})
export class InitialGroupNamePipe implements PipeTransform {
    transform(group: IdentityGroupModel): string {
        let result = '';
        if (group) {
            result = this.getInitialGroupName(group.name).toUpperCase();
        }
        return result;
    }

    getInitialGroupName(groupName: string) {
        groupName = groupName ? groupName[0] : '';
        return groupName;
    }
}
