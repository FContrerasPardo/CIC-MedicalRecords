/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessVariableStringFilterConfig } from '../../../filter/filter-models/process-variables-filters';
import { CreateProcessVariableConfigFilterStrategy } from './base-config-strategy';

export class ProcessStringFilterConfigStrategy extends CreateProcessVariableConfigFilterStrategy {
    create(): ProcessVariableStringFilterConfig {
        const stringVariableConfig: ProcessVariableStringFilterConfig = {
            data: {
                processDefinitionKey: this.process.key,
                variableName: this.variable.name,
                variableType: this.variable.type,
                operator: this.alreadyCreatedFilters[0]?.operator ?? 'eq',
            },
            name: this.name,
            translationKey: this.translationKey,
            description: this.description,
            value: this.alreadyCreatedFilters[0]?.value ? ['' + this.alreadyCreatedFilters[0].value] : [],
            visible: !!this.alreadyCreatedFilters[0]?.value,
        };

        return stringVariableConfig;
    }
}
