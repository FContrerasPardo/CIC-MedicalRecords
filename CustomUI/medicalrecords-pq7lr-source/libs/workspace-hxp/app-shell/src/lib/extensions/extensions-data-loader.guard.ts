/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { EXTENSION_DATA_LOADERS_TOKEN } from '@alfresco-dbp/workspace-hxp/process-services-cloud-extension/process-form/feature-shell';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export type ExtensionLoaderCallback = (route: ActivatedRouteSnapshot) => Observable<boolean>;

export const DefaultExtensionLoaderFactory = () => [];

export const ExtensionsDataLoaderGuard: CanActivateFn = (route: ActivatedRouteSnapshot): Observable<boolean> => {
    const extensionDataLoaders = inject(EXTENSION_DATA_LOADERS_TOKEN);
    if (extensionDataLoaders.length === 0) {
        return of(true);
    }

    const dataLoaderCallbacks = extensionDataLoaders.map((callback) => callback(route));

    return forkJoin(dataLoaderCallbacks).pipe(
        map(() => true),
        catchError((e) => {

            console.error('Some of the extension data loader guards has been errored.');

            console.error(e);
            return of(true);
        })
    );
};
