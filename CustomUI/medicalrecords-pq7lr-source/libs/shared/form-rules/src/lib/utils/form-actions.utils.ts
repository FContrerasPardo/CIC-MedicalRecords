/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FieldInputs, ShowSpinnerPayload, StartProcessPayload, VariablesInputs } from '../model/form-rules.model';

export function getActionType(action: string, defaultType = 'string'): string {
    switch (action) {
        case StartProcessPayload.INPUTS: {
            return 'start-process-inputs';
        }
        case ShowSpinnerPayload.MESSAGE:
        case FieldInputs.VALUE:
        case VariablesInputs.VALUE: {
            return defaultType;
        }
        case ShowSpinnerPayload.SHOW_SPINNER: {
            return 'boolean';
        }
        default: {
            return 'boolean';
        }
    }
}
