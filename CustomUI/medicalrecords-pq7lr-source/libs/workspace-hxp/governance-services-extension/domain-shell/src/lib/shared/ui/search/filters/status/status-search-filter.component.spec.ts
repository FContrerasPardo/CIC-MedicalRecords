/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusSearchFilterComponent } from './status-search-filter.component';
import { StatusSearchFilterService } from './status-search-filter.service';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MultiSelectListSearchFilterHarness } from '../base/multi-select-list-filter/multi-select-list-search-filter-harness.mock';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';

describe('StatusSearchFilterComponent', () => {
    let fixture: ComponentFixture<StatusSearchFilterComponent>;
    let component: StatusSearchFilterComponent;
    let statusSearchFilterService: StatusSearchFilterService;
    let loader: HarnessLoader;

    const mockStatuses = [
        { label: 'Ready', value: 'Ready' },
        { label: 'Incomplete', value: 'Incomplete' },
    ];

    const mockStatusSearchFilterService = {
        getStatuses: jest.fn().mockReturnValue(mockStatuses),
        toQueryParams: jest.fn(),
        fromQueryParams: jest.fn(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StatusSearchFilterComponent, NoopAnimationsModule, NoopTranslateModule, MatIconTestingModule],
            providers: [
                {
                    provide: StatusSearchFilterService,
                    useValue: mockStatusSearchFilterService,
                },
            ],
        }).compileComponents();

        statusSearchFilterService = TestBed.inject(StatusSearchFilterService);

        fixture = TestBed.createComponent(StatusSearchFilterComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
        fixture.detectChanges();
    });

    afterEach(() => {
        mockStatusSearchFilterService.getStatuses.mockClear();
    });

    it('should display filter label', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('GOVERNANCE.SEARCH.FILTERS.STATUS.LABEL');
    });

    it('should call the filter service when loadOptions is called', () => {
        expect(statusSearchFilterService.getStatuses).toHaveBeenCalled();
    });

    it('should call the service to get the query params', () => {
        const data = new MultiSelectListSearchFilterData([{ label: 'Ready', value: 'Ready' }]);

        component.toQueryParams(data);

        expect(mockStatusSearchFilterService.toQueryParams).toHaveBeenCalledWith(data);
    });

    describe('fromQueryParams', () => {
        it('should delegate to the service and return its result', () => {
            const params = { status: ['Ready'] };
            mockStatusSearchFilterService.fromQueryParams.mockReturnValue({ test: true });
            const result = component.fromQueryParams(params);
            expect(mockStatusSearchFilterService.fromQueryParams).toHaveBeenCalledWith(params);
            expect(result).toEqual({ test: true });
        });

        it('should handle undefined from service', () => {
            mockStatusSearchFilterService.fromQueryParams.mockReturnValue(undefined);
            const result = component.fromQueryParams({});
            expect(result).toBeUndefined();
        });

        it('should handle empty array from service', () => {
            mockStatusSearchFilterService.fromQueryParams.mockReturnValue(undefined);
            const result = component.fromQueryParams({ status: [] });
            expect(result).toBeUndefined();
        });

        it('should handle single value from service', () => {
            mockStatusSearchFilterService.fromQueryParams.mockReturnValue({ test: 'single' });
            const result = component.fromQueryParams({ status: 'Ready' });
            expect(result).toEqual({ test: 'single' });
        });
    });
});
