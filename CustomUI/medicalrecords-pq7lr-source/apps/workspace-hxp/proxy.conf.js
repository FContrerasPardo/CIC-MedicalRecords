/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const {
    getDeployedAppProxy,
    getIdentityAdapterServiceProxy,
    getGovernanceServiceProxy,
    hxpContentRepositoryProxy,
    getNucleusProxy,
    getIntelligentDocumentProcessingServiceProxy,
    getWsProxy,
} = require('../../proxy-helpers');

const cloudApps = process.env.APP_CONFIG_APPS_DEPLOYED;
const cloudHost = process.env.APP_CONFIG_BPM_HOST;
const ecmHost = process.env.APP_CONFIG_ECM_HOST;
const governanceHost = process.env.APP_CONFIG_GOVERNANCE_HOST;
const nucleusHost = process.env.NUCLEUS_API_HOST;
const hxIdpHost = process.env.HXP_INTELLIGENT_DOCUMENT_PROCESSING_URL;

const wsProxy = cloudHost ? getWsProxy(cloudHost) : {};
const deployedAppProxy = cloudHost ? getDeployedAppProxy(cloudHost, cloudApps) : {};
const identityAdapterServiceProxy =  cloudHost ? getIdentityAdapterServiceProxy(cloudHost) : {};
const hxpContentProxy = ecmHost ? hxpContentRepositoryProxy(ecmHost) : {};
const governanceServiceProxy = governanceHost ? getGovernanceServiceProxy(governanceHost) : {};
const nucleusProxy = nucleusHost ? getNucleusProxy(nucleusHost) : {};
const intelligentDocumentProcessingServiceProxy = hxIdpHost ? getIntelligentDocumentProcessingServiceProxy(hxIdpHost) : {};

module.exports = {
    ...deployedAppProxy,
    ...identityAdapterServiceProxy,
    ...intelligentDocumentProcessingServiceProxy,
    ...hxpContentProxy,
    ...governanceServiceProxy,
    ...nucleusProxy,
    ...wsProxy,
};
