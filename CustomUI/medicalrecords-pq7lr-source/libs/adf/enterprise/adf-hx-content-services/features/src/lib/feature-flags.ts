/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/**
 * @internal
 */
export const ADF_HX_CONTENT_SERVICES_INTERNAL = {
    CIC_GOVERNANCE_DASHBOARD_FEATURE: 'cic-governance-dashboard-feature',
    CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE: 'cic-workspace-document-layout-toggle',
    SEARCH_RESULTS_100K: 'cic-workspace-search-results-100k',
} as const;

export type ADF_HX_CONTENT_SERVICES_INTERNAL = typeof ADF_HX_CONTENT_SERVICES_INTERNAL[keyof typeof ADF_HX_CONTENT_SERVICES_INTERNAL];
