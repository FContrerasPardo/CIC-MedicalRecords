/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { isEqual } from 'es-toolkit/compat';
import { Filter, FilterType } from '../filter.model';

export interface StringFilterConfig {
    name: string;
    translationKey: string;
    description?: string;
    value: string[] | null;
    allowEmpty?: boolean;
    visible: boolean;
    priority?: number;
}

export class StringFilter implements Filter<string[]> {
    readonly type = FilterType.STRING;

    name = '';
    translationKey = '';
    value: string[] | null = null;
    description?: string;
    allowEmpty = true;
    visible = false;
    priority?: number;

    constructor(config: StringFilterConfig) {
        this.name = config.name;
        this.translationKey = config.translationKey;
        this.value = config.value;
        this.allowEmpty = config.allowEmpty ?? true;
        this.visible = config.visible;
        this.description = config.description;
        this.priority = config.priority;
    }

    isValueEqualTo(other: StringFilter): boolean {
        const isCurrentValueEmpty = this.value === null || this.value.length === 0;
        const isOtherValueEmpty = other.value === null || other.value.length === 0;
        const areBothValuesEmpty = isCurrentValueEmpty && isOtherValueEmpty;

        return areBothValuesEmpty || isEqual(this.value, other.value);
    }
}
