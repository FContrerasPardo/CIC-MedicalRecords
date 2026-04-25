/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const Platform = {
    Windows: 'windows',
    Mac: 'mac',
} as const;

export type Platform = typeof Platform[keyof typeof Platform];

export const PlatformUtil = {
    getPlatform: (): Platform => {
        const osTestStrings = [
            { s: Platform.Windows, r: /(Win|Windows NT)/ },
            { s: Platform.Mac, r: /(Mac OS|Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
        ];

        const platform = osTestStrings.find((os) => os.r.test(navigator.userAgent));
        return platform ? platform.s : Platform.Windows;
    },
};
