/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { UserInfoService } from './user-info.service';
import { AuthenticationService, JwtHelperService } from '@alfresco/adf-core';
import { mockTokenName, mockDisplayName } from '../mocks/services/user-info.service.mock';

describe('UserInfoService', () => {
    let service: UserInfoService;

    function initTest(isOauth: boolean) {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: JwtHelperService,
                    useValue: {
                        getValueFromLocalToken: () => mockTokenName,
                    },
                },
                {
                    provide: AuthenticationService,
                    useValue: {
                        isOauth: () => isOauth,
                    },
                },
            ],
        });

        service = TestBed.inject(UserInfoService);
    }

    it('should set displayName to empty string if is not oauth', () => {
        initTest(false);
        expect(service.displayName).toEqual('');
    });

    it('should set displayName to name attribute from token if is oauth', () => {
        initTest(true);
        expect(service.displayName).toEqual(mockDisplayName);
    });
});
