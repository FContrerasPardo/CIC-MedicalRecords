/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthGuard, provideTranslations } from '@alfresco/adf-core';
import { APP_INITIALIZER, makeEnvironmentProviders } from '@angular/core';
import { isContentServiceEnabled } from './rules/content-services-extension-rules';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { provideManageVersions } from './extensions/manage-versions/manage-versions.providers';
import { provideSingleItemCopy } from './extensions/single-item-copy/single-item-copy.providers';
import { provideSingleItemMove } from './extensions/single-item-move/single-item-move.providers';
import { providePermissionManagement } from './extensions/permission-management/permission-management.providers';
import {
    HxpContentServicesSidenavComponent,
    ContentBrowserComponent,
    provideContentServicesExtensionContentBrowserFeatureShell,
} from '@hxp/workspace-hxp/content-services-extension/content-browser/feature-shell';
import { FORM_RULES_CONFIGURATION, FormRulesConfiguration } from '@alfresco-dbp/shared/form-rules';
import { of } from 'rxjs';

export function provideHxwContentServices() {
    return makeEnvironmentProviders([
        provideSingleItemCopy(),
        provideSingleItemMove(),
        provideManageVersions(),
        providePermissionManagement(),
        provideContentServicesExtensionContentBrowserFeatureShell(),
        provideExtensionConfig(['content-services.extension.json']),
        provideTranslations('content-services-extension-domain-shell', 'assets/content-services-extension-domain-shell'),
        {
            provide: FORM_RULES_CONFIGURATION,
            useFactory: () => {
                return of({
                    listenForProcessCreatedByActor: true,
                } satisfies FormRulesConfiguration);
            },
            deps: [],
        },
        {
            provide: APP_INITIALIZER,
            useFactory: (extensions: ExtensionService) => () => {
                extensions.setAuthGuards({
                    'content-services-app.auth': AuthGuard,
                });
                extensions.setComponents({
                    'content-services-app.sidenav': HxpContentServicesSidenavComponent,
                    'content-services-app.main-content': ContentBrowserComponent,
                });

                extensions.setEvaluators({
                    isContentServiceEnabled,
                });
            },
            deps: [ExtensionService],
            multi: true,
        },
    ]);
}
