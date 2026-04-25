/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DocumentCopyDialogComponent, CopyDialogData } from './document-copy-dialog.component';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { firstValueFrom, of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { DocumentService, HxpNotificationService, CopyStatus, DocumentPermissions } from '@alfresco/adf-hx-content-services/services';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopTranslateModule } from '@alfresco/adf-core';
import {
    copyApiProvider,
    queryApiProvider,
    documentApiProvider,
    ROOT_DOCUMENT,
    mockHxcsJsClientConfigurationService,
} from '@alfresco/adf-hx-content-services/api';
import { BreadcrumbDataService, BreadcrumbEntryTypes } from '../../../services/breadcrumb-data.service';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('DocumentCopyDialogComponent', () => {
    let component: DocumentCopyDialogComponent;
    let fixture: ComponentFixture<DocumentCopyDialogComponent>;
    let hxpNotificationService: HxpNotificationService;
    let notificationServiceSpy: any;

    let mockDialogRef: { close: jest.Mock; afterClosed: jest.Mock };
    let mockDocumentService: { requestReload: jest.Mock; copyDocument: jest.Mock; updateDocument: jest.Mock };
    let mockBreadcrumbDataService: { getBreadcrumbData: jest.Mock; filterSubfolders: jest.Mock; resetPagination: jest.Mock; isLoading$: typeof of };

    const dialogData: CopyDialogData = {
        parentDocument: ROOT_DOCUMENT,
        documentToCopy: jestMocks.fileDocument,
    };
    const breadcrumbData = {
        currentFolder: jestMocks.fileDocument,
        subFolders: jestMocks.nestedDocumentAncestors,
        totalCount: 2,
    };

    beforeEach(() => {
        mockDialogRef = { close: jest.fn(), afterClosed: jest.fn() };
        mockDocumentService = { requestReload: jest.fn(), copyDocument: jest.fn(), updateDocument: jest.fn() };
        mockBreadcrumbDataService = { getBreadcrumbData: jest.fn(), filterSubfolders: jest.fn(), resetPagination: jest.fn(), isLoading$: of(false) };

        mockDialogRef.afterClosed.mockReturnValue(of());

        TestBed.configureTestingModule({
            imports: [MatSnackBarModule, NoopAnimationsModule, NoopTranslateModule, DocumentCopyDialogComponent, MatIconTestingModule],
            providers: [
                mockHxcsJsClientConfigurationService,
                copyApiProvider,
                documentApiProvider,
                queryApiProvider,
                { provide: DocumentService, useValue: mockDocumentService },
                FormBuilder,
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
                { provide: MatDialogRef, useValue: mockDialogRef },
            ],
        });

        TestBed.overrideComponent(DocumentCopyDialogComponent, {
            set: { providers: [{ provide: BreadcrumbDataService, useValue: mockBreadcrumbDataService }] },
        });
        fixture = TestBed.createComponent(DocumentCopyDialogComponent);
        component = fixture.componentInstance;

        mockBreadcrumbDataService.getBreadcrumbData.mockReturnValue(of(breadcrumbData));
        mockBreadcrumbDataService.filterSubfolders.mockReturnValue(breadcrumbData);

        hxpNotificationService = TestBed.inject(HxpNotificationService);
        notificationServiceSpy = spyOn(hxpNotificationService, 'openSnackBar');
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    const clickCopyButton = (): void => {
        const copyButtonElement = fixture.debugElement.query(By.css('button.hxp-single-file-copy-btn'));
        copyButtonElement.triggerEventHandler('click', null);
        fixture.detectChanges();
    };

    it('should display search textbox', () => {
        const searchTextboxElement = fixture.debugElement.query(By.css("input[type='text']"));
        expect(searchTextboxElement).toBeTruthy();
    });

    it('should display cancel button', () => {
        const cancelButtonElement = fixture.debugElement.query(By.css('[data-automation-id="hxp-copy-dialog-cancel-button"]'));
        expect(cancelButtonElement).toBeTruthy();
    });

    it('should display copy button', () => {
        const copyButtonElement = fixture.debugElement.query(By.css('.hxp-single-file-copy-btn'));
        expect(copyButtonElement).toBeTruthy();
    });

    it('should receive selected document as dialog data', () => {
        const data = TestBed.inject(MAT_DIALOG_DATA);
        expect(data.documentToCopy).toEqual(jestMocks.fileDocument);
    });

    it('should fetch/update and filter breadcrumb data when a folder is selected', async () => {
        const folder = jestMocks.folderDocument;
        const mockSubFolders = jestMocks.nestedDocumentAncestors;

        mockBreadcrumbDataService.getBreadcrumbData.mockReturnValue(
            of({
                parentFolder: ROOT_DOCUMENT,
                currentFolder: folder,
                subFolders: mockSubFolders,
            })
        );

        component.onSelectedFolder({
            document: folder,
            type: BreadcrumbEntryTypes.SELF,
        });

        const data = await firstValueFrom(component.breadcrumbData$);

        expect(mockBreadcrumbDataService.getBreadcrumbData).toHaveBeenCalledWith({
            document: folder,
            type: BreadcrumbEntryTypes.SELF,
        });

        const EXPECTED_SUBFOLDER_COUNT = 2;
        expect(data?.subFolders.length).toBe(EXPECTED_SUBFOLDER_COUNT);
        expect(data?.subFolders.some((sf) => sf.sys_id === dialogData.documentToCopy.sys_id)).toBe(false);
    });

    it('should perform copy and update action and close dialog on successful copy', fakeAsync(() => {
        const fileId = dialogData.documentToCopy.sys_id;
        const fileName = dialogData.documentToCopy.sys_name;

        component.onSelectedFolder({
            document: jestMocks.fileDocument,
            type: BreadcrumbEntryTypes.PARENT,
        });
        fixture.detectChanges();
        mockDocumentService.copyDocument.mockReturnValue(of({ document: jestMocks.fileDocument, status: CopyStatus.SUCCESS }));
        mockDocumentService.updateDocument.mockReturnValue(of(jestMocks.fileDocument));

        clickCopyButton();
        fixture.detectChanges();

        expect(mockDocumentService.copyDocument).toHaveBeenCalledWith(
            fileId,
            `COPY.DIALOG.FILE_NAME_PREFIX ${fileName}`,
            breadcrumbData.currentFolder.sys_id
        );
        expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(fileId, { sys_title: `COPY.DIALOG.FILE_NAME_PREFIX ${fileName}` });
        expect(notificationServiceSpy).toHaveBeenCalledWith('SNACKBAR.COPY.FILE_SUCCESS', 'done');
        expect(mockDialogRef.close).toHaveBeenCalled();
    }));

    it('should display error notification message when copy fails', () => {
        component.onSelectedFolder({
            document: jestMocks.fileDocument,
            type: BreadcrumbEntryTypes.PARENT,
        });
        fixture.detectChanges();

        mockDocumentService.copyDocument.mockReturnValue(of(CopyStatus.ERROR));
        clickCopyButton();
        fixture.detectChanges();

        expect(notificationServiceSpy).toHaveBeenCalledWith('SNACKBAR.COPY.FILE_ERROR', 'error');
    });

    it('should disable copy button if user has no "Add Children" permission on selected folder', async () => {
        component.onSelectedFolder({
            document: {
                ...jestMocks.folderDocument,
                sys_effectivePermissions: [DocumentPermissions.CREATE_CHILD],
            },
            type: BreadcrumbEntryTypes.PARENT,
        });

        await fixture.whenStable();
        fixture.detectChanges();

        const copyButtonElement = fixture.debugElement.query(By.css('.hxp-single-file-copy-btn'));
        expect(copyButtonElement).toBeTruthy();
        expect(copyButtonElement.nativeElement.disabled).toBeFalsy();

        mockBreadcrumbDataService.getBreadcrumbData.mockReturnValue(
            of({
                parentFolder: ROOT_DOCUMENT,
                currentFolder: {
                    ...jestMocks.folderDocument,
                    sys_effectivePermissions: [],
                },
                subFolders: [],
            })
        );

        component.onSelectedFolder({
            document: {
                ...jestMocks.folderDocument,
                sys_effectivePermissions: [],
            },
            type: BreadcrumbEntryTypes.PARENT,
        });

        await fixture.whenStable();
        fixture.detectChanges();

        expect(copyButtonElement.nativeElement.disabled).toBeTruthy();
    });

    it('should pass accessibility checks', waitForAsync(async () => {
        component.onSelectedFolder({
            document: {
                ...jestMocks.folderDocument,
                sys_effectivePermissions: [DocumentPermissions.CREATE_CHILD],
            },
            type: BreadcrumbEntryTypes.PARENT,
        });
        await fixture.whenStable();
        fixture.detectChanges();

        const res = await a11yReport('.hxp-dialog-fixed-size-wrapper');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    }));
});
