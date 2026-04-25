/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { FormModel, FormService } from '@alfresco/adf-core';
import { MockProvider } from 'ng-mocks';
import { FormActionsService } from './form-action.service';
import { FORM_PREFIX, FormActions } from '../../model/form-rules.model';

describe('FormActionsService', () => {
    let service: FormActionsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [FormActionsService, MockProvider(FormService)],
        });

        service = TestBed.inject(FormActionsService);
    });

    describe('validate action', () => {
        it('should set showAllValidationErrors to true before calling validateForm', () => {
            const form = new FormModel({});
            let flagAtCallTime: boolean;
            spyOn(form, 'validateForm').and.callFake(() => {
                flagAtCallTime = form.showAllValidationErrors;
            });

            service.execute({ target: `${FORM_PREFIX}${FormActions.VALIDATE}`, payload: {} }, form);

            expect(flagAtCallTime).toBe(true);
            expect(form.showAllValidationErrors).toBe(true);
            expect(form.validateForm).toHaveBeenCalledTimes(1);
        });
    });

    describe('unknown action', () => {
        it('should not throw for unknown action types', () => {
            const form = new FormModel({});

            expect(() => {
                service.execute({ target: `${FORM_PREFIX}unknownAction`, payload: {} }, form);
            }).not.toThrow();
        });
    });
});
