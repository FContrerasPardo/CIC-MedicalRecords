/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationFormService } from './authentication-form.service';
import { FormGroup, UntypedFormBuilder } from '@angular/forms';
import {
    basicAuthenticationSecuredFields,
    bearerAuthenticationSecuredFields,
    clientCredentialsAuthenticationSecuredFields,
    passwordAuthenticationSecuredFields,
    grantTypeAuthenticationSecuredFields,
    smtpAuthenticationSecuredFields,
    xApiKeyAuthenticationSecuredFields,
    jwtAssertionAuthenticationSecuredFields,
    sshAuthenticationSecuredFields,
} from './mock/authentication-secured-fields.mock';
import {
    basicAuthenticationContentMock,
    bearerAuthenticationContentMock,
    clientCredentialsAuthenticationContentMock,
    passwordAuthenticationContentMock,
    grantTypeAuthenticationContentMock,
    invalidAuthenticationTypeContentMock,
    smtpAuthenticationContentMock,
    xApiKeyAuthenticationContentMock,
    jwtAssertionAuthenticationContentMock,
    sshAuthenticationContentMock,
} from './mock/authentication-content.mock';
import { TestBed } from '@angular/core/testing';

describe('AuthenticationFormService', () => {
    let service: AuthenticationFormService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AuthenticationFormService, UntypedFormBuilder],
        });

        service = TestBed.inject(AuthenticationFormService);
    });

    describe('Form Group Creation', () => {
        it('should create form group for basic authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(basicAuthenticationSecuredFields, basicAuthenticationContentMock).controls[
                'myBasicAuthKey'
            ] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(2);
            expect(formGroupControls[0].value).toEqual('my-username');
            expect(formGroupControls[1].value).toEqual('my-password');
        });

        it('should create form group for bearer authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(bearerAuthenticationSecuredFields, bearerAuthenticationContentMock)
                .controls['myBearerAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(1);
            expect(formGroupControls[0].value).toEqual('my-token');
        });

        it('should create form group for client credentials authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                clientCredentialsAuthenticationSecuredFields,
                clientCredentialsAuthenticationContentMock
            ).controls['myClientCredentialsAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(4);
            expect(formGroupControls[0].value).toEqual('my-client-id');
            expect(formGroupControls[1].value).toEqual('my-client-secret');
            expect(formGroupControls[2].value).toEqual('my-endpoint');
            expect(formGroupControls[3].value).toEqual('email');
        });

        it('should create form group for password authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                passwordAuthenticationSecuredFields,
                passwordAuthenticationContentMock
            ).controls['myPasswordAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(6);
            expect(formGroupControls[0].value).toEqual('my-client-id');
            expect(formGroupControls[1].value).toEqual('my-client-secret');
            expect(formGroupControls[2].value).toEqual('my-username');
            expect(formGroupControls[3].value).toEqual('my-password');
            expect(formGroupControls[4].value).toEqual('https://my-token-endpoint.fake.com');
            expect(formGroupControls[5].value).toEqual('openid profile');
        });

        it('should create form group for grant type authentication with scope', () => {
            const authFormGroup = service.createFormGroupForAuthentication(grantTypeAuthenticationSecuredFields, grantTypeAuthenticationContentMock)
                .controls['myGrantTypeAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(5);
            expect(formGroupControls[0].value).toEqual('my-client-id');
            expect(formGroupControls[1].value).toEqual('my-client-secret');
            expect(formGroupControls[2].value).toEqual('my-endpoint');
            expect(formGroupControls[3].value).toEqual('hxp.integrations');
            expect(formGroupControls[4].value).toEqual('urn:hyland:params:oauth:grant-type:api-credentials');
        });

        it('should create form group for smtp type authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(smtpAuthenticationSecuredFields, smtpAuthenticationContentMock).controls[
                'mySmtpAuthKey'
            ] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(7);
            expect(formGroupControls[0].value).toEqual('smtp-user');
            expect(formGroupControls[1].value).toEqual('smtp-password');
            expect(formGroupControls[2].value).toEqual('smtp.fake.com');
            expect(formGroupControls[3].value).toEqual(587);
            expect(formGroupControls[4].value).toEqual('my-smtp-from-address');
            expect(formGroupControls[5].value).toEqual('my-smtp-from-name');
            expect(formGroupControls[6].value).toEqual('my-smtp-reply-to-address');
        });

        it('should create form group for x-api-key type authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(xApiKeyAuthenticationSecuredFields, xApiKeyAuthenticationContentMock)
                .controls['myXApiKeyAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(1);
            expect(formGroupControls[0].value).toEqual('x-api-key-token');
        });

        it('should create form group for jwt assertion authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                jwtAssertionAuthenticationSecuredFields,
                jwtAssertionAuthenticationContentMock
            ).controls['myJwtAssertionAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(7);
            expect(formGroupControls[0].value).toEqual('my-issuer');
            expect(formGroupControls[1].value).toEqual('my-private-key');
            expect(formGroupControls[2].value).toEqual('https://my-endpoint.fake.com');
            expect(formGroupControls[3].value).toEqual('my-scope');
            expect(formGroupControls[4].value).toEqual('my-subject');
            expect(formGroupControls[5].value).toEqual('my-audience');
            expect(formGroupControls[6].value).toEqual('my-key-id');
        });

        it('should create form group for ssh authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                sshAuthenticationSecuredFields,
                sshAuthenticationContentMock
            ).controls['mySshAuthKey'] as FormGroup;
            const formGroupControls = Object.values(authFormGroup.controls);

            expect(authFormGroup).toBeDefined();
            expect(formGroupControls.length).toEqual(3);
            expect(formGroupControls[0].value).toEqual('ssh-user');
            expect(formGroupControls[1].value).toEqual('my-ssh-private-key');
            expect(formGroupControls[2].value).toEqual('my-passphrase');
        });

        it('should add pattern validator', () => {
            const field = {
                required: false,
                validators: { pattern: { value: /^abc$/ } },
                type: 'text' as const,
                key: 'test',
                translationKey: 'test',
            };
            const formGroup = service.createFormGroupForAuthentication([field], basicAuthenticationContentMock);
            const control = (formGroup.controls[basicAuthenticationContentMock.getAuthKey()] as FormGroup).controls['test'];
            control.setValue('def');
            expect(control.valid).toBe(false);
            control.setValue('abc');
            expect(control.valid).toBe(true);
        });

        it('should add required validator when required is true', () => {
            const field = { required: true, type: 'text' as const, key: 'test', translationKey: 'test' };
            const formGroup = service.createFormGroupForAuthentication([field], basicAuthenticationContentMock);
            const control = (formGroup.controls[basicAuthenticationContentMock.getAuthKey()] as FormGroup).controls['test'];
            control.setValue('');
            expect(control.hasError('required')).toBe(true);
            control.setValue('value');
            expect(control.hasError('required')).toBe(false);
        });

        it('should add email validator when type is email', () => {
            const field = { required: false, type: 'email' as const, key: 'test', translationKey: 'test' };
            const formGroup = service.createFormGroupForAuthentication([field], basicAuthenticationContentMock);
            const control = (formGroup.controls[basicAuthenticationContentMock.getAuthKey()] as FormGroup).controls['test'];
            control.setValue('not-an-email');
            expect(control.hasError('email')).toBe(true);
            control.setValue('test@email.com');
            expect(control.hasError('email')).toBe(false);
        });

        it('should add all validators when required is true and type is email', () => {
            const field = { required: true, type: 'email' as const, key: 'test', translationKey: 'test' };
            const formGroup = service.createFormGroupForAuthentication([field], basicAuthenticationContentMock);
            const control = (formGroup.controls[basicAuthenticationContentMock.getAuthKey()] as FormGroup).controls['test'];
            control.setValue('');
            expect(control.hasError('required')).toBe(true);
            control.setValue('invalid');
            expect(control.hasError('email')).toBe(true);
            control.setValue('test@email.com');
            expect(control.valid).toBe(true);
        });

        it('should apply pattern validator for endpoint field in client credentials', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                clientCredentialsAuthenticationSecuredFields,
                clientCredentialsAuthenticationContentMock
            ).controls['myClientCredentialsAuthKey'] as FormGroup;
            const endpointControl = authFormGroup.controls['endpoint'];
            endpointControl.setValue('invalid-url');
            expect(endpointControl.valid).toBe(false);
            endpointControl.setValue('http://valid-url.com');
            expect(endpointControl.valid).toBe(true);
        });

        it('should apply pattern validator for endpoint field in jwt assertion', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                jwtAssertionAuthenticationSecuredFields,
                jwtAssertionAuthenticationContentMock
            ).controls['myJwtAssertionAuthKey'] as FormGroup;
            const endpointControl = authFormGroup.controls['endpoint'];
            endpointControl.setValue('invalid-url');
            expect(endpointControl.valid).toBe(false);
            endpointControl.setValue('https://valid-url.com');
            expect(endpointControl.valid).toBe(true);
        });

        it('should validate required and optional fields in password authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                passwordAuthenticationSecuredFields,
                passwordAuthenticationContentMock
            ).controls['myPasswordAuthKey'] as FormGroup;

            const clientIdControl = authFormGroup.controls['clientId'];
            const clientSecretControl = authFormGroup.controls['clientSecret'];
            const usernameControl = authFormGroup.controls['username'];
            const passwordControl = authFormGroup.controls['password'];
            const endpointControl = authFormGroup.controls['endpoint'];
            const scopeControl = authFormGroup.controls['scope'];

            clientIdControl.setValue('');
            expect(clientIdControl.hasError('required')).toBe(true);
            clientIdControl.setValue('client-id');
            expect(clientIdControl.valid).toBe(true);

            usernameControl.setValue('');
            expect(usernameControl.hasError('required')).toBe(true);
            usernameControl.setValue('username');
            expect(usernameControl.valid).toBe(true);

            passwordControl.setValue('');
            expect(passwordControl.hasError('required')).toBe(true);
            passwordControl.setValue('password');
            expect(passwordControl.valid).toBe(true);

            endpointControl.setValue('invalid-url');
            expect(endpointControl.valid).toBe(false);
            endpointControl.setValue('https://endpoint.com/token');
            expect(endpointControl.valid).toBe(true);

            clientSecretControl.setValue('');
            expect(clientSecretControl.valid).toBe(true);

            scopeControl.setValue('');
            expect(scopeControl.valid).toBe(true);
        });

        it('should validate required fields in jwt assertion authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                jwtAssertionAuthenticationSecuredFields,
                jwtAssertionAuthenticationContentMock
            ).controls['myJwtAssertionAuthKey'] as FormGroup;

            const issuerControl = authFormGroup.controls['issuer'];
            const privateKeyControl = authFormGroup.controls['privateKey'];
            const endpointControl = authFormGroup.controls['endpoint'];

            issuerControl.setValue('');
            expect(issuerControl.hasError('required')).toBe(true);
            issuerControl.setValue('test-issuer');
            expect(issuerControl.valid).toBe(true);

            privateKeyControl.setValue('');
            expect(privateKeyControl.hasError('required')).toBe(true);
            privateKeyControl.setValue('test-key');
            expect(privateKeyControl.valid).toBe(true);

            endpointControl.setValue('');
            expect(endpointControl.hasError('required')).toBe(true);
            endpointControl.setValue('https://endpoint.com');
            expect(endpointControl.valid).toBe(true);
        });

        it('should allow optional fields to be empty in jwt assertion authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                jwtAssertionAuthenticationSecuredFields,
                jwtAssertionAuthenticationContentMock
            ).controls['myJwtAssertionAuthKey'] as FormGroup;

            const scopeControl = authFormGroup.controls['scope'];
            const subjectControl = authFormGroup.controls['subject'];
            const audienceControl = authFormGroup.controls['audience'];
            const keyIdControl = authFormGroup.controls['keyId'];

            scopeControl.setValue('');
            expect(scopeControl.valid).toBe(true);

            subjectControl.setValue('');
            expect(subjectControl.valid).toBe(true);

            audienceControl.setValue('');
            expect(audienceControl.valid).toBe(true);

            keyIdControl.setValue('');
            expect(keyIdControl.valid).toBe(true);
        });

        it('should validate required fields in ssh authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                sshAuthenticationSecuredFields,
                sshAuthenticationContentMock
            ).controls['mySshAuthKey'] as FormGroup;

            const usernameControl = authFormGroup.controls['username'];
            const privateKeyControl = authFormGroup.controls['privateKey'];

            usernameControl.setValue('');
            expect(usernameControl.hasError('required')).toBe(true);
            usernameControl.setValue('test-user');
            expect(usernameControl.valid).toBe(true);

            privateKeyControl.setValue('');
            expect(privateKeyControl.hasError('required')).toBe(true);
            privateKeyControl.setValue('test-ssh-key');
            expect(privateKeyControl.valid).toBe(true);
        });

        it('should allow optional fields to be empty in ssh authentication', () => {
            const authFormGroup = service.createFormGroupForAuthentication(
                sshAuthenticationSecuredFields,
                sshAuthenticationContentMock
            ).controls['mySshAuthKey'] as FormGroup;

            const passphraseControl = authFormGroup.controls['passphrase'];

            passphraseControl.setValue('');
            expect(passphraseControl.valid).toBe(true);
        });
    });

    describe('getAuthenticationFormFields', () => {
        it('should return username and password fields in case of basic auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(basicAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(basicAuthenticationSecuredFields);
        });

        it('should return token field in case of bearer auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(bearerAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(bearerAuthenticationSecuredFields);
        });

        it('should return clientId, clientSecret, endpoint, scope fields in case of client_credentials auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(clientCredentialsAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(clientCredentialsAuthenticationSecuredFields);
        });

        it('should return clientId, clientSecret, username, password, token endpoint and scope fields in case of password auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(passwordAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(passwordAuthenticationSecuredFields);
        });

        it('should return clientId, clientSecret, endpoint, scope and grant type fields in case of grant type auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(grantTypeAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(grantTypeAuthenticationSecuredFields);
        });

        it('should return issuer, privateKey, endpoint, scope, subject, audience, keyId fields in case of jwt_assertion auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(jwtAssertionAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(jwtAssertionAuthenticationSecuredFields);
        });

        it('should return username, privateKey, passphrase fields in case of ssh auth', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(sshAuthenticationContentMock.getAuthType());
            expect(fields).toEqual(sshAuthenticationSecuredFields);
        });

        it('should return username and password as default fields in case the authenticationType is not correctly defined', () => {
            const fields = service.getAuthenticationFormFieldsDefinitionByType(invalidAuthenticationTypeContentMock.getAuthType());
            expect(fields).toEqual(basicAuthenticationSecuredFields);
        });
    });
});
