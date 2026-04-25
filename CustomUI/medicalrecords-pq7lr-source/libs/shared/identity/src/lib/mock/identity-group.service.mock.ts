/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { IdentityGroupFilterInterface } from '../models/identity-group-filter.interface';

export const mockSearchGroupByRoles: IdentityGroupFilterInterface = {
    roles: ['fake-role-1', 'fake-role-2'],
    withinApplication: '',
};

export const mockSearchGroupByRolesAndApp: IdentityGroupFilterInterface = {
    roles: ['fake-role-1', 'fake-role-2'],
    withinApplication: 'fake-app-name',
};

export const mockSearchGroupByApp: IdentityGroupFilterInterface = {
    roles: [],
    withinApplication: 'fake-app-name',
};

export const errorResponse = new HttpErrorResponse({
    error: 'Mock Error',
    status: 404,
    statusText: 'Not Found',
});
