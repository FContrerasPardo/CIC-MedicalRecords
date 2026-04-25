/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const healthCheck = require('./workspace-hxp-health-checks');
const fetchDynamicAppDetails = require('../../../scripts/utils/fetch-dynamic-app-details');

/**
 * Combined pre-e2e script that runs health checks before fetching dynamic app details
 * @param {string} projectName - The project name for dynamic app details
 */
module.exports = async (projectName) => {
    try {
        const currentProject = process.env.NX_TASK_TARGET_PROJECT;
        await healthCheck(currentProject);
        await fetchDynamicAppDetails(projectName);
    } catch (error) {
        console.error('❌ Pree2e setup failed:', error.message);
        process.exit(1);
    }
};
