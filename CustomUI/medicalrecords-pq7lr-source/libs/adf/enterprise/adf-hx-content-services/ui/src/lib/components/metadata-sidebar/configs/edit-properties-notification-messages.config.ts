/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EditPropertiesStatus } from './edit-properties-status.enum';

export const editPropertiesNotificationMessages: Record<EditPropertiesStatus, string> = {
    [EditPropertiesStatus.SUCCESS]: 'DOCUMENT.PROPERTIES.EDIT.SUCCESS',
    [EditPropertiesStatus.ERROR]: 'DOCUMENT.PROPERTIES.EDIT.ERROR',
    [EditPropertiesStatus.INFO]: 'DOCUMENT.PROPERTIES.EDIT.INFO',
};
