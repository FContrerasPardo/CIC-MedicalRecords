/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MockComponent } from 'ng-mocks';
import { Filter, FilterService } from '@alfresco-dbp/shared-filters-services';
import { FiltersContainerComponent } from './filters-container.component';
import { FilterSaveAsDialogComponent } from '../filter-save-as-dialog/filter-save-as-dialog.component';
import { FiltersContainerActionsComponent } from '../filters-container-actions/filters-container-actions.component';
import { of } from 'rxjs';
import { MoreFiltersMenuComponent } from '../more-filters-menu/more-filters-menu.component';
import { getAllFiltersMock, getRadioFilterMock } from '../../mock/filters.mock';
import { ExpansionPanelHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { SimpleChange } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatExpansionPanelHarness } from '@angular/material/expansion/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('FiltersContainerComponent', () => {
    let component: FiltersContainerComponent;
    let fixture: ComponentFixture<FiltersContainerComponent>;
    let filterService: FilterService;
    let translateService: TranslateService;
    let loader: HarnessLoader;

    const getExpansionPanel = async () => {
        return ExpansionPanelHarnessUtils.getExpansionPanel({
            fixture,
            expansionPanelFilters: {
                selector: '[data-automation-id="hxp-filters-container-expansion-panel"]',
            },
        });
    };

    const setValueToSavedFiltersAutocompleteInput = (value: string): HTMLInputElement => {
        const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]')).nativeElement as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        return input;
    };

    const mockSavedFilters: Filter[] = [
        {
            name: 'FILTER.SAVED_1',
            translationKey: 'FILTER.SAVED_1',
            type: 'radio',
            visible: true,
            value: null,
        } as Filter,
        {
            name: 'FILTER.SAVED_2',
            translationKey: 'FILTER.SAVED_2',
            type: 'date',
            visible: true,
            value: null,
        } as Filter,
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                NoopTranslateModule,
                FiltersContainerComponent,
                MatAutocompleteModule,
                MatFormFieldModule,
                MatInputModule,
                ReactiveFormsModule,
                MatIconTestingModule,
                MockComponent(FilterSaveAsDialogComponent),
                MockComponent(FiltersContainerActionsComponent),
                MockComponent(MoreFiltersMenuComponent),
            ],
        }).overrideProvider(FilterService, {
            useValue: {
                getAllFilters: () => {
                    return of(getAllFiltersMock());
                },
                updateFilter: () => of({}),
                setFilters: () => of({}),
                filterValuesChanged$: of(true),
            },
        });

        translateService = TestBed.inject(TranslateService);
        jest.spyOn(translateService, 'instant').mockImplementation((key: string) => key);
        filterService = TestBed.inject(FilterService);
        fixture = TestBed.createComponent(FiltersContainerComponent);
        component = fixture.componentInstance;
        component.visibleActions = ['save', 'saveAs', 'delete', 'reset'];
        loader = TestbedHarnessEnvironment.loader(fixture);
    });

    it('should subscribe to get filters on init', () => {
        const allFiltersMock = getAllFiltersMock();

        fixture.detectChanges();

        expect(component.allFilters).toEqual(allFiltersMock);
        expect(component.visibleFilters()).toEqual(allFiltersMock.filter((filter) => filter.visible));
    });

    it('should emit filtersChange if filters changed ', async () => {
        filterService.filterValuesChanged$ = of(true);
        const filtersChangeSpy = jest.spyOn(component.filtersChange, 'emit');

        fixture.detectChanges();
        await fixture.whenStable();

        expect(filtersChangeSpy).toHaveBeenCalled();
    });

    it('should not emit filtersChange if filters have not changed ', () => {
        filterService.filterValuesChanged$ = of(false);
        const filtersChangeSpy = jest.spyOn(component.filtersChange, 'emit');

        fixture.detectChanges();

        expect(filtersChangeSpy).not.toHaveBeenCalled();
    });

    it('should set filters on change', () => {
        const allFiltersMock = getAllFiltersMock();
        const setFiltersSpy = jest.spyOn(filterService, 'setFilters');

        component.filters = allFiltersMock;
        component.ngOnChanges({ filters: { currentValue: allFiltersMock } as SimpleChange });

        expect(setFiltersSpy).toHaveBeenCalledWith(allFiltersMock);
    });

    it('should expansion panel be folded and disabled when loading is true', async () => {
        fixture.detectChanges();
        const expansionPanel = await getExpansionPanel();
        const expanded = await expansionPanel.isExpanded();
        const disabled = await expansionPanel.isDisabled();

        expect(expanded).toBe(false);
        expect(disabled).toBe(true);
    });

    it('should expansion panel be expanded and enabled when loading is false', async () => {
        component.loading = false;
        fixture.detectChanges();

        const expansionPanel = await getExpansionPanel();
        const expanded = await expansionPanel.isExpanded();
        const disabled = await expansionPanel.isDisabled();

        expect(expanded).toBe(true);
        expect(disabled).toBe(false);
    });

    it('should update filter value', () => {
        jest.spyOn(filterService, 'updateFilter');
        component.onFilterValueChange(getRadioFilterMock());

        expect(filterService.updateFilter).toHaveBeenCalledWith(getRadioFilterMock());
    });

    it('should remove filter', () => {
        const radioFilterMock = getRadioFilterMock();
        jest.spyOn(filterService, 'updateFilter');
        component.onFilterRemove(radioFilterMock);

        expect(radioFilterMock.visible).toBe(false);
        expect(filterService.updateFilter).toHaveBeenCalledWith(radioFilterMock);
    });

    it('should save filters', () => {
        const allFiltersMock = getAllFiltersMock();
        const setFiltersSpy = jest.spyOn(filterService, 'setFilters');
        const saveFilterSpy = jest.spyOn(component.saveFilter, 'emit');

        component.filters = allFiltersMock;
        fixture.detectChanges();
        component.onFiltersSave();

        expect(setFiltersSpy).toHaveBeenCalledWith(allFiltersMock);
        expect(saveFilterSpy).toHaveBeenCalled();
    });

    describe('with saved filters', () => {
        beforeEach(() => {
            component.savedFilters = mockSavedFilters;
            component.loading = false;
            fixture.detectChanges();
        });

        it('should initialize saved filters autocomplete when savedFilters are provided on init', () => {
            expect(component.filteredSavedFilters).toEqual(mockSavedFilters);
        });

        it('should update filteredSavedFilters when savedFilters input changes', () => {
            const newSavedFilters: Filter[] = [mockSavedFilters[0]];
            component.savedFilters = newSavedFilters;

            component.ngOnChanges({
                savedFilters: {
                    currentValue: newSavedFilters,
                    previousValue: mockSavedFilters,
                    firstChange: false,
                    isFirstChange: () => false,
                },
            });

            expect(component.filteredSavedFilters).toEqual(newSavedFilters);
        });

        it('should update saved filter input when currentSavedFilter changes', async () => {
            const currentFilter = mockSavedFilters[0];

            component.currentSavedFilter = currentFilter;
            component.ngOnChanges({
                currentSavedFilter: {
                    currentValue: currentFilter,
                    previousValue: null,
                    firstChange: true,
                    isFirstChange: () => true,
                },
            });

            fixture.detectChanges();

            const matAutoCompleteHarness = await loader.getHarness(MatAutocompleteHarness);
            expect(await matAutoCompleteHarness.getValue()).toEqual('FILTER.SAVED_1');
        });

        it('should handle null value in saved filter input', () => {
            setValueToSavedFiltersAutocompleteInput(null);
            fixture.detectChanges();

            expect(component.filteredSavedFilters).toEqual(mockSavedFilters);
        });

        it('should filter saved filters when typing in autocomplete', () => {
            setValueToSavedFiltersAutocompleteInput('SAVED_1');
            fixture.detectChanges();

            expect(component.filteredSavedFilters).toEqual([mockSavedFilters[0]]);
        });

        it('should show all saved filters when autocomplete value is empty string', () => {
            setValueToSavedFiltersAutocompleteInput('SAVED_1');
            fixture.detectChanges();
            expect(component.filteredSavedFilters).toEqual([mockSavedFilters[0]]);

            setValueToSavedFiltersAutocompleteInput('');
            fixture.detectChanges();

            expect(component.filteredSavedFilters).toEqual(mockSavedFilters);
        });

        it('should not show clear button when autocomplete input is empty', () => {
            setValueToSavedFiltersAutocompleteInput('');
            fixture.detectChanges();

            const clearButton = fixture.debugElement.query(By.css('[data-automation-id="clear-saved-filter-button"]'));
            expect(clearButton).toBeFalsy();
        });

        it('should show clear button when autocomplete input is set', () => {
            setValueToSavedFiltersAutocompleteInput('Test1');
            fixture.detectChanges();

            const clearButton = fixture.debugElement.query(By.css('[data-automation-id="clear-saved-filter-button"]'));
            expect(clearButton).toBeTruthy();
        });

        it('should clear and emit undefined when clearing saved filter with existing currentSavedFilter', async () => {
            await loader.getHarness(MatAutocompleteHarness).then((autoComplete) => autoComplete.selectOption({ text: '' }));
            fixture.detectChanges();

            const emitSpy = jest.spyOn(component.savedFilterSelected, 'emit');

            const clearButton = fixture.debugElement.query(By.css('[data-automation-id="clear-saved-filter-button"]'));
            clearButton.nativeElement.click();

            fixture.detectChanges();

            const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]'))
                .nativeElement as HTMLInputElement;

            expect(input.value).toBe('');
            expect(emitSpy).toHaveBeenCalledWith(undefined);
        });
    });

    it('should emit savedFilterSelected when selecting a different filter', () => {
        component.savedFilters = mockSavedFilters;
        component.currentSavedFilter = mockSavedFilters[0];
        fixture.detectChanges();

        const emitSpy = jest.spyOn(component.savedFilterSelected, 'emit');
        const event = {
            option: {
                value: mockSavedFilters[1],
            },
        } as unknown as MatAutocompleteSelectedEvent;

        component.onSavedFilterSelect(event);

        expect(emitSpy).toHaveBeenCalledWith(mockSavedFilters[1]);
    });

    it('should not emit savedFilterSelected when selecting the same filter', () => {
        component.savedFilters = mockSavedFilters;
        component.currentSavedFilter = mockSavedFilters[0];
        fixture.detectChanges();

        const emitSpy = jest.spyOn(component.savedFilterSelected, 'emit');
        const event = {
            option: {
                value: mockSavedFilters[0],
            },
        } as unknown as MatAutocompleteSelectedEvent;

        component.onSavedFilterSelect(event);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should hide saved filters autocomplete when savedFilters is undefined', async () => {
        component.savedFilters = undefined;
        component.loading = false;
        fixture.detectChanges();

        const savedFiltersAutocomplete = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete"]'));
        expect(savedFiltersAutocomplete).toBeFalsy();
        expect(component.filteredSavedFilters).toEqual([]);
    });

    describe('getFilterNames', () => {
        it('should call translateService.instant for each filter name', () => {
            const filters = [{ name: 'FILTER.NAME_1' }, { name: 'FILTER.NAME_2' }, { name: 'FILTER.NAME_3' }];

            const translateSpy = jest.spyOn(translateService, 'instant');

            component['getFilterNames'](filters);

            expect(translateSpy).toHaveBeenCalledTimes(3);
            expect(translateSpy).toHaveBeenCalledWith('FILTER.NAME_1');
            expect(translateSpy).toHaveBeenCalledWith('FILTER.NAME_2');
            expect(translateSpy).toHaveBeenCalledWith('FILTER.NAME_3');
        });

        it('should return empty array when filters is null', () => {
            const result = component['getFilterNames'](null);

            expect(result).toEqual([]);
        });

        it('should return empty array when filters is undefined', () => {
            const result = component['getFilterNames'](undefined);

            expect(result).toEqual([]);
        });

        it('should return empty array for empty filters array', () => {
            const result = component['getFilterNames']([]);

            expect(result).toEqual([]);
        });

        it('should not call translateService when filters is null or undefined', () => {
            const translateSpy = jest.spyOn(translateService, 'instant');

            component['getFilterNames'](null);
            component['getFilterNames'](undefined);

            expect(translateSpy).not.toHaveBeenCalled();
        });
    });

    describe('keyboard event handling', () => {
        beforeEach(() => {
            component.savedFilters = mockSavedFilters;
            component.loading = false;
            fixture.detectChanges();
        });

        describe('Escape key', () => {
            it('should call onEscape when Escape key is pressed on input element', async () => {
                const onEscapeSpy = jest.spyOn(component, 'onEscape');
                const inputHarness = await loader.getHarness(
                    MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' })
                );

                await inputHarness.focus();
                fixture.detectChanges();

                const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]')).nativeElement;
                const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    bubbles: true,
                    cancelable: true,
                });
                input.dispatchEvent(escapeEvent);

                fixture.detectChanges();

                expect(onEscapeSpy).toHaveBeenCalled();
            });

            it('should close autocomplete panel when Escape is pressed', () => {
                fixture.detectChanges();

                const mockClosePanel = jest.fn();
                Object.defineProperty(component, 'autocompleteTrigger', {
                    get: () => ({ closePanel: mockClosePanel }),
                    configurable: true,
                });

                component.onEscape();

                expect(mockClosePanel).toHaveBeenCalled();
            });

            it('should handle onEscape when autocompleteTrigger is not available', () => {
                Object.defineProperty(component, 'autocompleteTrigger', {
                    get: () => undefined,
                    configurable: true,
                });

                expect(() => component.onEscape()).not.toThrow();
            });

            it('should verify input element properly handles Escape key event', async () => {
                const onEscapeSpy = jest.spyOn(component, 'onEscape');
                const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]'));

                expect(input).toBeTruthy();

                const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    bubbles: true,
                    cancelable: true,
                });
                input.nativeElement.dispatchEvent(escapeEvent);
                fixture.detectChanges();

                expect(onEscapeSpy).toHaveBeenCalled();
            });
        });

        describe('Enter key', () => {
            it('should filter saved filters when typing', async () => {
                const inputHarness = await loader.getHarness(
                    MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' })
                );

                await inputHarness.setValue('SAVED_1');
                fixture.detectChanges();

                expect(component.filteredSavedFilters).toEqual([mockSavedFilters[0]]);
            });

            it('should have autocomplete bound to input field', fakeAsync(() => {
                let inputHarness: MatInputHarness;
                let autocompleteHarness: MatAutocompleteHarness;

                loader
                    .getHarness(MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' }))
                    .then((harness) => (inputHarness = harness));
                loader.getHarness(MatAutocompleteHarness).then((harness) => (autocompleteHarness = harness));

                tick();

                expect(inputHarness).toBeTruthy();
                expect(autocompleteHarness).toBeTruthy();
            }));

            it('should prevent Enter key event from bubbling to expansion panel header', async () => {
                const expansionPanel = await loader.getHarness(MatExpansionPanelHarness);
                const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]'));

                expect(await expansionPanel.isExpanded()).toBe(true);

                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    bubbles: true,
                    cancelable: true,
                });
                input.nativeElement.dispatchEvent(enterEvent);

                fixture.detectChanges();
                await fixture.whenStable();

                expect(await expansionPanel.isExpanded()).toBe(true);
            });
        });

        describe('preventEventBubbling', () => {
            it('should stop Enter key event from reaching expansion panel header', async () => {
                const expansionPanel = await loader.getHarness(MatExpansionPanelHarness);
                const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]'));

                expect(await expansionPanel.isExpanded()).toBe(true);

                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    bubbles: true,
                    cancelable: true,
                });
                input.nativeElement.dispatchEvent(enterEvent);

                fixture.detectChanges();
                await fixture.whenStable();

                expect(await expansionPanel.isExpanded()).toBe(true);
            });

            it('should not collapse expansion panel when typing in autocomplete input', fakeAsync(() => {
                let expansionPanel: MatExpansionPanelHarness;
                let inputHarness: MatInputHarness;
                loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
                loader
                    .getHarness(MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' }))
                    .then((harness) => (inputHarness = harness));
                tick();

                expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
                tick();

                inputHarness.focus();
                tick();
                inputHarness.setValue('test');
                tick();

                fixture.detectChanges();
                tick();

                expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
                tick();
                expect(component.isPanelExpanded).toBe(true);
            }));
        });

        it('should handle Escape key to close autocomplete without affecting panel state', fakeAsync(() => {
            let expansionPanel: MatExpansionPanelHarness;
            let inputHarness: MatInputHarness;
            let autocompleteHarness: MatAutocompleteHarness;
            loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
            loader
                .getHarness(MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' }))
                .then((harness) => (inputHarness = harness));
            loader.getHarness(MatAutocompleteHarness).then((harness) => (autocompleteHarness = harness));
            tick();

            inputHarness.focus();
            tick();
            inputHarness.setValue('SAVED');
            tick();

            fixture.detectChanges();
            tick();

            autocompleteHarness.isOpen().then((isOpen) => expect(isOpen).toBe(true));
            tick();

            const mockClosePanel = jest.fn();
            Object.defineProperty(component, 'autocompleteTrigger', {
                get: () => ({ closePanel: mockClosePanel }),
                configurable: true,
            });

            component.onEscape();

            expect(mockClosePanel).toHaveBeenCalled();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
        }));

        it('should prevent click events on form field from toggling expansion panel', async () => {
            const expansionPanel = await loader.getHarness(MatExpansionPanelHarness);
            const formField = fixture.debugElement.query(By.css('.hxp-filters-container__saved-filters-field'));

            expect(await expansionPanel.isExpanded()).toBe(true);

            formField.nativeElement.click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(await expansionPanel.isExpanded()).toBe(true);
        });

        it('should allow arrow key navigation in autocomplete without affecting panel', fakeAsync(() => {
            let expansionPanel: MatExpansionPanelHarness;
            let inputHarness: MatInputHarness;
            let autocompleteHarness: MatAutocompleteHarness;
            loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
            loader
                .getHarness(MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' }))
                .then((harness) => (inputHarness = harness));
            loader.getHarness(MatAutocompleteHarness).then((harness) => (autocompleteHarness = harness));
            tick();

            inputHarness.focus();
            tick();
            inputHarness.setValue('SAVED');
            tick();

            fixture.detectChanges();
            tick();

            autocompleteHarness.isOpen().then((isOpen) => expect(isOpen).toBe(true));
            tick();

            const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]')).nativeElement;

            for (const key of ['ArrowDown', 'ArrowUp']) {
                const arrowEvent = new KeyboardEvent('keydown', {
                    key,
                    bubbles: true,
                    cancelable: true,
                });
                input.dispatchEvent(arrowEvent);
            }

            fixture.detectChanges();
            tick();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
        }));
    });

    describe('expansion panel interaction', () => {
        beforeEach(() => {
            component.savedFilters = mockSavedFilters;
            component.loading = false;
            fixture.detectChanges();
        });

        it('should not collapse expansion panel when typing in autocomplete input', fakeAsync(() => {
            let expansionPanel: MatExpansionPanelHarness;
            let inputHarness: MatInputHarness;
            loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
            loader
                .getHarness(MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' }))
                .then((harness) => (inputHarness = harness));
            tick();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();

            inputHarness.focus();
            tick();
            inputHarness.setValue('test');
            tick();

            fixture.detectChanges();
            tick();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
            expect(component.isPanelExpanded).toBe(true);
        }));

        it('should maintain panel state when interacting with form field', fakeAsync(() => {
            let expansionPanel: MatExpansionPanelHarness;
            loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
            tick();

            const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]'));

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
            expect(component.isPanelExpanded).toBe(true);

            input.nativeElement.click();
            fixture.detectChanges();
            tick();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
            expect(component.isPanelExpanded).toBe(true);
        }));

        it('should have form field inside expansion panel header', fakeAsync(() => {
            let expansionPanel: MatExpansionPanelHarness;
            loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
            tick();
            const input = fixture.debugElement.query(By.css('[data-automation-id="saved-filters-autocomplete-input"]'));

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
            expect(input).toBeTruthy();
            expect(input.nativeElement).toBeTruthy();
        }));

        it('should keep panel expanded when selecting option from autocomplete', fakeAsync(() => {
            let expansionPanel: MatExpansionPanelHarness;
            let inputHarness: MatInputHarness;
            let autocompleteHarness: MatAutocompleteHarness;
            loader.getHarness(MatExpansionPanelHarness).then((harness) => (expansionPanel = harness));
            loader
                .getHarness(MatInputHarness.with({ selector: '[data-automation-id="saved-filters-autocomplete-input"]' }))
                .then((harness) => (inputHarness = harness));
            loader.getHarness(MatAutocompleteHarness).then((harness) => (autocompleteHarness = harness));
            tick();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();

            inputHarness.focus();
            tick();
            inputHarness.setValue('SAVED_1');
            tick();

            fixture.detectChanges();
            tick();

            autocompleteHarness.isOpen().then((isOpen) => expect(isOpen).toBe(true));
            tick();

            autocompleteHarness.getOptions().then((options) => {
                if (options.length > 0) {
                    options[0].click();
                    fixture.detectChanges();
                    tick();
                }
            });
            tick();

            expansionPanel.isExpanded().then((isExpanded) => expect(isExpanded).toBe(true));
            tick();
        }));
    });
});
