/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { GovernancePermissionService } from '../config/governance-permission.service';

export const governancePermissionGuard: CanActivateFn = () => {
    const permissionService = inject(GovernancePermissionService);
    return permissionService.hasGovernanceAccess();
};
