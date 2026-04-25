/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { ButtonHarnessUtils, InputHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { FilterSaveAsDialogComponent, FilterSaveAsDialogData } from './filter-save-as-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

describe('FilterSaveAsDialogComponent', () => {
    let component: FilterSaveAsDialogComponent;
    let fixture: ComponentFixture<FilterSaveAsDialogComponent>;

    const setNameInputValue = (value: string) =>
        InputHarnessUtils.getInput({
            fixture,
            inputFilters: {
                selector: '[data-automation-id="hxp-filter-save-as-dialog-name"]',
            },
        }).then((input) => input.setValue(value));

    function setupTestBed(data: FilterSaveAsDialogData) {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, NoopTranslateModule],
            providers: [
                MockProvider(MatDialogRef, {
                    close: () => {},
                }),
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: data,
                },
            ],
        });

        fixture = TestBed.createComponent(FilterSaveAsDialogComponent);
        component = fixture.componentInstance;
    }

    describe('with title', () => {
        beforeEach(() => {
            setupTestBed({ title: 'test.title' });
            fixture.detectChanges();
        });

        it('should close dialog with no arguments on cancel button click', async () => {
            const spy = jest.spyOn(component.dialogRef, 'close');

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '[data-automation-id="hxp-filter-save-as-dialog-cancel"]',
                },
            });

            expect(spy).toHaveBeenCalledWith();
        });

        it('should close dialog with name on save button click', async () => {
            const spy = jest.spyOn(component.dialogRef, 'close');

            await setNameInputValue('test');
            const saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            saveButton.click();

            expect(spy).toHaveBeenCalledWith({ name: 'test' });
        });

        it('should close dialog with name when Enter key is pressed and input is valid', async () => {
            const spy = jest.spyOn(component.dialogRef, 'close');

            await setNameInputValue('test');
            const input = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-name"]'));
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            input.nativeElement.dispatchEvent(event);
            fixture.detectChanges();

            expect(spy).toHaveBeenCalledWith({ name: 'test' });
        });

        it('should not close dialog when Enter key is pressed and input is invalid', async () => {
            const spy = jest.spyOn(component.dialogRef, 'close');

            await setNameInputValue('');
            component.nameControl.markAsTouched();
            fixture.detectChanges();

            const input = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-name"]'));
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            input.nativeElement.dispatchEvent(event);
            fixture.detectChanges();

            expect(spy).not.toHaveBeenCalled();
        });

        it('should save button be disabled when name is empty or null', async () => {
            let saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            expect(saveButton.disabled).toBe(true);

            await setNameInputValue('test');

            saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');

            expect(saveButton.disabled).toBe(false);
        });

        it('should set title from data', () => {
            expect(component.title).toBe('test.title');
        });
    });

    it('should not throw error if data is undefined', () => {
        setupTestBed(undefined);
        expect(() => component.ngOnInit()).not.toThrow();
        expect(component.title).toBeUndefined();
    });

    it('should not throw error if data.title is undefined', () => {
        setupTestBed({ title: undefined });
        expect(() => component.ngOnInit()).not.toThrow();
        expect(component.title).toBeUndefined();
    });

    describe('with default name input value', () => {
        beforeEach(() => {
            setupTestBed({ title: 'test.title', currentFilterName: 'test' });
            fixture.detectChanges();
        });

        it('should show required error when name is empty and touched', async () => {
            await setNameInputValue('');
            component.nameControl.markAsTouched();
            fixture.detectChanges();

            const error = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-required-error"]'));
            expect(error).toBeTruthy();
            expect(component.nameControl.valid).toBe(false);
            const saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            expect(saveButton.disabled).toBe(true);
        });

        it('should show not required error when name is empty and not touched', async () => {
            await setNameInputValue('');
            fixture.detectChanges();

            const error = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-required-error"]'));
            expect(error).toBeFalsy();
            expect(component.nameControl.valid).toBe(false);
            const saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            expect(saveButton.disabled).toBe(true);
        });
    });

    describe('with existing filter names', () => {
        beforeEach(() => {
            setupTestBed({ title: 'test.title', existingFilterNames: ['test', 'test2'] });
            fixture.detectChanges();
        });

        it('should show duplicate error when name is already taken', async () => {
            await setNameInputValue('test');
            fixture.detectChanges();

            const error = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-duplicate-error"]'));
            expect(error).toBeTruthy();
            expect(component.nameControl.valid).toBe(false);
            const saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            expect(saveButton.disabled).toBe(true);
        });

        it('should show no duplicate error when name is not taken', async () => {
            await setNameInputValue('test3');
            fixture.detectChanges();

            const error = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-duplicate-error"]'));
            expect(error).toBeFalsy();
            expect(component.nameControl.valid).toBe(true);
            const saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            expect(saveButton.disabled).toBe(false);
        });
    });

    describe('with existing filter names and current filter name', () => {
        beforeEach(() => {
            setupTestBed({ title: 'test.title', existingFilterNames: ['test', 'test2'], currentFilterName: 'test' });
            fixture.detectChanges();
        });

        it('should show duplicate error when name is the same as the current filter name', async () => {
            await setNameInputValue('test');
            fixture.detectChanges();

            const error = fixture.debugElement.query(By.css('[data-automation-id="hxp-filter-save-as-dialog-duplicate-error"]'));
            expect(error).toBeTruthy();
            expect(component.nameControl.valid).toBeFalsy();
            const saveButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-save-as-dialog-save"]');
            expect(saveButton.disabled).toBeTruthy();
        });
    });
});
