/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Filter } from './filter.model';
import {
    ProcessVariableDateFilter,
    ProcessVariableFilter,
    ProcessVariableNumberFilter,
    ProcessVariableRadioFilter,
    ProcessVariableStringFilter,
} from './filter-models/process-variables-filters';

export const isProcessVariableFilter = (processFilter: Filter): processFilter is ProcessVariableFilter => {
    return (
        processFilter instanceof ProcessVariableStringFilter ||
        processFilter instanceof ProcessVariableNumberFilter ||
        processFilter instanceof ProcessVariableDateFilter ||
        processFilter instanceof ProcessVariableRadioFilter
    );
};
