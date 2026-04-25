/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { CheckboxFilterComponent } from './checkbox-filter.component';
import { CheckboxFilter } from '@alfresco-dbp/shared-filters-services';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { FilterChipComponent } from '../../filter-chip/filter-chip.component';
import { clickChip } from '../../../utils/filter-testing-utils';
import { CheckboxFilterMenuComponent } from './checkbox-filter-menu/checkbox-filter-menu.component';
import { MockComponent } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('CheckboxFilterComponent', () => {
    let component: CheckboxFilterComponent;
    let fixture: ComponentFixture<CheckboxFilterComponent>;
    let overlay: HTMLElement;
    let overlayContainer: OverlayContainer;
    let filterChipId: string;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                NoopTranslateModule,
                CheckboxFilterComponent,
                OverlayModule,
                FilterChipComponent,
                MockComponent(CheckboxFilterMenuComponent),
                MatIconTestingModule,
            ],
        });

        fixture = TestBed.createComponent(CheckboxFilterComponent);
        component = fixture.componentInstance;
        component.filter = new CheckboxFilter({
            name: 'mockName',
            translationKey: 'mockLabel',
            value: null,
            options: [
                { value: 'mockValue', label: 'mockLabel' },
                { value: 'mockValue2', label: 'mockLabel2' },
            ],
            visible: true,
        });
        fixture.detectChanges();
        overlayContainer = TestBed.inject(OverlayContainer);
        overlay = overlayContainer.getContainerElement();

        filterChipId = component.filter.name + '-filter-chip';
    });

    it('should open and close menu on chip click', async () => {
        await clickChip(fixture, filterChipId);
        let menu = overlay.querySelector('[data-automation-id="hxp-checkbox-filter-menu"]');
        expect(menu).not.toBeNull();

        await clickChip(fixture, filterChipId);
        expect(component.isMenuOpen).toBe(false);
        menu = overlay.querySelector('[data-automation-id="hxp-checkbox-filter-menu"]');
        expect(menu).toBeNull();
    });

    it('should update filter value, emit filterChange and close the menu when update button is clicked', async () => {
        jest.spyOn(component.filterChange, 'emit');

        component.onUpdate([
            { value: 'newMockValue', label: 'newMockLabel' },
            { value: 'newMockValue2', label: 'newMockLabel2' },
        ]);

        if (component.filter?.value) {
            expect(component.filter.value?.map((option) => option.value)).toEqual(['newMockValue', 'newMockValue2']);
            expect(component.filterChange.emit).toHaveBeenCalledWith(component.filter);
            expect(component.isMenuOpen).toBe(false);
        } else {
            fail('Filter value should not be null');
        }
    });

    describe('allowEmpty behavior', () => {
        it('should set chip removable to false when allowEmpty is false', () => {
            const newFilter = new CheckboxFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: [{ value: 'mockValue', label: 'mockLabel' }],
                options: [
                    { value: 'mockValue', label: 'mockLabel' },
                    { value: 'mockValue2', label: 'mockLabel2' },
                ],
                allowEmpty: false,
                visible: true,
            });
            component.filter = newFilter;
            component.markForCheck();
            fixture.detectChanges();

            const chipDebugElement = fixture.debugElement.query(By.directive(FilterChipComponent));
            expect(chipDebugElement).toBeTruthy();

            const removeIcon = chipDebugElement.nativeElement.querySelector('.hxp-filter-chip__remove-icon');
            expect(removeIcon).toBeFalsy();
        });

        it('should set chip removable to true when allowEmpty is true', () => {
            const newFilter = new CheckboxFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: [{ value: 'mockValue', label: 'mockLabel' }],
                options: [
                    { value: 'mockValue', label: 'mockLabel' },
                    { value: 'mockValue2', label: 'mockLabel2' },
                ],
                allowEmpty: true,
                visible: true,
            });
            component.filter = newFilter;
            component.markForCheck();
            fixture.detectChanges();

            const chipDebugElement = fixture.debugElement.query(By.directive(FilterChipComponent));
            expect(chipDebugElement).toBeTruthy();

            const removeIcon = chipDebugElement.nativeElement.querySelector('.hxp-filter-chip__remove-icon');
            expect(removeIcon).toBeTruthy();
        });

        it('should prevent clearing filter when allowEmpty is false and selectedOptions is empty', () => {
            component.filter = new CheckboxFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: [{ value: 'mockValue', label: 'mockLabel' }],
                options: [
                    { value: 'mockValue', label: 'mockLabel' },
                    { value: 'mockValue2', label: 'mockLabel2' },
                ],
                allowEmpty: false,
                visible: true,
            });
            component.isMenuOpen = true;
            jest.spyOn(component.filterChange, 'emit');

            component.onUpdate([]);

            expect(component.filter.value).toEqual([{ value: 'mockValue', label: 'mockLabel' }]);
            expect(component.filterChange.emit).not.toHaveBeenCalled();
            expect(component.isMenuOpen).toBe(false);
        });

        it('should allow updating filter when allowEmpty is false and at least one option is selected', () => {
            component.filter = new CheckboxFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: [{ value: 'mockValue', label: 'mockLabel' }],
                options: [
                    { value: 'mockValue', label: 'mockLabel' },
                    { value: 'mockValue2', label: 'mockLabel2' },
                ],
                allowEmpty: false,
                visible: true,
            });
            component.isMenuOpen = true;
            jest.spyOn(component.filterChange, 'emit');

            component.onUpdate([{ value: 'mockValue2', label: 'mockLabel2' }]);

            expect(component.filter.value).toEqual([{ value: 'mockValue2', label: 'mockLabel2' }]);
            expect(component.filterChange.emit).toHaveBeenCalledWith(component.filter);
            expect(component.isMenuOpen).toBe(false);
        });

        it('should allow clearing filter when allowEmpty is true', () => {
            component.filter = new CheckboxFilter({
                name: 'mockName',
                translationKey: 'mockLabel',
                value: [{ value: 'mockValue', label: 'mockLabel' }],
                options: [
                    { value: 'mockValue', label: 'mockLabel' },
                    { value: 'mockValue2', label: 'mockLabel2' },
                ],
                allowEmpty: true,
                visible: true,
            });
            component.isMenuOpen = true;
            jest.spyOn(component.filterChange, 'emit');

            component.onUpdate([]);

            expect(component.filter.value).toBeNull();
            expect(component.filterChange.emit).toHaveBeenCalledWith(component.filter);
            expect(component.isMenuOpen).toBe(false);
        });
    });
});
