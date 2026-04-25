/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DefaultStatusSnackBarIcon } from '@alfresco/adf-hx-content-services/api';
import { DeletedStatus } from './deleted-status.enum';

export const deleteSnackBarTypes: Record<DeletedStatus, DefaultStatusSnackBarIcon> = {
    [DeletedStatus.REQUEST]: 'info',
    [DeletedStatus.SUCCESS]: 'done',
    [DeletedStatus.ERROR]: 'error',
};
