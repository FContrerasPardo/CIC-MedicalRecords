/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { DocumentMoveDialogComponent, MoveDialogData } from './document-move-dialog.component';
import { mockHxcsJsClientConfigurationService, ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { DocumentService, HxpNotificationService, MoveStatus } from '@alfresco/adf-hx-content-services/services';
import { of } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BreadcrumbData, BreadcrumbDataService, BreadcrumbEntryTypes } from '../../../services/breadcrumb-data.service';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('DocumentMoveDialogComponent', () => {
    const mockDialogData: MoveDialogData = {
        parentDocument: ROOT_DOCUMENT,
        documentToMove: jestMocks.fileDocument,
        shouldRefresh: true,
    };

    let fixture: ComponentFixture<DocumentMoveDialogComponent>;
    let component: DocumentMoveDialogComponent;
    let hxpNotificationService: HxpNotificationService;

    let mockDialogRef: { close: jest.Mock; afterClosed: jest.Mock };
    let mockBreadcrumbDataService: { getBreadcrumbData: jest.Mock; filterSubfolders: jest.Mock; resetPagination: jest.Mock; isLoading$: typeof of };
    let mockDocumentService: { moveDocument: jest.Mock; requestReload: jest.Mock };

    const breadcrumbData: BreadcrumbData = {
        parentFolder: jestMocks.folderDocument,
        currentFolder: jestMocks.folderDocument,
        subFolders: jestMocks.nestedDocumentAncestors,
        totalCount: 2,
    };

    const clickMoveButton = (): void => {
        const moveButtonElement = fixture.debugElement.query(By.css('button.hxp-single-file-move-button'));
        moveButtonElement.triggerEventHandler('click', null);
        fixture.detectChanges();
    };

    beforeEach(() => {
        mockDialogRef = { close: jest.fn(), afterClosed: jest.fn() };
        mockBreadcrumbDataService = { getBreadcrumbData: jest.fn(), filterSubfolders: jest.fn(), resetPagination: jest.fn(), isLoading$: of(false) };
        mockDocumentService = { moveDocument: jest.fn(), requestReload: jest.fn() };

        mockDialogRef.afterClosed.mockReturnValue(of());

        TestBed.configureTestingModule({
            imports: [
                MatSnackBarModule,
                DocumentMoveDialogComponent,
                NoopTranslateModule,
                NoopAnimationsModule,
                RouterTestingModule,
                MatIconTestingModule,
            ],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
                { provide: DocumentService, useValue: mockDocumentService },
                mockHxcsJsClientConfigurationService,
            ],
        });

        TestBed.overrideComponent(DocumentMoveDialogComponent, {
            set: { providers: [{ provide: BreadcrumbDataService, useValue: mockBreadcrumbDataService }] },
        });
        mockBreadcrumbDataService.getBreadcrumbData.mockReturnValue(of(breadcrumbData));
        mockBreadcrumbDataService.filterSubfolders.mockReturnValue(breadcrumbData);

        hxpNotificationService = TestBed.inject(HxpNotificationService);
        fixture = TestBed.createComponent(DocumentMoveDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should display search textbox', () => {
        const searchTextboxElement = fixture.debugElement.query(By.css('input[type="text"]'));
        expect(searchTextboxElement).toBeTruthy();
    });

    it('should display Move button', () => {
        const textboxElement = fixture.debugElement.query(By.css('button.hxp-single-file-move-button'));
        expect(textboxElement).toBeTruthy();
    });

    it('should receive selected file as dialog data', () => {
        const data: MoveDialogData = TestBed.inject(MAT_DIALOG_DATA);
        expect(data.documentToMove).toEqual(jestMocks.fileDocument);
    });

    it('move button is disabled when target folder is same as the move file parent folder', async () => {
        (component as any).moveDocument = jestMocks.folderDocument;
        component.onSelectedFolder({
            document: jestMocks.folderDocument,
            type: BreadcrumbEntryTypes.SELF,
        });

        fixture.detectChanges();

        await fixture.whenStable();
        fixture.detectChanges();

        const moveButton = fixture.debugElement.nativeElement.querySelector('.hxp-single-file-move-button');
        expect(moveButton.disabled).toBeTruthy();
    });

    it('move button is enabled when target folder is not same as the move file parent folder', async () => {
        component.onSelectedFolder({
            document: jestMocks.fileDocument,
            type: BreadcrumbEntryTypes.PARENT,
        });
        fixture.detectChanges();

        await fixture.whenStable();
        fixture.detectChanges();

        const moveButton = fixture.debugElement.nativeElement.querySelector('.hxp-single-file-move-button');
        expect(moveButton.disabled).toBeFalsy();
    });

    it('should perform move and update action and close dialog on successful move', () => {
        const fileId = mockDialogData.documentToMove.sys_id;
        const notificationServiceSpy = spyOn(hxpNotificationService, 'openSnackBar');
        mockDocumentService.moveDocument.mockReturnValue(of({ document: jestMocks.fileDocument, status: MoveStatus.SUCCESS }));
        component.onSelectedFolder({
            document: jestMocks.fileDocument,
            type: BreadcrumbEntryTypes.PARENT,
        });
        fixture.detectChanges();
        clickMoveButton();
        fixture.detectChanges();

        expect(mockDocumentService.moveDocument).toHaveBeenCalledWith(fileId, breadcrumbData.currentFolder.sys_id);
        expect(notificationServiceSpy).toHaveBeenCalledWith('SNACKBAR.MOVE.FILE_SUCCESS', 'done');
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should pass accessibility checks', waitForAsync(async () => {
        component.onSelectedFolder({
            document: jestMocks.fileDocument,
            type: BreadcrumbEntryTypes.PARENT,
        });
        await fixture.whenStable();
        fixture.detectChanges();

        const res = await a11yReport('.hxp-dialog-fixed-size-wrapper');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    }));
});
