/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const HXP_FILES_TO_BE_IGNORED = [
    '**/*.tmp',
    '**/tmp',
    '**/jest.config.ts', // TODO: Needs to add it back
    'apps/workspace-hxp/project.variables.ci.json5',
    'apps/workspace-hxp/custom-script/workspace-envsub.mjs',
];

export const HXP_PACKAGE_PATTERNS_TO_BE_EXCLUDED = [
    '@alfresco/aca-about',
    '@alfresco/aca-content',
    '@alfresco/aca-fold',
    '@alfresco/aca-preview',
    '@alfresco/aca-viewer',
    '@alfresco/adf-office-services-ext',
    '@alfresco/aca-folder-rules',
    '@alfresco/adf-ai-extension',
    '@alfresco/microsoft-office-online-integration-extension',
    '@alfresco/adf-extensions-order-extension',
    '@alfresco/adf-governance',
    '@alfresco/adf-governance',
    '@alfresco/adf-content-services-extension',
    'igniteui-angular',
    '@infragistics/igniteui-angular',
];
