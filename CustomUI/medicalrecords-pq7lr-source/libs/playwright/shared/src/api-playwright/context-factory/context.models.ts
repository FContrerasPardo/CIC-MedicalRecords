/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { APIRequestContext } from '@playwright/test';

export interface UserCredentials {
    username: string;
    password: string;
    scope: string;
    clientId: string;
}

export interface AuthFormData {
    form: {
        username?: string;
        password?: string;
        grant_type?: string;
        client_id?: string;
        client_secret?: string;
        scope?: string;
    };
}

export interface TokenDetails {
    access_token: string;
    expires_in: string;
}

export interface CustomAPIRequest extends APIRequestContext {
    token: string;
    username?: string;
}

export interface UserContexts {
    hrUserApiContext: CustomAPIRequest;
    hrUserAcsApiContext: CustomAPIRequest;
    processAdminApiContext: CustomAPIRequest;
    modelerUserApiContext: CustomAPIRequest;
    modelerqaUserApiContext: CustomAPIRequest;
    devopsUserApiContext: CustomAPIRequest;
    analystUserApiContext: CustomAPIRequest;
    superadminApiContext: CustomAPIRequest;
    hxprAdminApiContext: CustomAPIRequest;
    salesUserApiContext: CustomAPIRequest;
    repoAdminApiContext: CustomAPIRequest;
    repoAdminContentApiContext: CustomAPIRequest;
    superadminIdentityApiContext: CustomAPIRequest;
    salesUserAcsApiContext: CustomAPIRequest;
}
