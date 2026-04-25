/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { AppEnv } from '../interfaces/app-env.interface';
import { ContextApp } from '../interfaces/context-app.interface';
import { CONTROL_CENTER_TOKEN } from '../tokens/control-center.token';
import { AppKeyService } from '../services/app-key.service';

@Pipe({
    name: 'initialEnv',
})
export class InitialEnvPipe implements PipeTransform {
    private readonly appKeyService = inject(AppKeyService);
    private readonly controlCenter = inject(CONTROL_CENTER_TOKEN);

    transform(apps: ContextApp[]): AppEnv {
        return apps.find((app: ContextApp) => app.appKey === this.appKeyService.currentKey)?.environment || this.controlCenter;
    }
}
