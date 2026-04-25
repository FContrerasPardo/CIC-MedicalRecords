/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ButtonHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { ComponentFixture } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { By } from '@angular/platform-browser';

export const clickChip = async (fixture: ComponentFixture<any>, chipId: string): Promise<void> => {
    const filterChip = fixture.debugElement.query(By.css(`[data-automation-id="${chipId}"]`));
    const chipRow = filterChip.query(By.css('[data-automation-id="hxp-filter-chip"]'));
    chipRow.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
};

export const getClearSelectionButton = async (fixture: ComponentFixture<any>): Promise<MatButtonHarness> => {
    return ButtonHarnessUtils.getButton({
        fixture,
        buttonFilters: {
            selector: '[data-automation-id="hxp-filter-menu-clear-selection-button"]',
        },
    });
};

export const getUpdateButton = async (fixture: ComponentFixture<any>): Promise<MatButtonHarness> => {
    return ButtonHarnessUtils.getButton({
        fixture,
        buttonFilters: {
            selector: '[data-automation-id="hxp-filter-menu-update-button"]',
        },
    });
};
