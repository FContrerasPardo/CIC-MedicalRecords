/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const DialogConfig: Readonly<{
    small: { width: string; height: string };
    medium: { width: string; height: string };
    large: { width: string; height: string };
}> = {
    small: {
        width: '500px',
        height: '640px',
    },
    medium: {
        width: '700px',
        height: '640px',
    },
    large: {
        width: '900px',
        height: '640px',
    },
};
