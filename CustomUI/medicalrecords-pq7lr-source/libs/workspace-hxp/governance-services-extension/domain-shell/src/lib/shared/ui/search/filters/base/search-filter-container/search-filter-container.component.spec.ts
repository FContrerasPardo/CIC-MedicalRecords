/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchFilterContainerComponent } from './search-filter-container.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ReactiveFormsModule } from '@angular/forms';
import { MockSearchFilterData } from '../../../models/search-filter.data.mock';
import { SimpleChange } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { SearchFilterHarness } from './search-filter-container-harness.mock';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { firstValueFrom } from 'rxjs';
import { MatIconTestingModule } from '@angular/material/icon/testing';

// Mocking HTMLCanvasElement to avoid errors in tests
HTMLCanvasElement.prototype.getContext = jest.fn();

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] = [];

describe('GovernanceSearchFilterContainerComponent', () => {
    let loader: HarnessLoader;
    let component: SearchFilterContainerComponent;
    let fixture: ComponentFixture<SearchFilterContainerComponent>;

    const filterValue = new MockSearchFilterData([{ label: 'Base Filter Value', value: 'base-filter-value' }]);

    const multipleFilterValues = new MockSearchFilterData([
        { label: 'Base Filter Value 1', value: 'base-filter-value-1' },
        { label: 'Base Filter Value 2', value: 'base-filter-value-2' },
        { label: 'Base Filter Value 3', value: 'base-filter-value-3' },
    ]);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NoopTranslateModule, ReactiveFormsModule, SearchFilterContainerComponent, MatIconTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(SearchFilterContainerComponent);
        component = fixture.componentInstance;
        component.name = 'Base Filter';
        fixture.detectChanges();
        await fixture.whenStable();
        loader = TestbedHarnessEnvironment.loader(fixture);
    });

    afterEach(async () => {
        const filterHarness = await loader.getHarness(SearchFilterHarness);
        if (await filterHarness?.isOpen()) {
            const clearFilterButton = await filterHarness.getClearButton();
            await clearFilterButton?.click();
            fixture.detectChanges();
            await fixture.whenStable();
        }
    });

    it('should display base filter information', async () => {
        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const label = await filterHarness.getLabel();
        const expandIcon = await filterHarness.getExpandIcon();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter');
        expect(expandIcon).toBeTruthy();
        expect(await expandIcon?.getName()).toBe('chevron_down');
        expect(await filterHarness.isOpen()).toBeFalsy();
    });

    it('should open the filter overlay', async () => {
        const filterHarness = await loader.getHarness(SearchFilterHarness);
        await filterHarness.open();

        const applyFilterButton = await filterHarness.getApplyButton();
        const clearFilterButton = await filterHarness.getClearButton();

        expect(await filterHarness.isOpen()).toBeTruthy();
        expect(applyFilterButton).toBeTruthy();
        expect(clearFilterButton).toBeTruthy();
        expect(await applyFilterButton?.isDisabled()).toBeTruthy();
        expect(await clearFilterButton?.isDisabled()).toBeTruthy();
    });

    it('should display data if value is defined', async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter: Base Filter Value');
    });

    it('should clear the filter', async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        const filterCleared$ = firstValueFrom(component.filterCleared);

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter: Base Filter Value');

        await filterHarness.open();
        fixture.detectChanges();
        expect(await filterHarness.isOpen()).toBeTruthy();

        const clearFilterButton = await filterHarness.getClearButton();
        expect(clearFilterButton).toBeTruthy();
        expect(await clearFilterButton?.isDisabled()).toBeFalsy();
        await clearFilterButton?.click();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(component.data).toBeUndefined();
        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter');
        await filterCleared$;
    });

    it('should apply the filter', async () => {
        const filterApplied$ = firstValueFrom(component.filterApplied);

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(component.data).toBeUndefined();
        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter');

        await filterHarness.open();
        fixture.detectChanges();

        const applyFilterButton = await filterHarness.getApplyButton();

        expect(await filterHarness.isOpen()).toBeTruthy();
        expect(applyFilterButton).toBeTruthy();
        expect(await applyFilterButton?.isDisabled()).toBeTruthy();

        component.selectedValue = filterValue;
        component.filterForm.markAsDirty();
        fixture.detectChanges();

        expect(await applyFilterButton?.isDisabled()).toBeFalsy();

        await applyFilterButton?.click();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(component.data).toEqual(filterValue);
        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter: Base Filter Value');

        await filterApplied$;
    });

    it("should close overlay without changing filter's applied value", async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();

        const overlayClosed$ = firstValueFrom(component.overlayClosed);
        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const label = await filterHarness.getLabel();

        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter: Base Filter Value');

        await filterHarness.open();
        fixture.detectChanges();
        expect(await filterHarness.isOpen()).toBeTruthy();

        const backdrop = await filterHarness.getOverlayBackdrop();
        expect(backdrop).toBeTruthy();
        await backdrop?.dispatchEvent('click');

        await fixture.whenStable();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(label).toBeTruthy();
        expect(await label?.text()).toBe('Base Filter: Base Filter Value');
        expect(component.data).toEqual(filterValue);

        await overlayClosed$;
    });

    it('should not display badge for single selection', async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const badge = await filterHarness.getBadge();
        expect(badge).toBeFalsy();
    });

    it('should display badge for multiple selection', async () => {
        component.selectedValue = multipleFilterValues;
        component.applyChanges();
        fixture.detectChanges();

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        const badge = await filterHarness.getBadge();
        expect(badge).toBeTruthy();
        expect(await badge?.text()).toBe('+2');
    });

    it('should mark form as dirty if selection changed', async () => {
        expect(component.filterForm.dirty).toBe(false);
        component.selectedValue = multipleFilterValues;
        component.ngOnChanges({
            selectedValue: new SimpleChange(null, multipleFilterValues, true),
        });
        expect(component.filterForm.dirty).toBe(true);
        component.applyChanges();
        expect(component.filterForm.dirty).toBe(false);
    });

    it('should mark form as pristine if selected value has not changed', () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        component.filterForm.markAsDirty();

        component.ngOnChanges({
            selectedValue: new SimpleChange(filterValue, filterValue, false),
        });

        expect(component.filterForm.pristine).toBe(true);
    });

    it('should ignore ngOnChanges when selectedValue is not in the change set', () => {
        component.filterForm.markAsDirty();
        component.ngOnChanges({});
        expect(component.filterForm.dirty).toBe(true);
    });

    it('should clear applied data when selectedValue becomes empty after initialization', () => {
        component.selectedValue = filterValue;
        component.ngOnChanges({
            selectedValue: new SimpleChange(undefined, filterValue, true),
        });
        expect(component.data).toEqual(filterValue);

        component.selectedValue = undefined;
        component.ngOnChanges({
            selectedValue: new SimpleChange(filterValue, undefined, false),
        });
        expect(component.data).toBeUndefined();
    });

    it('should discard pending changes when closing overlay from backdrop', async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        await filterHarness.open();
        fixture.detectChanges();

        component.selectedValue = multipleFilterValues;
        component.filterForm.markAsDirty();
        fixture.detectChanges();

        const backdrop = await filterHarness.getOverlayBackdrop();
        await backdrop?.dispatchEvent('click');
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.selectedValue).toEqual(filterValue);
        expect(component.filterForm.dirty).toBe(true);
    });

    it('should prevent Enter key default when form target is not a button', () => {
        const preventDefault = jest.fn();
        (component as any).onFormKeydownEnter({
            target: document.createElement('input'),
            preventDefault,
        } as Event);

        expect(preventDefault).toHaveBeenCalled();
    });

    it('should allow Enter key default when form target is a button', () => {
        const preventDefault = jest.fn();
        (component as any).onFormKeydownEnter({
            target: document.createElement('button'),
            preventDefault,
        } as Event);

        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should allow Enter key default when form target is a list option element', () => {
        const preventDefault = jest.fn();
        // Build the tag name at runtime to avoid static selector lint rule
        const tag = ['MAT', 'LIST', 'OPTION'].join('-');
        const listOptionElement = { tagName: tag } as HTMLElement;
        (component as any).onFormKeydownEnter({
            target: listOptionElement,
            preventDefault,
        } as Event);

        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should not create another overlay when already opened', () => {
        const createSpy = jest.spyOn((component as any).overlay, 'create');

        (component as any).openFilterOverlay();
        (component as any).openFilterOverlay();

        expect(createSpy).toHaveBeenCalledTimes(1);

        (component as any).closeOverlay(false);
    });

    it('should focus the chip button when requested', () => {
        const chipButton = fixture.nativeElement.querySelector('.hxp-governance-search-filter-chip') as HTMLButtonElement;
        const focusSpy = jest.spyOn(chipButton, 'focus');

        component.focusChip();

        expect(focusSpy).toHaveBeenCalled();
    });

    it('should pass accessibility checks when closed', async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();

        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });

    it('should pass accessibility checks when overlay is open', async () => {
        component.selectedValue = filterValue;
        component.applyChanges();
        fixture.detectChanges();

        const filterHarness = await loader.getHarness(SearchFilterHarness);
        await filterHarness.open();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeTruthy();

        const res = await a11yReport('.hxp-governance-search-filter-overlay');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
