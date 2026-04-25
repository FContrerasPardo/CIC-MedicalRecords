/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Filter, FilterType, Option } from '../filter.model';

export interface RadioFilterConfig {
    name: string;
    translationKey: string;
    description?: string;
    value: Option | null;
    options: Option[];
    allowEmpty?: boolean;
    visible: boolean;
    priority?: number;
}

export class RadioFilter implements Filter<Option> {
    readonly type = FilterType.RADIO;

    name = '';
    translationKey = '';
    description?: string;
    value: Option | null = null;
    options: Option[] = [];
    allowEmpty = true;
    visible = false;
    priority?: number;

    constructor(config: RadioFilterConfig) {
        this.name = config.name;
        this.translationKey = config.translationKey;
        this.value = config.value;
        this.options = config.options;
        this.allowEmpty = config.allowEmpty ?? true;
        this.visible = config.visible;
        this.description = config.description;
        this.priority = config.priority;
    }

    isValueEqualTo(other: RadioFilter): boolean {
        return this.value?.value === other.value?.value;
    }
}
