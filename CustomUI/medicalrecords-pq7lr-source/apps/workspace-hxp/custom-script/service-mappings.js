/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/**
 * Service mappings for workspace-hxp e2e tests
 * Maps NX project names to required backend services for health checks
 * Available backend services are based on apps/workspace-hxp/proxy.conf.js
 */

const AVAILABLE_SERVICES = {
    'content-repository': {
        host: 'APP_CONFIG_ECM_HOST',
        endpoint: '/actuator/health',
    },

    'deployment': {
        host: 'APP_CONFIG_BPM_HOST',
        endpoint: '/deployment-service/actuator/health',
    },

    'governance': {
        host: 'APP_CONFIG_GOVERNANCE_HOST',
        endpoint: '/actuator/health',
    },

    'identity-adapter': {
        host: 'APP_CONFIG_BPM_HOST',
        endpoint: '/identity-adapter-service/actuator/health',
    },

    'nucleus': {
        host: 'NUCLEUS_API_HOST',
        endpoint: '/graph/graphql',
    },
};

/**
 * Project-specific service requirements.
 * Key: NX project name, Value: array of required service names
 */
const PROJECT_SERVICE_MAPPING = {
    'workspace-hxp-playwright-app-shell-e2e': ['identity-adapter', 'content-repository', 'nucleus'],

    'workspace-hxp-playwright-document-details-e2e': ['identity-adapter', 'content-repository'],
    'workspace-hxp-playwright-file-actions-e2e': ['identity-adapter', 'content-repository'],
    'workspace-hxp-playwright-file-management-e2e': ['identity-adapter', 'content-repository'],
    'workspace-hxp-playwright-file-upload-e2e': ['identity-adapter', 'content-repository'],
    'workspace-hxp-playwright-navigation-e2e': ['identity-adapter', 'content-repository'],
    'workspace-hxp-playwright-permissions-management-e2e': ['identity-adapter', 'content-repository'],
    'workspace-hxp-playwright-search-e2e': ['identity-adapter', 'content-repository', 'nucleus'],

    'workspace-hxp-playwright-governance-e2e': ['identity-adapter', 'content-repository', 'governance'],

    'workspace-hxp-playwright-process-services-cloud-extension-forms-e2e': ['identity-adapter', 'deployment'],
    'workspace-hxp-playwright-process-services-cloud-extension-form-widgets-e2e': ['identity-adapter', 'deployment'],
    'workspace-hxp-playwright-process-services-cloud-extension-process-automation-e2e': ['identity-adapter', 'deployment'],
    'workspace-hxp-playwright-process-services-cloud-extension-processes-e2e': ['identity-adapter', 'deployment', 'nucleus'],
    'workspace-hxp-playwright-process-services-cloud-extension-tasks-e2e': ['identity-adapter', 'deployment'],

    'workspace-hxp-playwright-custom-theme-e2e': ['identity-adapter', 'content-repository', 'nucleus'],
    'workspace-hxp-playwright-custom-ui-e2e': ['identity-adapter'],
    'workspace-hxp-playwright-automate-visual-regression-e2e': ['identity-adapter', 'deployment'],
};

const DEFAULT_SERVICES = ['identity-adapter'];

/**
 * Get required services for a specific project
 * @param {string} projectName - NX project name
 * @returns {string[]} Array of required service names
 */
function getServicesForProject(projectName) {
    return PROJECT_SERVICE_MAPPING[projectName] || DEFAULT_SERVICES;
}

/**
 * Get service configuration for health checks
 * @param {string} serviceName - Service name
 * @returns {object|null} Service configuration or null if not found
 */
function getServiceConfig(serviceName) {
    return AVAILABLE_SERVICES[serviceName] || null;
}

module.exports = {
    AVAILABLE_SERVICES,
    PROJECT_SERVICE_MAPPING,
    DEFAULT_SERVICES,
    getServicesForProject,
    getServiceConfig
};
