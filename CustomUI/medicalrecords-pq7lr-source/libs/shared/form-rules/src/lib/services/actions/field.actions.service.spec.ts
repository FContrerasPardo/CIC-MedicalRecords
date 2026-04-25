/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { TestBed } from '@angular/core/testing';
import { FormEvent, FormFieldEvent, FormModel, FormRulesEvent, FormService } from '@alfresco/adf-core';
import { VariableResolverService } from '../variable-resolver/variable-resolver.service';
import { MockProvider } from 'ng-mocks';
import { getDatatableFormModelMock } from '../../mocks/form-rules.mock';
import { FieldActionsService } from './field-actions.service';
import { Subject } from 'rxjs';

describe('FieldActionsService', () => {
    let fieldActionService: FieldActionsService;
    let formService: FormService;
    const variableResolverService = {
        resolveExpression: jest.fn(),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                FieldActionsService,
                MockProvider(FormService, { formRulesEvent: new Subject<FormRulesEvent>() }),
                {
                    provide: VariableResolverService,
                    useValue: variableResolverService,
                },
            ],
        });

        fieldActionService = TestBed.inject(FieldActionsService);
        formService = TestBed.inject(FormService);
    });

    it('should emit form rule event on value change', () => {
        const newVariableValue = 'new-value';

        jest.spyOn(variableResolverService, 'resolveExpression').mockReturnValue(newVariableValue);
        const onFormRulesEventSpy = jest.spyOn(formService.formRulesEvent, 'next');

        const formModel = getDatatableFormModelMock();
        const field = formModel.getFieldById('dataTable');
        const event = new FormRulesEvent('click', new FormFieldEvent(formModel, field));
        const variable = formModel.variables[0];

        fieldActionService.execute({ target: `field.${field.id}`, payload: { value: variable.value } }, event, true);

        const onFormLoadedEvent = new FormEvent(event.form);
        const formRules = new FormRulesEvent('fieldValueChanged', onFormLoadedEvent);
        const onProcessFinishRule = new FormRulesEvent('fieldValueChanged', formRules);

        expect(onFormRulesEventSpy).toHaveBeenCalledWith(onProcessFinishRule);
        expect(onFormRulesEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should change the required state when the field is NOT required by default', () => {
        const action = { target: 'field.Text07b5z4', payload: { required: false } };
        const event = {
            form: { changeFieldRequired: (fieldId, value) => {}, getFieldById: (fieldId) => ({ json: { required: false } }) } as FormModel,
        } as FormRulesEvent;
        const changeFieldRequiredSpy = jest.spyOn(event.form, 'changeFieldRequired');

        fieldActionService.execute(action, event, true);

        expect(changeFieldRequiredSpy).toHaveBeenCalledWith('Text07b5z4', false);
        expect(changeFieldRequiredSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT change the required state when the field is required by default', () => {
        const action = { target: 'field.Text07b5z4', payload: { required: false } };
        const event = {
            form: { changeFieldRequired: (fieldId, value) => {}, getFieldById: (fieldId) => ({ json: { required: true } }) } as FormModel,
        } as FormRulesEvent;
        const changeFieldRequiredSpy = jest.spyOn(event.form, 'changeFieldRequired');

        fieldActionService.execute(action, event, true);

        expect(changeFieldRequiredSpy).not.toHaveBeenCalled();
    });

    it('should resolve the value when changing the required state', () => {
        variableResolverService.resolveExpression.mockReturnValue(true);
        const requiredExpression = '${field.Checkbox0tp71y}';
        const action = {
            target: 'field.Text0nb1gm',
            payload: {
                required: requiredExpression,
            },
        };

        const event = {
            form: { changeFieldRequired: jest.fn(), getFieldById: () => ({}) },
        } as FormRulesEvent;

        fieldActionService.execute(action, event, true);

        expect(event.form.changeFieldRequired).toHaveBeenCalledWith('Text0nb1gm', true);
        expect(variableResolverService.resolveExpression).toHaveBeenCalledWith(requiredExpression, event, false, undefined);
    });

    it('should return early if fieldId is missing', () => {
        const action = { target: undefined, payload: {} };
        const event = { form: {} } as FormRulesEvent;

        expect(() => fieldActionService.execute(action, event, true)).not.toThrow();
    });

    it('should return early if payload is missing', () => {
        const action = { target: 'field.Text0nb1gm', payload: {} };
        const event = { form: {} } as FormRulesEvent;

        expect(() => fieldActionService.execute(action, event, true)).not.toThrow();
    });

    it('should change field disabled state', () => {
        const action = { target: 'field.Text07b5z4', payload: { disabled: true } };
        const event = {
            form: { changeFieldDisabled: jest.fn() },
        } as FormRulesEvent;

        fieldActionService.execute(action, event, true);

        expect(event.form.changeFieldDisabled).toHaveBeenCalledWith('Text07b5z4', true);
    });

    it('should change field display state', () => {
        const action = { target: 'field.Text07b5z4', payload: { display: false } };
        const event = {
            form: { changeFieldVisibility: jest.fn() },
        } as FormRulesEvent;

        fieldActionService.execute(action, event, true);

        expect(event.form.changeFieldVisibility).toHaveBeenCalledWith('Text07b5z4', false);
    });

    it('should do nothing for unknown field input', () => {
        const action = { target: 'field.Text07b5z4', payload: { unknown: 'value' } };
        const event = {
            form: {},
        } as FormRulesEvent;

        expect(() => fieldActionService.execute(action, event, true)).not.toThrow();
    });

    it('should invert payload when field gets disabled and filter not matched', () => {
        const action = { target: 'field.Text07b5z4', payload: { disabled: true } };
        const event = {
            form: { changeFieldDisabled: jest.fn() },
        } as FormRulesEvent;

        fieldActionService.execute(action, event, false);

        expect(event.form.changeFieldDisabled).toHaveBeenCalledWith('Text07b5z4', false);
    });
});
