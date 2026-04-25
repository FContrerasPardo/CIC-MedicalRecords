/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken, ModuleWithProviders, NgModule, Provider } from '@angular/core';
import { Store } from '@ngrx/store';
import {
    AuthGuard,
    AppConfigService,
    ThumbnailService,
    provideTranslations,
    FORM_RULES_MANAGER,
    ADF_AMOUNT_SETTINGS,
    ADF_DISPLAY_TEXT_SETTINGS,
    ADF_CUSTOM_MESSAGE
} from '@alfresco/adf-core';
import { ExtensionService, provideAppExtensions, provideExtensionConfig } from '@alfresco/adf-extensions';
import { ProcessExtensionServiceCloud } from './services/process-extension-cloud.service';
import {
    processServiceCloudPluginLoaderFactory,
    ExtensionLoaderCallback,
    EXTENSION_DATA_LOADERS,
} from './services/process-service-cloud-plugin-loader.factory';
import { isProcessServiceCloudPluginEnabled } from './rules/process-services-cloud.rules';
import { ProcessServicesCloudExtensionStoreModule } from './store/process-services-cloud-extension.store.module';
import { SidenavCloudExtComponent } from './components/sidenav-cloud-ext/sidenav-cloud-ext.component';
import { TaskCloudModule, ProcessServicesCloudModule, UserPreferenceCloudService } from '@alfresco/adf-process-services-cloud';
import { ProcessListCloudModule } from './features/process-list/process-list.module';
import { TaskDetailsCloudModule } from './features/task-details/task-details-cloud.module';
import {
    AmountWidgetConfigProviderService,
    CustomValidationMessageConfigProviderService,
    FormRulesImplementationService,
    FormDisplayTextConfigProviderService,
} from '@alfresco-dbp/shared/form-rules';
import { TaskFiltersProxyComponent } from './components/task-filters-proxy/task-filters-proxy.component';
import { ProcessFiltersProxyComponent } from './components/process-filters-proxy/process-filters-proxy.component';
import { DisplayMessageComponent } from './components/display-message/display-message.component';
import { provideRouter, Routes } from '@angular/router';
import { ProcessDetailsCloudExtComponent } from './features/process-details/components/process-details/process-details-cloud-ext.component';
import { provideEffects } from '@ngrx/effects';
import { StartProcessEffects } from './features/start-process/effects/start-process.effects';
import { StartProcessComponent } from './features/start-process/components/start-process/start-process.component';
import { canShow } from './features/start-process/rules/start-process.rules';
import { TaskListCloudEffects } from './features/task-list/store/effects/task-list-cloud.effects';
import { TaskListCloudContainerExtComponent } from './features/task-list/components/task-list-cloud-ext/task-list-cloud-container-ext.component';
import { MainActionButtonComponent } from './components/main-action-button/main-action-button.component';
import { Apollo } from 'apollo-angular';
import { STUDIO_SHARED } from '@features';

interface ProcessServicesCloudExtensionModuleConfig {
    extensionDataLoadersToken?: InjectionToken<ExtensionLoaderCallback>;
}

const processServicesCloudExtensionRoutes: Routes = [
    {
        path: 'display-message',
        component: DisplayMessageComponent,
    },
];

const defaultExtensionLoaderProvider = {
    provide: EXTENSION_DATA_LOADERS,
    multi: true,
    useFactory: processServiceCloudPluginLoaderFactory,
    deps: [ProcessExtensionServiceCloud, AppConfigService, Store],
};

@NgModule({
    imports: [
        ProcessServicesCloudExtensionStoreModule,
        TaskCloudModule,
        ProcessServicesCloudModule.forRoot(undefined, UserPreferenceCloudService as any),
        ProcessListCloudModule,
        TaskDetailsCloudModule,
    ],
    providers: [
        provideAppExtensions(),
        provideRouter(processServicesCloudExtensionRoutes),
        provideEffects([StartProcessEffects, TaskListCloudEffects]),
        Apollo,
        {
            provide: FORM_RULES_MANAGER,
            useExisting: FormRulesImplementationService,
        },
        provideTranslations('process-services-cloud-extension', 'assets/adf-process-services-cloud-extension'),
        defaultExtensionLoaderProvider,
        provideExtensionConfig(['process-services-cloud.extension.json']),
        {
            provide: ADF_AMOUNT_SETTINGS,
            useFactory: (service: AmountWidgetConfigProviderService) => service.provideConfig(STUDIO_SHARED.STUDIO_LOCALE_SPECIFIC_AMOUNT),
            deps: [AmountWidgetConfigProviderService],
        },
        {
            provide: ADF_DISPLAY_TEXT_SETTINGS,
            useFactory: (service: FormDisplayTextConfigProviderService) => service.provideConfig(STUDIO_SHARED.STUDIO_VARIABLES_IN_FORM_DISPLAY_TEXT),
            deps: [FormDisplayTextConfigProviderService],
        },
        {
            provide: ADF_CUSTOM_MESSAGE,
            useFactory: (service: CustomValidationMessageConfigProviderService) => service.provideConfig(STUDIO_SHARED.STUDIO_CONFIGURABLE_FORM_VALIDATION_MESSAGE),
            deps: [CustomValidationMessageConfigProviderService],
        },
    ],
})
export class ProcessServicesCloudExtensionModule {
    constructor(
        extensions: ExtensionService,
        processExtensionServiceCloud: ProcessExtensionServiceCloud,
        // ThumbnailService is used for icons registration
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _thumbnailService: ThumbnailService
    ) {
        extensions.setAuthGuards({
            'process-services-cloud.auth': AuthGuard,
        });

        extensions.setComponents({
            'process-services-cloud.process-services-cloud.sidenav': SidenavCloudExtComponent,
            'process-services-cloud.task-filters-proxy': TaskFiltersProxyComponent,
            'process-services-cloud.process-filters-proxy': ProcessFiltersProxyComponent,
            'process-services-cloud.message-display': DisplayMessageComponent,
            'process-services-cloud.process-details': ProcessDetailsCloudExtComponent,
            'process-services-cloud.start-process.start': StartProcessComponent,
            'process-services-cloud.task-list': TaskListCloudContainerExtComponent,
            'task-list-header-action': MainActionButtonComponent,
        });

        extensions.setEvaluators({
            'hide-element': () => false,
            'process-services-cloud.isEnabled': isProcessServiceCloudPluginEnabled,
            'process-services-cloud.isRunning': isProcessServiceCloudRunning,
            'process-services-cloud.start-process.canShow': canShow,
        });

        function isProcessServiceCloudRunning(): boolean {
            return processExtensionServiceCloud.processServicesCloudRunning;
        }
    }

    static withConfig(config: ProcessServicesCloudExtensionModuleConfig): ModuleWithProviders<ProcessServicesCloudExtensionModule> {
        const providers: Provider[] = [];

        if (config.extensionDataLoadersToken) {
            providers.push({
                ...defaultExtensionLoaderProvider,
                provide: config.extensionDataLoadersToken,
            });
        }

        return {
            ngModule: ProcessServicesCloudExtensionModule,
            providers,
        };
    }
}
