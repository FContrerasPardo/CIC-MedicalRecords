/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';
import { ContextApp } from '../interfaces/context-app.interface';
import { AppEnv } from '../interfaces/app-env.interface';
import { getUniqueEnvs } from '../utils/get-unique-envs.util';

@Pipe({
    name: 'contextEnvs',
})
export class ContextEnvsPipe implements PipeTransform {
    transform(apps: ContextApp[]): AppEnv[] {
        return getUniqueEnvs(apps.filter((app: ContextApp) => !!app.environment).map((app: ContextApp) => app.environment || ({} as AppEnv)));
    }
}
