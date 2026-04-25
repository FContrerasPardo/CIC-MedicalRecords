/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ContentShareDialogComponent, DialogData } from './content-share-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { ContentShareService, HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ContentShareDialogComponent', () => {
    let component: ContentShareDialogComponent;
    let fixture: ComponentFixture<ContentShareDialogComponent>;
    let contentShareService: ContentShareService;
    let notificationService: HxpNotificationService;
    let clipboard: Clipboard;

    const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [{ 'button-name': 1 }];

    beforeEach(() => {
        const dialogData: DialogData = { sharedDocument: jestMocks.fileDocument };

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, ContentShareDialogComponent, MatIconTestingModule],
            providers: [Clipboard, { provide: MAT_DIALOG_DATA, useValue: dialogData }, { provide: MatDialogRef, useValue: {} }],
        });

        fixture = TestBed.createComponent(ContentShareDialogComponent);
        component = fixture.componentInstance;
        contentShareService = TestBed.inject(ContentShareService);
        notificationService = TestBed.inject(HxpNotificationService);
        clipboard = TestBed.inject(Clipboard);
        jest.spyOn(clipboard, 'copy').mockImplementation(jest.fn());
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should receive document id as dialog data', () => {
        expect(component['data'].sharedDocument).toEqual(jestMocks.fileDocument);
    });

    it('should display read-only textbox', () => {
        const textboxElement = fixture.debugElement.query(By.css('input[type="text"]'));
        expect(textboxElement).toBeTruthy();
        expect(textboxElement.nativeElement.readOnly).toBeTruthy();
    });

    it('should display the value inside textbox returned by the contentShareService', () => {
        const textboxElement = fixture.debugElement.query(By.css('input[type="text"]'));
        const result = contentShareService.getSingleContentShareLink(jestMocks.fileDocument);
        component.shareDocumentForm.patchValue({ shared_link: result });
        fixture.detectChanges();
        expect(textboxElement.nativeElement.value).toBe(result);
    });

    it('should copy the text to the clipboard when the copy button is clicked', async () => {
        const result = contentShareService.getSingleContentShareLink(jestMocks.fileDocument);
        component.shareDocumentForm.patchValue({ shared_link: result });
        fixture.detectChanges();
        fixture.nativeElement.querySelector('button[matSuffix]').click();
        fixture.detectChanges();
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(clipboard.copy).toHaveBeenCalledWith(result as string);
    });

    it('should show notification when copy button is clicked', async () => {
        jest.spyOn(notificationService, 'openSnackBar').mockImplementation(() => {});
        fixture.nativeElement.querySelector('button[matSuffix]').click();
        fixture.detectChanges();
        expect(notificationService.openSnackBar).toHaveBeenCalledTimes(1);
    });

    it('should pass accessibility checks', waitForAsync(async () => {
        const result = contentShareService.getSingleContentShareLink(jestMocks.fileDocument);
        component.shareDocumentForm.patchValue({ shared_link: result });
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    }));
});
