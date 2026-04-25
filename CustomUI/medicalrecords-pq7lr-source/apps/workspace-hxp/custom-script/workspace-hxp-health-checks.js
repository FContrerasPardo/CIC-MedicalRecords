/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const axios = require('axios');
const { styleText } = require('node:util');
const { getServicesForProject, getServiceConfig, DEFAULT_SERVICES } = require('./service-mappings');
const { handleError } = require('../../../scripts/utils/axios-error-handler');

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Checks if a specific service is reachable and responding
 * @param {string} serviceName - Name of the service to check
 * @returns {Promise<boolean>} - True if service is up, false otherwise
 */
const isServiceUp = async (serviceName) => {
    const serviceConfig = getServiceConfig(serviceName);

    if (!serviceConfig) {
        console.log(`Service ${styleText('red', serviceName)} not found in service configuration`);
        return false;
    }

    const hostUrl = process.env[serviceConfig.host];

    if (!hostUrl) {
        console.log(`Service ${styleText('yellow', serviceName)} skipped (${serviceConfig.host} not configured)`);
        return true;
    }

    try {
        const url = `${hostUrl}${serviceConfig.endpoint}`;
        const axiosConfig = {
            timeout: 10000,
            validateStatus: () => true
        };

        const res = serviceConfig.endpoint.includes('graphql')
            ? await axios.post(url, { query: '{ __schema { queryType { name } } }' }, axiosConfig)
            : await axios.get(url, axiosConfig);

        const reason = `${res.status} ${res.statusText}`;

        if (res.status >= 200 && res.status < 300) {
            console.log(`Service ${styleText('magenta', serviceName)} is ${styleText('green', 'healthy')}`);
            return true;
        } else if (res.status >= 400 && res.status < 500) {
            console.log(`Service ${styleText('magenta', serviceName)} is ${styleText('yellow', 'up')} but returns ${styleText('yellow', reason)}`);
            return true;
        } else if (res.status >= 500) {
            console.log(`Service ${styleText('red', serviceName)} is DOWN (${styleText('red', reason)})`);
            return false;
        }

        console.log(`Service ${styleText('yellow', serviceName)} returned unexpected status ${styleText('red', reason)}`);
        return true;

    } catch (error) {
        console.log(`Service ${styleText('red', serviceName)} is ${styleText('red', 'unreachable')}`);
        handleError(error);
    }
    return false;
};

/**
 * Determines services to check based on input type
 * @param {string|string[]} input - Either array of services or project name
 * @returns {string[]} - Array of service names to check
 */
const resolveServices = (input) => {
    const services = Array.isArray(input)
        ? input
        : (getServicesForProject(input) || DEFAULT_SERVICES);

    console.log(`Checking ${services.length} service(s): ${services.join(', ')}`);
    return services;
};

/**
 * Main health check function
 * @param {string|string[]} servicesOrProjectName - Either array of services or project name string
 * @returns {Promise<void>} - Exits with code 1 if any checks fail
 */
const healthCheck = async (servicesOrProjectName) => {
    console.log('🏥 Running health checks...');

    const services = resolveServices(servicesOrProjectName);
    const healthCheckPromises = services.map(isServiceUp);
    const results = await Promise.allSettled(healthCheckPromises);

    const hasFailures = results.some(result =>
        result.status === 'rejected' || result.value === false
    );

    if (hasFailures) {
        console.log(styleText('red', '✗ Some services are down'));
        process.exit(1);
    }
};

module.exports = healthCheck;

// Allow direct execution from command line
if (require.main === module) {
    const suiteType = process.argv[2] || 'default';
    healthCheck(suiteType).catch(console.error);
}
