/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { By } from '@angular/platform-browser';
import { PermissionInheritanceToggleComponent } from './permissions-inheritance-toggle.component';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';

describe('InheritanceToggleComponent', () => {
    let component: PermissionInheritanceToggleComponent;
    let fixture: ComponentFixture<PermissionInheritanceToggleComponent>;
    let loader: HarnessLoader;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MatSlideToggleModule, NoopAnimationsModule, PermissionInheritanceToggleComponent, NoopTranslateModule],
        }).compileComponents();

        fixture = TestBed.createComponent(PermissionInheritanceToggleComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
        fixture.detectChanges();
    });

    it('should display the correct label for the slide toggle', () => {
        const slideToggle = fixture.debugElement.query(By.css('.hxp-slide-toggle-inheritance'));
        const label = slideToggle.nativeElement.textContent.trim();

        expect(label).toBe('PERMISSIONS_MANAGEMENT_ACTION.BLOCK_INHERITANCE.TITLE');
    });

    it('should toggle the value and emit event on user interaction', async () => {
        jest.spyOn(component.toggleChange, 'emit');

        const slideToggleHarness = await loader.getHarness(MatSlideToggleHarness);

        expect(await slideToggleHarness.isChecked()).toBe(true);

        await slideToggleHarness.uncheck();
        fixture.detectChanges();

        expect(component.toggleChange.emit).toHaveBeenCalledWith(false);

        await slideToggleHarness.check();
        fixture.detectChanges();

        expect(component.toggleChange.emit).toHaveBeenCalledWith(true);
    });
});
