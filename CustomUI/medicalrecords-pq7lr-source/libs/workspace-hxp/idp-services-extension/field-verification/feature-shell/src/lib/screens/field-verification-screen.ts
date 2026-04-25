/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IdpDedicatedScreenBaseComponent } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IDP_FIELD_VERIFICATION_SERVICES_PROVIDER } from '../services/idp-services.module';
import { FieldVerificationRootComponent } from '../components/root/field-verification-root.component';

@Component({
    selector: 'hyland-idp-field-verification-screen',
    template: '<hyland-idp-field-verification-root />',
    styleUrl: './field-verification-screen.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [...IDP_FIELD_VERIFICATION_SERVICES_PROVIDER],
    imports: [FieldVerificationRootComponent],
})
export class FieldVerificationScreenComponent extends IdpDedicatedScreenBaseComponent {}
