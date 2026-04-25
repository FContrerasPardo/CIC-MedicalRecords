/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { DashboardStateService } from './dashboard-state.service';
import { DashboardDataService } from './dashboard.data.service';
import {
    DEFAULT_STATUS_COLOR,
    STATUS_COLOR_MAP,
    WIDGET_ID,
    WidgetId,
} from '../definitions/dashboard.constants';

import {
    IDENTITY_USER_SERVICE_TOKEN,
    IdentityUserModel,
    RecordStatusType,
} from '@alfresco/adf-hx-content-services/services';

import { StorageService } from '@alfresco/adf-core';

describe('DashboardStateService', () => {
    let service: DashboardStateService;
    let dashboardDataServiceSpy: jest.Mocked<DashboardDataService>;
    let storageServiceSpy: jest.Mocked<StorageService>;
    let identityUserServiceSpy: { getCurrentUserInfo: jest.Mock<IdentityUserModel, []> };

    beforeEach(() => {
        const dataSpy: Partial<Record<keyof DashboardDataService, unknown>> = {
            fetchRecordHealth: jest.fn(),
            fetchActiveRetention: jest.fn(),
            fetchMissingProperties: jest.fn(),
            fetchCutoffTracker: jest.fn(),
            fetchDispositionTracker: jest.fn(),
            fetchLegalHoldSummary: jest.fn(),
            clearMonthlyStatisticsCache: jest.fn(),
            clearTrackerStatisticsCache: jest.fn(),
            clearTotalStatisticsCache: jest.fn(),
        };

        const storageSpy: Partial<Record<keyof StorageService, unknown>> = {
            getItem: jest.fn(),
            setItem: jest.fn(),
        };

        const identitySpy = {
            getCurrentUserInfo: jest.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                DashboardStateService,
                { provide: DashboardDataService, useValue: dataSpy },
                { provide: StorageService, useValue: storageSpy },
                { provide: IDENTITY_USER_SERVICE_TOKEN, useValue: identitySpy },
            ],
        });

        service = TestBed.inject(DashboardStateService);
        dashboardDataServiceSpy = TestBed.inject(DashboardDataService) as jest.Mocked<DashboardDataService>;
        storageServiceSpy = TestBed.inject(StorageService) as jest.Mocked<StorageService>;
        identityUserServiceSpy = TestBed.inject(IDENTITY_USER_SERVICE_TOKEN) as unknown as {
            getCurrentUserInfo: jest.Mock<IdentityUserModel, []>;
        };
    });

    describe('getWidgetData', () => {
        it('should return raw widget category data for category-based widgets', async () => {
            const mockData = { series: [{ id: '1', category: 'Cat1', total: 10, value: 5 }] };

            dashboardDataServiceSpy.fetchActiveRetention.mockReturnValue(of(mockData as any));

            const result = await firstValueFrom(service.getWidgetData(WIDGET_ID.ActiveRetention as WidgetId));

            expect(result).toEqual(mockData);
        });

        it('should return raw widget category data for legal hold summary', async () => {
            const mockData = { series: [{ id: 'LH#1', category: 'Case A', total: 10, value: 3 }] };

            dashboardDataServiceSpy.fetchLegalHoldSummary.mockReturnValue(of(mockData as any));

            const result = await firstValueFrom(service.getWidgetData(WIDGET_ID.LegalHoldSummary as WidgetId));

            expect(result).toEqual(mockData);
        });


        it('should enrich record health breakdown entries with label and color for display', async () => {
            const mockBreakdown = [{ status: 'Ready' as RecordStatusType, value: 10 }];
            const rawResponse = { total: 10, breakdown: mockBreakdown };

            dashboardDataServiceSpy.fetchRecordHealth.mockReturnValue(of(rawResponse as any));

            const result = await firstValueFrom(service.getWidgetData(WIDGET_ID.RecordHealth as WidgetId));

            expect(result).toBeTruthy();

            if (result && 'breakdown' in result) {
                const first = (result as any).breakdown[0];
                expect(first.status).toBe('Ready');
                expect(first.value).toBe(10);
                expect(first.label).toBeDefined();
                expect(first.color).toBeDefined();
            }
        });

        it('should pass the selected category id when requesting record health data', async () => {
            const rawResponse = { total: 10, breakdown: [{ status: 'Ready' as RecordStatusType, value: 10 }] };

            dashboardDataServiceSpy.fetchRecordHealth.mockReturnValue(of(rawResponse as any));

            await firstValueFrom(service.getWidgetData(WIDGET_ID.RecordHealth as WidgetId, { categoryId: 'C#2' }));

            expect(dashboardDataServiceSpy.fetchRecordHealth).toHaveBeenCalledWith('C#2');
        });

        it('should pass the selected month when requesting cutoff tracker data', async () => {
            const selectedDate = new Date(2026, 11, 3);
            const rawResponse = { series: [{ id: 'C#1', category: 'Category 1', total: 10, value: 3 }] };

            dashboardDataServiceSpy.fetchCutoffTracker.mockReturnValue(of(rawResponse as any));

            await firstValueFrom(service.getWidgetData(WIDGET_ID.CutoffTracker as WidgetId, { date: selectedDate }));

            expect(dashboardDataServiceSpy.fetchCutoffTracker).toHaveBeenCalledWith(selectedDate);
        });

        it('should pass the selected month when requesting disposition tracker data', async () => {
            const selectedDate = new Date(2026, 6, 14);
            const rawResponse = { series: [{ id: 'C#1', category: 'Category 1', total: 12, value: 4 }] };

            dashboardDataServiceSpy.fetchDispositionTracker.mockReturnValue(of(rawResponse as any));

            await firstValueFrom(service.getWidgetData(WIDGET_ID.DispositionTracker as WidgetId, { date: selectedDate }));

            expect(dashboardDataServiceSpy.fetchDispositionTracker).toHaveBeenCalledWith(selectedDate);
        });

        it('should return null for record health when the response does not contain a breakdown array', async () => {
            dashboardDataServiceSpy.fetchRecordHealth.mockReturnValue(of({ total: 10 } as any));

            const result = await firstValueFrom(service.getWidgetData(WIDGET_ID.RecordHealth as WidgetId));

            expect(result).toBeNull();
        });

        it('should return null for category widgets when the response does not contain a series array', async () => {
            dashboardDataServiceSpy.fetchActiveRetention.mockReturnValue(of({ nope: true } as any));

            const result = await firstValueFrom(service.getWidgetData(WIDGET_ID.ActiveRetention as WidgetId));

            expect(result).toBeNull();
        });


        it('should return null when the underlying widget request throws', async () => {
            dashboardDataServiceSpy.fetchRecordHealth.mockReturnValue(throwError(() => new Error('fail')));

            const result = await firstValueFrom(service.getWidgetData(WIDGET_ID.RecordHealth as WidgetId));

            expect(result).toBeNull();
        });

        it('should return null for unknown widget ids', async () => {
            const result = await firstValueFrom(service.getWidgetData('UNKNOWN' as WidgetId));
            expect(result).toBeNull();
        });
    });

    describe('fetchAllWidgets', () => {
        it('should fetch all widgets and return one combined result object', async () => {
            const recordHealthRaw = {
                total: 10,
                breakdown: [{ status: 'Ready' as RecordStatusType, value: 10 }],
            };

            const activeRetention = { series: [{ id: '1', category: 'AR', total: 10, value: 5 }] };
            const missingProps = { series: [{ id: '2', category: 'MP', total: 11, value: 6 }] };
            const cutoff = { series: [{ id: '3', category: 'CT', total: 12, value: 7 }] };
            const disposition = { series: [{ id: '4', category: 'DT', total: 13, value: 8 }] };
            const legalHold = { series: [{ id: 'LH', category: 'LH', total: 14, value: 9 }] };

            dashboardDataServiceSpy.fetchRecordHealth.mockReturnValue(of(recordHealthRaw as any));
            dashboardDataServiceSpy.fetchActiveRetention.mockReturnValue(of(activeRetention as any));
            dashboardDataServiceSpy.fetchMissingProperties.mockReturnValue(of(missingProps as any));
            dashboardDataServiceSpy.fetchCutoffTracker.mockReturnValue(of(cutoff as any));
            dashboardDataServiceSpy.fetchDispositionTracker.mockReturnValue(of(disposition as any));
            dashboardDataServiceSpy.fetchLegalHoldSummary.mockReturnValue(of(legalHold as any));

            const result = await firstValueFrom(service.fetchAllWidgets());

            expect(result[WIDGET_ID.ActiveRetention]).toEqual(activeRetention);
            expect(result[WIDGET_ID.MissingProperties]).toEqual(missingProps);
            expect(result[WIDGET_ID.CutoffTracker]).toEqual(cutoff);
            expect(result[WIDGET_ID.DispositionTracker]).toEqual(disposition);
            expect(result[WIDGET_ID.LegalHoldSummary]).toEqual(legalHold);

            expect(result[WIDGET_ID.RecordHealth]).toBeTruthy();
            const rh = result[WIDGET_ID.RecordHealth] as any;
            expect(rh.total).toBe(10);
            expect(Array.isArray(rh.breakdown)).toBe(true);
            expect(rh.breakdown[0].label).toBeDefined();
            expect(rh.breakdown[0].color).toBeDefined();
        });
    });

    describe('clearWidgetCaches', () => {
        it('should clear cached widget backend responses that are shared across the dashboard', () => {
            service.clearWidgetCaches();

            expect(dashboardDataServiceSpy.clearMonthlyStatisticsCache).toHaveBeenCalledTimes(1);
            expect(dashboardDataServiceSpy.clearTrackerStatisticsCache).toHaveBeenCalledTimes(1);
            expect(dashboardDataServiceSpy.clearTotalStatisticsCache).toHaveBeenCalledTimes(1);
        });
    });

    describe('getStatusColor', () => {
        it('should return the default status color when status is missing', () => {
            expect(service.getStatusColor(undefined)).toBe(DEFAULT_STATUS_COLOR);
        });

        it('should return a mapped status color when status is known', () => {
            const anyKnownStatus = Object.keys(STATUS_COLOR_MAP)[0];
            if (!anyKnownStatus) {
                expect(service.getStatusColor('SOME_UNKNOWN_STATUS')).toBe(DEFAULT_STATUS_COLOR);
                return;
            }

            expect(service.getStatusColor(anyKnownStatus)).toBe((STATUS_COLOR_MAP as any)[anyKnownStatus]);
        });

        it('should fall back to default status color when status is unknown', () => {
            expect(service.getStatusColor('SOME_UNKNOWN_STATUS')).toBe(DEFAULT_STATUS_COLOR);
        });
    });

    describe('widget order persistence', () => {
        it('should use the default widget order when the user is not available', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({} as IdentityUserModel);

            const defaultOrder = [
                WIDGET_ID.RecordHealth,
                WIDGET_ID.ActiveRetention,
                WIDGET_ID.MissingProperties,
            ] as unknown as WidgetId[];

            const result = service.loadWidgetOrder(defaultOrder);

            expect(result).toEqual(defaultOrder);
            expect(storageServiceSpy.getItem).not.toHaveBeenCalled();
        });

        it('should use the stored widget order when available for the signed-in user', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({ username: 'john' } as IdentityUserModel);

            const defaultOrder = [
                WIDGET_ID.RecordHealth,
                WIDGET_ID.ActiveRetention,
                WIDGET_ID.MissingProperties,
            ] as unknown as WidgetId[];

            const storedOrder = [WIDGET_ID.MissingProperties, WIDGET_ID.RecordHealth, WIDGET_ID.ActiveRetention];
            storageServiceSpy.getItem.mockReturnValue(JSON.stringify(storedOrder));

            const result = service.loadWidgetOrder(defaultOrder);

            expect(storageServiceSpy.getItem).toHaveBeenCalledWith('john_widgetOrder');
            expect(result).toEqual(storedOrder);
        });

        it('should fall back to default order when the stored widget order is invalid JSON', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({ username: 'john' } as IdentityUserModel);

            const defaultOrder = [
                WIDGET_ID.RecordHealth,
                WIDGET_ID.ActiveRetention,
                WIDGET_ID.MissingProperties,
            ] as unknown as WidgetId[];

            storageServiceSpy.getItem.mockReturnValue('{not-json');

            const result = service.loadWidgetOrder(defaultOrder);

            expect(result).toEqual(defaultOrder);
        });

        it('should fall back to default order when the stored widget order is not an array', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({ username: 'john' } as IdentityUserModel);

            const defaultOrder = [
                WIDGET_ID.RecordHealth,
                WIDGET_ID.ActiveRetention,
                WIDGET_ID.MissingProperties,
            ] as unknown as WidgetId[];

            storageServiceSpy.getItem.mockReturnValue(JSON.stringify({ nope: true }));

            const result = service.loadWidgetOrder(defaultOrder);

            expect(result).toEqual(defaultOrder);
        });

        it('should return stored widget order as-is without normalization', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({ username: 'john' } as IdentityUserModel);

            const defaultOrder = [
                WIDGET_ID.RecordHealth,
                WIDGET_ID.ActiveRetention,
                WIDGET_ID.LegalHoldSummary,
            ] as unknown as WidgetId[];

            const storedOrder = [WIDGET_ID.ActiveRetention, 'unknown-widget', WIDGET_ID.ActiveRetention, WIDGET_ID.RecordHealth];
            storageServiceSpy.getItem.mockReturnValue(JSON.stringify(storedOrder));

            const result = service.loadWidgetOrder(defaultOrder);

            expect(result).toEqual(storedOrder);
        });

        it('should save the widget order for the signed-in user', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({ username: 'john' } as IdentityUserModel);

            const order = [
                WIDGET_ID.MissingProperties,
                WIDGET_ID.RecordHealth,
                WIDGET_ID.ActiveRetention,
            ] as unknown as WidgetId[];

            service.saveWidgetOrder(order);

            expect(storageServiceSpy.setItem).toHaveBeenCalledTimes(1);
            expect(storageServiceSpy.setItem).toHaveBeenCalledWith('john_widgetOrder', JSON.stringify(order));
        });

        it('should not save widget order when the user is not available', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({} as IdentityUserModel);

            service.saveWidgetOrder([WIDGET_ID.RecordHealth] as unknown as WidgetId[]);

            expect(storageServiceSpy.setItem).not.toHaveBeenCalled();
        });

        it('should not save widget order when the order is empty', () => {
            identityUserServiceSpy.getCurrentUserInfo.mockReturnValue({ username: 'john' } as IdentityUserModel);

            service.saveWidgetOrder([] as unknown as WidgetId[]);

            expect(storageServiceSpy.setItem).not.toHaveBeenCalled();
        });
    });
});
