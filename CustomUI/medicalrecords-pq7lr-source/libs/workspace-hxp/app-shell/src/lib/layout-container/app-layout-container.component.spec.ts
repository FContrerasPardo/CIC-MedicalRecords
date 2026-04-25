/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { AppLayoutContainerComponent } from './app-layout-container.component';
import { ApplicationChromeComponent } from '@hxp/shared-hxp/navigation/application-chrome';
import { ShellLayoutComponent } from '@alfresco/adf-core/shell';
import { By } from '@angular/platform-browser';

describe('AppLayoutContainerComponent', () => {
    let fixture: ComponentFixture<AppLayoutContainerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AppLayoutContainerComponent, MockComponents(ShellLayoutComponent, ApplicationChromeComponent)],
        }).compileComponents();

        fixture = TestBed.createComponent(AppLayoutContainerComponent);
    });

    it('should display application chrome', () => {
        fixture.detectChanges();
        const applicationChrome = fixture.debugElement.query(By.css('[data-test-id="app-chrome"]'));

        expect(applicationChrome).toBeTruthy();
    });
});
