/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterChipComponent } from './filter-chip.component';
import { ChipHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('FilterChipComponent', () => {
    let component: FilterChipComponent;
    let fixture: ComponentFixture<FilterChipComponent>;

    const getChipRow = async () => {
        return ChipHarnessUtils.getChipRow({
            fixture,
            chipFilters: {
                selector: '[data-automation-id="hxp-filter-chip"]',
            },
        });
    };

    const getLabel = () => {
        return fixture.nativeElement.querySelector('[data-automation-id="hxp-filter-chip-label"]');
    };

    const getSuffix = () => {
        return fixture.nativeElement.querySelector('[data-automation-id="hxp-filter-chip-label-suffix"]');
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, FilterChipComponent, MatIconTestingModule],
        });

        fixture = TestBed.createComponent(FilterChipComponent);
        component = fixture.componentInstance;
    });

    it('should emit chipClick on chip row click', async () => {
        fixture.detectChanges();
        const spy = jest.spyOn(component.chipClick, 'emit');
        const chip = await getChipRow();
        const chipRowHost = await chip.host();

        await chipRowHost.click();

        expect(spy).toHaveBeenCalled();
    });

    it('should emit removeIconClick on remove icon click', async () => {
        fixture.detectChanges();
        const spy = jest.spyOn(component.removeIconClick, 'emit');
        const chip = await getChipRow();

        await chip.remove();

        expect(spy).toHaveBeenCalled();
    });

    it('should display only label if no suffix provided', () => {
        component.labelTranslationKey = 'test label';
        fixture.detectChanges();

        const suffix = getSuffix();
        const label = getLabel();
        const labelTextContent = (label.textContent as string).trim();

        expect(label).not.toBeNull();
        expect(labelTextContent).toBe('test label');
        expect(suffix).toBeNull();
    });

    it('should display label and colon if suffix provided', () => {
        component.labelTranslationKey = 'test label';
        component.suffix = 'suffix';
        fixture.detectChanges();

        const label = getLabel();
        const labelTextContent = (label.textContent as string).trim();

        expect(label).not.toBeNull();
        expect(labelTextContent).toBe('test label:');
    });

    it('should display suffix if provided', () => {
        component.labelTranslationKey = 'test label';
        component.suffix = 'suffix';
        fixture.detectChanges();

        const suffix = getSuffix();
        const suffixTextContent = (suffix.textContent as string).trim();

        expect(suffix).not.toBeNull();
        expect(suffixTextContent).toBe('suffix');
    });

    it('should display chip count if suffix and chipCount provided and chipCount greater than one', () => {
        component.labelTranslationKey = 'test label';
        component.suffix = 'suffix';
        component.chipCount = 2;
        fixture.detectChanges();

        const suffix = getSuffix();
        const suffixTextContent = (suffix.textContent as string).trim();

        expect(suffix).not.toBeNull();
        expect(suffixTextContent).toBe('suffix +1');
    });
});
