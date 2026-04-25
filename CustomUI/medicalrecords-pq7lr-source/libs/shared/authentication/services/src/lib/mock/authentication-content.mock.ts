/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationContent } from '../models/authentication-content.model';

export const basicAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-1',
        name: 'myBasicAuth',
        key: 'myBasicAuthKey',
        description: 'my basic auth description',
        authProperties: {
            authenticationType: 'basic',
            username: 'my-username',
            password: 'my-password',
        },
    })
);

export const bearerAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-2',
        name: 'myBearerAuth',
        key: 'myBearerAuthKey',
        description: 'my bearer auth description',
        authProperties: {
            authenticationType: 'bearer',
            token: 'my-token',
        },
    })
);

export const clientCredentialsAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-3',
        name: 'myClientCredentialsAuth',
        key: 'myClientCredentialsAuthKey',
        description: 'my client credentials auth description',
        authProperties: {
            authenticationType: 'client_credentials',
            clientId: 'my-client-id',
            clientSecret: 'my-client-secret',
            endpoint: 'my-endpoint',
            scope: 'email',
        },
    })
);

export const passwordAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-password',
        name: 'myPasswordAuth',
        key: 'myPasswordAuthKey',
        description: 'my password auth description',
        authProperties: {
            authenticationType: 'password',
            clientId: 'my-client-id',
            clientSecret: 'my-client-secret',
            username: 'my-username',
            password: 'my-password',
            endpoint: 'https://my-token-endpoint.fake.com',
            scope: 'openid profile',
        },
    })
);

export const invalidAuthenticationTypeContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-4',
        name: 'my invalid auth',
        description: 'my invalid auth description',
        authProperties: {
            authenticationType: 'invalid auth type',
        },
    })
);

export const grantTypeAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-5',
        name: 'myGrantTypeAuth',
        key: 'myGrantTypeAuthKey',
        description: 'my grant type auth description',
        authProperties: {
            authenticationType: 'grant_type',
            clientId: 'my-client-id',
            clientSecret: 'my-client-secret',
            endpoint: 'my-endpoint',
            scope: 'hxp.integrations',
            grantType: 'urn:hyland:params:oauth:grant-type:api-credentials',
        },
    })
);

export const smtpAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-6',
        name: 'mySmtpAuth',
        key: 'mySmtpAuthKey',
        description: 'my smtp auth description',
        authProperties: {
            authenticationType: 'smtp',
            username: 'smtp-user',
            password: 'smtp-password',
            host: 'smtp.fake.com',
            port: 587,
            fromAddress: 'my-smtp-from-address',
            fromName: 'my-smtp-from-name',
            replyToAddress: 'my-smtp-reply-to-address',
        },
    })
);

export const xApiKeyAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-7',
        name: 'myXApiKeyAuth',
        key: 'myXApiKeyAuthKey',
        description: 'my x-api-key auth description',
        authProperties: {
            authenticationType: 'x_api_key',
            apiKey: 'x-api-key-token',
        },
    })
);

export const jwtAssertionAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-8',
        name: 'myJwtAssertionAuth',
        key: 'myJwtAssertionAuthKey',
        description: 'my jwt assertion auth description',
        authProperties: {
            authenticationType: 'jwt_assertion',
            issuer: 'my-issuer',
            privateKey: 'my-private-key',
            endpoint: 'https://my-endpoint.fake.com',
            scope: 'my-scope',
            audience: 'my-audience',
            subject: 'my-subject',
            keyId: 'my-key-id',
        },
    })
);

export const sshAuthenticationContentMock = new AuthenticationContent(
    JSON.stringify({
        id: 'authentication-id-9',
        name: 'mySshAuth',
        key: 'mySshAuthKey',
        description: 'my ssh auth description',
        authProperties: {
            authenticationType: 'ssh',
            username: 'ssh-user',
            privateKey: 'my-ssh-private-key',
            passphrase: 'my-passphrase',
        },
    })
);

