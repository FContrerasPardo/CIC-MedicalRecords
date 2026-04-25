/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormRulesEvent } from '@alfresco/adf-core';
import { ProcessInstanceVariable } from '@alfresco/adf-process-services-cloud';
import { PayloadBody } from '../model/form-rules.model';

export interface ActionData {
    target: string;
    payload: PayloadBody;
}

export interface OnProcessFinishCondition {
    type: 'CORRELATION_KEY';
    value: string;
}

export interface FormProcessFinishEventData {
    process: {
        processInstanceId: string;
        correlationKey: string;
        variable: {
            [variableName: string]: ProcessInstanceVariable;
        };
    };
}

export interface ProcessExecutionContext {
    action: ActionData;
    event: FormRulesEvent;
}

export const FORM_EVENTS = {
    onProcessFinish: 'onProcessFinish',
} as const;

export interface PrefillPayloadFormData {
    correlationKey: string;
    formValues: {
        [formVariable: string]: string;
    };
}

export interface UpdateFormVariableActionData extends ActionData {
    payload: PrefillPayloadFormData;
}
