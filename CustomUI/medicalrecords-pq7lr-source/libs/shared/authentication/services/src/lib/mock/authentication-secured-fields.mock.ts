/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationCredentialsField } from '../models/authentication-details-form-values.types';
import { SMTP_PORT_REGEX, URL_REGEXP } from '../models';

export const basicAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'username',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.USERNAME',
        required: true,
        type: 'text',
    },
    {
        key: 'password',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PASSWORD',
        required: true,
        type: 'password',
    },
];

export const bearerAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'token',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.TOKEN',
        required: true,
        type: 'password',
    },
];

export const clientCredentialsAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'clientId',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_ID',
        required: true,
        type: 'text',
    },
    {
        key: 'clientSecret',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_SECRET',
        required: true,
        type: 'password',
    },
    {
        key: 'endpoint',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.ENDPOINT',
        required: true,
        validators: {
            pattern: {
                value: URL_REGEXP,
                errorMessage: 'SHARED_AUTHENTICATION.ERRORS.URL_ERROR',
            },
        },
        type: 'text',
    },
    {
        key: 'scope',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.SCOPE',
        required: false,
        type: 'text',
    },
];

export const passwordAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'clientId',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_ID',
        required: true,
        type: 'text',
    },
    {
        key: 'clientSecret',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_SECRET',
        required: false,
        type: 'password',
    },
    {
        key: 'username',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.USERNAME',
        required: true,
        type: 'text',
    },
    {
        key: 'password',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PASSWORD',
        required: true,
        type: 'password',
    },
    {
        key: 'endpoint',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.ENDPOINT',
        required: true,
        validators: {
            pattern: {
                value: URL_REGEXP,
                errorMessage: 'SHARED_AUTHENTICATION.ERRORS.URL_ERROR',
            },
        },
        type: 'text',
    },
    {
        key: 'scope',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.SCOPE',
        required: false,
        type: 'text',
    },
];

export const grantTypeAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'clientId',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_ID',
        required: true,
        type: 'text',
    },
    {
        key: 'clientSecret',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_SECRET',
        required: true,
        type: 'password',
    },
    {
        key: 'endpoint',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.ENDPOINT',
        required: true,
        validators: {
            pattern: {
                value: URL_REGEXP,
                errorMessage: 'SHARED_AUTHENTICATION.ERRORS.URL_ERROR',
            },
        },
        type: 'text',
    },
    {
        key: 'scope',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.SCOPE',
        required: false,
        type: 'text',
    },
    {
        key: 'grantType',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.GRANT_TYPE',
        required: true,
        type: 'text',
    },
];

export const smtpAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'username',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.USERNAME',
        required: true,
        type: 'text',
    },
    {
        key: 'password',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PASSWORD',
        required: true,
        type: 'password',
    },
    {
        key: 'host',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.HOST',
        required: true,
        type: 'text',
    },
    {
        key: 'port',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PORT',
        required: true,
        validators: {
            pattern: {
                value: SMTP_PORT_REGEX,
                errorMessage: 'SHARED_AUTHENTICATION.ERRORS.SMTP_PORT_ERROR',
            },
        },
        type: 'text',
    },
    {
        key: 'fromAddress',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.FROM_ADDRESS',
        required: true,
        type: 'text',
    },
    {
        key: 'fromName',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.FROM_NAME',
        required: false,
        type: 'text',
    },
    {
        key: 'replyToAddress',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.REPLY_TO_ADDRESS',
        required: false,
        type: 'text',
    },
];

export const xApiKeyAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'apiKey',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.API_KEY',
        required: true,
        type: 'password',
    },
];

export const jwtAssertionAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'issuer',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.ISSUER',
        required: true,
        type: 'text',
    },
    {
        key: 'privateKey',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PRIVATE_KEY_RS256',
        required: true,
        type: 'password-multiline',
    },
    {
        key: 'endpoint',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.ENDPOINT_AND_AUDIENCE',
        required: true,
        validators: {
            pattern: {
                value: URL_REGEXP,
                errorMessage: 'SHARED_AUTHENTICATION.ERRORS.URL_ERROR',
            },
        },
        type: 'text',
    },
    {
        key: 'scope',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.SCOPE',
        required: false,
        type: 'text',
    },
    {
        key: 'subject',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.SUBJECT',
        required: false,
        type: 'text',
    },
    {
        key: 'audience',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.AUDIENCE',
        required: false,
        type: 'text',
    },
    {
        key: 'keyId',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.KEY_ID',
        required: false,
        type: 'text',
    },
];

export const sshAuthenticationSecuredFields: AuthenticationCredentialsField[] = [
    {
        key: 'username',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.USERNAME',
        required: true,
        type: 'text',
    },
    {
        key: 'privateKey',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PRIVATE_KEY',
        required: true,
        type: 'password-multiline',
    },
    {
        key: 'passphrase',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.PASSPHRASE',
        required: false,
        type: 'password',
    },
];

