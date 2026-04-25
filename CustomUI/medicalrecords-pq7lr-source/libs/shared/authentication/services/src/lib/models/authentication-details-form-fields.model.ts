/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationCredentialsField } from './authentication-details-form-values.types';

export const URL_REGEXP = /^[A-Za-z][A-Za-z\d.+-]*:\/*(?:\w+(?::\w+)?@)?[^\s/]+(?::\d+)?(?:\/[\w#!:.?+=&%@\-/]*)?$/;
export const SMTP_PORT_REGEX = /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/;

const FIELD_USERNAME: AuthenticationCredentialsField = {
    key: 'username',
    translationKey: 'SHARED_AUTHENTICATION.DETAILS.USERNAME',
    required: true,
    type: 'text',
};

const FIELD_PASSWORD: AuthenticationCredentialsField = {
    key: 'password',
    translationKey: 'SHARED_AUTHENTICATION.DETAILS.PASSWORD',
    required: true,
    type: 'password',
};

const FIELD_CLIENT_ID: AuthenticationCredentialsField = {
    key: 'clientId',
    translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_ID',
    required: true,
    type: 'text',
};

const FIELD_CLIENT_SECRET_REQUIRED: AuthenticationCredentialsField = {
    key: 'clientSecret',
    translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_SECRET',
    required: true,
    type: 'password',
};

const FIELD_CLIENT_SECRET_OPTIONAL: AuthenticationCredentialsField = {
    key: 'clientSecret',
    translationKey: 'SHARED_AUTHENTICATION.DETAILS.CLIENT_SECRET',
    required: false,
    type: 'password',
};

const FIELD_ENDPOINT: AuthenticationCredentialsField = {
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
};

const FIELD_SCOPE: AuthenticationCredentialsField = {
    key: 'scope',
    translationKey: 'SHARED_AUTHENTICATION.DETAILS.SCOPE',
    required: false,
    type: 'text',
};

export const basicAuthenticationFormFields: AuthenticationCredentialsField[] = [FIELD_USERNAME, FIELD_PASSWORD];

export const bearerAuthenticationFormFields: AuthenticationCredentialsField[] = [
    {
        key: 'token',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.TOKEN',
        required: true,
        type: 'password',
    },
];

export const xApiKeyAuthenticationFormFields: AuthenticationCredentialsField[] = [
    {
        key: 'apiKey',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.API_KEY',
        required: true,
        type: 'password',
    },
];

export const clientCredentialsAuthenticationFormFields: AuthenticationCredentialsField[] = [
    FIELD_CLIENT_ID,
    FIELD_CLIENT_SECRET_REQUIRED,
    FIELD_ENDPOINT,
    FIELD_SCOPE,
];

export const passwordAuthenticationFormFields: AuthenticationCredentialsField[] = [
    FIELD_CLIENT_ID,
    FIELD_CLIENT_SECRET_OPTIONAL,
    FIELD_USERNAME,
    FIELD_PASSWORD,
    FIELD_ENDPOINT,
    FIELD_SCOPE,
];

export const jwtAssertionAuthenticationFormFields: AuthenticationCredentialsField[] = [
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
    FIELD_SCOPE,
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

export const grantTypeAuthenticationFormFields: AuthenticationCredentialsField[] = [
    FIELD_CLIENT_ID,
    FIELD_CLIENT_SECRET_REQUIRED,
    FIELD_ENDPOINT,
    FIELD_SCOPE,
    {
        key: 'grantType',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.GRANT_TYPE',
        required: true,
        type: 'text',
    },
];

export const smtpAuthenticationFormFields: AuthenticationCredentialsField[] = [
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
        type: 'number',
    },
    FIELD_USERNAME,
    FIELD_PASSWORD,
    {
        key: 'fromAddress',
        translationKey: 'SHARED_AUTHENTICATION.DETAILS.FROM_ADDRESS',
        required: true,
        type: 'email',
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
        type: 'email',
    },
];

export const sshAuthenticationFormFields: AuthenticationCredentialsField[] = [
    FIELD_USERNAME,
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
