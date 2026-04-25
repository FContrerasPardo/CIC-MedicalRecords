/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DefaultStatusSnackBarIcon } from '@alfresco/adf-hx-content-services/api';
import { CopyStatus } from '@alfresco/adf-hx-content-services/services';

export const copySnackBarTypes: Record<CopyStatus, DefaultStatusSnackBarIcon> = {
    [CopyStatus.SUCCESS]: 'done',
    [CopyStatus.ERROR]: 'error',
};
