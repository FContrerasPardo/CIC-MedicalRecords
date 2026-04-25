/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { CheckboxFilterMenuComponent } from './checkbox-filter-menu.component';
import { CheckboxHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { getClearSelectionButton, getUpdateButton } from '../../../../utils/filter-testing-utils';

describe('CheckboxFilterMenuComponent', () => {
    let component: CheckboxFilterMenuComponent;
    let fixture: ComponentFixture<CheckboxFilterMenuComponent>;

    const getSelectAllCheckbox = async (): Promise<MatCheckboxHarness> => {
        return CheckboxHarnessUtils.getCheckbox({
            fixture,
            checkboxFilters: {
                selector: '[data-automation-id="hxp-checkbox-filter-menu-select-all"]',
            },
        });
    };

    const getCheckbox = async (value: string): Promise<MatCheckboxHarness> => {
        return CheckboxHarnessUtils.getCheckbox({
            fixture,
            checkboxFilters: {
                selector: `[data-automation-id="hxp-checkbox-filter-menu-option-${value}"]`,
            },
        });
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, CheckboxFilterMenuComponent],
        });

        fixture = TestBed.createComponent(CheckboxFilterMenuComponent);
        component = fixture.componentInstance;
    });

    it('should disable clear selection button when selectedOptions are empty', async () => {
        component.options = [
            { value: 'mockValue', label: 'mockLabel', checked: false },
            { value: 'mockValue2', label: 'mockLabel2', checked: false },
        ];
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);

        expect(await clearSelectionButton.isDisabled()).toBe(true);
    });

    it('should enable clear selection button when selectedOptions are not empty', async () => {
        component.options = [
            { value: 'mockValue', label: 'mockLabel', checked: true },
            { value: 'mockValue2', label: 'mockLabel2', checked: false },
        ];
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);

        expect(await clearSelectionButton.isDisabled()).toBe(false);
    });

    it('should deselect all options when clear button is clicked', async () => {
        jest.spyOn(component.update, 'emit');
        component.options = [
            { value: 'mockValue', label: 'mockLabel', checked: true },
            { value: 'mockValue2', label: 'mockLabel2', checked: true },
            { value: 'mockValue3', label: 'mockLabel3', checked: false },
        ];
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);
        await clearSelectionButton.click();

        for (const option of component.options) {
            expect(option.checked).toBe(false);
        }
    });

    it('should select all options on select all checkbox click', async () => {
        component.options = [
            { value: 'mockValue', label: 'mockLabel', checked: false },
            { value: 'mockValue2', label: 'mockLabel2', checked: false },
            { value: 'mockValue3', label: 'mockLabel3', checked: false },
        ];
        fixture.detectChanges();

        const selectAllCheckbox = await getSelectAllCheckbox();
        await selectAllCheckbox.check();

        for (const option of component.options) {
            expect(option.checked).toBe(true);
        }
    });

    it('should select an option on checkbox click', async () => {
        component.options = [
            { value: 'mockValue', label: 'mockLabel', checked: false },
            { value: 'mockValue2', label: 'mockLabel2', checked: false },
            { value: 'mockValue3', label: 'mockLabel3', checked: false },
        ];
        fixture.detectChanges();

        const checkbox = await getCheckbox('mockValue');
        await checkbox.check();

        expect(component.options[0].checked).toBe(true);
    });

    it('should emit update with selectedOptions on update button click', async () => {
        jest.spyOn(component.update, 'emit');
        component.options = [
            { value: 'mockValue', label: 'mockLabel', checked: true },
            { value: 'mockValue2', label: 'mockLabel2', checked: true },
            { value: 'mockValue3', label: 'mockLabel3', checked: false },
        ];
        fixture.detectChanges();

        const updateButton = await getUpdateButton(fixture);
        await updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith([
            { value: 'mockValue', label: 'mockLabel', checked: true },
            { value: 'mockValue2', label: 'mockLabel2', checked: true },
        ]);
    });

    describe('allowEmpty', () => {
        it('should not disable options when allowEmpty is true', () => {
            component.allowEmpty = true;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: false },
            ];

            expect(component.isAtLeastOneRequired(component.options[0])).toBe(false);
            expect(component.isAtLeastOneRequired(component.options[1])).toBe(false);
        });

        it('should disable last selected option when allowEmpty is false', () => {
            component.allowEmpty = false;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: false },
            ];

            expect(component.isAtLeastOneRequired(component.options[0])).toBe(true);
            expect(component.isAtLeastOneRequired(component.options[1])).toBe(false);
        });

        it('should not disable options when multiple are selected and allowEmpty is false', () => {
            component.allowEmpty = false;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: true },
            ];

            expect(component.isAtLeastOneRequired(component.options[0])).toBe(false);
            expect(component.isAtLeastOneRequired(component.options[1])).toBe(false);
        });

        it('should disable last checked option when allowEmpty is false', async () => {
            component.allowEmpty = false;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: false },
            ];
            fixture.detectChanges();

            const checkbox = await getCheckbox('option1');

            expect(await checkbox.isDisabled()).toBe(true);
        });

        it('should hide clear selection button when allowEmpty is false', () => {
            component.allowEmpty = false;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: true },
            ];
            fixture.detectChanges();

            const clearSelectionButton = fixture.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-clear-selection-button"]');

            expect(clearSelectionButton).toBeFalsy();
        });

        it('should enable clear selection button when allowEmpty is true', async () => {
            component.allowEmpty = true;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: true },
            ];
            fixture.detectChanges();

            const clearSelectionButton = await getClearSelectionButton(fixture);

            expect(await clearSelectionButton.isDisabled()).toBe(false);
        });

        it('should disable select all checkbox when all selected and allowEmpty is false', async () => {
            component.allowEmpty = false;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: true },
            ];
            fixture.detectChanges();

            const selectAllCheckbox = await getSelectAllCheckbox();

            expect(await selectAllCheckbox.isDisabled()).toBe(true);
        });

        it('should enable select all checkbox when not all selected and allowEmpty is false', async () => {
            component.allowEmpty = false;
            component.options = [
                { value: 'option1', label: 'Option 1', checked: true },
                { value: 'option2', label: 'Option 2', checked: false },
            ];
            fixture.detectChanges();

            const selectAllCheckbox = await getSelectAllCheckbox();

            expect(await selectAllCheckbox.isDisabled()).toBe(false);
        });
    });
});
