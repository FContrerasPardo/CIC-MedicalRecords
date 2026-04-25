/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormEvent, FormModel, FormRulesEvent, FormService } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { FIELD_PREFIX, FieldInputs, PayloadBody } from '../../model/form-rules.model';
import { VariableResolverService } from '../variable-resolver/variable-resolver.service';
import { FormProcessFinishEventData } from '../interfaces';
import { getActionType } from '../../utils/form-actions.utils';

@Injectable({
    providedIn: 'root',
})
export class FieldActionsService {
    private readonly variableResolver = inject(VariableResolverService);
    private readonly formService = inject(FormService);

    execute(action: { target: string; payload: PayloadBody }, event: FormRulesEvent, filterMatched: boolean, data?: FormProcessFinishEventData) {
        const fieldId = action?.target?.slice(FIELD_PREFIX.length);

        if (!fieldId || !action?.payload) {
            return;
        }

        for (const fieldInput of Object.keys(action.payload)) {
            const isBooleanInputType = getActionType(fieldInput) === 'boolean';
            const value = isBooleanInputType && !filterMatched ? !action.payload[fieldInput] : action.payload[fieldInput];

            switch (fieldInput) {
                case FieldInputs.DISABLED: {
                    event.form.changeFieldDisabled(fieldId, value);
                    break;
                }
                case FieldInputs.DISPLAY: {
                    event.form.changeFieldVisibility(fieldId, value);
                    break;
                }
                case FieldInputs.REQUIRED: {
                    this.handleRequired(fieldId, value, event, data);
                    break;
                }
                case FieldInputs.VALUE: {
                    if (filterMatched) {
                        const resolvedValue = this.variableResolver.resolveExpression(value, event, false, data);
                        event.form.changeFieldValue(fieldId, resolvedValue);

                        // Handle reactive widgets
                        const onFormLoadedEvent = new FormEvent(event.form);
                        const formRules = new FormRulesEvent('fieldValueChanged', onFormLoadedEvent);
                        const onProcessFinishRule = new FormRulesEvent('fieldValueChanged', formRules);
                        this.formService.formRulesEvent.next(onProcessFinishRule);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
    }

    private handleRequired(fieldId: string, value: any, event: FormRulesEvent, data?: FormProcessFinishEventData) {
        if (this.isFieldRequiredByDefault(fieldId, event.form)) {
            return;
        }
        const resolvedValue = typeof value === 'boolean' ? value : this.variableResolver.resolveExpression(value, event, false, data);
        event.form.changeFieldRequired(fieldId, resolvedValue);
    }

    private isFieldRequiredByDefault(fieldId: string, formModel: FormModel): boolean {
        const field = formModel.getFieldById(fieldId);
        return field?.json?.required === true;
    }
}
