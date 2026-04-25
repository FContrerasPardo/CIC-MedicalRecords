/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { GlobalApps } from '../interfaces/global-apps.interface';

export const DEFAULT_GLOBAL_APPS: GlobalApps = {
    data: {
        currentUser: {
            id: '',
            accountApps: [],
            subscribedApps: [],
            platformHomeUrl: '',
        },
    },
};
