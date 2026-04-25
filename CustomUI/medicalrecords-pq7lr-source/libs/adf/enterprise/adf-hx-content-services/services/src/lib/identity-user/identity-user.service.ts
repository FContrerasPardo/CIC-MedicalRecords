/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken } from '@angular/core';

export const IDENTITY_USER_SERVICE_TOKEN = new InjectionToken<IIdentityUserService>('IDENTITY_USER_SERVICE');

export interface IdentityUserModel {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    readonly?: boolean;
}

export interface IIdentityUserService {
    getCurrentUserInfo(): IdentityUserModel;
    search(name?: string, filters?: any): any;
}
