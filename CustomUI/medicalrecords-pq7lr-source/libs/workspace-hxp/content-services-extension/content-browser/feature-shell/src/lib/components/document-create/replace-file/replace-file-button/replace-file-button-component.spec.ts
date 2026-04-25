/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplaceFileButtonComponent } from './replace-file-button-component';
import { ReplaceFileButtonComponentActionService } from './replace-file-button-component-action.service';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ActionContext } from '@alfresco/adf-hx-content-services/services';
import { By } from '@angular/platform-browser';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

// https://hyland.atlassian.net/browse/CSX-331
const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [{ 'aria-required-parent': 1 }];

describe('ReplaceFileButtonComponent', () => {
    let component: ReplaceFileButtonComponent;
    let fixture: ComponentFixture<ReplaceFileButtonComponent>;

    const replaceFileButtonServiceSpy = { execute: jest.fn(), isAvailable: jest.fn() };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NoopTranslateModule, ReplaceFileButtonComponent, MatIconTestingModule],
            providers: [{ provide: ReplaceFileButtonComponentActionService, useValue: replaceFileButtonServiceSpy }],
        });

        fixture = TestBed.createComponent(ReplaceFileButtonComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        replaceFileButtonServiceSpy.isAvailable.mockClear();
        replaceFileButtonServiceSpy.execute.mockClear();
    });

    it('should not be visible if action is not available', () => {
        let replaceFileButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-replace-file-button"]'));

        expect(component.isAvailable).toBe(false);
        expect(replaceFileButton).toBeFalsy();

        replaceFileButtonServiceSpy.isAvailable.mockReturnValue(false);

        component.data = { documents: [jestMocks.fileDocument] } as ActionContext;
        component.ngOnChanges();
        fixture.detectChanges();

        expect(component.isAvailable).toBe(false);

        replaceFileButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-replace-file-button"]'));

        expect(replaceFileButton).toBeFalsy();
    });

    it('should be visible if action is available', () => {
        let replaceFileButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-replace-file-button"]'));

        expect(component.isAvailable).toBe(false);
        expect(replaceFileButton).toBeFalsy();

        replaceFileButtonServiceSpy.isAvailable.mockReturnValue(true);

        component.data = { documents: [jestMocks.fileDocument] } as ActionContext;
        component.ngOnChanges();
        fixture.detectChanges();

        replaceFileButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-replace-file-button"]'));

        expect(component.isAvailable).toBeTruthy();
        expect(replaceFileButton).toBeTruthy();
    });

    it('should execute replace file action when button is clicked', () => {
        expect(replaceFileButtonServiceSpy.execute).not.toHaveBeenCalled();

        replaceFileButtonServiceSpy.isAvailable.mockReturnValue(true);

        component.data = { documents: [jestMocks.fileDocument] } as ActionContext;
        component.ngOnChanges();
        fixture.detectChanges();

        const replaceFileButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-replace-file-button"]'));

        expect(replaceFileButton).toBeTruthy();

        replaceFileButton.nativeElement.click();

        expect(replaceFileButtonServiceSpy.execute).toHaveBeenCalledWith(component.data);
    });

    it('should pass accessibility checks', async () => {
        replaceFileButtonServiceSpy.isAvailable.mockReturnValue(true);

        component.data = { documents: [jestMocks.fileDocument] } as ActionContext;
        component.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport('.hxp-replace-file-button');

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
