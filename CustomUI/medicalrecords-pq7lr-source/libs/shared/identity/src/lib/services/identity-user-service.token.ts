/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken } from '@angular/core';
import { IdentityUserService } from './identity-user.service';

export const SHARED_IDENTITY_USER_SERVICE_TOKEN = new InjectionToken<IdentityUserService>('shared-identity-user-service-token');
