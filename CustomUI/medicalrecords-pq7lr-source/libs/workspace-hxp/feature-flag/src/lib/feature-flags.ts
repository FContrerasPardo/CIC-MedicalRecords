/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const WORKSPACE_HXP = {
    FORMS_DEFERRED_DOC_CREATION: 'studio-forms-deferred-doc-creation',
} as const;
export type WORKSPACE_HXP = typeof WORKSPACE_HXP[keyof typeof WORKSPACE_HXP];

export const WORKSPACE_IDP_HXP = {
    CLASSIFICATION_SETTINGS: 'idp-classification-settings',
    CLASS_VERIFICATION_CUT_INSERT: 'idp-class-verification-cut-insert',
    CLASS_VERIFICATION_REASONING: 'idp-class-verification-reasoning',
    FIELD_VALIDATION_RULES: 'idp-field-validation-rules',
    FORM_AS_METADATA_PANEL: 'idp-form-as-metadata-panel',
    REDACTION: 'idp-config-redaction',
} as const;
export type WORKSPACE_IDP_HXP = typeof WORKSPACE_IDP_HXP[keyof typeof WORKSPACE_IDP_HXP];
