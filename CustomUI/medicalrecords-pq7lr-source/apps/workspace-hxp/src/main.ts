/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { AppExtensionService } from '@alfresco/adf-extensions';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { CustomAlfrescoApiFactory } from './app/services/alfresco-api-factory';
import { enableProdMode, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { SHARED_IDENTITY_FULL_NAME_PIPE_INCLUDE_EMAIL } from '@alfresco-dbp/shared/identity';
import { provideCustomAuthStoragePrefix } from '@alfresco-dbp/shared-authentication-services';
import { provideFeatureFlagsWithInitializer } from '@hxp/shared-hxp/services';
import { providePublicAccessShell } from '@hxp/workspace-hxp/public-access-extension/domain-shell';
import { provideAppConfig, provideCoreAuth, provideI18N } from '@alfresco/adf-core';
import { provideExperienceWorkspaceAppShell, provideAppExtensions } from '@hxp/workspace-hxp/app-shell';
import { ALFRESCO_API_FACTORY, AlfrescoApiLoaderService } from '@alfresco/adf-content-services';
import { PluginsModule } from '@plugins';
import { provideAnalytics } from '@alfresco-dbp/shared/analytics';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideSatoriTheme } from '@hylandsoftware/satori-ui';
import { registerAppLocales } from './app/app.i18n';

registerAppLocales();

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        provideAppConfig(),
        provideCoreAuth({ useHash: true }),
        provideAnimations(),
        provideHttpClient(),
        provideAppExtensions(),
        provideAnalytics(),
        providePublicAccessShell(),
        provideRouter([], withHashLocation()),
        provideExperienceWorkspaceAppShell(),
        provideStore({}),
        provideEffects([]),
        importProvidersFrom(PluginsModule),
        provideAppInitializer(() => {
            const extensions = inject(AppExtensionService);
            return extensions.load();
        }),
        provideAppInitializer(() => {
            const alfrescoApiLoader = inject(AlfrescoApiLoaderService);
            return alfrescoApiLoader.init();
        }),
        provideFeatureFlagsWithInitializer('hxw-feature-flags', environment.devTools),
        {
            provide: ALFRESCO_API_FACTORY,
            useClass: CustomAlfrescoApiFactory,
        },
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: { appearance: 'outline' },
        },
        {
            provide: SHARED_IDENTITY_FULL_NAME_PIPE_INCLUDE_EMAIL,
            useValue: true,
        },
        {
            provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
            useValue: {
                duration: 10000,
            },
        },
        provideI18N({
            defaultLanguage: 'en',
            assets: [
                ['app', 'resources'],
                ['idp-viewer', 'assets/idp-viewer'],
                ['upload-files', 'assets/upload-files'],
                ['shared-filters-smart', 'resources/shared/filters/smart'],
                ['idp-services-extension-shared', 'assets/idp-services-extension-shared'],
                ['public-access-extension-forms', 'assets/public-access-extension/public-forms'],
                ['idp-services-extension-domain-shell', 'assets/idp-services-extension-domain-shell'],
                ['adf-hx-content-services-search-icons', 'assets/adf-enterprise-adf-hx-content-services-icons'],
                ['content-services-extension-search-feature-shell', 'assets/content-services-extension-search'],
                ['idp-services-extension-class-verification', 'assets/idp-services-extension-class-verification'],
                ['idp-services-extension-document-scanning', 'assets/idp-services-extension-document-scanning'],
                ['idp-services-extension-field-verification', 'assets/idp-services-extension-field-verification'],
                ['content-services-extension-shared-content-repository-ui', 'assets/content-services-extension-shared-content-repository'],
                ['navigation-application-chrome', 'assets/navigation/application-chrome'],
                ['satori-ui', 'assets/satori-ui'],
                ['satori-preview', 'assets/satori-preview'],
                ['navigation-header', 'assets/navigation/header'],
                ['adf-enterprise-adf-hx-content-services-services', 'assets/adf-enterprise-adf-hx-content-services-services'],
                ['process-services-cloud-extension-process-form', 'assets/process-services-cloud-extension-process-form'],
            ],
        }),
        ...provideCustomAuthStoragePrefix(),
        ...(environment.production ? [] : [provideStoreDevtools({ maxAge: 25 })]),
        provideSatoriTheme(),
    ],
    // eslint-disable-next-line
}).catch((error) => console.error(error));
