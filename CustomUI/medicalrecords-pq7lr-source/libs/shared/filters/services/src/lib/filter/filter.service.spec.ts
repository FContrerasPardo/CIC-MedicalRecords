/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';
import { ALL_FILTERS_MOCK, RADIO_FILTER_MOCK } from './mock/filters.mock';
import { take } from 'rxjs/operators';
import { Filter } from './filter.model';
import { EventEmitter } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProcessVariableStringFilter } from './filter-models/process-variables-filters';

describe('FilterService', () => {
    let service: FilterService;
    const langChangeEmitter = new EventEmitter<LangChangeEvent>();

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MockProvider(TranslateService, {
                    instant: (key: string) => key,
                    onLangChange: langChangeEmitter,
                }),
                FilterService,
            ],
        });
        service = TestBed.inject(FilterService);
    });

    it('should set and get filters', async () => {
        service.setFilters(ALL_FILTERS_MOCK);

        service
            .getAllFilters()
            .pipe(take(1))
            .subscribe((filters) => {
                expect(filters).toEqual(ALL_FILTERS_MOCK);
            });

        service.filtersDirty$.pipe(take(1)).subscribe((dirty) => {
            expect(dirty).toBe(false);
        });

        service.filterValuesChanged$.pipe(take(1)).subscribe((changed) => {
            expect(changed).toBe(false);
        });
    });

    it('should reset filters', async () => {
        service.setFilters(ALL_FILTERS_MOCK);
        service.updateFilter({
            ...ALL_FILTERS_MOCK[0],
            visible: !ALL_FILTERS_MOCK[0].visible,
        });

        service.resetFilters();

        service
            .getAllFilters()
            .pipe(take(1))
            .subscribe((filters) => {
                expect(filters).toEqual(ALL_FILTERS_MOCK);
            });
    });

    it('should update filter', async () => {
        service.setFilters(ALL_FILTERS_MOCK);
        const updatedFilter = {
            ...RADIO_FILTER_MOCK,
            value: { label: 'mockLabel2', value: 'mockValue2' },
        };

        service.updateFilter(updatedFilter);

        service.filtersDirty$.pipe(take(1)).subscribe((dirty) => {
            expect(dirty).toBe(true);
        });

        service.filterValuesChanged$.pipe(take(1)).subscribe((changed) => {
            expect(changed).toBe(true);
        });

        service
            .getAllFilters()
            .pipe(take(1))
            .subscribe((filters) => {
                expect(filters[0].value).toEqual(updatedFilter.value);
            });
    });

    it('should deep clone filters on reset so external mutations do not affect subsequent resets', async () => {
        service.setFilters(ALL_FILTERS_MOCK);

        const originalDateFrom = (ALL_FILTERS_MOCK.find((f) => f.name === 'mockDate').value as any).range.from.getTime();

        service.resetFilters();
        const filtersAfterFirstReset = await firstValueFrom(service.getAllFilters());
        const dateFilterAfterFirstReset = filtersAfterFirstReset.find((f) => f.name === 'mockDate');

        (dateFilterAfterFirstReset.value as any).range.from = new Date('2030-01-01T00:00:00.000Z');

        service.resetFilters();
        const filtersAfterSecondReset = await firstValueFrom(service.getAllFilters());
        const dateFilterAfterSecondReset = filtersAfterSecondReset.find((f) => f.name === 'mockDate');

        const mutatedFromTime = (dateFilterAfterSecondReset.value as any).range.from.getTime();
        if (mutatedFromTime !== originalDateFrom) {
            fail(
                'After mutating returned filter state and calling resetFilters again, ' +
                    `expected 'mockDate' range.from to revert to ${new Date(originalDateFrom).toISOString()} ` +
                    `but got ${new Date(mutatedFromTime).toISOString()}. ` +
                    'Ensure cloneDeep(originalFilters) is used when emitting filters in resetFilters().'
            );
        }
    });

    describe('sortFilters', () => {
        describe('normal filters', () => {
            it('should sort by priority value (lower first, higher later)', () => {
                const filters = [
                    { name: 'noPriority', translationKey: 'NO_PRIORITY', visible: true, value: null, allowEmpty: false },
                    { name: 'priority2', translationKey: 'PRIORITY_2', visible: true, value: null, allowEmpty: false, priority: 2 },
                    { name: 'priority1', translationKey: 'PRIORITY_1', visible: true, value: null, allowEmpty: false, priority: 1 },
                ] as Filter[];

                const sorted = service.sortFilters(filters);

                expect(sorted[0].name).toBe('priority1');
                expect(sorted[1].name).toBe('priority2');
                expect(sorted[2].name).toBe('noPriority');
            });

            it('should sort filters with same priority alphabetically by translated label', () => {
                const filters = [
                    { name: 'priority5Z', translationKey: 'ZULU', visible: true, value: null, allowEmpty: false, priority: 5 },
                    { name: 'priority5A', translationKey: 'ALPHA', visible: true, value: null, allowEmpty: false, priority: 5 },
                    { name: 'priority5M', translationKey: 'MIKE', visible: true, value: null, allowEmpty: false, priority: 5 },
                    { name: 'priority1', translationKey: 'PRIORITY_1', visible: true, value: null, allowEmpty: false, priority: 1 },
                ] as Filter[];

                const sorted = service.sortFilters(filters);

                expect(sorted[0].name).toBe('priority1');
                expect(sorted[1].name).toBe('priority5A');
                expect(sorted[2].name).toBe('priority5M');
                expect(sorted[3].name).toBe('priority5Z');
            });

            it('should place visible filters before hidden filters', () => {
                const filters = [
                    { name: 'hiddenFilter1', translationKey: 'HIDDEN_1', visible: false, value: null, allowEmpty: true },
                    { name: 'visibleFilter', translationKey: 'VISIBLE', visible: true, value: null, allowEmpty: true },
                    { name: 'hiddenFilter2', translationKey: 'HIDDEN_2', visible: false, value: null, allowEmpty: true },
                ] as Filter[];

                const sorted = service.sortFilters(filters);

                expect(sorted[0].name).toBe('visibleFilter');
                expect(sorted[0].visible).toBe(true);
            });

            it('should place mandatory filters before optional filters within same visibility', () => {
                const filters = [
                    { name: 'optionalFilter', translationKey: 'OPTIONAL', visible: true, value: null, allowEmpty: true },
                    { name: 'mandatoryFilter', translationKey: 'MANDATORY', visible: true, value: null, allowEmpty: false },
                ] as Filter[];

                const sorted = service.sortFilters(filters);

                expect(sorted[0].name).toBe('mandatoryFilter');
                expect(sorted[0].allowEmpty).toBe(false);
                expect(sorted[1].name).toBe('optionalFilter');
            });

            it('should sort by visible, then allowEmpty, then alphabetically', () => {
                const filters = [
                    { name: 'hiddenOptional', translationKey: 'HIDDEN_OPTIONAL', visible: false, value: null, allowEmpty: true },
                    { name: 'visibleOptionalZ', translationKey: 'ZULU', visible: true, value: null, allowEmpty: true },
                    { name: 'visibleMandatory', translationKey: 'MANDATORY', visible: true, value: null, allowEmpty: false },
                    { name: 'visibleOptionalA', translationKey: 'ALPHA', visible: true, value: null, allowEmpty: true },
                ] as Filter[];

                const sorted = service.sortFilters(filters);

                expect(sorted[0].name).toBe('visibleMandatory');
                expect(sorted[1].name).toBe('visibleOptionalA');
                expect(sorted[2].name).toBe('visibleOptionalZ');
                expect(sorted[3].name).toBe('hiddenOptional');
            });

            it('should place all filters with priority before filters without priority', () => {
                const filters = [
                    { name: 'noPriorityHidden', translationKey: 'NO_PRIORITY_HIDDEN', visible: false, value: null, allowEmpty: true },
                    { name: 'priority1000', translationKey: 'PRIORITY_1000', visible: true, value: null, allowEmpty: false, priority: 1000 },
                    { name: 'noPriorityVisible', translationKey: 'NO_PRIORITY_VISIBLE', visible: true, value: null, allowEmpty: true },
                    { name: 'priority1', translationKey: 'PRIORITY_1', visible: true, value: null, allowEmpty: false, priority: 1 },
                ] as Filter[];

                const sorted = service.sortFilters(filters);

                expect(sorted[0].name).toBe('priority1');
                expect(sorted[1].name).toBe('priority1000');
                expect(sorted[2].name).toBe('noPriorityVisible');
                expect(sorted[3].name).toBe('noPriorityHidden');
            });
        });

        describe('custom filters (process variable)', () => {
            const createProcessVariableFilter = (name: string, translationKey: string, visible: boolean): Filter =>
                new ProcessVariableStringFilter({
                    name,
                    translationKey,
                    visible,
                    value: null,
                    data: { processDefinitionKey: 'test', variableName: name, variableType: 'string', operator: 'EQUALS' },
                });

            it('should place custom filters after normal filters', () => {
                const normalFilter = { name: 'normalFilter', translationKey: 'NORMAL', visible: true, value: null, allowEmpty: true } as Filter;
                const customFilter = createProcessVariableFilter('customFilter', 'CUSTOM', true);

                const sorted = service.sortFilters([customFilter, normalFilter]);

                expect(sorted[0].name).toBe('normalFilter');
                expect(sorted[1].name).toBe('customFilter');
            });

            it('should sort custom filters alphabetically', () => {
                const customZ = createProcessVariableFilter('customZ', 'ZULU', true);
                const customA = createProcessVariableFilter('customA', 'ALPHA', true);
                const customM = createProcessVariableFilter('customM', 'MIKE', true);

                const sorted = service.sortFilters([customZ, customA, customM]);

                expect(sorted[0].name).toBe('customA');
                expect(sorted[1].name).toBe('customM');
                expect(sorted[2].name).toBe('customZ');
            });

            it('should place visible custom filters before hidden custom filters', () => {
                const hiddenCustom = createProcessVariableFilter('hiddenCustom', 'HIDDEN', false);
                const visibleCustom = createProcessVariableFilter('visibleCustom', 'VISIBLE', true);

                const sorted = service.sortFilters([hiddenCustom, visibleCustom]);

                expect(sorted[0].name).toBe('visibleCustom');
                expect(sorted[1].name).toBe('hiddenCustom');
            });

            it('should sort custom filters by visible then alphabetically', () => {
                const hiddenA = createProcessVariableFilter('hiddenA', 'ALPHA_HIDDEN', false);
                const visibleZ = createProcessVariableFilter('visibleZ', 'ZULU', true);
                const visibleA = createProcessVariableFilter('visibleA', 'ALPHA', true);
                const hiddenZ = createProcessVariableFilter('hiddenZ', 'ZULU_HIDDEN', false);

                const sorted = service.sortFilters([hiddenA, visibleZ, visibleA, hiddenZ]);

                expect(sorted[0].name).toBe('visibleA');
                expect(sorted[1].name).toBe('visibleZ');
                expect(sorted[2].name).toBe('hiddenA');
                expect(sorted[3].name).toBe('hiddenZ');
            });
        });

        describe('mixed normal and custom filters', () => {
            const createProcessVariableFilter = (name: string, translationKey: string, visible: boolean): Filter =>
                new ProcessVariableStringFilter({
                    name,
                    translationKey,
                    visible,
                    value: null,
                    data: { processDefinitionKey: 'test', variableName: name, variableType: 'string', operator: 'EQUALS' },
                });

            it('should sort normal filters first, then custom filters', () => {
                const normalVisible = {
                    name: 'normalVisible',
                    translationKey: 'NORMAL_VISIBLE',
                    visible: true,
                    value: null,
                    allowEmpty: true,
                } as Filter;
                const normalHidden = {
                    name: 'normalHidden',
                    translationKey: 'NORMAL_HIDDEN',
                    visible: false,
                    value: null,
                    allowEmpty: true,
                } as Filter;
                const customVisible = createProcessVariableFilter('customVisible', 'CUSTOM_VISIBLE', true);
                const customHidden = createProcessVariableFilter('customHidden', 'CUSTOM_HIDDEN', false);

                const sorted = service.sortFilters([customHidden, normalHidden, customVisible, normalVisible]);

                expect(sorted[0].name).toBe('normalVisible');
                expect(sorted[1].name).toBe('normalHidden');
                expect(sorted[2].name).toBe('customVisible');
                expect(sorted[3].name).toBe('customHidden');
            });

            it('should handle complex mixed scenario correctly', () => {
                const dashboard = {
                    name: 'dashboard',
                    translationKey: 'DASHBOARD',
                    visible: true,
                    value: null,
                    allowEmpty: false,
                    priority: 1,
                } as Filter;
                const normalMandatory = {
                    name: 'normalMandatory',
                    translationKey: 'NORMAL_MANDATORY',
                    visible: true,
                    value: null,
                    allowEmpty: false,
                } as Filter;
                const normalOptional = {
                    name: 'normalOptional',
                    translationKey: 'NORMAL_OPTIONAL',
                    visible: true,
                    value: null,
                    allowEmpty: true,
                } as Filter;
                const normalHidden = {
                    name: 'normalHidden',
                    translationKey: 'NORMAL_HIDDEN',
                    visible: false,
                    value: null,
                    allowEmpty: true,
                } as Filter;
                const customVisible = createProcessVariableFilter('customVisible', 'CUSTOM_VISIBLE', true);
                const customHidden = createProcessVariableFilter('customHidden', 'CUSTOM_HIDDEN', false);

                const sorted = service.sortFilters([customHidden, normalHidden, customVisible, normalOptional, dashboard, normalMandatory]);

                expect(sorted[0].name).toBe('dashboard');
                expect(sorted[1].name).toBe('normalMandatory');
                expect(sorted[2].name).toBe('normalOptional');
                expect(sorted[3].name).toBe('normalHidden');
                expect(sorted[4].name).toBe('customVisible');
                expect(sorted[5].name).toBe('customHidden');
            });
        });

        describe('language change', () => {
            it('should re-sort filters when language changes', () => {
                const translateService = TestBed.inject(TranslateService);
                let currentLang = 'en';

                jest.spyOn(translateService, 'instant').mockImplementation((key: string | string[]) => {
                    const translations: Record<string, Record<string, string>> = {
                        en: { FILTER_A: 'Alpha', FILTER_B: 'Beta', FILTER_C: 'Charlie' },
                        de: { FILTER_A: 'Zulu', FILTER_B: 'Beta', FILTER_C: 'Alpha' },
                    };
                    const keyStr = Array.isArray(key) ? key[0] : key;
                    return translations[currentLang][keyStr] || keyStr;
                });

                const filters = [
                    { name: 'filterA', translationKey: 'FILTER_A', visible: true, value: null, allowEmpty: true },
                    { name: 'filterB', translationKey: 'FILTER_B', visible: true, value: null, allowEmpty: true },
                    { name: 'filterC', translationKey: 'FILTER_C', visible: true, value: null, allowEmpty: true },
                ] as Filter[];

                service.setFilters(filters);

                const emissions: Filter[][] = [];
                const subscription = service.getAllFilters().subscribe((sortedFilters) => {
                    emissions.push([...sortedFilters]);
                });

                expect(emissions.length).toBe(1);
                expect(emissions[0].map((f) => f.name)).toEqual(['filterA', 'filterB', 'filterC']);

                currentLang = 'de';
                langChangeEmitter.emit({ lang: 'de', translations: {} });

                expect(emissions.length).toBe(2);
                expect(emissions[1].map((f) => f.name)).toEqual(['filterC', 'filterB', 'filterA']);

                subscription.unsubscribe();
            });
        });
    });
});
