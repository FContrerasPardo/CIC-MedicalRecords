/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { ContextApp } from '../interfaces/context-app.interface';
import { AppEnv } from '../interfaces/app-env.interface';
import { HOME_TOKEN } from '../tokens/home.token';
import { sortApps } from '../utils/sort-apps.util';

@Pipe({
    name: 'envApps',
})
export class EnvAppsPipe implements PipeTransform {
    private readonly home = inject(HOME_TOKEN);

    transform(apps: ContextApp[], currentEnv: AppEnv): ContextApp[] {
        return sortApps(
            apps.filter((app: ContextApp) => !app.environment || app.environment.id === currentEnv.id),
            this.home.id
        );
    }
}
