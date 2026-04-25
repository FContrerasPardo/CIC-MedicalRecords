/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContextApp } from '../../interfaces/context-app.interface';

export const mockAppV1: ContextApp = {
    id: 'mock-id-v1',
    name: 'mock-name-v1',
    launchUrl: 'mock-launch-url-v1',
    appKey: 'mock-app-key-v1',
};

export const mockAppV2: ContextApp = {
    id: 'mock-id-v2',
    name: 'mock-name-v2',
    launchUrl: 'mock-launch-url-v2',
    appKey: 'mock-app-key-v2',
};

export const mockCurrentAppKey = 'mock-app-key-v1';
