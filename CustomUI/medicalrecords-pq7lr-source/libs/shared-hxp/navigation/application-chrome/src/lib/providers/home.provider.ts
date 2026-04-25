/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Provider } from '@angular/core';
import { ContextName } from '../interfaces/context-name.interface';
import { HOME_TOKEN } from '../tokens/home.token';

export function provideHome(home: ContextName): Provider {
    return {
        provide: HOME_TOKEN,
        useValue: home,
    };
}
