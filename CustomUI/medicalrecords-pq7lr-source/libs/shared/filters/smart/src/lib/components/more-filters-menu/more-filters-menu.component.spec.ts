/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MoreFiltersMenuComponent } from './more-filters-menu.component';
import { DateFilter, Filter, FilterService, RadioFilter } from '@alfresco-dbp/shared-filters-services';
import { getAllFiltersMock, getDateFilterMock, getProcessStringFilterMock } from '../../mock/filters.mock';
import { CheckboxHarnessUtils, InputHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('MoreFiltersMenuComponent', () => {
    const getAllFilters = (): Filter[] => {
        const mockAlwaysVisibleFilter = new RadioFilter({
            name: 'mockAlwaysVisibleFilter',
            translationKey: 'mockAlwaysVisibleFilter',
            value: { value: 'mockValue1', label: 'mockLabel1', checked: true },
            options: [
                { label: 'mockLabel1', value: 'mockValue1' },
                { label: 'mockLabel2', value: 'mockValue2' },
            ],
            visible: true,
            allowEmpty: false,
        });

        return [...getAllFiltersMock(), mockAlwaysVisibleFilter];
    };

    let component: MoreFiltersMenuComponent;
    let translateService: TranslateService;
    let fixture: ComponentFixture<MoreFiltersMenuComponent>;
    const filterService = {
        getAllFilters: jest.fn().mockReturnValue(of([...getAllFilters()])),
        updateFilter: jest.fn(),
    };

    const setSearchInputValue = async (value: string) => {
        return InputHarnessUtils.getInput({
            fixture,
            inputFilters: {
                selector: '[data-automation-id="hxp-more-filters-menu-search-input"]',
            },
        }).then((searchInput) => searchInput.setValue(value));
    };

    const getAllCheckboxes = async (): Promise<MatCheckboxHarness[]> => {
        return CheckboxHarnessUtils.getAllCheckboxes({
            fixture,
            checkboxFilters: {
                ancestor: '[data-automation-id="hxp-more-filters-menu-list-item"]',
            },
        });
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule, NoopAnimationsModule, NoopTranslateModule, MoreFiltersMenuComponent, MatIconTestingModule],
            providers: [
                {
                    provide: FilterService,
                    useValue: filterService,
                },
            ],
        });

        fixture = TestBed.createComponent(MoreFiltersMenuComponent);
        component = fixture.componentInstance;
        translateService = TestBed.inject(TranslateService);
        fixture.detectChanges();
    });

    it('should set filters and form controls on init', async () => {
        for (const filter of getAllFilters()) {
            expect(component.filters()).toContainEqual(filter);
            expect(component.filterVisibilitiesForm.get(filter.name)).toBeTruthy();
            expect(component.filterVisibilitiesForm.get(filter.name)?.value).toBe(filter.visible);
            expect(component.filterVisibilitiesForm.get(filter.name)?.disabled).toBe(!filter.allowEmpty && filter.visible);
        }
    });

    it('should filter filters by search input', async () => {
        // eslint-disable-next-line @cspell/spellchecker
        const filtersThatContainSearchTerm = getAllFilters().filter((filter) => filter.translationKey.toLowerCase().includes('mockr'));
        const checkboxes = await setSearchInputValue('mockR').then(() => getAllCheckboxes());

        expect(checkboxes.length).toBe(filtersThatContainSearchTerm.length);
    });

    it('should clear filter when search input is empty', async () => {
        const checkboxes = await setSearchInputValue('').then(() => getAllCheckboxes());
        expect(checkboxes.length).toBe(getAllFilters().length);
    });

    it('should set checkboxes to initial state on clear selection', async () => {
        await CheckboxHarnessUtils.checkboxCheck({
            fixture,
            checkboxFilters: {
                selector: '[data-automation-id="hxp-more-filters-menu-checkbox-mockString"]',
            },
        });

        expect(component.filterVisibilitiesForm.getRawValue()).toEqual({
            ...component.initialFormState,
            mockString: true,
        });

        const updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-more-filters-menu-clear-selection-button"]');
        updateButton.click();

        expect(component.filterVisibilitiesForm.getRawValue()).toEqual(component.initialFormState);
    });

    it('should update filters with changed visibilities and emit filtersVisibilityUpdate on update', async () => {
        const testFilter = getDateFilterMock();
        const updateFilterSpy = jest.spyOn(filterService, 'updateFilter');
        const filtersVisibilityUpdateSpy = jest.spyOn(component.filtersVisibilityUpdate, 'emit');

        await CheckboxHarnessUtils.checkboxUncheck({
            fixture,
            checkboxFilters: {
                selector: `[data-automation-id="hxp-more-filters-menu-checkbox-${testFilter.name}"]`,
            },
        });

        const updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-more-filters-menu-update-button"]');
        updateButton.click();

        const expectedDateFilter = new DateFilter({
            name: testFilter.name,
            translationKey: testFilter.translationKey,
            value: testFilter.value,
            options: testFilter.options,
            visible: false,
        });

        expect(updateFilterSpy).toHaveBeenCalledWith(expectedDateFilter);
        expect(updateFilterSpy).toHaveBeenCalledTimes(1);
        expect(filtersVisibilityUpdateSpy).toHaveBeenCalledWith(component.filters());
    });

    it('should show filter description', async () => {
        const processFilter = getProcessStringFilterMock();
        const stringProcess = await CheckboxHarnessUtils.getCheckbox({
            fixture,
            checkboxFilters: {
                selector: `[data-automation-id="hxp-more-filters-menu-checkbox-${processFilter.name}"]`,
            },
        });

        const checkboxName = await stringProcess.getLabelText();

        expect(checkboxName).toBe('mockProcessString mockProcessStringDescription');
    });

    it('should filter by translated label', async () => {
        const translatedLabel = 'Translated Date Label';
        jest.spyOn(translateService, 'instant').mockImplementation((key: string | string[]) => {
            if (key === 'mockDate') {
                return translatedLabel;
            }
            return key as string;
        });

        const checkboxes = await setSearchInputValue('Translated Date').then(() => getAllCheckboxes());

        expect(checkboxes.length).toBe(1);
        const checkboxLabel = await checkboxes[0].getLabelText();
        expect(checkboxLabel).toBe('mockDate');
    });

    it('should not filter by translation key', async () => {
        const translatedLabel = 'Completely Different Label';
        jest.spyOn(translateService, 'instant').mockImplementation((key: string | string[]) => {
            if (key === 'mockDate') {
                return translatedLabel;
            }
            return key as string;
        });

        const checkboxes = await setSearchInputValue('mockDate').then(() => getAllCheckboxes());

        const mockDateCheckbox = checkboxes.find(async (cb) => {
            const label = await cb.getLabelText();
            return label.includes(translatedLabel);
        });

        expect(mockDateCheckbox).toBeUndefined();
    });
});
