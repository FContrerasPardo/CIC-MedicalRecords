/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DeletedStatus } from './deleted-status.enum';

interface MessageStructure {
    SINGLE: string;
    MULTI: string;
}

export const deleteItemNotificationMessages: Record<DeletedStatus, MessageStructure> = {
    [DeletedStatus.REQUEST]: {
        SINGLE: 'DOCUMENT_DELETE.SNACKBAR.DELETE.ITEM.REQUEST',
        MULTI: 'DOCUMENT_DELETE.SNACKBAR.DELETE.MULTIPLE_ITEMS.REQUEST',
    },
    [DeletedStatus.SUCCESS]: {
        SINGLE: 'DOCUMENT_DELETE.SNACKBAR.DELETE.ITEM.SUCCESS',
        MULTI: 'DOCUMENT_DELETE.SNACKBAR.DELETE.MULTIPLE_ITEMS.SUCCESS',
    },
    [DeletedStatus.ERROR]: {
        SINGLE: 'DOCUMENT_DELETE.SNACKBAR.DELETE.ITEM.ERROR',
        MULTI: 'DOCUMENT_DELETE.SNACKBAR.DELETE.MULTIPLE_ITEMS.ERROR',
    },
};
