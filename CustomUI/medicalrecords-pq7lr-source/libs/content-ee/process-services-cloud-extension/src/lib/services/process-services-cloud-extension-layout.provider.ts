/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken } from '@angular/core';
import { Subject } from 'rxjs';

export type NavBarMode = 'collapsed' | 'expanded';

export interface LayoutService {
    appNavNarMode$: Subject<NavBarMode>;
    toggleAppNavBar$: Subject<void>;
}

export const PROCESS_SERVICES_CLOUD_LAYOUT_PROVIDER = new InjectionToken<LayoutService>('PROCESS_SERVICES_CLOUD_LAYOUT_PROVIDER');
