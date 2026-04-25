/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiltersContainerActionsComponent } from './filters-container-actions.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonHarness } from '@angular/material/button/testing';
import { FilterService, RadioFilter } from '@alfresco-dbp/shared-filters-services';
import { of } from 'rxjs';
import { FilterSaveAsDialogComponent } from '../filter-save-as-dialog/filter-save-as-dialog.component';
import { getAllFiltersMock, getRadioFilterMock } from '../../mock/filters.mock';
import { MatDialogModule } from '@angular/material/dialog';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

const ActionLabel = {
    SAVE: 'FILTERS.SAVE',
    SAVE_AS: 'FILTERS.SAVE_AS',
    DELETE: 'FILTERS.DELETE',
    RESET: 'FILTERS.RESET',
    RENAME: 'FILTERS.RENAME',
} as const;
type ActionLabel = typeof ActionLabel[keyof typeof ActionLabel];

describe('FiltersContainerActionsComponent', () => {
    let component: FiltersContainerActionsComponent;
    let fixture: ComponentFixture<FiltersContainerActionsComponent>;
    let filterService: FilterService;
    let loader: HarnessLoader;

    const getActionButton = async (actionLabel: ActionLabel): Promise<MatButtonHarness | null> => {
        const button = await loader.getHarnessOrNull(MatButtonHarness.with({ text: actionLabel }));

        return button;
    };

    const setDefaultFilter = (isDefault: boolean) => {
        if (isDefault) {
            component.isDefaultFilter = true;
            component.ngOnChanges({
                isDefaultFilter: {
                    currentValue: true,
                    previousValue: false,
                    firstChange: false,
                    isFirstChange: () => false,
                },
            });
        } else {
            component.isDefaultFilter = false;
            component.ngOnChanges({
                isDefaultFilter: {
                    currentValue: false,
                    previousValue: true,
                    firstChange: false,
                    isFirstChange: () => false,
                },
            });
        }
    };

    const setFiltersDirty = (isDirty: boolean) => {
        if (isDirty) {
            filterService.setFilters(getAllFiltersMock());
            filterService.updateFilter({
                ...getRadioFilterMock(),
                value: { value: 'mockValue2', label: 'mockLabel2', checked: true },
            } as RadioFilter);
        } else {
            filterService.setFilters(getAllFiltersMock());
        }
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, FiltersContainerActionsComponent, MatDialogModule],
            providers: [FilterService],
        });

        fixture = TestBed.createComponent(FiltersContainerActionsComponent);
        filterService = TestBed.inject(FilterService);

        component = fixture.componentInstance;
        component.visibleActions = ['save', 'saveAs', 'delete', 'reset', 'rename'];
        loader = TestbedHarnessEnvironment.loader(fixture);
    });

    describe('Reset Action', () => {
        it('should be disabled when filtersDirty is false', async () => {
            setFiltersDirty(false);
            fixture.detectChanges();

            await getActionButton(ActionLabel.RESET)
                .then((resetButton) => resetButton?.isDisabled())
                .then((isDisabled) => {
                    expect(isDisabled).toBe(true);
                    setFiltersDirty(true);
                    fixture.detectChanges();
                    return getActionButton(ActionLabel.RESET);
                })
                .then((resetButton) => resetButton?.isDisabled())
                .then((isDisabled) => {
                    expect(isDisabled).toBe(false);
                });
        });

        it('should call resetFilters on click', async () => {
            const resetSpy = jest.spyOn(filterService, 'resetFilters');
            setFiltersDirty(true);
            fixture.detectChanges();

            const resetButton = await getActionButton(ActionLabel.RESET);
            if (resetButton) {
                await resetButton.click();
                expect(resetSpy).toHaveBeenCalled();
            } else {
                fail('Reset button not found');
            }
        });
    });

    describe('Save Action', () => {
        it('should be disabled when filtersDirty is false', async () => {
            setDefaultFilter(false);
            setFiltersDirty(false);
            fixture.detectChanges();

            await getActionButton(ActionLabel.SAVE)
                .then((button) => button.isDisabled())
                .then((isDisabled) => {
                    expect(isDisabled).toBe(true);
                    setDefaultFilter(false);
                    setFiltersDirty(true);
                    fixture.detectChanges();
                    return getActionButton(ActionLabel.SAVE);
                })
                .then((button) => button.isDisabled())
                .then((isDisabled) => {
                    expect(isDisabled).toBe(false);
                });
        });

        it('should not be visible for default filters', async () => {
            setDefaultFilter(true);
            fixture.detectChanges();

            const saveButton = await getActionButton(ActionLabel.SAVE);
            expect(saveButton).toBeNull();
        });

        it('should be visible for non-default filters', async () => {
            setDefaultFilter(false);
            fixture.detectChanges();

            const saveButton = await getActionButton(ActionLabel.SAVE);
            expect(saveButton).not.toBeNull();
        });

        it('should emit saveClick', async () => {
            const saveSpy = jest.spyOn(component.saveClick, 'emit');
            setFiltersDirty(true);
            setDefaultFilter(false);
            fixture.detectChanges();

            const saveButton = await getActionButton(ActionLabel.SAVE);

            if (saveButton) {
                await saveButton.click();
                expect(saveSpy).toHaveBeenCalled();
            } else {
                fail('Save button not found');
            }
        });
    });

    describe('Save As Action', () => {
        it('should be disabled when filtersDirty is false', async () => {
            setFiltersDirty(false);
            fixture.detectChanges();

            await getActionButton(ActionLabel.SAVE_AS)
                .then((button) => button.isDisabled())
                .then((isDisabled) => {
                    expect(isDisabled).toBe(true);
                    setFiltersDirty(true);
                    fixture.detectChanges();
                    return getActionButton(ActionLabel.SAVE_AS);
                })
                .then((button) => button.isDisabled())
                .then((isDisabled) => {
                    expect(isDisabled).toBe(false);
                });
        });

        it('should open FilterSaveAsDialogComponent on click and emit saveAsClick with name', async () => {
            const dialogOpenSpy = jest.spyOn(component.dialog, 'open').mockReturnValue({
                afterClosed: () => of({ name: 'name' }),
            } as any);
            const saveAsSpy = jest.spyOn(component.saveAsClick, 'emit');
            setFiltersDirty(true);
            fixture.detectChanges();

            const saveAsButton = await getActionButton(ActionLabel.SAVE_AS);
            if (saveAsButton) {
                await saveAsButton.click();

                expect(dialogOpenSpy).toHaveBeenCalledWith(FilterSaveAsDialogComponent, {
                    height: 'auto',
                    minWidth: '500px',
                    data: { title: 'FILTERS.DIALOG.TITLE_SAVE_AS', existingFilterNames: [], currentFilterName: undefined },
                });
                expect(saveAsSpy).toHaveBeenCalledWith('name');
            } else {
                fail('Save As button not found');
            }
        });
    });

    describe('Delete Action', () => {
        it('should not be visible for default filters', async () => {
            setDefaultFilter(true);
            fixture.detectChanges();

            const deleteButton = await getActionButton(ActionLabel.DELETE);
            expect(deleteButton).toBeNull();
        });

        it('should be visible for non-default filters', async () => {
            setDefaultFilter(false);
            fixture.detectChanges();

            const deleteButton = await getActionButton(ActionLabel.DELETE);
            expect(deleteButton).not.toBeNull();
        });

        it('should emit deleteClick', async () => {
            const deleteSpy = jest.spyOn(component.deleteClick, 'emit');
            setDefaultFilter(false);
            fixture.detectChanges();

            const deleteButton = await getActionButton(ActionLabel.DELETE);
            if (deleteButton) {
                await deleteButton.click();
                expect(deleteSpy).toHaveBeenCalled();
            } else {
                fail('Delete button not found');
            }
        });
    });

    describe('Rename Action', () => {
        it('should not be visible for default filters', async () => {
            setDefaultFilter(true);
            fixture.detectChanges();

            const renameButton = await getActionButton(ActionLabel.RENAME);
            expect(renameButton).toBeNull();
        });

        it('should be visible for non-default filters', async () => {
            setDefaultFilter(false);
            fixture.detectChanges();

            const renameButton = await getActionButton(ActionLabel.RENAME);
            expect(renameButton).not.toBeNull();
        });

        it('should open FilterRenameDialogComponent on click and emit renameClick with name', async () => {
            const dialogOpenSpy = jest.spyOn(component.dialog, 'open').mockReturnValue({
                afterClosed: () => of({ name: 'new filter name' }),
            } as any);
            const renameSpy = jest.spyOn(component.renameClick, 'emit');
            setDefaultFilter(false);
            fixture.detectChanges();

            const renameButton = await getActionButton(ActionLabel.RENAME);
            if (renameButton) {
                await renameButton.click();

                expect(dialogOpenSpy).toHaveBeenCalledWith(FilterSaveAsDialogComponent, {
                    height: 'auto',
                    minWidth: '500px',
                    data: { title: 'FILTERS.DIALOG.TITLE_RENAME', existingFilterNames: [], currentFilterName: undefined },
                });
                expect(renameSpy).toHaveBeenCalledWith('new filter name');
            } else {
                fail('Rename button not found');
            }
        });

        it('should not emit renameClick when dialog is cancelled', async () => {
            const dialogOpenSpy = jest.spyOn(component.dialog, 'open').mockReturnValue({
                afterClosed: () => of(null),
            } as any);
            const renameSpy = jest.spyOn(component.renameClick, 'emit');
            setDefaultFilter(false);
            fixture.detectChanges();

            const renameButton = await getActionButton(ActionLabel.RENAME);
            if (renameButton) {
                await renameButton.click();

                expect(dialogOpenSpy).toHaveBeenCalledWith(FilterSaveAsDialogComponent, {
                    height: 'auto',
                    minWidth: '500px',
                    data: { title: 'FILTERS.DIALOG.TITLE_RENAME', existingFilterNames: [], currentFilterName: undefined },
                });
                expect(renameSpy).not.toHaveBeenCalled();
            } else {
                fail('Rename button not found');
            }
        });

        it('should not emit renameClick when dialog returns undefined', async () => {
            const dialogOpenSpy = jest.spyOn(component.dialog, 'open').mockReturnValue({
                afterClosed: () => of(undefined),
            } as any);
            const renameSpy = jest.spyOn(component.renameClick, 'emit');
            setDefaultFilter(false);
            fixture.detectChanges();

            const renameButton = await getActionButton(ActionLabel.RENAME);
            if (renameButton) {
                await renameButton.click();

                expect(dialogOpenSpy).toHaveBeenCalledWith(FilterSaveAsDialogComponent, {
                    height: 'auto',
                    minWidth: '500px',
                    data: { title: 'FILTERS.DIALOG.TITLE_RENAME', existingFilterNames: [], currentFilterName: undefined },
                });
                expect(renameSpy).not.toHaveBeenCalled();
            } else {
                fail('Rename button not found');
            }
        });

        it('should not emit renameClick when dialog returns empty name', async () => {
            const dialogOpenSpy = jest.spyOn(component.dialog, 'open').mockReturnValue({
                afterClosed: () => of({ name: '' }),
            } as any);
            const renameSpy = jest.spyOn(component.renameClick, 'emit');
            setDefaultFilter(false);
            fixture.detectChanges();

            const renameButton = await getActionButton(ActionLabel.RENAME);
            if (renameButton) {
                await renameButton.click();

                expect(dialogOpenSpy).toHaveBeenCalledWith(FilterSaveAsDialogComponent, {
                    height: 'auto',
                    minWidth: '500px',
                    data: { title: 'FILTERS.DIALOG.TITLE_RENAME', existingFilterNames: [], currentFilterName: undefined },
                });
                expect(renameSpy).not.toHaveBeenCalled();
            } else {
                fail('Rename button not found');
            }
        });
    });
});
