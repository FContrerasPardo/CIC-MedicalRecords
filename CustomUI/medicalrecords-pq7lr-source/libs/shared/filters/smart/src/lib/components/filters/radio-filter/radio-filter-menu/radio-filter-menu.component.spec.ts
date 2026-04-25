/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { RadioFilterMenuComponent } from './radio-filter-menu.component';
import { getClearSelectionButton } from '../../../../utils/filter-testing-utils';
import { ApplicationOption } from '@alfresco-dbp/shared-filters-services';
import { By } from '@angular/platform-browser';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('RadioFilterMenuComponent', () => {
    let component: RadioFilterMenuComponent;
    let fixture: ComponentFixture<RadioFilterMenuComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, RadioFilterMenuComponent, MatIconTestingModule],
        });

        fixture = TestBed.createComponent(RadioFilterMenuComponent);
        component = fixture.componentInstance;
        component.options = [
            { value: 'mockValue', label: 'mockLabel' },
            { value: 'mockValue2', label: 'mockLabel2' },
        ];
    });

    it('should disable clear selection button when selected radio is null', async () => {
        component.selectedOption = null;
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);

        expect(await clearSelectionButton.isDisabled()).toBe(true);
    });

    it('should enable clear selection button when selected radio is not null', async () => {
        component.selectedOption = { value: 'mockValue', label: 'mockLabel' };
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);

        expect(await clearSelectionButton.isDisabled()).toBe(false);
    });

    it('should set selected option to null when clear button is clicked', async () => {
        component.selectedOption = { value: 'mockValue', label: 'mockLabel' };
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);
        await clearSelectionButton.click();

        expect(component.selectedOption).toBeNull();
    });

    it('should emit update with selectedRadio on update button click', async () => {
        jest.spyOn(component.update, 'emit');
        component.selectedOption = null;
        fixture.detectChanges();

        let updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-update-button"]');
        updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith(null);

        component.selectedOption = { value: 'mockValue', label: 'mockLabel' };
        fixture.detectChanges();

        updateButton = fixture.debugElement.nativeElement.querySelector('[data-automation-id="hxp-filter-menu-update-button"]');
        updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith({
            value: 'mockValue',
            label: 'mockLabel',
        });
    });

    describe('Status Icon Display', () => {
        it('should display cloud icons for deployed apps', () => {
            const optionsWithStatus: ApplicationOption[] = [
                { value: 'deployed-app-1', label: 'Deployed App 1', hasStatusDeployed: true },
                { value: 'deployed-app-2', label: 'Deployed App 2', hasStatusDeployed: true },
                { value: 'not-deployed-app', label: 'Not Deployed App', hasStatusDeployed: false },
            ];
            component.options = optionsWithStatus;
            fixture.detectChanges();

            const deployedIcons = fixture.debugElement.queryAll(By.css('.hxp-radio-filter-menu__deployed-icon'));

            expect(deployedIcons.length).toBe(2);
        });

        it('should not display cloud icons for non-deployed apps', () => {
            const optionsWithStatus: ApplicationOption[] = [
                { value: 'not-deployed-app-1', label: 'Not Deployed App 1', hasStatusDeployed: false },
                { value: 'not-deployed-app-2', label: 'Not Deployed App 2' },
            ];
            component.options = optionsWithStatus;
            fixture.detectChanges();

            const deployedIcons = fixture.debugElement.queryAll(By.css('.hxp-radio-filter-menu__deployed-icon'));

            expect(deployedIcons.length).toBe(0);
        });
    });
});
