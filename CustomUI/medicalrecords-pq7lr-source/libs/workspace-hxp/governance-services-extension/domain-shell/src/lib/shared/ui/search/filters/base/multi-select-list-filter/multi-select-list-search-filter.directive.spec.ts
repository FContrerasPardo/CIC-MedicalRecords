/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { Observable, of } from 'rxjs';
import { MultiSelectListSearchFilterBase } from './multi-select-list-search-filter.directive';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchFilterContainerComponent } from '../search-filter-container/search-filter-container.component';
import { SearchFilterInputComponent } from '../search-filter-input/search-filter-input.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { MultiSelectListSearchFilterHarness } from './multi-select-list-search-filter-harness.mock';
import { MultiSelectListSearchFilterData, MultiSelectListSearchFilterValue } from './multi-select-list-search-filter.data';
import { getMockInput } from '../search-filter-input/helpers';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

const MOCK_DATA = [
    { label: 'Apples', value: 'apples' },
    { label: 'Bananas', value: 'bananas' },
    { label: 'Cherries', value: 'cherries' },
] as MultiSelectListSearchFilterValue[];

@Component({
    selector: 'hxp-governance-search-category-filter',
    templateUrl: './multi-select-list-search-filter.directive.html',
    styleUrls: ['./multi-select-list-search-filter.directive.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatChipsModule,
        MatFormFieldModule,
        MatIconModule,
        MatIconTestingModule,
        MatInputModule,
        MatListModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        ReactiveFormsModule,
        SearchFilterContainerComponent,
        TranslatePipe,
        SearchFilterInputComponent,
        NoopTranslateModule,
    ],
})
export class ExampleFilterComponent extends MultiSelectListSearchFilterBase {
    constructor() {
        super();
        this.filterLabelKey = 'EXAMPLE.FILTER.LABEL';
    }

    override toQueryParams(): Record<string, any> {
        return {};
    }

    override fromQueryParams(): MultiSelectListSearchFilterData | undefined {
        return undefined;
    }

    protected loadOptions(): Observable<MultiSelectListSearchFilterValue[]> {
        return of(MOCK_DATA);
    }

    // Test helpers to expose protected/private members
    public testInitializeSelectionFromQueryParams() {
        this.initializeSelectionFromQueryParams();
    }
    public getTestSelection() {
        return this.selection;
    }
    public getTestOptions() {
        return this.options;
    }
    public testSyncSelectedLabelsWithOptions() {
        (this as any).syncSelectedLabelsWithOptions();
    }
}

