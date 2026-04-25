/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/* eslint-disable unicorn/explicit-length-check */
// length is of type IdpFieldValidationLengthRule, which is not a primitive type
import { Injectable } from '@angular/core';
import { IdpFieldValidationRules } from '@hxp/workspace-hxp/idp-services-extension/shared';

export interface FieldValidationInput {
    value: string | undefined;
    name: string;
}

export interface FieldValidationError {
    type: 'required' | 'minLength' | 'maxLength' | 'pattern';
    fieldName: string;
    value?: string | number;
    pattern?: string;
}

@Injectable({
    providedIn: 'root',
})
export class IdpTableCellValidationService {
    /**
     * Validates a field value against the provided validation rules
     * @param field - The field data containing value and name
     * @param validationRules - The validation rules to apply
     * @returns true if valid, false if invalid
     */
    validateField(field: FieldValidationInput, validationRules: IdpFieldValidationRules | undefined): boolean {
        return !this.getValidationError(field, validationRules);
    }

    /**
     * Gets validation error details for use with translation system
     * @param field - The field data containing value and name
     * @param validationRules - The validation rules to check against
     * @returns FieldValidationError object or undefined if valid
     */
    getValidationError(field: FieldValidationInput, validationRules: IdpFieldValidationRules | undefined): FieldValidationError | undefined {
        if (!validationRules) {
            return undefined;
        }

        const value = field.value ?? '';
        const isEmpty = value.trim().length === 0;

        // Check required validation
        if (validationRules.required && isEmpty) {
            return { type: 'required', fieldName: field.name };
        }

        // If empty and not required, skip other validations
        if (isEmpty) {
            return undefined;
        }

        // Check length validation (only if value is not empty)
        // Support both nested format (validation.length.min) and flat format (validation.minLength) for backwards compatibility
        const minLength = validationRules.length?.min ?? (validationRules as any).minLength;
        const maxLength = validationRules.length?.max ?? (validationRules as any).maxLength;

        if (minLength !== undefined && value.length < minLength) {
            return { type: 'minLength', fieldName: field.name, value: minLength };
        }
        if (maxLength !== undefined && value.length > maxLength) {
            return { type: 'maxLength', fieldName: field.name, value: maxLength };
        }

        // Check regex validation (only if value is not empty)
        // Support both nested format (validation.regex.pattern) and flat format (validation.pattern) for backwards compatibility
        const pattern = validationRules.regex?.pattern ?? (validationRules as any).pattern;
        if (pattern) {
            const regex = new RegExp(pattern);
            if (!regex.test(value)) {
                return { type: 'pattern', fieldName: field.name, pattern };
            }
        }

        return undefined;
    }
}
