/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const FileSourceServiceId = {
    HXP_CONTENT: 'hxp-content',
    HXP_LOCAL: 'hxp-local',
    ALL_FILE_SOURCES: 'all-file-sources',
} as const;

export type FileSourceServiceId = typeof FileSourceServiceId[keyof typeof FileSourceServiceId];
