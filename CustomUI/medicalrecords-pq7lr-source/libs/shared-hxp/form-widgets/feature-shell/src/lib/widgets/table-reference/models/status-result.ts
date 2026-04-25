/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const StatusResult = {
    STATUS_IMPORTANT_LOUD: 'important-loud',
    STATUS_IMPORTANT: 'important',
    STATUS_SUCCESS: 'success',
    STATUS_WARNING: 'warning',
    STATUS_INFO: 'info',
    STATUS_NEUTRAL: 'neutral',
} as const;

export type StatusResult = keyof typeof StatusResult;
