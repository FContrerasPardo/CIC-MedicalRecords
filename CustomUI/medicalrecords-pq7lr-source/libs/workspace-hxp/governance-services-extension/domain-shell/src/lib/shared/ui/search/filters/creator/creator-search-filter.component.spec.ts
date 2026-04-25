/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreatorSearchFilterComponent } from './creator-search-filter.component';
import { CreatorSearchFilterService } from './creator-search-filter.service';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MultiSelectListSearchFilterHarness } from '../base/multi-select-list-filter/multi-select-list-search-filter-harness.mock';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { HarnessLoader } from '@angular/cdk/testing';
import { of } from 'rxjs';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';

describe('CreatorSearchFilterComponent', () => {
    let fixture: ComponentFixture<CreatorSearchFilterComponent>;
    let component: CreatorSearchFilterComponent;
    let creatorSearchFilterService: CreatorSearchFilterService;
    let loader: HarnessLoader;

    const mockCreators = [
        { label: 'User 1', value: 'user1', id: 'user1' },
        { label: 'User 2', value: 'user2', id: 'user2' },
    ];

    const mockCreatorSearchFilterService = {
        getCreators: jest.fn().mockReturnValue(of(mockCreators)),
        toQueryParams: jest.fn(),
        fromQueryParams: jest.fn(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreatorSearchFilterComponent, NoopAnimationsModule, NoopTranslateModule, MatIconTestingModule],
            providers: [
                {
                    provide: CreatorSearchFilterService,
                    useValue: mockCreatorSearchFilterService,
                },
            ],
        }).compileComponents();

        creatorSearchFilterService = TestBed.inject(CreatorSearchFilterService);

        fixture = TestBed.createComponent(CreatorSearchFilterComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
        fixture.detectChanges();
    });

    afterEach(() => {
        mockCreatorSearchFilterService.getCreators.mockClear();
    });

    it('should display filter label', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('GOVERNANCE.SEARCH.FILTERS.CREATOR.LABEL');
    });

    it('should call the filter service when loadOptions is called', () => {
        expect(creatorSearchFilterService.getCreators).toHaveBeenCalled();
    });

    it('should call the service to get the query params', () => {
        const data = new MultiSelectListSearchFilterData([{ label: 'User 1', value: 'user1' }]);

        component.toQueryParams(data);

        expect(creatorSearchFilterService.toQueryParams).toHaveBeenCalledWith(data);
    });

    describe('fromQueryParams', () => {
        it('should delegate to the service and return its result', () => {
            const params = { creator: ['user1', 'user2'] };
            mockCreatorSearchFilterService.fromQueryParams = jest.fn().mockReturnValue({ test: true });
            const result = component.fromQueryParams(params);
            expect(mockCreatorSearchFilterService.fromQueryParams).toHaveBeenCalledWith(params);
            expect(result).toEqual({ test: true });
        });

        it('should handle undefined from service', () => {
            mockCreatorSearchFilterService.fromQueryParams = jest.fn().mockReturnValue(undefined);
            const result = component.fromQueryParams({});
            expect(result).toBeUndefined();
        });

        it('should handle empty array from service', () => {
            mockCreatorSearchFilterService.fromQueryParams = jest.fn().mockReturnValue(undefined);
            const result = component.fromQueryParams({ creator: [] });
            expect(result).toBeUndefined();
        });

        it('should handle single value from service', () => {
            mockCreatorSearchFilterService.fromQueryParams = jest.fn().mockReturnValue({ test: 'single' });
            const result = component.fromQueryParams({ creator: 'user1' });
            expect(result).toEqual({ test: 'single' });
        });
    });
});
