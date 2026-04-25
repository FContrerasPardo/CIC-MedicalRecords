/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { provideExtensionConfig } from '@alfresco/adf-extensions';
import { EnvironmentProviders, importProvidersFrom, makeEnvironmentProviders } from '@angular/core';
import { WorkspaceHxpIdpServicesClassVerificationFeatureShellModule } from '@hxp/workspace-hxp/idp-services-extension/class-verification/feature-shell';
import { WorkspaceHxpIdpServicesFieldVerificationFeatureShellModule } from '@hxp/workspace-hxp/idp-services-extension/field-verification/feature-shell';
import { WorkspaceHxpIdpServicesDocumentScanningFeatureShellModule } from '@hxp/workspace-hxp/idp-services-extension/document-scanning/feature-shell';

export function provideIdpServicesDomainShell(): EnvironmentProviders {
    return makeEnvironmentProviders([
        importProvidersFrom([
            WorkspaceHxpIdpServicesClassVerificationFeatureShellModule,
            WorkspaceHxpIdpServicesFieldVerificationFeatureShellModule,
            WorkspaceHxpIdpServicesDocumentScanningFeatureShellModule,
        ]),
        provideExtensionConfig(['idp-services.extension.json']),
    ]);
}
