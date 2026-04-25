/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseFilterFormType } from '@alfresco/adf-hx-content-services/services';

export interface CreatedDateFormType extends BaseFilterFormType {
    defaultOption: Date;
    isCustomDate: boolean;
    afterDate: Date;
    beforeDate: Date;
}
