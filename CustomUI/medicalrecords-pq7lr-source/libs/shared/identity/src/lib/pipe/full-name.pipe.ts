/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform, inject } from '@angular/core';
import { SHARED_IDENTITY_FULL_NAME_PIPE_INCLUDE_EMAIL } from './full-name-email-required.token';

export interface UserLike {
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

@Pipe({
    name: 'sharedIdentityFullName',
})
export class SharedIdentityFullNamePipe implements PipeTransform {
    private includeEmail = inject(SHARED_IDENTITY_FULL_NAME_PIPE_INCLUDE_EMAIL, { optional: true }) ?? false;


    transform(user: UserLike, includeEmail?: boolean): string {
        return this.buildFullName(user, includeEmail) || this.buildFromUsernameOrEmail(user, includeEmail);
    }

    private includeEmailInFullName(includeEmail: boolean | undefined) {
        return includeEmail === undefined ? !!this.includeEmail : includeEmail;
    }

    private buildFullName(user: UserLike, includeEmail: boolean | undefined): string {
        const sharedIdentityFullName: string[] = [];
        let hasName = false;

        if (user?.firstName) {
            hasName = true;
            sharedIdentityFullName.push(user?.firstName);
        }

        if (user?.lastName) {
            hasName = true;
            sharedIdentityFullName.push(user?.lastName);
        }

        if (this.includeEmailInFullName(includeEmail) && hasName && !!user?.email) {
            sharedIdentityFullName.push(`<${user.email}>`);
        }

        return sharedIdentityFullName.join(' ');
    }

    private buildFromUsernameOrEmail(user: UserLike, includeEmail: boolean | undefined): string {
        let sharedIdentityFullName = (user?.username || user?.email) ?? '';

        if (this.includeEmailInFullName(includeEmail) && user.username && user.email) {
            sharedIdentityFullName += ` <${user.email}>`;
        }

        return sharedIdentityFullName;
    }
}
