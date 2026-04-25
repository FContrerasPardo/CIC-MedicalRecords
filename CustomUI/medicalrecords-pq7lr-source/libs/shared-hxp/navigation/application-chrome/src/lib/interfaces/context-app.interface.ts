/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppEnv } from './app-env.interface';

export interface ContextApp {
    id: string;
    name: string;
    launchUrl: string;
    appKey?: string;
    environment?: AppEnv;
}
