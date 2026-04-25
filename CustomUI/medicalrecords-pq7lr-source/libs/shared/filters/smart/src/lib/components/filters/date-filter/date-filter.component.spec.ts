/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule, UserPreferencesService } from '@alfresco/adf-core';
import { DateFilterComponent } from './date-filter.component';
import { DATE_OPTIONS, DateFilter, RANGE_DATE_OPTION } from '@alfresco-dbp/shared-filters-services';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { FilterChipComponent } from '../../filter-chip/filter-chip.component';
import { clickChip } from '../../../utils/filter-testing-utils';
import { DateFilterMenuComponent } from './date-filter-menu/date-filter-menu.component';
import { MockComponent } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { signal, WritableSignal } from '@angular/core';

describe('DateFilterComponent', () => {
    let component: DateFilterComponent;
    let fixture: ComponentFixture<DateFilterComponent>;
    let overlay: HTMLElement;
    let overlayContainer: OverlayContainer;
    let filterChipId: string;
    let localeSignal: WritableSignal<string>;
    const userPreferencesService: any = {
        localeSignal: () => localeSignal(),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                NoopTranslateModule,
                DateFilterComponent,
                OverlayModule,
                FilterChipComponent,
                MockComponent(DateFilterMenuComponent),
            ],
            providers: [{ provide: UserPreferencesService, useValue: userPreferencesService }],
        });

        localeSignal = signal('en');
        fixture = TestBed.createComponent(DateFilterComponent);
        component = fixture.componentInstance;
        component.filter = new DateFilter({
            name: 'mockName',
            translationKey: 'mockLabel',
            value: {
                selectedOption: null,
                range: null,
            },
            options: DATE_OPTIONS,
            visible: true,
        });
        fixture.detectChanges();
        overlayContainer = TestBed.inject(OverlayContainer);
        overlay = overlayContainer.getContainerElement();

        filterChipId = component.filter.name + '-filter-chip';
    });

    it('should open and close menu on chip click', async () => {
        await clickChip(fixture, filterChipId);
        let menu = overlay.querySelector('[data-automation-id="hxp-date-filter-menu"]');
        expect(menu).not.toBeNull();

        await clickChip(fixture, filterChipId);
        expect(component.isMenuOpen).toBe(false);
        menu = overlay.querySelector('[data-automation-id="hxp-date-filter-menu"]');
        expect(menu).toBeNull();
    });

    it('should update filter value, emit filterChange and close the menu when update button is clicked', async () => {
        jest.spyOn(component.filterChange, 'emit');

        component.onUpdate({
            selectedOption: DATE_OPTIONS[0],
            range: null,
        });

        if (component.filter?.value) {
            expect(component.filter.value?.selectedOption?.value).toBe(DATE_OPTIONS[0].value);
            expect(component.filterChange.emit).toHaveBeenCalledWith(component.filter);
            expect(component.isMenuOpen).toBe(false);
        } else {
            fail('Filter value is not set');
        }
    });

    it('should update locale and labelSuffix when userPreferencesService emits new localeSignal ', async () => {
        component.onUpdate({
            selectedOption: RANGE_DATE_OPTION,
            range: {
                from: new Date('2021-05-10T00:00:00.000Z'),
                to: new Date('2021-05-15T00:00:00.000Z'),
            },
        });
        expect(component.locale).toBe('en');
        expect(component.labelSuffix).toBe('5/10/2021 - 5/15/2021');

        localeSignal.set('de');
        fixture.detectChanges();

        expect(component.locale).toBe('de');
        expect(component.labelSuffix).toBe('10.5.2021 - 15.5.2021');

        localeSignal.set('fr');
        fixture.detectChanges();

        expect(component.locale).toBe('fr');
        expect(component.labelSuffix).toBe('10/05/2021 - 15/05/2021');
    });

    describe('should update suffix properly', () => {
        it('when filter value is null', async () => {
            component.onUpdate({
                selectedOption: null,
                range: null,
            });

            expect(component.labelSuffix).toBe('');
        });

        it('when filter value is not range', async () => {
            component.onUpdate({
                selectedOption: DATE_OPTIONS[0],
                range: null,
            });

            expect(component.labelSuffix).toBe(DATE_OPTIONS[0].label);
        });

        it('when filter value is range and from is set', async () => {
            const newDate = new Date('2021-01-01T00:00:00.000Z');
            component.onUpdate({
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: newDate,
                    to: null,
                },
            });

            expect(component.labelSuffix).toBe('FILTERS.DATE_FILTER.FROM_DATE');
            expect(component.filter?.value?.range?.from).toEqual(newDate);
        });

        it('when filter value is range and to is set', async () => {
            const newDate = new Date('2021-01-01T00:00:00.000Z');
            component.onUpdate({
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: null,
                    to: newDate,
                },
            });

            expect(component.labelSuffix).toBe('FILTERS.DATE_FILTER.TO_DATE');
            expect(component.filter?.value?.range?.to).toEqual(newDate);
        });

        it('when filter value is range and both from and to are set', async () => {
            component.onUpdate({
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: new Date('2021-01-01T00:00:00.000Z'),
                    to: new Date('2021-01-02T00:00:00.000Z'),
                },
            });

            const expectedSuffix = `${component.filter?.value?.range?.from?.toLocaleDateString(
                localeSignal()
            )} - ${component.filter?.value?.range?.to?.toLocaleDateString(localeSignal())}`;
            expect(component.labelSuffix).toBe(expectedSuffix);
        });

        it('when filter value is range and both "from" and "to" are set and filter should use time', async () => {
            component.filter.useTime = true;
            const from = new Date('2021-01-01T20:10:00.000Z');
            const to = new Date('2021-01-02T10:00:00.000Z');

            component.onUpdate({
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from,
                    to,
                },
            });

            const expectedSuffix = `${from.toLocaleString(localeSignal())} - ${to.toLocaleString(localeSignal())}`;
            expect(component.labelSuffix).toBe(expectedSuffix);
        });

        it('should re-translate suffix when language changes', () => {
            const translateService = TestBed.inject(TranslateService);
            let currentLang = 'en';

            jest.spyOn(translateService, 'instant').mockImplementation((key: string | string[]) => {
                const keyStr = Array.isArray(key) ? key[0] : key;
                const translations: Record<string, Record<string, string>> = {
                    en: { 'FILTERS.DATE_FILTER.FROM_DATE': 'From: {{date}}' },
                    de: { 'FILTERS.DATE_FILTER.FROM_DATE': 'Von: {{date}}' },
                };
                return translations[currentLang][keyStr] || keyStr;
            });

            const newDate = new Date('2021-01-01T00:00:00.000Z');
            component.onUpdate({
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: newDate,
                    to: null,
                },
            });

            expect(component.labelSuffix).toBe('From: {{date}}');

            currentLang = 'de';
            localeSignal.set('de');
            fixture.detectChanges();

            expect(component.labelSuffix).toBe('Von: {{date}}');
        });
    });

    describe('allowEmpty behavior', () => {
        it('should set chip removable to true when allowEmpty is true', () => {
            component.filter = new DateFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: {
                    selectedOption: null,
                    range: null,
                },
                options: DATE_OPTIONS,
                visible: true,
                allowEmpty: true,
            });
            component.markForCheck();
            fixture.detectChanges();

            const chipDebugElement = fixture.debugElement.query(By.directive(FilterChipComponent));
            expect(chipDebugElement).toBeTruthy();

            const removeIcon = chipDebugElement.nativeElement.querySelector('.hxp-filter-chip__remove-icon');
            expect(removeIcon).toBeTruthy();
        });

        it('should set chip removable to false when allowEmpty is false', () => {
            const newFilter = new DateFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: {
                    selectedOption: null,
                    range: null,
                },
                options: DATE_OPTIONS,
                visible: true,
                allowEmpty: false,
            });
            component.filter = newFilter;
            component.markForCheck();
            fixture.detectChanges();

            const chipDebugElement = fixture.debugElement.query(By.directive(FilterChipComponent));
            expect(chipDebugElement).toBeTruthy();

            const removeIcon = chipDebugElement.nativeElement.querySelector('.hxp-filter-chip__remove-icon');
            expect(removeIcon).toBeFalsy();
        });

        it('should prevent clearing when allowEmpty is false and newValue is null', () => {
            component.filter.allowEmpty = false;
            component.filter.value = {
                selectedOption: DATE_OPTIONS[0],
                range: null,
            };
            const initialValue = component.filter.value;
            jest.spyOn(component.filterChange, 'emit');
            component.isMenuOpen = true;

            component.onUpdate(null);

            expect(component.filter.value).toBe(initialValue);
            expect(component.filterChange.emit).not.toHaveBeenCalled();
            expect(component.isMenuOpen).toBe(false);
        });

        it('should allow clearing when allowEmpty is true and newValue is null', () => {
            component.filter.allowEmpty = true;
            component.filter.value = {
                selectedOption: DATE_OPTIONS[0],
                range: null,
            };
            jest.spyOn(component.filterChange, 'emit');
            component.isMenuOpen = true;

            component.onUpdate(null);

            expect(component.filter.value).toBeNull();
            expect(component.filterChange.emit).toHaveBeenCalledWith(component.filter);
            expect(component.isMenuOpen).toBe(false);
        });

        it('should allow updating when allowEmpty is false and newValue is not null', () => {
            component.filter.allowEmpty = false;
            component.filter.value = {
                selectedOption: DATE_OPTIONS[0],
                range: null,
            };
            jest.spyOn(component.filterChange, 'emit');
            component.isMenuOpen = true;

            const newValue = {
                selectedOption: DATE_OPTIONS[1],
                range: null,
            };
            component.onUpdate(newValue);

            expect(component.filter.value).toEqual(newValue);
            expect(component.filterChange.emit).toHaveBeenCalledWith(component.filter);
            expect(component.isMenuOpen).toBe(false);
        });
    });
});
