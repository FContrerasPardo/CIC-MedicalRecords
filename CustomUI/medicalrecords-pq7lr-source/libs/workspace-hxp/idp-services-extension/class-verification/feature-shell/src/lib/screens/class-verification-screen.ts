/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IdpDedicatedScreenBaseComponent } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { ClassVerificationRootComponent } from '../components/root/class-verification-root.component';
import { IDP_CLASS_VERIFICATION_SERVICES_PROVIDER } from '../services/idp-services.module';

@Component({
    selector: 'hyland-idp-class-verification-screen',
    template: '<hyland-idp-class-verification-root />',
    styleUrl: './class-verification-screen.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [...IDP_CLASS_VERIFICATION_SERVICES_PROVIDER],
    imports: [ClassVerificationRootComponent],
})
export class ClassVerificationScreenComponent extends IdpDedicatedScreenBaseComponent {}
