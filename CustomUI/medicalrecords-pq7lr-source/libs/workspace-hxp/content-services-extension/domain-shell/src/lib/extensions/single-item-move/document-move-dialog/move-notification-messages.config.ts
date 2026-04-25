/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DocumentType, MoveStatus } from '@alfresco/adf-hx-content-services/services';

export const moveNotificationMessages: Record<MoveStatus, Record<DocumentType, string>> = {
    [MoveStatus.SUCCESS]: {
        FOLDER: 'SNACKBAR.MOVE.FOLDER_SUCCESS',
        FILE: 'SNACKBAR.MOVE.FILE_SUCCESS',
    },
    [MoveStatus.ERROR]: {
        FOLDER: 'SNACKBAR.MOVE.FOLDER_ERROR',
        FILE: 'SNACKBAR.MOVE.FILE_ERROR',
    },
};
