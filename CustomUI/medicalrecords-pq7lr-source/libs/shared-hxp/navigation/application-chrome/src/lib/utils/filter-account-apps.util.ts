/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AccountApp } from '../interfaces/account-app.interface';
import { ProvisioningStatus } from '../types/provisioning-status.type';

export function filterAccountApps(accountApps: AccountApp[]) {
    return accountApps.filter((app: AccountApp) => app.provisioningStatus === ProvisioningStatus.Provisioned);
}
