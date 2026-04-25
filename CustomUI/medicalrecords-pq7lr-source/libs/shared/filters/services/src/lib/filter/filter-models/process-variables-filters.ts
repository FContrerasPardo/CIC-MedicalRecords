/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessFilterOperators } from '@alfresco/adf-process-services-cloud';
import { DateFilter, DateFilterConfig } from './date-filter.model';
import { NumberFilter, NumberFilterConfig } from './number-filter.model';
import { RadioFilter, RadioFilterConfig } from './radio-filter.model';
import { StringFilter, StringFilterConfig } from './string-filter.model';

interface ProcessVariableFilterData {
    processDefinitionKey: string;
    variableName: string;
    variableType: string;
    operator: ProcessFilterOperators | string;
}

interface ProcessVariableFilterDataConfig {
    data: ProcessVariableFilterData;
}

export type ProcessVariableNumberFilterConfig = ProcessVariableFilterDataConfig & NumberFilterConfig;
export type ProcessVariableStringFilterConfig = ProcessVariableFilterDataConfig & StringFilterConfig;
export type ProcessVariableDateFilterConfig = ProcessVariableFilterDataConfig & DateFilterConfig;
export type ProcessVariableRadioFilterConfig = ProcessVariableFilterDataConfig & RadioFilterConfig;

export type ProcessVariableFilterConfig =
    | ProcessVariableNumberFilterConfig
    | ProcessVariableStringFilterConfig
    | ProcessVariableDateFilterConfig
    | ProcessVariableRadioFilterConfig;

export class ProcessVariableStringFilter extends StringFilter {
    data: ProcessVariableFilterData;
    override priority = 100;

    constructor(config: ProcessVariableStringFilterConfig) {
        super(config);
        this.data = config.data;
    }
}

export class ProcessVariableNumberFilter extends NumberFilter {
    data: ProcessVariableFilterData;
    override priority = 100;

    constructor(config: ProcessVariableNumberFilterConfig) {
        super(config);
        this.data = config.data;
    }
}

export class ProcessVariableDateFilter extends DateFilter {
    data: ProcessVariableFilterData;
    override priority = 100;

    constructor(config: ProcessVariableDateFilterConfig) {
        super(config);
        this.data = config.data;
    }
}

export class ProcessVariableRadioFilter extends RadioFilter {
    data: ProcessVariableFilterData;
    override priority = 100;

    constructor(config: ProcessVariableRadioFilterConfig) {
        super(config);
        this.data = config.data;
    }
}

export type ProcessVariableFilter =
    | ProcessVariableStringFilter
    | ProcessVariableNumberFilter
    | ProcessVariableDateFilter
    | ProcessVariableRadioFilter;
