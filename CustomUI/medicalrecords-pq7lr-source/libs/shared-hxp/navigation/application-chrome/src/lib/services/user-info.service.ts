/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AuthenticationService, JwtHelperService } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class UserInfoService {
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly authenticationService = inject(AuthenticationService);

    displayName: string;

    constructor() {
        this.displayName = this.authenticationService.isOauth()
            ? this.jwtHelperService.getValueFromLocalToken<string>(JwtHelperService.USER_NAME)
            : '';
    }
}
