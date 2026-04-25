/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Predicate } from './conditions.model';

export const FORM_PREFIX = 'form.';
export const FIELD_PREFIX = 'field.';
export const VARIABLE_PREFIX = 'variable.';
export const VARIABLES_PREFIX = 'variables.';
export const START_PROCESS_PREFIX = 'startProcess.';
export const TOGGLE_SPINNER_PREFIX = 'toggleSpinner.';
export const PROCESS_VARIABLES_PREFIX = 'process.variable.';

export type FormRuleEventActionTarget = 'toggleSpinner' | 'startProcess' | string;
export interface FormRuleEventAction {
    target: FormRuleEventActionTarget;
    payload: PayloadBody;
}

export interface FormRuleEventPayload {
    filter?: string | Predicate;
    actions: FormRuleEventAction[];
}

export interface PayloadBody {
    [key: string]: any;
}

export interface FormRules {
    form?: {
        [event: string]: FormRuleEventPayload[];
    };
    fields?: {
        [fieldId: string]: {
            [event: string]: FormRuleEventPayload[];
        };
    };
}

export interface FormRulesContext {
    field?: PayloadBody;
    variable?: PayloadBody;
}

export const FormActions = {
    VALIDATE: 'validate',
    START_PROCESS: 'startProcess',
    TOGGLE_SPINNER: 'toggleSpinner',
    SHOW_SPINNER: 'showSpinner',
    HIDE_SPINNER: 'hideSpinner',
} as const;
export type FormActions = typeof FormActions[keyof typeof FormActions];

export const VariablesInputs = {
    VALUE: 'value',
} as const;
export type VariablesInputs = typeof VariablesInputs[keyof typeof VariablesInputs];

export const StartProcessPayload = {
    INPUTS: 'inputs',
    PROCESS_NAME: 'processName',
    CORRELATION_KEY: 'correlationKey',
    PROCESS_DEFINITION_ID: 'processDefinitionId',
} as const;
export type StartProcessPayload = typeof StartProcessPayload[keyof typeof StartProcessPayload];

export const ShowSpinnerPayload = {
    MESSAGE: 'message',
    SHOW_SPINNER: 'showSpinner',
} as const;
export type ShowSpinnerPayload = typeof ShowSpinnerPayload[keyof typeof ShowSpinnerPayload];

export const HideSpinnerPayload = {
    SHOW_SPINNER: 'showSpinner',
} as const;
export type HideSpinnerPayload = typeof HideSpinnerPayload[keyof typeof HideSpinnerPayload];

export const FieldInputs = {
    DISPLAY: 'display',
    DISABLED: 'disabled',
    REQUIRED: 'required',
    VALUE: 'value',
} as const;
export type FieldInputs = typeof FieldInputs[keyof typeof FieldInputs];
