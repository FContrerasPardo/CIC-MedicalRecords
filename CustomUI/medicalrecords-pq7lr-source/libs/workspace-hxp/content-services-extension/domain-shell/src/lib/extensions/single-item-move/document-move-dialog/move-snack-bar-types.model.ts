/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MoveStatus } from '@alfresco/adf-hx-content-services/services';
import { DefaultStatusSnackBarIcon } from '@alfresco/adf-hx-content-services/api';

export const moveSnackBarTypes: Record<MoveStatus, DefaultStatusSnackBarIcon> = {
    [MoveStatus.SUCCESS]: 'done',
    [MoveStatus.ERROR]: 'error',
};
