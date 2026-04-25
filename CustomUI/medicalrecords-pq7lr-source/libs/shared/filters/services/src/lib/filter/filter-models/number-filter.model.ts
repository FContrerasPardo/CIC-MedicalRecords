/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Filter, FilterType, NumberFilterOperatorType, NumberFilterValue } from '../filter.model';

export interface NumberFilterConfig {
    name: string;
    translationKey: string;
    value: NumberFilterValue | null;
    description?: string;
    visible: boolean;
    allowEmpty?: boolean;
    compareOptions?: Map<NumberFilterOperatorType, string>;
    allowDecimalValues?: boolean;
    priority?: number;
}

export class NumberFilter implements Filter<NumberFilterValue> {
    readonly type = FilterType.NUMBER;

    name = '';
    translationKey = '';
    value: NumberFilterValue | null = null;
    description?: string;
    allowEmpty = true;
    visible = false;
    compareOptions?: Map<NumberFilterOperatorType, string>;
    allowDecimalValues = false;
    priority?: number;

    constructor(config: NumberFilterConfig) {
        this.name = config.name;
        this.translationKey = config.translationKey;
        this.value = config.value;
        this.allowEmpty = config.allowEmpty ?? true;
        this.visible = config.visible;
        this.compareOptions = config.compareOptions;
        this.description = config.description;
        this.allowDecimalValues = config.allowDecimalValues || false;
        this.priority = config.priority;
    }

    isValueEqualTo(other: NumberFilter): boolean {
        return (
            this.value?.operator === other.value?.operator && this.value?.value1 === other.value?.value1 && this.value?.value2 === other.value?.value2
        );
    }
}
