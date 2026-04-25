/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ParamType } from './params';
import { CommanderOptionParams, ComplexCommanderOptionParams, Param } from './param';

export class ConfirmParam extends Param {
    protected type = ParamType.confirm;

    get commanderOption(): ComplexCommanderOptionParams {
        const optionParams: CommanderOptionParams = [`-${this.options.alias}, --${this.options.name}`, this.formattedTitle + ' (true)'];
        optionParams.push((value, previousValue) => (value !== undefined ? !!value : previousValue));
        this.addDefaultParamIfNeeded(optionParams);

        const negatedOptionParams: CommanderOptionParams = [`--no-${this.options.name}`, this.formattedTitle + ' (false)'];
        negatedOptionParams.push((value, previousValue) => (value !== undefined ? !value : previousValue));

        return new ComplexCommanderOptionParams([optionParams, negatedOptionParams]);
    }

    get inquirerOption() {
        return {
            type: this.type,
            name: this.options.name,
            message: this.options.title,
            ...(this.options.value !== undefined ? { default: !!this.options.value } : {}),
        };
    }
}
