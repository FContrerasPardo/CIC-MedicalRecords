/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const WorkspaceHxpIdpFeatureFlagNames = {
    IdpFieldValidationRules: 'idp-field-validation-rules',
    IdpFormAsMetadataPanel: 'idp-form-as-metadata-panel',
    IdpReasoningFieldExtraction: 'idp-reasoning-fields',
};

export type WorkspaceHxpIdpFeatureFlagNames =
    typeof WorkspaceHxpIdpFeatureFlagNames[keyof typeof WorkspaceHxpIdpFeatureFlagNames];
