/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContentActionRef, ExtensionConfig, ExtensionService } from '@alfresco/adf-extensions';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class ToolbarMenuItemsFactoryService {
    private readonly extensionService = inject(ExtensionService);

    getMoreMenuItems(): Observable<ContentActionRef> {
        const featureName = 'header';
        const actionType = 'menu';

        return this.extensionService.setup$.pipe(
            filter((config) => this.hasFeature(featureName, config)),
            map<ExtensionConfig, ContentActionRef[]>((config) => config.features?.[featureName]),
            map<ContentActionRef[], ContentActionRef>(
                (actionsRef) => actionsRef.find((actionRef) => actionRef.type === actionType) as ContentActionRef
            ),
            filter((moreMenuAction) => !!moreMenuAction.children?.length),
            shareReplay(1)
        );
    }

    private hasFeature(featureName: string, config?: ExtensionConfig): boolean {
        const feature = config?.features?.[featureName];
        return feature !== undefined && Array.isArray(feature);
    }
}
