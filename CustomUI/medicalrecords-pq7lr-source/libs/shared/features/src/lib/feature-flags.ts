/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const STUDIO_SHARED = {
    STUDIO_CONTENT_MODEL_IMPROVEMENTS: 'studio-content-model-constraints-improvements',
    STUDIO_SET_PERMISSIONS_ON_CONTENT_CREATION: 'studio-set-permissions-content-creation',
    STUDIO_DECIMAL_NUMBERS: 'studio-decimal-numbers',
    STUDIO_FORM_PROCESS_DEPENDENCY: 'studio-form-process-dependency',
    STUDIO_PUBLIC_PROCESS_REDIRECT: 'studio-public-process-redirect',
    STUDIO_VARIABLES_AND_SECRETS: 'studio-variables-and-secrets',
    STUDIO_ENVIRONMENT_SECRETS: 'studio-environment-secrets',
    STUDIO_ADMIN_DISABLE_INACTIVE_ENV: 'studio-admin-disable-inactive-env',
    STUDIO_SKIP_VALIDATION_IN_GROUPS_SECTIONS: 'skip-validation-in-groups-sections',
    STUDIO_LOCALE_SPECIFIC_AMOUNT: 'studio-locale-specific-amount',
    STUDIO_VARIABLES_IN_FORM_DISPLAY_TEXT: 'studio-variables-in-form-display-text',
    FORMS_DEFERRED_DOC_CREATION: 'studio-forms-deferred-doc-creation',
    STUDIO_CONFIGURABLE_FORM_VALIDATION_MESSAGE: 'studio-configurable-form-validation-message',
    STUDIO_FORM_TAB_DELETIONS: 'studio-form-tab-deletions',
    STUDIO_FORM_STICKY_TABS: 'studio-form-sticky-tabs',
} as const;
export type STUDIO_SHARED = (typeof STUDIO_SHARED)[keyof typeof STUDIO_SHARED];

export const SHARED_HXP = {
    STUDIO_MAIL_NOTIFICATIONS_VIA_SMTP: 'studio-mail-notifications-via-smtp',
    STUDIO_DARK_LIGHT_THEME_SWITCH: 'studio-dark-light-theme-switch',
    STUDIO_X_API_AUTH_TYPE: 'studio-x-api-auth-type',
    STUDIO_LINKED_PROCESSES: 'studio-linked-processes',
    STUDIO_JWT_SECURED_AUTH: 'studio-jwt-secured-auth',
    STUDIO_SFTP_UPLOAD_LAMBDA: 'studio-sftp-upload-lambda',
    STUDIO_PASSWORD_AUTH: 'studio-onbase-oauth-password-grant',
    STUDIO_UNIFIED_MODERN_UI: 'studio-unified-modern-ui',
};
export type SHARED_HXP = (typeof SHARED_HXP)[keyof typeof SHARED_HXP];

export const CICGOV = {
    CONFIGURATION: 'cic-governance-configuration',
} as const;

export const RPA = {
    AGENTIC_AI_PROCESS: 'rpa-agentic-ai-task-automation',
    AGENTIC_AI_PROJECT: 'rpa-agentic-ai-task-automation-project-view',
    PROMPT_EDITING: 'rpa-agentic-ai-prompt-editing',
} as const;
export type RPA = (typeof RPA)[keyof typeof RPA];
