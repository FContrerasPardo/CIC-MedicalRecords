/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService, AuthenticationService, NotificationService, TranslationService } from '@alfresco/adf-core';
import { HxPFeaturesService } from './hxp-features.service';
import { ReplaySubject, firstValueFrom, of } from 'rxjs';
import { MockService } from 'ng-mocks';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FeaturesServiceConfigToken } from '@alfresco/adf-core/feature-flags';

describe('HxPFeaturesService', () => {
    let service: HxPFeaturesService;
    let adfHttpClient: AdfHttpClient;
    let authenticationService: AuthenticationService;
    let mockTranslationService: TranslationService;
    let mockNotificationService: NotificationService;

    const appConfigService: AppConfigService = {
        get: (property: string) => {
            if (property === 'bpmHost') {
                return 'http://mock.com';
            } else if (property === 'alfresco-deployed-apps') {
                return [{ name: 'mock-app' }];
            } else {
                return null;
            }
        },
        loadWellKnown: () => jest.fn().mockImplementation(() => Promise.resolve()),
    } as unknown as AppConfigService;

    beforeEach(() => {
        const alfrescoApiInitialized$ = new ReplaySubject<boolean>();
        alfrescoApiInitialized$.next(true);
        const onLogin$ = new ReplaySubject<boolean>();
        onLogin$.next(true);

        authenticationService = MockService(AuthenticationService, {
            isLoggedIn: () => true,
            onLogin: onLogin$,
        });
        adfHttpClient = MockService(AdfHttpClient);
        mockNotificationService = MockService(NotificationService);
        mockTranslationService = MockService(TranslationService);

        TestBed.configureTestingModule({
            providers: [
                HxPFeaturesService,
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: TranslationService, useValue: mockTranslationService },
                { provide: AppConfigService, useValue: appConfigService },
                { provide: AuthenticationService, useValue: authenticationService },
                { provide: AdfHttpClient, useValue: adfHttpClient },
                { provide: FeaturesServiceConfigToken, useValue: {} }
            ]
        });

        service = TestBed.inject(HxPFeaturesService);
        (service as any).FEATURE_FLAGS_TIMEOUT = 1000;
        (service as any).FITMENT_FACTOR = 200;
        service.init();
    });

    describe('Check path generation based on the received configuration', () => {
        let apiUrl;

        beforeEach(() => {
            apiUrl = '';
            spyOn(adfHttpClient, 'request').and.returnValue(Promise.resolve({}));
        });

        it('should return correct path', async () => {
            apiUrl = 'http://mock.com/v1/feature-flags';
            await firstValueFrom(service.init());

            await firstValueFrom(service.getFlags$());
            expect(adfHttpClient.request).toHaveBeenCalledWith(apiUrl, { httpMethod: 'GET' });
        });

        it('should return correct path when is not application aware', async () => {
            apiUrl = 'http://mock.com/v1/feature-flags';

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    HxPFeaturesService,
                    { provide: NotificationService, useValue: mockNotificationService },
                    { provide: TranslationService, useValue: mockTranslationService },
                    { provide: AppConfigService, useValue: appConfigService },
                    { provide: AuthenticationService, useValue: authenticationService },
                    { provide: AdfHttpClient, useValue: adfHttpClient },
                    { provide: FeaturesServiceConfigToken, useValue: { isApplicationAware: false } }
                ]
            });
            service = TestBed.inject(HxPFeaturesService);

            await firstValueFrom(service.init());

            await firstValueFrom(service.getFlags$());
            expect(adfHttpClient.request).toHaveBeenCalledWith(apiUrl, { httpMethod: 'GET' });
        });

        it('should return correct path when is application aware and service relative path was provided', async () => {
            apiUrl = 'http://mock.com/mock-app/rb/v1/feature-flags';

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    HxPFeaturesService,
                    { provide: NotificationService, useValue: mockNotificationService },
                    { provide: TranslationService, useValue: mockTranslationService },
                    { provide: AppConfigService, useValue: appConfigService },
                    { provide: AuthenticationService, useValue: authenticationService },
                    { provide: AdfHttpClient, useValue: adfHttpClient },
                    { provide: FeaturesServiceConfigToken, useValue: { isApplicationAware: true, serviceRelativePath: '/rb/' } }
                ]
            });
            service = TestBed.inject(HxPFeaturesService);

            await firstValueFrom(service.init());

            await firstValueFrom(service.getFlags$());
            expect(adfHttpClient.request).toHaveBeenCalledWith(apiUrl, { httpMethod: 'GET' });
        });

        it('should retry 3 times on timeout error and show the error message', fakeAsync(() => {
            const mockNotificationServiceSpy = spyOn(mockNotificationService, 'showError').and.callThrough();
            const mockTranslationServiceSpy = spyOn(mockTranslationService, 'instant').and.callThrough();

            // Simulate timeout error
            const error = new Error('Service down');
            adfHttpClient.request.and.returnValue(Promise.reject(error));
            // Fail the request 3 times
            let result: any;

            (service as any).initializeFlags().subscribe((res) => {
                result = res;
            });

            // simulate retries (total 3 attempts with increasing timeout)
            tick(1000 + 1200 + 1400 + 1600); // Timeout grows due to FITMENT_FACTOR

            expect(result).toEqual({});
            expect(adfHttpClient.request).toHaveBeenCalledTimes(service.retryCount + 1);
            expect(mockNotificationServiceSpy).toHaveBeenCalled();
            expect(mockTranslationServiceSpy).toHaveBeenCalledWith('SDK.MAIN_NAVIGATION.ERRORS.LOADING_ERROR');
        }));
    });

    describe('Getting values for the feature flags', () => {
        const expectedFeatureFlags = {
            ff1: { current: true },
            ff2: { current: false },
            ff3: { current: true },
        };

        beforeEach(async () => {
            spyOn(service, 'getFlags$').and.returnValue(of(expectedFeatureFlags));
        });

        it('should get false when flag is unknown - isOn$', (done) => {
            service.isOn$('ff4').subscribe((result) => {
                expect(result).toBeFalsy();
                done();
            });
        });

        it('should get true when flag is unknown - isOff$', (done) => {
            service.isOff$('ff4').subscribe((result) => {
                expect(result).toBeTruthy();
                done();
            });
        });

        it('should get the value of the flag when flag is known - isOn$', (done) => {
            service.isOn$('ff1').subscribe((result) => {
                expect(result).toBeTruthy();
                done();
            });
            service.isOn$('ff2').subscribe((result) => {
                expect(result).toBeFalsy();
                done();
            });
            service.isOn$('ff3').subscribe((result) => {
                expect(result).toBeTruthy();
                done();
            });
        });

        it('should get the value of the flag when flag is known - isOff$', (done) => {
            service.isOff$('ff1').subscribe((result) => {
                expect(result).toBeFalsy();
                done();
            });
            service.isOff$('ff2').subscribe((result) => {
                expect(result).toBeTruthy();
                done();
            });
            service.isOff$('ff3').subscribe((result) => {
                expect(result).toBeFalsy();
                done();
            });
        });

        it('should get all the flags values asynchronously', (done) => {
            service.init();
            service.getFlags$().subscribe((result) => {
                expect(result).toEqual(expectedFeatureFlags);
                done();
            });
        });
    });
});
