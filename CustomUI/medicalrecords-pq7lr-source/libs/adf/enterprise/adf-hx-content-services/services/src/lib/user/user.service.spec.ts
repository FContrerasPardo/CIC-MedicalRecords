/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { MockService, ngMocks } from 'ng-mocks';
import { UserApi } from '@hylandsoftware/hxcs-js-client';
import { UserService } from './user.service';
import { switchMap, tap } from 'rxjs/operators';
import { generateMockErrorResponse, generateMockResponse } from '@hxp/workspace-hxp/shared/testing';
import { USER_API_TOKEN } from '@alfresco/adf-hx-content-services/api';

const mockUsers = [
    {
        id: 'c5fee88f-102f-42c3-923d-3ee2dfcb52a2',
        firstName: 'test1',
        lastName: 'user1',
    },
    {
        id: '444660e7-0334-4356-8c3d-484fe445b610',
        firstName: 'test2',
        lastName: 'user2',
    },
];

describe('User Service', () => {
    let getUserByIdSpy: jest.SpyInstance<Promise<any>>;
    let userService: UserService;
    let mockUserApi: UserApi;

    beforeEach(() => {
        ngMocks.autoSpy('jest');

        mockUserApi = MockService(UserApi);
        getUserByIdSpy = jest.spyOn(mockUserApi, 'getUserById').mockImplementation((id) => {
            if (id === mockUsers[0].id) {
                return generateMockResponse({ data: mockUsers[0] });
            }
            if (id === mockUsers[1].id) {
                return generateMockResponse({ data: mockUsers[1] });
            }
            return generateMockErrorResponse('User not found', 404);
        });

        TestBed.configureTestingModule({
            providers: [
                UserService,
                { provide: USER_API_TOKEN, useValue: mockUserApi }
            ]
        });

        userService = TestBed.inject(UserService);
    });

    afterEach(() => {
        getUserByIdSpy.mockReset();
    });

    it('should fetch users if not cached', (done) => {
        const user1 = mockUsers[0];
        const user2 = mockUsers[1];

        userService
            .resolveUser(user1.id)
            .pipe(
                tap((user) => {
                    expect(user).toEqual(user1);
                    expect(getUserByIdSpy).toHaveBeenCalledTimes(1);
                }),
                switchMap(() => userService.resolveUser(user2.id)),
                tap((user) => {
                    expect(user).toEqual(user2);
                    expect(getUserByIdSpy).toHaveBeenCalledTimes(2);
                })
            )
            .subscribe(() => done());
    });

    it('should not fetch users if cached', (done) => {
        const user1 = mockUsers[0];

        userService
            .resolveUser(user1.id)
            .pipe(
                tap((user) => {
                    expect(user).toEqual(user1);
                    expect(getUserByIdSpy).toHaveBeenCalledTimes(1);
                }),
                switchMap(() => userService.resolveUser(user1.id)),
                tap((user) => {
                    expect(user).toEqual(user1);
                    expect(getUserByIdSpy).toHaveBeenCalledTimes(1);
                })
            )
            .subscribe(() => done());
    });
});
