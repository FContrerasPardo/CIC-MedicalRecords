/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const ProvisioningStatus = {
    Carriedover: 'CARRIEDOVER',
    Decommissioned: 'DECOMMISSIONED',
    Decommissioning: 'DECOMMISSIONING',
    Pending: 'PENDING',
    Provisioned: 'PROVISIONED',
    Provisioning: 'PROVISIONING',
} as const;

export type ProvisioningStatus = typeof ProvisioningStatus[keyof typeof ProvisioningStatus];
