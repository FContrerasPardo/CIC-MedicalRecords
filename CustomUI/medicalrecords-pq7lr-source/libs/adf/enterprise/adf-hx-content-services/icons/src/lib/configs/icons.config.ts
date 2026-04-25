/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { mimeTypeLinkedImages } from '../configs/mime-type.config';

export const DefaultIcon = {
    UNKNOWN: 'document',
    FOLDER: 'folder',
    OPEN_FOLDER: 'folder_open',
} as const;

export type DefaultIcon = typeof DefaultIcon[keyof typeof DefaultIcon];

export type MimeType = keyof typeof mimeTypeLinkedImages;
