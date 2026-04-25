/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { User, UserApi } from '@hylandsoftware/hxcs-js-client';
import { Observable, from } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { USER_API_TOKEN } from '@alfresco/adf-hx-content-services/api';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    protected cache: Map<string, Observable<User>> = new Map();
    private readonly userApi = inject<UserApi>(USER_API_TOKEN);

    resolveUser(id: string): Observable<User> {
        if (this.cache.has(id)) {
            return this.cache.get(id) as Observable<User>;
        }
        const user$ = from(this.userApi.getUserById(id)).pipe(
            map((res) => {
                return res.data;
            }),
            shareReplay(1)
        );
        this.cache.set(id, user$);
        return user$;
    }
}
