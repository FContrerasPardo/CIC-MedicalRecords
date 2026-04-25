/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Provider } from '@angular/core';
import { ICON_ALIAS_MAP_TOKEN } from '@alfresco/adf-core';
import { ICON_ALIAS_MAP } from '../config/icon-alias-map.json';

export function provideIconAliasMap(): Provider {
    return {
        provide: ICON_ALIAS_MAP_TOKEN,
        useValue: ICON_ALIAS_MAP,
    };
}
