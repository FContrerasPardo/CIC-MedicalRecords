/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ConfigOptions, ToolbarPosition } from './config-options';
import { UserLayoutOptions } from './layout';

export const ConfigDefault: ConfigOptions = {
    defaultLayoutType: { type: UserLayoutOptions.Single_Vertical },
    defaultZoomConfig: { min: 25, max: 500, step: 25 },
    defaultZoomLevel: 100,
    toolbarPosition: ToolbarPosition.Right,
    lazyLoad: {
        enabled: true,
        rootMargin: '200px 200px', // top/bottom left/right
        threshold: 0.1, // 10%
    },
};
