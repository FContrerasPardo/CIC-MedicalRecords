/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { StringFilterMenuComponent } from './string-filter-menu.component';
import { InputHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';

describe('StringFilterMenuComponent', () => {
    let component: StringFilterMenuComponent;
    let fixture: ComponentFixture<StringFilterMenuComponent>;

    const getInput = async () => {
        return InputHarnessUtils.getInput({
            fixture,
            inputFilters: {
                selector: '[data-automation-id="hxp-string-filter-menu-input"]',
            },
        });
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule, NoopAnimationsModule, NoopTranslateModule, StringFilterMenuComponent],
        });

        fixture = TestBed.createComponent(StringFilterMenuComponent);
        component = fixture.componentInstance;
        component.inputValue = null;
        fixture.detectChanges();
    });

    it('should disable clear selection button when input value is null', async () => {
        let clearSelectionButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-clear-selection-button"]');
        expect(clearSelectionButton.disabled).toBe(true);

        const input = await getInput();
        await input.setValue('mockValue');

        clearSelectionButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-clear-selection-button"]');

        expect(clearSelectionButton.disabled).toBe(false);
    });

    it('should reset input value when clear button is clicked', async () => {
        const input = await getInput();
        await input.setValue('mockValue');

        const clearSelectionButton = fixture.debugElement.nativeElement.querySelector(
            '[data-automation-id="hxp-filter-menu-clear-selection-button"]'
        );
        clearSelectionButton.click();

        expect(await input.getValue()).toBe('');
    });

    it('should emit update with input value on update button click', async () => {
        jest.spyOn(component.update, 'emit');
        await getInput().then((input) => input.setValue('newMockValue'));

        const updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-update-button"]');
        updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith('newMockValue');
    });
});
