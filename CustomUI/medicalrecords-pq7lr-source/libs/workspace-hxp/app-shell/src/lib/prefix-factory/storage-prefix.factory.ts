/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService, StoragePrefixFactoryService } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class StoragePrefixFactory implements StoragePrefixFactoryService {
    private readonly appConfigService = inject(AppConfigService);

    getPrefix(): Observable<string | undefined> {
        return this.appConfigService.select('alfresco-deployed-apps').pipe(
            map((deployedApps: Array<{ name: string }>) => {
                return deployedApps[0]?.name;
            })
        );
    }
}
