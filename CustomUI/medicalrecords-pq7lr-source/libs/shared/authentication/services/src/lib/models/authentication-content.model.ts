/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationProperties, AuthenticationType } from './authentication.types';

export class AuthenticationContent {
    id: string;
    name: string;
    authProperties: AuthenticationProperties;
    description?: string;
    key: string;

    constructor(authenticationContent: string) {
        const authenticationContentJson = JSON.parse(authenticationContent);

        this.id = authenticationContentJson?.id || '';
        this.name = authenticationContentJson?.name || '';
        this.description = authenticationContentJson?.description || '';
        this.authProperties = authenticationContentJson?.authProperties;
        this.key = authenticationContentJson?.key || '';
    }

    hasAuthProperties(): boolean {
        return !!this?.authProperties;
    }

    getAuthProperties(): AuthenticationProperties {
        return this.authProperties;
    }

    getAuthProperty(property: string): any {
        return this.authProperties[property];
    }

    hasAuthProperty(property: string): boolean {
        return !!this.authProperties[property];
    }

    getAuthType(): AuthenticationType {
        return this.authProperties?.authenticationType;
    }

    getAuthName(): string {
        return this.name || '';
    }

    getAuthKey(): string {
        return this.key || '';
    }

    getAuthDescription(): string {
        return this.description || '';
    }
}
