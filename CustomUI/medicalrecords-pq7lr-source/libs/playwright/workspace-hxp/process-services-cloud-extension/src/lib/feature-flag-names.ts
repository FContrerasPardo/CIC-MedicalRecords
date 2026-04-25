/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const WorkspaceHxpProcessFeatureFlagNames = {
    StudioGenerateFormFile: 'studio-generate-form-file',
    StudioSkipValidationInGroupsSections: 'skip-validation-in-groups-sections',
    StudioVariablesInFormDisplayText: 'studio-variables-in-form-display-text',
    StudioFormsDeferredDocCreation: 'studio-forms-deferred-doc-creation',
};

export type WorkspaceHxpProcessFeatureFlagNames =
    typeof WorkspaceHxpProcessFeatureFlagNames[keyof typeof WorkspaceHxpProcessFeatureFlagNames];
