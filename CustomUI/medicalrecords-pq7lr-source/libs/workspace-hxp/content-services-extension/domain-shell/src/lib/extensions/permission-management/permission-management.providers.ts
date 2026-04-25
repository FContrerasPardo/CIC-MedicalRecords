/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ExtensionService } from '@alfresco/adf-extensions';
import { PermissionsButtonActionService } from '@alfresco/adf-hx-content-services/ui';
import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PermissionsManagementButtonComponent } from './permissions-management-button/permissions-management-button-component';
import {
    provideAdfEnterpriseAdfHxContentServicesServices,
    HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
} from '@alfresco/adf-hx-content-services/services';

export function providePermissionManagement(): EnvironmentProviders {
    return makeEnvironmentProviders([
        provideAdfEnterpriseAdfHxContentServicesServices(),
        {
            provide: HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
            useClass: PermissionsButtonActionService,
        },
        {
            provide: APP_INITIALIZER,
            useFactory: (extensions: ExtensionService) => () => {
                extensions.setComponents({
                    'document.permissions_management': PermissionsManagementButtonComponent,
                });
            },
            deps: [ExtensionService],
            multi: true,
        },
    ]);
}
