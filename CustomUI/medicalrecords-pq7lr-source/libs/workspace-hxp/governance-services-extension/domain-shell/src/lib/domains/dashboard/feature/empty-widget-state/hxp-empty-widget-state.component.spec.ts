/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxpEmptyWidgetStateComponent } from './hxp-empty-widget-state.component';
import { IconHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { By } from '@angular/platform-browser';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('HxpEmptyWidgetStateComponent', () => {
    let fixture: ComponentFixture<HxpEmptyWidgetStateComponent>;
    const expectedIconName = 'governance_empty_widget';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HxpEmptyWidgetStateComponent, MatIconTestingModule],
        });

        fixture = TestBed.createComponent(HxpEmptyWidgetStateComponent);

        fixture.componentRef.setInput('message', 'Initial Test Message');
        fixture.detectChanges();
    });

    it('should pass accessibility checks', async () => {
        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });

    it('should render the message passed via signal input', () => {
        const testMessage = 'No Records to track';

        fixture.componentRef.setInput('message', testMessage);
        fixture.detectChanges();

        const messageEl = fixture.debugElement.query(By.css('.hxp-empty-text'));

        expect(messageEl).toBeTruthy();
        expect(messageEl.nativeElement.textContent.trim()).toBe(testMessage);
    });

    it('should display the correct Icon', async () => {
        const iconHarness = await IconHarnessUtils.getIcon({ fixture });

        const iconName = await iconHarness.getName();

        expect(iconName).toBe(expectedIconName);
    });
});
