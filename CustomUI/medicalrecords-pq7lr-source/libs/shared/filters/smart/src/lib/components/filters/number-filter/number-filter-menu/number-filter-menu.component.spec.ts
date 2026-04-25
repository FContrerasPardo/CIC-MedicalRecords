/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NumberFilterMenuComponent } from './number-filter-menu.component';
import { InputHarnessUtils, SelectHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { NumberFilterOperatorType } from '@alfresco-dbp/shared-filters-services';
import { MatInputHarness } from '@angular/material/input/testing';
import { MockPipe } from 'ng-mocks';
import { UnescapePipe } from './unescape.pipe';
import { getClearSelectionButton } from '../../../../utils/filter-testing-utils';
import { OPERATOR_ICON_MAP } from '../number-filter.component';

describe('NumberFilterMenuComponent', () => {
    let component: NumberFilterMenuComponent;
    let fixture: ComponentFixture<NumberFilterMenuComponent>;

    const getValue1Input = async (): Promise<MatInputHarness> => {
        return component.operator === NumberFilterOperatorType.BETWEEN
            ? InputHarnessUtils.getInput({
                  fixture,
                  inputFilters: {
                      selector: '[data-automation-id="hxp-number-filter-menu-input-from"]',
                  },
              })
            : InputHarnessUtils.getInput({
                  fixture,
                  inputFilters: {
                      selector: '[data-automation-id="hxp-number-filter-menu-input-single"]',
                  },
              });
    };

    const getValue2Input = async (): Promise<MatInputHarness> => {
        return InputHarnessUtils.getInput({
            fixture,
            inputFilters: {
                selector: '[data-automation-id="hxp-number-filter-menu-input-to"]',
            },
        });
    };

    const selectOperator = async (operatorType: NumberFilterOperatorType): Promise<void> => {
        await SelectHarnessUtils.clickDropdownOptions({
            fixture,
            dropdownFilters: {
                selector: '[data-automation-id="hxp-number-filter-menu-operator-select"]',
            },
            optionsFilters: {
                text: `FILTERS.NUMBER_FILTER.${operatorType}`,
            },
        });
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, NumberFilterMenuComponent, MockPipe(UnescapePipe)],
        });

        fixture = TestBed.createComponent(NumberFilterMenuComponent);
        component = fixture.componentInstance;
        component.operators = OPERATOR_ICON_MAP;
        component.value = {
            value1: null,
            value2: null,
            operator: 'EQUALS',
        };
        fixture.detectChanges();
    });

    it('should disable clear selection button when value1 and value2 are null', async () => {
        await getClearSelectionButton(fixture)
            .then((clearSelectionButton) => clearSelectionButton.isDisabled())
            .then((isDisabled) => {
                expect(isDisabled).toBe(true);
                return getValue1Input();
            })
            .then((input1) => input1.setValue('1'));

        const updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-clear-selection-button"]');
        updateButton.click();

        expect(updateButton.disabled).toBe(false);
    });

    it('should reset values when clear button is clicked', async () => {
        await selectOperator(NumberFilterOperatorType.BETWEEN)
            .then(() => getValue1Input())
            .then((input1) => input1.setValue('1').then(() => input1))
            .then(() => getValue2Input())
            .then((input2) => input2.setValue('2'));

        expect(component.value1).toBe(1);
        expect(component.operator).toBe(NumberFilterOperatorType.BETWEEN);
        expect(component.value2).toBe(2);

        const updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-clear-selection-button"]');
        updateButton.click();

        expect(component.value1).toBeNull();
        expect(component.operator).toBe(NumberFilterOperatorType.EQUALS);
        expect(component.value2).toBeNull();
    });

    it('should emit update on update button click', async () => {
        jest.spyOn(component.update, 'emit');
        await selectOperator(NumberFilterOperatorType.LESS_THAN)
            .then(() => getValue1Input())
            .then((input1) => input1.setValue('7'));
        expect(component.value1).toBe(7);
        expect(component.operator).toBe(NumberFilterOperatorType.LESS_THAN);

        const updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-update-button"]');
        updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith({
            value1: 7,
            operator: NumberFilterOperatorType.LESS_THAN,
            value2: null,
        });
    });
});
