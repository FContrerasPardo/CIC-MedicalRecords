/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import { AuthenticationCredentialsField } from './models/authentication-details-form-values.types';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import {
    basicAuthenticationFormFields,
    bearerAuthenticationFormFields,
    clientCredentialsAuthenticationFormFields,
    passwordAuthenticationFormFields,
    jwtAssertionAuthenticationFormFields,
    grantTypeAuthenticationFormFields,
    smtpAuthenticationFormFields,
    xApiKeyAuthenticationFormFields,
    sshAuthenticationFormFields,
} from './models/authentication-details-form-fields.model';
import { AuthenticationType } from './models/authentication.types';
import { AuthenticationContent } from './models/authentication-content.model';

@Injectable({
    providedIn: 'root',
})
export class AuthenticationFormService {
    private readonly fb = inject(UntypedFormBuilder);


    createFormGroupForAuthentication(
        authenticationFormFieldsDefinition: AuthenticationCredentialsField[],
        authContent: AuthenticationContent
    ): UntypedFormGroup {
        const formControls: Record<string, UntypedFormControl> = {};
        for (const formField of authenticationFormFieldsDefinition) {
            const formControlValue = authContent?.hasAuthProperties() ? authContent.getAuthProperty(formField.key) : '';
            formControls[formField.key] = this.createAuthController(formControlValue, formField);
        }
        return this.fb.group({
            [authContent.getAuthKey()]: this.fb.group(formControls),
        } as Record<string, UntypedFormGroup>);
    }

    private createAuthController(value: string | number, { required = true, validators, type }: AuthenticationCredentialsField): UntypedFormControl {
        const controller = new UntypedFormControl(value);
        const formValidators = [
            ...(required ? [Validators.required] : []),
            ...(validators?.pattern ? [Validators.pattern(validators.pattern.value)] : []),
            ...(type === 'email' ? [Validators.email] : []),
        ];
        controller.setValidators(formValidators);
        return controller;
    }

    getAuthenticationFormFieldsDefinitionByType(authType: AuthenticationType): AuthenticationCredentialsField[] {
        switch (authType) {
            case AuthenticationType.BASIC: {
                return basicAuthenticationFormFields;
            }
            case AuthenticationType.BEARER: {
                return bearerAuthenticationFormFields;
            }
            case AuthenticationType.CLIENT_CREDENTIALS: {
                return clientCredentialsAuthenticationFormFields;
            }
            case AuthenticationType.PASSWORD: {
                return passwordAuthenticationFormFields;
            }
            case AuthenticationType.JWT_ASSERTION: {
                return jwtAssertionAuthenticationFormFields;
            }
            case AuthenticationType.GRANT_TYPE: {
                return grantTypeAuthenticationFormFields;
            }
            case AuthenticationType.SMTP: {
                return smtpAuthenticationFormFields;
            }
            case AuthenticationType.X_API_KEY: {
                return xApiKeyAuthenticationFormFields;
            }
            case AuthenticationType.SSH: {
                return sshAuthenticationFormFields;
            }
            default: {
                return basicAuthenticationFormFields;
            }
        }
    }
}