describe('MultiSelectListSearchFilterBase', () => {
    let fixture: ComponentFixture<ExampleFilterComponent>;
    let component: ExampleFilterComponent;
    let loader: HarnessLoader;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExampleFilterComponent, MatIconTestingModule],
            providers: [provideNoopAnimations()],
        }).compileComponents();

        fixture = TestBed.createComponent(ExampleFilterComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
        fixture.detectChanges();
    });

    it('should display the filter', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        const chipLabel = await filterHarness.getLabel();

        expect(chipLabel).toBeTruthy();
        expect(await chipLabel?.text()).toBe('EXAMPLE.FILTER.LABEL');
        expect(await filterHarness.isOpen()).toBeFalsy();

        let summary = await filterHarness.getSummary();
        let selection = await filterHarness.getSelection();
        let noResults = await filterHarness.getNoResults();

        expect(summary).toBeFalsy();
        expect(selection).toBeFalsy();
        expect(noResults).toBeFalsy();
        expect(await filterHarness.isOpen()).toBeFalsy();

        await filterHarness.open();

        summary = await filterHarness.getSummary();
        selection = await filterHarness.getSelection();
        noResults = await filterHarness.getNoResults();

        expect(await filterHarness.isOpen()).toBeTruthy();
        expect(summary).toBeTruthy();
        expect(selection).toBeTruthy();
        expect(noResults).toBeFalsy();
    });

    it('should display the input inside the overlay', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);

        expect(await filterHarness.isOpen()).toBeFalsy();
        await filterHarness.open();
        expect(await filterHarness.isOpen()).toBeTruthy();

        expect(getMockInput()).toBeTruthy();
    });

    it('filters options as the user types', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        let items = await filterHarness.getSelection();

        expect(items).toBeTruthy();
        expect(items?.length).toBe(3);

        getMockInput().search.emit('app');

        items = await filterHarness.getSelection();

        expect(items).toBeTruthy();
        expect(items?.length).toBe(1);
    });

    it('shows empty-state when no match', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        let items = await filterHarness.getSelection();
        let notResults = await filterHarness.getNoResults();

        expect(items).toBeTruthy();
        expect(items?.length).toBe(3);
        expect(notResults).toBeFalsy();

        getMockInput().search.emit('xyz');

        items = await filterHarness.getSelection();
        notResults = await filterHarness.getNoResults();

        expect(items).toBeFalsy();
        expect(notResults).toBeTruthy();
    });

    it('selects items and renders chips', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        const items = await filterHarness.getSelection();
        await items?.[0].select();
        await items?.[1].select();
        fixture.detectChanges();

        const summary = await filterHarness.getSummary();
        const summaryItems = await summary?.getChips();

        expect(summaryItems?.length).toBe(2);
        expect(await summaryItems?.[0].getText()).toContain('Apples');
        expect(await summaryItems?.[1].getText()).toContain('Bananas');
    });

    it('should initialize selection from query params and sync chips', async () => {
        // Simulate query param selection
        component.selectedValue = new MultiSelectListSearchFilterData([
            { label: 'Bananas', value: 'bananas' },
            { label: 'Cherries', value: 'cherries' },
        ]);
        component.testInitializeSelectionFromQueryParams();
        fixture.detectChanges();

        // Ensure overlay is open for chips to be rendered
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        fixture.detectChanges();
        const summary = await filterHarness.getSummary();
        expect(summary).toBeTruthy();
        const summaryItems = await summary?.getChips();
        expect(summaryItems).toBeTruthy();
        expect(summaryItems?.length).toBe(2);
        expect(await summaryItems?.[0]?.getText()).toContain('Bananas');
        expect(await summaryItems?.[1]?.getText()).toContain('Cherries');
        // Selection should match options by reference
        expect(component.getTestSelection().selected.map((s) => s.value)).toEqual(['bananas', 'cherries']);
    });

    it('should sync selected labels with options', async () => {
        // Select an option
        component.selectedValue = new MultiSelectListSearchFilterData([{ label: 'Bananas', value: 'bananas' }]);
        component.testInitializeSelectionFromQueryParams();
        fixture.detectChanges();

        // Change label in options
        component.getTestOptions()[1].label = 'Yellow Bananas';
        component.testSyncSelectedLabelsWithOptions();
        fixture.detectChanges();

        // Ensure overlay is open for chips to be rendered
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        fixture.detectChanges();
        const summary = await filterHarness.getSummary();
        expect(summary).toBeTruthy();
        const summaryItems = await summary?.getChips();
        expect(summaryItems).toBeTruthy();
        expect(await summaryItems?.[0].getText()).toContain('Yellow Bananas');
    });

    it('removes selection when chip remove icon clicked', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        const items = await filterHarness.getSelection();
        const firstOption = items?.[0];
        await firstOption?.select();
        fixture.detectChanges();

        const summary = await filterHarness.getSummary();
        let summaryItems = await summary?.getChips();

        expect(summaryItems?.length).toBe(1);

        const summaryItem = summaryItems?.[0];
        const removeButton = await summaryItem?.getRemoveButton();
        await removeButton?.click();

        expect(await firstOption?.isSelected()).toBeFalsy();

        summaryItems = await summary?.getChips();

        expect(summaryItems?.length).toBe(0);
    });

    it('clear-input button resets search and list', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        let items = await filterHarness.getSelection();

        expect(items?.length).toBe(3);

        getMockInput().search.emit('app');

        items = await filterHarness.getSelection();

        expect(items?.length).toBe(1);

        getMockInput().clear.emit();

        items = await filterHarness.getSelection();

        expect(items?.length).toBe(3);
    });

    it('should apply the filter when apply button is clicked', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        const selection = await filterHarness.getSelection();
        const firstOption = selection?.[0];
        await firstOption?.select();
        fixture.detectChanges();

        // TODO - enable after the search filter value service is implemented
        // const filteredAppliedPromise = searchFilterValueService.filterApplied$.pipe(take(1)).toPromise();

        expect(component.selectedValue).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.value).toBeFalsy();

        const applyFilterButton = await filterHarness.getApplyButton();
        expect(applyFilterButton).toBeTruthy();
        applyFilterButton?.click();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(component.value).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.selectedValue).toEqual(component.value);

        // TODO - enable after the search filter value service is implemented
        // const selectedValue = await filteredAppliedPromise;
        // expect(selectedValue?.filter).toEqual(component);

        component.clearFilter();
    });

    it('should clear the filter', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        const selection = await filterHarness.getSelection();
        const firstOption = selection?.[0];
        await firstOption?.select();
        fixture.detectChanges();

        expect(component.selectedValue).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.value).toBeFalsy();

        const applyFilterButton = await filterHarness.getApplyButton();

        expect(applyFilterButton).toBeTruthy();

        applyFilterButton?.click();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();

        await filterHarness.open();

        expect(await filterHarness.isOpen()).toBeTruthy();
        expect(component.value).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.selectedValue).toEqual(component.value);

        const clearFilterButton = await filterHarness.getClearButton();

        expect(clearFilterButton).toBeTruthy();

        clearFilterButton?.click();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(component.value).toBeFalsy();
        expect(component.selectedValue).toBeFalsy();
        expect(component.selectedValue).toEqual(component.value);
        expect(await firstOption?.isSelected()).toBeFalsy();
    });

    it('should select and deselect option when selected option changes', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        const selection = await filterHarness.getSelection();
        const firstOption = selection?.[0];
        const secondOption = selection?.[1];
        const thirdOption = selection?.[2];
        await firstOption?.select();
        await secondOption?.select();
        await thirdOption?.select();
        fixture.detectChanges();

        expect(component.selectedValue).toEqual(new MultiSelectListSearchFilterData(MOCK_DATA));
        expect(component.value).toBeFalsy();

        await firstOption?.deselect();
        await secondOption?.deselect();
        await thirdOption?.deselect();
        fixture.detectChanges();

        expect(component.selectedValue).toBeFalsy();
        expect(component.value).toBeFalsy();
    });

    it('should keep previously submitted value when overlay selection changes without applying it', async () => {
        const filterHarness = await loader.getHarness(MultiSelectListSearchFilterHarness);
        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        const selection = await filterHarness.getSelection();
        const firstOption = selection?.[0];
        const secondOption = selection?.[1];
        await firstOption?.select();
        fixture.detectChanges();

        // TODO - enable after the search filter value service is implemented
        // const filteredAppliedPromise = searchFilterValueService.filterApplied$.pipe(take(1)).toPromise();

        expect(component.selectedValue).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.value).toBeFalsy();

        const applyFilterButton = await filterHarness.getApplyButton();
        expect(applyFilterButton).toBeTruthy();
        applyFilterButton?.click();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(component.value).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.selectedValue).toEqual(component.value);

        // TODO - enable after the search filter value service is implemented
        // const selectedValue = await filteredAppliedPromise;
        // expect(selectedValue?.filter).toEqual(component);

        await filterHarness.open();
        await secondOption?.select();
        fixture.detectChanges();

        const backdrop = await filterHarness.getOverlayBackdrop();
        expect(backdrop).toBeTruthy();
        backdrop?.dispatchEvent('click');
        await fixture.whenStable();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeFalsy();
        expect(component.value).toEqual(new MultiSelectListSearchFilterData([MOCK_DATA[0]]));
        expect(component.selectedValue).toEqual(component.value);

        await filterHarness.open();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(await filterHarness.isOpen()).toBeTruthy();
        expect(await firstOption?.isSelected()).toBeTruthy();
        expect(await secondOption?.isSelected()).toBeFalsy();
    });

    it('should pass accessibility audit', async () => {
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});
