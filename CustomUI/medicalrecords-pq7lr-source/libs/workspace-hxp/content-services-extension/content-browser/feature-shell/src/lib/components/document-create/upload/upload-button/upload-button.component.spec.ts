/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadFileButtonComponent } from './upload-button.component';
import { HxpUploadService } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { UploadDialogService } from '@hxp/workspace-hxp/content-services-extension/shared/upload/feature-shell';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

// https://hyland.atlassian.net/browse/CSX-332
const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] = [{ 'aria-required-parent': 1 }];

describe('UploadFileButtonComponent', () => {
    let component: UploadFileButtonComponent;
    let fixture: ComponentFixture<UploadFileButtonComponent>;

    const uploadDialogServiceSpy = { uploadFiles: jest.fn() };
    const uploadServiceSpy: any = { uploadFiles: jest.fn() };
    uploadServiceSpy.fileUploadError = new Subject();
    uploadServiceSpy.fileUploadSuccess = new Subject();

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UploadFileButtonComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                { provide: HxpUploadService, useValue: uploadServiceSpy },
                { provide: UploadDialogService, useValue: uploadDialogServiceSpy },
            ],
        });

        fixture = TestBed.createComponent(UploadFileButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        uploadDialogServiceSpy.uploadFiles.mockClear();
    });

    it('should hide the button when isAvailable is false', () => {
        component.isAvailable = false;
        fixture.detectChanges();

        const uploadButton = fixture.debugElement.query(By.css('.hxp-workspace-upload-button'));

        expect(uploadButton).toBeFalsy();
    });

    it('should display the button when isAvailable is true', () => {
        component.isAvailable = true;
        fixture.detectChanges();
        const uploadButton = fixture.debugElement.query(By.css('.hxp-workspace-upload-button')).nativeElement;

        expect(uploadButton).toBeTruthy();
    });

    it('should call uploadFiles method when files are added', () => {
        expect(uploadDialogServiceSpy.uploadFiles).not.toHaveBeenCalled();

        const input = fixture.debugElement.query(By.css('#upload-multiple-files'));

        expect(input).toBeTruthy();

        const event = { currentTarget: { files: [new File([''], 'test-file.txt')], value: '' }, target: { value: '' } };
        input.triggerEventHandler('change', event);
        fixture.detectChanges();

        expect(uploadDialogServiceSpy.uploadFiles).toHaveBeenCalled();
    });

    it('should pass accessibility checks', async () => {
        component.isAvailable = true;
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport('.hxp-workspace-upload-button');

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
