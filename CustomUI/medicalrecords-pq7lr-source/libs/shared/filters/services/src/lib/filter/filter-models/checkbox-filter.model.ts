/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { isEqual } from 'es-toolkit/compat';
import { Filter, FilterType, Option } from '../filter.model';

export interface CheckboxFilterConfig {
    name: string;
    translationKey: string;
    value: Option[] | null;
    options: Option[];
    allowEmpty?: boolean;
    visible: boolean;
    priority?: number;
}

export class CheckboxFilter implements Filter<Option[]> {
    readonly type = FilterType.CHECKBOX;

    name = '';
    translationKey = '';
    value: Option[] | null = null;
    options: Option[] = [];
    allowEmpty = true;
    visible = false;
    priority?: number;

    constructor(config: CheckboxFilterConfig) {
        this.name = config.name;
        this.translationKey = config.translationKey;
        this.value = config.value;
        this.options = config.options;
        this.allowEmpty = config.allowEmpty ?? true;
        this.visible = config.visible;
        this.priority = config.priority;
    }

    isValueEqualTo(other: CheckboxFilter): boolean {
        const isCurrentValueEmpty = this.value === null || this.value.length === 0;
        const isOtherValueEmpty = other.value === null || other.value.length === 0;
        const areBothValuesEmpty = isCurrentValueEmpty && isOtherValueEmpty;

        return areBothValuesEmpty || isEqual(this.value, other.value);
    }
}
