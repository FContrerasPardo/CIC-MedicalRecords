/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { provideTranslations } from '@alfresco/adf-core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { SATORI_ICONS } from '@hylandsoftware/satori-icons';
import { governancePermissionGuard } from './shared/guards/governance-permission.guard';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { GovernanceSidenavMenuItemComponent } from './shared/ui/navigation/sidenav-menu-item/sidenav-menu-item.component';
import { GovernanceManagementTabsComponent } from './governance-management/governance-management-tabs.component';

export function provideGovernanceServicesExtension(): EnvironmentProviders {
    return makeEnvironmentProviders([
        provideExtensionConfig(['governance-services.extension.json']),
        provideTranslations('governance-services-extension-domain-shell', 'assets/governance-services-extension-domain-shell'),

        {
            provide: APP_INITIALIZER,
            useFactory: (extensions: ExtensionService, sanitizer: DomSanitizer, iconRegistry: MatIconRegistry) => () => {
                extensions.setAuthGuards({
                    'governance-app.auth': governancePermissionGuard,
                });

                extensions.setComponents({
                    'governance-services-app.dashboard': GovernanceManagementTabsComponent,
                    'governance-services-app.search-results': GovernanceManagementTabsComponent,
                    'governance-services-app.legal-holds': GovernanceManagementTabsComponent,
                    'governances-services.sidenav-item': GovernanceSidenavMenuItemComponent,
                });

                iconRegistry.addSvgIconSetLiteral(sanitizer.bypassSecurityTrustHtml(SATORI_ICONS));

                iconRegistry.addSvgIcon(
                    'internal_repository',
                    sanitizer.bypassSecurityTrustResourceUrl('assets/icons/datasources/Internal_Repository.svg')
                );

                iconRegistry.addSvgIcon('governance_record_onHold', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/Record_onHold.svg'));

                iconRegistry.addSvgIcon(
                    'governance_record_hasCredential',
                    sanitizer.bypassSecurityTrustResourceUrl('assets/icons/Record_hasCredential.svg')
                );

                iconRegistry.addSvgIcon('governance_empty_widget', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/Empty_widget.svg'));
            },
            deps: [ExtensionService, DomSanitizer, MatIconRegistry],
            multi: true,
        },
    ]);
}
