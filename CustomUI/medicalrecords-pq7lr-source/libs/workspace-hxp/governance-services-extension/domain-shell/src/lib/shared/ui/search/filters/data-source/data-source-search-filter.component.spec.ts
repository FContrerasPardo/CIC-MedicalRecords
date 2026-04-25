/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataSourceSearchFilterComponent } from './data-source-search-filter.component';
import { DataSourceSearchFilterService } from './data-source-search-filter.service';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MultiSelectListSearchFilterHarness } from '../base/multi-select-list-filter/multi-select-list-search-filter-harness.mock';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { HarnessLoader } from '@angular/cdk/testing';
import { of } from 'rxjs';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';

describe('DataSourceSearchFilterComponent', () => {
    let fixture: ComponentFixture<DataSourceSearchFilterComponent>;
    let component: DataSourceSearchFilterComponent;
    let dataSourceSearchFilterService: DataSourceSearchFilterService;
    let loader: HarnessLoader;

    const mockDataSources = [
        { label: 'Data Source 1', value: 'ds1', icon: 'cloud' },
        { label: 'Data Source 2', value: 'ds2', icon: 'cloud' },
    ];

    const mockDataSourceSearchFilterService = {
        getDataSources: jest.fn().mockReturnValue(of(mockDataSources)),
        toQueryParams: jest.fn(),
        fromQueryParams: jest.fn(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DataSourceSearchFilterComponent, NoopAnimationsModule, NoopTranslateModule, MatIconTestingModule],
            providers: [
                {
                    provide: DataSourceSearchFilterService,
                    useValue: mockDataSourceSearchFilterService,
                },
            ],
        }).compileComponents();

        dataSourceSearchFilterService = TestBed.inject(DataSourceSearchFilterService);

        fixture = TestBed.createComponent(DataSourceSearchFilterComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
        fixture.detectChanges();
    });

    afterEach(() => {
        mockDataSourceSearchFilterService.getDataSources.mockClear();
    });

    it('should display filter label', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('GOVERNANCE.SEARCH.FILTERS.DATA_SOURCE.LABEL');
    });

    it('should call the filter service when loadOptions is called', () => {
        expect(dataSourceSearchFilterService.getDataSources).toHaveBeenCalled();
    });

    it('should call the service to get the query params', () => {
        const data = new MultiSelectListSearchFilterData([{ label: 'Data Source 1', value: 'ds1', icon: 'cloud' }]);

        component.toQueryParams(data);

        expect(dataSourceSearchFilterService.toQueryParams).toHaveBeenCalledWith(data);
    });

    describe('fromQueryParams', () => {
        it('should delegate to the service and return its result', () => {
            const params = { eds: ['ds1'] };
            mockDataSourceSearchFilterService.fromQueryParams.mockReturnValue({ test: true });
            const result = component.fromQueryParams(params);
            expect(mockDataSourceSearchFilterService.fromQueryParams).toHaveBeenCalledWith(params);
            expect(result).toEqual({ test: true });
        });

        it('should handle undefined from service', () => {
            mockDataSourceSearchFilterService.fromQueryParams.mockReturnValue(undefined);
            const result = component.fromQueryParams({});
            expect(result).toBeUndefined();
        });

        it('should handle empty array from service', () => {
            mockDataSourceSearchFilterService.fromQueryParams.mockReturnValue(undefined);
            const result = component.fromQueryParams({ eds: [] });
            expect(result).toBeUndefined();
        });

        it('should handle single value from service', () => {
            mockDataSourceSearchFilterService.fromQueryParams.mockReturnValue({ test: 'single' });
            const result = component.fromQueryParams({ eds: 'ds1' });
            expect(result).toEqual({ test: 'single' });
        });
    });
});
