/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { AppConfigService, AppConfigServiceMock, NoopTranslateModule, OAuth2Service } from '@alfresco/adf-core';
import { IdentityGroupService } from './identity-group.service';
import { errorResponse, mockSearchGroupByApp, mockSearchGroupByRoles, mockSearchGroupByRolesAndApp } from '../mock/identity-group.service.mock';
import { mockFoodGroups } from '../mock/group.mock';
import { of, throwError } from 'rxjs';

describe('IdentityGroupService', () => {
    let service: IdentityGroupService;
    let oAuth2Service: OAuth2Service;
    let spyOnGet: jest.SpyInstance;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [{ provide: AppConfigService, useClass: AppConfigServiceMock }],
        });
        service = TestBed.inject(IdentityGroupService);
        oAuth2Service = TestBed.inject(OAuth2Service);
        spyOnGet = jest.spyOn(oAuth2Service, 'get');
    });

    describe('Search', () => {
        it('should fetch groups', (done) => {
            spyOnGet.mockReturnValue(of(mockFoodGroups));
            const searchSpy = jest.spyOn(service, 'search');

            service.search('fake').subscribe((res) => {
                expect(res).toBeDefined();
                expect(searchSpy).toHaveBeenCalled();
                expect(service.queryParams).toEqual({
                    search: 'fake',
                });
                done();
            });
        });

        it('should not fetch groups if error occurred', (done) => {
            spyOnGet.mockReturnValue(throwError(errorResponse));

            const searchSpy = jest.spyOn(service, 'search');

            service.search('fake').subscribe(
                () => {
                    fail('expected an error, not groups');
                },
                (error) => {
                    expect(searchSpy).toHaveBeenCalled();
                    expect(error.status).toEqual(404);
                    expect(error.statusText).toEqual('Not Found');
                    expect(error.error).toEqual('Mock Error');
                    done();
                }
            );
        });

        it('should fetch groups by roles', (done) => {
            spyOnGet.mockReturnValue(of(mockFoodGroups));
            const searchSpy = jest.spyOn(service, 'search');

            service.search('fake', mockSearchGroupByRoles).subscribe((res) => {
                expect(res).toBeDefined();
                expect(searchSpy).toHaveBeenCalled();
                expect(service.queryParams).toEqual({
                    search: 'fake',
                    role: 'fake-role-1,fake-role-2',
                });
                done();
            });
        });

        it('should not fetch groups by roles if error occurred', (done) => {
            spyOnGet.mockReturnValue(throwError(errorResponse));
            const searchSpy = jest.spyOn(service, 'search');

            service.search('fake', mockSearchGroupByRoles).subscribe(
                () => {
                    fail('expected an error, not groups');
                },
                (error) => {
                    expect(searchSpy).toHaveBeenCalled();
                    expect(service.queryParams).toEqual({
                        search: 'fake',
                        role: 'fake-role-1,fake-role-2',
                    });
                    expect(error.status).toEqual(404);
                    expect(error.statusText).toEqual('Not Found');
                    expect(error.error).toEqual('Mock Error');
                    done();
                }
            );
        });

        it('should fetch groups within app', (done) => {
            spyOnGet.mockReturnValue(of(mockFoodGroups));

            service.search('fake', mockSearchGroupByApp).subscribe((res) => {
                expect(res).toBeDefined();
                expect(service.queryParams).toEqual({
                    search: 'fake',
                    application: 'fake-app-name',
                });
                done();
            });
        });

        it('should fetch groups within app with roles', (done) => {
            spyOnGet.mockReturnValue(of(mockFoodGroups));

            service.search('fake', mockSearchGroupByRolesAndApp).subscribe((res) => {
                expect(res).toBeDefined();
                expect(service.queryParams).toEqual({
                    search: 'fake',
                    application: 'fake-app-name',
                    role: 'fake-role-1,fake-role-2',
                });
                done();
            });
        });

        it('should not fetch groups within app if error occurred', (done) => {
            spyOnGet.mockReturnValue(throwError(errorResponse));
            const searchSpy = jest.spyOn(service, 'search');

            service.search('fake', mockSearchGroupByApp).subscribe(
                () => {
                    fail('expected an error, not groups');
                },
                (error) => {
                    expect(searchSpy).toHaveBeenCalled();
                    expect(service.queryParams).toEqual({
                        search: 'fake',
                        application: 'fake-app-name',
                    });
                    expect(error.status).toEqual(404);
                    expect(error.statusText).toEqual('Not Found');
                    expect(error.error).toEqual('Mock Error');
                    done();
                }
            );
        });
    });
});
