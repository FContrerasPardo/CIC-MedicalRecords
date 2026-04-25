/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContextApp } from '../interfaces/context-app.interface';

export function sortApps(apps: ContextApp[], homeId: string): ContextApp[] {
    return apps.sort((a: ContextApp, b: ContextApp) => {
        if (a.id === homeId) {
            return -1;
        }

        if (b.id === homeId) {
            return 1;
        }

        return a.name.localeCompare(b.name);
    });
}
