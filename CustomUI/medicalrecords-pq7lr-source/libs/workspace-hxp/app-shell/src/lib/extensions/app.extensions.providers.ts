/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { combineLatest } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AppConfigService } from '@alfresco/adf-core';
import { AppExtensionService } from './app.extension.service';
import { ExtensionConfig, ExtensionRef, ExtensionService, mergeObjects } from '@alfresco/adf-extensions';
import { EnvironmentProviders, importProvidersFrom, inject, provideAppInitializer, Provider } from '@angular/core';
import { ProcessServicesCloudExtensionProcessFormFeatureShellModule } from '@alfresco-dbp/workspace-hxp/process-services-cloud-extension/process-form/feature-shell';

function setupDynamicExtension(extensions: ExtensionService, appConfigService: AppConfigService, appExtensionService: AppExtensionService) {
    const customModeledExtension$ = appConfigService.select('custom-modeled-extension').pipe(
        filter((ext) => !!ext?.$id),
        take(1)
    );

    combineLatest([customModeledExtension$, extensions.setup$, appExtensionService.onLoad$])
        .pipe(take(1))
        .subscribe(([customModeledExtension, extensionConfig]) => {
            if (!extensionConfig?.$references?.find((ref) => ref['$id'] === customModeledExtension.$id)) {
                initializeExtension(extensionConfig, customModeledExtension, extensions);
            }
        });
}

function initializeExtension(config: ExtensionConfig, customModeledExtension: ExtensionRef, extensions: ExtensionService) {
    config.features = config.features ? mergeObjects(config.features, customModeledExtension.features || {}) : customModeledExtension.features;
    config.rules = customModeledExtension.rules ? [...(config.rules || []), ...customModeledExtension.rules] : config.rules;
    config.actions = customModeledExtension.actions ? [...(config.actions || []), ...customModeledExtension.actions] : config.actions;
    config.routes = customModeledExtension.routes ? [...(config.routes || []), ...customModeledExtension.routes] : config.routes;
    config.appConfig = config.appConfig ? mergeObjects(config.appConfig, customModeledExtension.appConfig) : customModeledExtension.appConfig;

    config.$references = config.$references || [];
    config.$references.push({
        $id: customModeledExtension.$id,
        $name: customModeledExtension.$name,
        $description: customModeledExtension.$description,
        $vendor: customModeledExtension.$vendor,
        $license: customModeledExtension.$license,
        $version: customModeledExtension.$version,
    });

    extensions.setup(config);
}

export function provideAppExtensions(): (EnvironmentProviders | Provider)[] {
    return [
        importProvidersFrom([ProcessServicesCloudExtensionProcessFormFeatureShellModule]),

        provideAppInitializer(() => {
            const extensions = inject(AppExtensionService);
            return extensions.load();
        }),

        provideAppInitializer(() => {
            const extensions = inject(ExtensionService);
            const appConfigService = inject(AppConfigService);
            const appExtensionService = inject(AppExtensionService);
            setupDynamicExtension(extensions, appConfigService, appExtensionService);
        }),
    ];
}
