/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export type AuthenticationProperties =
    | BasicAuthenticationProperties
    | BearerAuthenticationProperties
    | ClientCredentialsAuthenticationProperties
    | PasswordAuthenticationProperties
    | JwtAssertionAuthenticationProperties
    | GrantTypeAuthenticationProperties
    | SmtpAuthenticationProperties
    | XApiKeyAuthenticationProperties
    | SshAuthenticationProperties;

export interface BasicAuthenticationProperties {
    authenticationType: 'basic';
    username: string;
    password: string;
}

export interface BearerAuthenticationProperties {
    authenticationType: 'bearer';
    token: string;
}

export interface ClientCredentialsAuthenticationProperties {
    authenticationType: 'client_credentials';
    clientId: string;
    clientSecret: string;
    endpoint: string;
    scope: string;
}

export interface PasswordAuthenticationProperties {
    authenticationType: 'password';
    clientId: string;
    clientSecret?: string;
    username: string;
    password: string;
    endpoint: string;
    scope?: string;
}

export interface JwtAssertionAuthenticationProperties {
    authenticationType: 'jwt_assertion';
    issuer: string;
    endpoint: string;
    privateKey: string;
    scope: string;
    audience: string;
    subject: string;
    keyId: string;
}

export interface GrantTypeAuthenticationProperties {
    authenticationType: 'grant_type';
    clientId: string;
    clientSecret: string;
    endpoint: string;
    scope: string;
    grantType: string;
}

export interface SmtpAuthenticationProperties {
    authenticationType: 'smtp';
    username: string;
    password: string;
    host: string;
    port: number;
    fromAddress: string;
    fromName: string;
    replyToAddress: string;
}

export interface XApiKeyAuthenticationProperties {
    authenticationType: 'x_api_key';
    apiKey: string;
}

export interface SshAuthenticationProperties {
    authenticationType: 'ssh';
    username: string;
    privateKey: string;
    passphrase?: string;
}

export const AuthenticationType = {
    BASIC: 'basic',
    BEARER: 'bearer',
    CLIENT_CREDENTIALS: 'client_credentials',
    PASSWORD: 'password',
    JWT_ASSERTION: 'jwt_assertion',
    GRANT_TYPE: 'grant_type',
    APP_SERVICE_AUTH: 'app_service_auth',
    SMTP: 'smtp',
    X_API_KEY: 'x_api_key',
    SSH: 'ssh',
} as const;

export type AuthenticationType = typeof AuthenticationType[keyof typeof AuthenticationType];
