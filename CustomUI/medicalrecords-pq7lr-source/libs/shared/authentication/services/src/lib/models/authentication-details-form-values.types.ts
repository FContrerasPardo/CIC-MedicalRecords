/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationType } from './authentication.types';

interface CommonAuthenticationFormValues {
    name: string;
    description: string;
}

type AuthenticationFormValues<T> = CommonAuthenticationFormValues & {
    secured: boolean;
    credentials: [
        {
            [key: string]: T;
        },
    ];
};

export interface BasicAuthenticationFormValues extends AuthenticationFormValues<BasicAuthenticationCredentials> {
    authType: typeof AuthenticationType.BASIC;
}

export interface BearerAuthenticationFormValues extends AuthenticationFormValues<BearerAuthenticationCredentials> {
    authType: typeof AuthenticationType.BEARER;
}

export interface ClientCredentialsAuthenticationFormValues extends AuthenticationFormValues<ClientCredentialsAuthenticationCredentials> {
    authType: typeof AuthenticationType.CLIENT_CREDENTIALS;
}

export interface PasswordAuthenticationFormValues extends AuthenticationFormValues<PasswordAuthenticationCredentials> {
    authType: typeof AuthenticationType.PASSWORD;
}

export interface JwtAssertionAuthenticationFormValues extends AuthenticationFormValues<JwtAssertionAuthenticationCredentials> {
    authType: typeof AuthenticationType.JWT_ASSERTION;
}

export interface GrantTypeAuthenticationFormValues extends AuthenticationFormValues<GrantTypeAuthenticationCredentials> {
    authType: typeof AuthenticationType.GRANT_TYPE;
}

export interface SmtpAuthenticationFormValues extends AuthenticationFormValues<SmtpAuthenticationCredentials> {
    authType: typeof AuthenticationType.SMTP;
}

export interface SshAuthenticationFormValues extends AuthenticationFormValues<SshAuthenticationCredentials> {
    authType: typeof AuthenticationType.SSH;
}

export interface XApiKeyAuthenticationFormValues extends AuthenticationFormValues<XApiKeyAuthenticationCredentials> {
    authType: typeof AuthenticationType.X_API_KEY;
}

export type AuthenticationDetailsFormValues =
    | BasicAuthenticationFormValues
    | BearerAuthenticationFormValues
    | ClientCredentialsAuthenticationFormValues
    | PasswordAuthenticationFormValues
    | JwtAssertionAuthenticationFormValues
    | GrantTypeAuthenticationFormValues
    | SmtpAuthenticationFormValues
    | XApiKeyAuthenticationFormValues
    | SshAuthenticationFormValues;

interface UsernamePasswordCredentials {
    username: string;
    password: string;
}

interface ClientIdSecretCredentials {
    clientId: string;
    clientSecret?: string;
}

interface OauthCredentials {
    endpoint: string;
    scope?: string;
}

export type BasicAuthenticationCredentials = UsernamePasswordCredentials;

export interface BearerAuthenticationCredentials {
    token: string;
}

export interface ClientCredentialsAuthenticationCredentials extends OauthCredentials, ClientIdSecretCredentials {}

export interface GrantTypeAuthenticationCredentials extends ClientCredentialsAuthenticationCredentials {
    grantType: string;
}

export interface PasswordAuthenticationCredentials extends OauthCredentials, ClientIdSecretCredentials, UsernamePasswordCredentials {}

export interface JwtAssertionAuthenticationCredentials extends OauthCredentials {
    issuer: string;
    privateKey: string;
    audience: string;
    subject: string;
    keyId: string;
}

export interface SmtpAuthenticationCredentials extends UsernamePasswordCredentials {
    host: string;
    port: number;
    fromAddress: string;
    fromName: string;
    replyToAddress: string;
}

export interface SshAuthenticationCredentials {
    username: string;
    privateKey: string;
    passphrase?: string;
}

export interface AuthenticationCredentialsField {
    key: string;
    translationKey: string;
    required: boolean;
    validators?: AuthenticationCredentialsFieldValidators;
    type: 'password' | 'text' | 'number' | 'email' | 'password-multiline';
    hint?: string;
}

export interface AuthenticationCredentialsFieldValidators {
    pattern?: {
        value: RegExp;
        errorMessage?: string;
    };
}

export interface XApiKeyAuthenticationCredentials {
    apiKey: string;
}
