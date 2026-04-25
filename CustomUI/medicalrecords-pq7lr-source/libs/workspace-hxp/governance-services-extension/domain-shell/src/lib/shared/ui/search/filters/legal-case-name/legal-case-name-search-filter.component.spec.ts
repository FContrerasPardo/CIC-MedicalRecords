/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegalCaseNameSearchFilterComponent } from './legal-case-name-search-filter.component';
import { LegalCaseNameSearchFilterService } from './legal-case-name-search-filter.service';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MultiSelectListSearchFilterHarness } from '../base/multi-select-list-filter/multi-select-list-search-filter-harness.mock';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { filter, firstValueFrom, take } from 'rxjs';

describe('LegalCaseNameSearchFilterComponent', () => {
    let fixture: ComponentFixture<LegalCaseNameSearchFilterComponent>;
    let component: LegalCaseNameSearchFilterComponent;
    let loader: HarnessLoader;

    const mockLegalCases = [
        { id: 'LC-1', category: 'Case Alpha' },
        { id: 'LC-2', category: 'Case Beta' },
    ];

    const mockLegalCaseNameSearchFilterService = {
        toQueryParams: jest.fn(),
        fromQueryParams: jest.fn(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LegalCaseNameSearchFilterComponent, NoopAnimationsModule, NoopTranslateModule, MatIconTestingModule],
            providers: [
                {
                    provide: LegalCaseNameSearchFilterService,
                    useValue: mockLegalCaseNameSearchFilterService,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LegalCaseNameSearchFilterComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('legalCaseItems', mockLegalCases);

        loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
        fixture.detectChanges();
    });

    afterEach(() => {
        mockLegalCaseNameSearchFilterService.toQueryParams.mockClear();
        mockLegalCaseNameSearchFilterService.fromQueryParams.mockClear();
    });

    it('should display filter label', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('GOVERNANCE.SEARCH.FILTERS.LEGAL_CASE.LABEL');
    });

    it('should delegate toQueryParams to the service', () => {
        const data = new MultiSelectListSearchFilterData([{ label: 'Case Alpha', value: 'LC-1' }]);

        component.toQueryParams(data);

        expect(mockLegalCaseNameSearchFilterService.toQueryParams).toHaveBeenCalledWith(data);
    });

    describe('fromQueryParams', () => {
        it('should call the service with params and current legalCaseItems()', () => {
            const params = { legalCaseName: ['LC-1'] };
            mockLegalCaseNameSearchFilterService.fromQueryParams.mockReturnValue({ test: true });

            const result = component.fromQueryParams(params);

            expect(mockLegalCaseNameSearchFilterService.fromQueryParams).toHaveBeenCalledWith(params, mockLegalCases);
            expect(result).toEqual({ test: true });
        });

        it('should handle undefined returned by the service', () => {
            mockLegalCaseNameSearchFilterService.fromQueryParams.mockReturnValue(undefined);

            const result = component.fromQueryParams({});

            expect(result).toBeUndefined();
        });

        it('should pass through single value param', () => {
            const params = { legalCaseName: 'LC-1' };
            mockLegalCaseNameSearchFilterService.fromQueryParams.mockReturnValue({ test: 'single' });

            const result = component.fromQueryParams(params);

            expect(mockLegalCaseNameSearchFilterService.fromQueryParams).toHaveBeenCalledWith(params, mockLegalCases);
            expect(result).toEqual({ test: 'single' });
        });

        it('should pass through empty array param and return undefined when service returns undefined', () => {
            const params = { legalCaseName: [] };
            mockLegalCaseNameSearchFilterService.fromQueryParams.mockReturnValue(undefined);

            const result = component.fromQueryParams(params);

            expect(mockLegalCaseNameSearchFilterService.fromQueryParams).toHaveBeenCalledWith(params, mockLegalCases);
            expect(result).toBeUndefined();
        });
    });

    it('should map legalCaseItems into MultiSelectList options when loading options', async () => {
        const optionsPromise = firstValueFrom((component as any).loadOptions());

        fixture.componentRef.setInput('legalCaseItems', [...mockLegalCases]);
        fixture.detectChanges();

        const options = await optionsPromise;

        expect(options).toEqual([
            { label: 'Case Alpha', value: 'LC-1' },
            { label: 'Case Beta', value: 'LC-2' },
        ]);
    });

    it('should return an empty options list when legalCaseItems is empty', async () => {
        const optionsPromise = firstValueFrom((component as any).loadOptions());

        fixture.componentRef.setInput('legalCaseItems', []);
        fixture.detectChanges();

        const options = await optionsPromise;
        expect(options).toEqual([]);
    });

    it('should update options when legalCaseItems changes after initialization', async () => {
        const updatedOptionsPromise = firstValueFrom(
            (component as any).loadOptions().pipe(
                filter((options: Array<{ label: string; value: string }>) => options.some((option) => option.value === 'LC-3')),
                take(1)
            )
        );

        fixture.componentRef.setInput('legalCaseItems', [{ id: 'LC-3', category: 'Case Gamma' }]);
        fixture.detectChanges();

        const updatedOptions = await updatedOptionsPromise;
        expect(updatedOptions).toEqual([{ label: 'Case Gamma', value: 'LC-3' }]);
    });
});
