/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpTableCellValidationService, FieldValidationInput } from './table-cell-validation.service';
import { IdpFieldValidationRules } from '@hxp/workspace-hxp/idp-services-extension/shared';

describe('IdpTableCellValidationService', () => {
    let service: IdpTableCellValidationService;

    beforeEach(() => {
        service = new IdpTableCellValidationService();
    });

    describe('validateField', () => {
        it('should return true when no validation rules are provided', () => {
            const field: FieldValidationInput = { value: 'test', name: 'testField' };
            expect(service.validateField(field, undefined)).toBe(true);
        });

        it('should return false when required field is empty', () => {
            const field: FieldValidationInput = { value: '', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true };
            expect(service.validateField(field, rules)).toBe(false);
        });

        it('should return false when required field contains only whitespace', () => {
            const field: FieldValidationInput = { value: '   ', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true };
            expect(service.validateField(field, rules)).toBe(false);
        });

        it('should return true when required field has value', () => {
            const field: FieldValidationInput = { value: 'test', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true };
            expect(service.validateField(field, rules)).toBe(true);
        });

        it('should return true when non-required field is empty', () => {
            const field: FieldValidationInput = { value: '', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: false };
            expect(service.validateField(field, rules)).toBe(true);
        });

        it('should return false when value is shorter than minimum length', () => {
            const field: FieldValidationInput = { value: 'ab', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                length: { min: 3 },
                required: false,
            };
            expect(service.validateField(field, rules)).toBe(false);
        });

        it('should return true when value meets minimum length', () => {
            const field: FieldValidationInput = { value: 'abc', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                length: { min: 3 },
                required: false,
            };
            expect(service.validateField(field, rules)).toBe(true);
        });

        it('should return false when value exceeds maximum length', () => {
            const field: FieldValidationInput = { value: 'abcdef', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                length: { max: 5 },
                required: false,
            };
            expect(service.validateField(field, rules)).toBe(false);
        });

        it('should return true when value is within maximum length', () => {
            const field: FieldValidationInput = { value: 'abcde', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                length: { max: 5 },
                required: false,
            };
            expect(service.validateField(field, rules)).toBe(true);
        });

        it('should return false when value does not match regex pattern', () => {
            const field: FieldValidationInput = { value: 'abc123', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                regex: { pattern: '^[a-z]+$' },
                required: false,
            };
            expect(service.validateField(field, rules)).toBe(false);
        });

        it('should return true when value matches regex pattern', () => {
            const field: FieldValidationInput = { value: 'abc', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                regex: { pattern: '^[a-z]+$' },
                required: false,
            };
            expect(service.validateField(field, rules)).toBe(true);
        });

        it('should handle undefined value as empty string', () => {
            const field: FieldValidationInput = { value: undefined, name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true };
            expect(service.validateField(field, rules)).toBe(false);
        });
    });

    describe('getValidationError', () => {
        it('should return null when no validation rules are provided', () => {
            const field: FieldValidationInput = { value: 'test', name: 'testField' };
            expect(service.getValidationError(field, undefined)).toBeUndefined();
        });

        it('should return required error when required field is empty', () => {
            const field: FieldValidationInput = { value: '', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true };
            const error = service.getValidationError(field, rules);
            expect(error).toEqual({ type: 'required', fieldName: 'testField' });
        });

        it('should return minLength error when value is too short', () => {
            const field: FieldValidationInput = { value: 'ab', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                length: { min: 5 },
                required: false,
            };
            const error = service.getValidationError(field, rules);
            expect(error).toEqual({ type: 'minLength', fieldName: 'testField', value: 5 });
        });

        it('should return maxLength error when value is too long', () => {
            const field: FieldValidationInput = { value: 'abcdefgh', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                length: { max: 5 },
                required: false,
            };
            const error = service.getValidationError(field, rules);
            expect(error).toEqual({ type: 'maxLength', fieldName: 'testField', value: 5 });
        });

        it('should return pattern error when value does not match regex', () => {
            const field: FieldValidationInput = { value: 'abc123', name: 'testField' };
            const rules: IdpFieldValidationRules = {
                regex: { pattern: '^[a-z]+$' },
                required: false,
            };
            const error = service.getValidationError(field, rules);
            expect(error).toEqual({ type: 'pattern', fieldName: 'testField', pattern: '^[a-z]+$' });
        });

        it('should return null when field is valid', () => {
            const field: FieldValidationInput = { value: 'test', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true, length: { min: 2, max: 10 } };
            expect(service.getValidationError(field, rules)).toBeUndefined();
        });

        it('should prioritize required error over other validations', () => {
            const field: FieldValidationInput = { value: '', name: 'testField' };
            const rules: IdpFieldValidationRules = { required: true, length: { min: 5 } };
            const error = service.getValidationError(field, rules);
            expect(error?.type).toBe('required');
        });
    });
});
