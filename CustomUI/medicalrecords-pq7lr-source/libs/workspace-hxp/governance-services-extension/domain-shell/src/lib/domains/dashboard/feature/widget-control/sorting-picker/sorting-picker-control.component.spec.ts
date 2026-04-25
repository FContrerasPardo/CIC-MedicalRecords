/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortingPickerControlComponent } from './sorting-picker-control.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { SelectHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { MatSelectHarness } from '@angular/material/select/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('SortingPickerControlComponent', () => {
    let fixture: ComponentFixture<SortingPickerControlComponent>;
    let matSelectHarness: MatSelectHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [SortingPickerControlComponent, MatFormFieldModule, MatSelectModule, MatIconTestingModule, NoopTranslateModule],
        });

        fixture = TestBed.createComponent(SortingPickerControlComponent);
        fixture.componentRef.setInput('disabled', false);
        fixture.componentRef.setInput('selected', null);
        fixture.detectChanges();

        matSelectHarness = await SelectHarnessUtils.getDropdown({ fixture });
    });

    it('should pass accessibility checks', async () => {
        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });

    it('should select option and emit event', async () => {
        await matSelectHarness.open();

        const options = await matSelectHarness.getOptions();
        await options[0].click();

        const valueText = await matSelectHarness.getValueText();
        const labelText = valueText.replace('filter_alt', '').trim();

        expect(labelText).toBe('GOVERNANCE.DASHBOARD.SORT_HIGH_TO_LOW');
    });

    it('should toggle disable state correctly', async () => {
        expect(await matSelectHarness.isDisabled()).toBe(false);

        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();

        expect(await matSelectHarness.isDisabled()).toBe(true);

        fixture.componentRef.setInput('disabled', false);
        fixture.detectChanges();

        expect(await matSelectHarness.isDisabled()).toBe(false);
    });
});
