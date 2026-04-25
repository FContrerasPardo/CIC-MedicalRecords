/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormFieldModel, FormFieldValidator } from '@alfresco/adf-core';

export class FormWidgetsFieldValidator implements FormFieldValidator {
    supportedTypes = ['hxp-upload', 'hxp-properties-viewer', 'hxp-file-viewer'];

    isSupported(field: FormFieldModel): boolean {
        return !!field?.type && this.supportedTypes.includes(field.type) && !field.form?.isFieldOrParentHidden(field);
    }

    validate(field: FormFieldModel): boolean {
        return !this.isSupported(field) || this.isValid(field);
    }

    private isValid(field: FormFieldModel): boolean {
        if (!field.required) {
            return true;
        }

        if (Array.isArray(field.value)) {
            return field.value.length > 0;
        }

        return !!field.value;
    }
}
