/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ADF_DATETIME_FORMATS, AdfDateTimeFnsAdapter, NoopTranslateModule } from '@alfresco/adf-core';
import { DateFilterMenuComponent } from './date-filter-menu.component';
import { ButtonHarnessUtils, RadioButtonHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { MatButtonHarness } from '@angular/material/button/testing';
import { DATE_OPTIONS, RANGE_DATE_OPTION } from '@alfresco-dbp/shared-filters-services';
import { MatRadioButtonHarness } from '@angular/material/radio/testing';
import { getClearSelectionButton, getUpdateButton } from '../../../../utils/filter-testing-utils';
import { startOfDay, endOfDay } from 'date-fns';
import { DatetimeAdapter, MAT_DATETIME_FORMATS, MatDatetimepickerModule, MatNativeDatetimeModule } from '@mat-datetimepicker/core';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('DateFilterMenuComponent', () => {
    let component: DateFilterMenuComponent;
    let fixture: ComponentFixture<DateFilterMenuComponent>;

    const getCustomRangeButton = async (): Promise<MatButtonHarness> => {
        return ButtonHarnessUtils.getButton({
            fixture,
            buttonFilters: {
                selector: '[data-automation-id="hxp-date-filter-menu-custom-range-button"]',
            },
        });
    };

    const getRadioButton = async (value: string): Promise<MatRadioButtonHarness> => {
        return RadioButtonHarnessUtils.getRadioButton({
            fixture,
            radioButtonsFilters: {
                selector: `[data-automation-id="hxp-date-filter-menu-option-${value}"]`,
            },
        });
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                NoopTranslateModule,
                DateFilterMenuComponent,
                MatDatepickerModule,
                MatDatetimepickerModule,
                MatNativeDateModule,
                MatNativeDatetimeModule,
                MatIconTestingModule,
            ],
            providers: [
                { provide: DatetimeAdapter, useClass: AdfDateTimeFnsAdapter },
                { provide: MAT_DATETIME_FORMATS, useValue: ADF_DATETIME_FORMATS },
                provideNativeDateAdapter(),
            ],
        });

        fixture = TestBed.createComponent(DateFilterMenuComponent);
        component = fixture.componentInstance;
        component.options = DATE_OPTIONS;
    });

    it('should disable clear selection button when selected date is null', async () => {
        component.value = {
            selectedOption: null,
            range: null,
        };
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);

        expect(await clearSelectionButton.isDisabled()).toBe(true);
    });

    it('should enable clear selection button when selected date is not null', async () => {
        component.value = {
            selectedOption: DATE_OPTIONS[0],
            range: null,
        };
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);

        expect(await clearSelectionButton.isDisabled()).toBe(false);
    });

    it('should reset range and set selected option to null when clear button is clicked', async () => {
        component.value = {
            selectedOption: DATE_OPTIONS[0],
            range: null,
        };
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);
        await clearSelectionButton.click();

        expect(component.form.value.selectedOption).toBeNull();
        expect(component.form.controls.range.controls.from.value).toBeNull();
        expect(component.form.controls.range.controls.to.value).toBeNull();
        expect(component.customRangeFormVisible).toBe(false);
    });

    it('should emit update with selectedOption and range on update button click', async () => {
        const from = new Date('2021-01-01T00:00:00.000Z');
        const to = new Date('2021-12-31T00:00:00.000Z');
        jest.spyOn(component.update, 'emit');
        component.value = {
            selectedOption: RANGE_DATE_OPTION,
            range: { from, to },
        };
        fixture.detectChanges();

        const updateButton = await getUpdateButton(fixture);
        await updateButton.click();

        const expectedFrom = startOfDay(from);
        const expectedTo = endOfDay(to);
        expect(component.update.emit).toHaveBeenCalledWith({
            selectedOption: RANGE_DATE_OPTION,
            range: {
                from: expectedFrom,
                to: expectedTo,
            },
        });
    });

    it('should use time with dates for range when time is setup', async () => {
        component.useTime = true;

        const from = new Date('2021-01-01T10:10:00.000Z');
        const to = new Date('2021-12-31T20:20:00.000Z');
        component.value = {
            selectedOption: RANGE_DATE_OPTION,
            range: { from, to },
        };

        jest.spyOn(component.update, 'emit');

        fixture.detectChanges();

        const updateButton = await getUpdateButton(fixture);
        await updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith({
            selectedOption: RANGE_DATE_OPTION,
            range: {
                from,
                to,
            },
        });
    });

    it('should set selected option and reset form on option click', async () => {
        component.value = {
            selectedOption: DATE_OPTIONS[1],
            range: null,
        };
        fixture.detectChanges();

        const radioButton = await getRadioButton(DATE_OPTIONS[0].value);
        await radioButton.check();

        expect(component.form.value.selectedOption).toEqual(DATE_OPTIONS[0]);
        expect(component.form.controls.range.controls.from.value).toBeNull();
        expect(component.form.controls.range.controls.to.value).toBeNull();
        expect(component.customRangeFormVisible).toBe(false);
    });

    it('should set selected option and show custom range form on custom range button click', async () => {
        component.value = {
            selectedOption: DATE_OPTIONS[1],
            range: null,
        };
        fixture.detectChanges();

        const customRangeButton = await getCustomRangeButton();
        await customRangeButton.click();

        expect(component.form.value.selectedOption).toEqual(RANGE_DATE_OPTION);
        expect(component.customRangeFormVisible).toBe(true);
    });

    it('should trigger function when input signal changes', async () => {
        const updateLocaleSpy = jest.spyOn(component, 'updateLocale');
        fixture.componentRef.setInput('locale', 'fr');
        fixture.detectChanges();

        expect(updateLocaleSpy).toHaveBeenCalled();
    });

    describe('allowEmpty behavior', () => {
        it('should hide clear selection button when allowEmpty is false', async () => {
            component.allowEmpty = false;
            component.value = {
                selectedOption: DATE_OPTIONS[0],
                range: null,
            };
            fixture.detectChanges();

            const clearSelectionButton = await getClearSelectionButton(fixture);

            expect(await clearSelectionButton.isDisabled()).toBe(true);
        });

        it('should show clear selection button when allowEmpty is true and option is selected', async () => {
            component.allowEmpty = true;
            component.value = {
                selectedOption: DATE_OPTIONS[0],
                range: null,
            };
            fixture.detectChanges();

            const clearSelectionButton = await getClearSelectionButton(fixture);

            expect(await clearSelectionButton.isDisabled()).toBe(false);
        });

        it('should return true for showClearButtons when allowEmpty is true', () => {
            component.allowEmpty = true;

            expect(component.showClearButtons).toBe(true);
        });

        it('should return false for showClearButtons when allowEmpty is false', () => {
            component.allowEmpty = false;

            expect(component.showClearButtons).toBe(false);
        });

        it('should hide clear buttons on From field when allowEmpty is false', () => {
            component.allowEmpty = false;
            component.value = {
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: new Date('2021-01-01'),
                    to: null,
                },
            };
            fixture.detectChanges();

            const clearIcon = fixture.nativeElement
                .querySelector('[data-automation-id="hxp-filter-menu-from-input"]')
                ?.parentElement?.querySelector('.hxp-date-filter-menu__range-form-field-suffix-icon');

            expect(clearIcon).toBeFalsy();
        });

        it('should show clear buttons on "From" field when allowEmpty is true', () => {
            component.allowEmpty = true;
            component.value = {
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: new Date('2021-01-01'),
                    to: null,
                },
            };
            fixture.detectChanges();

            const fromInput = fixture.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-from-input"]');
            expect(fromInput).toBeTruthy();

            const suffixContainer = fromInput
                ?.closest('.hxp-date-filter-menu__range-form-field')
                ?.querySelector('.hxp-date-filter-menu__range-form-field-suffix');
            const clearIcon = suffixContainer?.querySelector('.hxp-date-filter-menu__range-form-field-suffix-icon');

            expect(clearIcon).toBeTruthy();
        });

        it('should hide clear buttons on "To" field when allowEmpty is false', () => {
            component.allowEmpty = false;
            component.value = {
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: null,
                    to: new Date('2021-01-01'),
                },
            };
            fixture.detectChanges();

            const clearIcon = fixture.nativeElement
                .querySelector('[data-automation-id="hxp-filter-menu-to-input"]')
                ?.parentElement?.querySelector('.hxp-date-filter-menu__range-form-field-suffix-icon');

            expect(clearIcon).toBeFalsy();
        });

        it('should show clear buttons on "To" field when allowEmpty is true', () => {
            component.allowEmpty = true;
            component.value = {
                selectedOption: RANGE_DATE_OPTION,
                range: {
                    from: null,
                    to: new Date('2021-01-01'),
                },
            };
            fixture.detectChanges();

            const toInput = fixture.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-to-input"]');
            expect(toInput).toBeTruthy();

            const suffixContainer = toInput
                ?.closest('.hxp-date-filter-menu__range-form-field')
                ?.querySelector('.hxp-date-filter-menu__range-form-field-suffix');
            const clearIcon = suffixContainer?.querySelector('.hxp-date-filter-menu__range-form-field-suffix-icon');

            expect(clearIcon).toBeTruthy();
        });
    });
});
