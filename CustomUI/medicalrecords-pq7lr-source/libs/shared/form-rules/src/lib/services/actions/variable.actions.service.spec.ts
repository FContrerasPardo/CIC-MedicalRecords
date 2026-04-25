/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormEvent, FormFieldEvent, FormModel, FormRulesEvent, FormService, WidgetVisibilityService } from '@alfresco/adf-core';
import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { getFormModelMock, getFormModelMockForChange } from '../../mocks/form-rules.mock';
import { VariableResolverService } from '../variable-resolver/variable-resolver.service';
import { VariableAction, VariableActionsService } from './variable.action.service';

describe('VariableActionsService', () => {
    let actionService: VariableActionsService;
    let formService: FormService;
    let variableResolverService: VariableResolverService;
    let widgetVisibilityService: WidgetVisibilityService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [VariableActionsService, MockProvider(VariableResolverService), WidgetVisibilityService],
        });

        actionService = TestBed.inject(VariableActionsService);
        formService = TestBed.inject(FormService);
        variableResolverService = TestBed.inject(VariableResolverService);
        widgetVisibilityService = TestBed.inject(WidgetVisibilityService);
    });

    it('should notify variable dependant fields after form variable change', () => {
        const newVariableValue = 'new-value';

        spyOn(variableResolverService, 'resolveExpression').and.returnValue(newVariableValue);
        const refreshVisibilitySpy = spyOn(widgetVisibilityService, 'refreshVisibility');
        const onFormVariableChangedSpy = spyOn(formService.onFormVariableChanged, 'next').and.callThrough();

        const formModel = getFormModelMock();
        const variable = formModel.variables[0];

        const dropdownField = formModel.getFieldById('dropdown');
        const dropdownEvent = new FormRulesEvent('click', new FormFieldEvent(formModel, dropdownField));

        actionService.execute({ target: variable.name, payload: { value: variable.value } }, dropdownEvent);
        expect(onFormVariableChangedSpy).toHaveBeenCalledWith({ field: dropdownField, data: newVariableValue });

        const dataTableField = formModel.getFieldById('dataTable');
        const dataTableEvent = new FormRulesEvent('click', new FormFieldEvent(formModel, dataTableField));

        actionService.execute({ target: variable.name, payload: { value: variable.value } }, dataTableEvent);
        expect(onFormVariableChangedSpy).toHaveBeenCalledWith({ field: dataTableField, data: newVariableValue });
        expect(refreshVisibilitySpy).toHaveBeenCalled();
    });

    it('should update visibility of field after relevant form variable changes', () => {
        const newVariableValue = 'new-value';
        spyOn(variableResolverService, 'resolveExpression').and.returnValue(newVariableValue);
        const action: VariableAction = { target: 'variable.a8b157ae-4af5-4587-a7f3-e2d98735e014', payload: { value: '${field.Text0zui4x}' } };
        const formModel: FormModel = getFormModelMockForChange();
        const inputField = formModel.getFieldById('Text0zui4x');
        const fieldWithVisibilityCondition = formModel.getFieldById('DisplayTextId1');
        fieldWithVisibilityCondition.isVisible = false;

        formModel.changeFieldValue('Text0zui4x', newVariableValue);
        const changeEvent = new FormRulesEvent('change', new FormEvent(formModel), new Event('change'));
        actionService.execute(action, changeEvent);

        expect(inputField.value).toBe(newVariableValue);
        expect(formModel.variables[0].value).toBe(newVariableValue);
        expect(fieldWithVisibilityCondition.isVisible).toBe(true);
    });
});
