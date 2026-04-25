/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentUploadDialogComponent } from './upload-dialog.component';
import { Subject, of } from 'rxjs';
import { ContentUploadListComponent } from '../upload-list/upload-list.component';
import { ContentUploadPropertiesEditorComponent } from '../upload-properties-editor/upload-properties-editor.component';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import {
    DataColumnComponent,
    DataColumnListComponent,
    DataTableComponent,
    NoopTranslateModule,
    ToolbarComponent,
    UserPreferencesService,
} from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OverlayModule } from '@angular/cdk/overlay';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { CheckboxHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { DocumentModelService } from '@alfresco/adf-hx-content-services/services';
import { MockProvider, MockService } from 'ng-mocks';
import { DocumentLocationPickerComponent } from '../../../document-location-picker/document-location-picker.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FolderIconComponent, MimeTypeIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { DocumentCategoryPickerComponent } from '../../../document-category-picker/document-category-picker.component';
import { mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { generateMockUploadData, UploadDialogService } from '@hxp/workspace-hxp/content-services-extension/shared/upload/feature-shell';
import { MatIconModule } from '@angular/material/icon';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [
    { 'aria-progressbar-name': 2 },
    { 'aria-required-children': 3 },
    { 'aria-valid-attr-value': 4 },
];

describe('ContentUploadDialogComponent', () => {
    let component: ContentUploadDialogComponent;
    let fixture: ComponentFixture<ContentUploadDialogComponent>;

    const mockUploadDialogService: any = {
        addToQueue: jest.fn(),
        clearQueue: jest.fn(),
        completeQueuedUploads: jest.fn(),
        isFileUploadAborted: jest.fn(),
        isFileUploadCanceled: jest.fn(),
        isFileUploadErrored: jest.fn(),
        isUploadOngoing: jest.fn(),
        cancelUpload: jest.fn(),
    };
    const mockDocumentModelService = MockService(DocumentModelService);

    const getDialogComponents = () => {
        return {
            titleElement: fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog__title')),
            uploadListElement: fixture.debugElement.query(By.css('hxp-workspace-upload-list')),
            uploadPropertiesEditorElement: fixture.debugElement.query(By.css('hxp-workspace-upload-properties-editor')),
            closeDialogButton: fixture.debugElement.query(By.css('#hxp-workspace-upload-dialog-close')),
            submitButton: fixture.debugElement.query(By.css('#hxp-workspace-upload-dialog-upload')),
            deleteSelectionButton: fixture.debugElement.query(By.css('.hxp-workspace-upload-list__toolbar__delete_button')),
        };
    };

    const setupTestingModule = () => {
        return async () => {
            await TestBed.configureTestingModule({
                imports: [
                    CommonModule,
                    NoopAnimationsModule,
                    OverlayModule,
                    NoopTranslateModule,
                    FolderIconComponent,
                    MimeTypeIconComponent,
                    DocumentCategoryPickerComponent,
                    DocumentLocationPickerComponent,
                    MatTooltipModule,
                    MatExpansionModule,
                    MatIconModule,
                    MatIconTestingModule,
                    MatProgressBarModule,
                    FormsModule,
                    ReactiveFormsModule,
                    DataColumnComponent,
                    DataColumnListComponent,
                    DataTableComponent,
                    ToolbarComponent,
                    ContentUploadListComponent,
                    ContentUploadPropertiesEditorComponent,
                    ContentUploadDialogComponent,
                ],
                providers: [
                    mockHxcsJsClientConfigurationService,
                    MockProvider(UserPreferencesService, {
                        select: () => of('ltr') as any,
                    }),
                    {
                        provide: UploadDialogService,
                        useValue: mockUploadDialogService,
                    },
                    {
                        provide: DocumentModelService,
                        useValue: mockDocumentModelService,
                    },
                ],
            }).compileComponents();

            mockUploadDialogService.newUploads = new Subject();
            mockUploadDialogService.queueChanged = new Subject();
            mockUploadDialogService.uploadError = new Subject();
            mockUploadDialogService.uploadCanceled = new Subject();
            mockUploadDialogService.uploadCompleted = new Subject();
            mockUploadDialogService.uploadRetried = new Subject();

            mockDocumentModelService.getModel = () => of();

            fixture = TestBed.createComponent(ContentUploadDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        };
    };

    beforeEach(setupTestingModule());

    it("shouldn't allow submitting the upload if required properties are missing", () => {
        component.currentDocument = jestMocks.folderDocument;
        let dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeFalsy();

        mockUploadDialogService.newUploads.next(generateMockUploadData());
        fixture.detectChanges();

        dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeTruthy();

        const { titleElement, uploadListElement, uploadPropertiesEditorElement, closeDialogButton, submitButton } = getDialogComponents();

        expect(titleElement).toBeTruthy();
        expect(titleElement.nativeElement.textContent.trim()).toBe('FILE_UPLOAD.DIALOG.TITLE.MULTIPLE_FILES');
        expect(uploadListElement).toBeTruthy();
        expect(uploadPropertiesEditorElement).toBeTruthy();
        expect(closeDialogButton).toBeTruthy();
        expect(closeDialogButton.nativeElement.disabled).toBeFalsy();
        expect(submitButton).toBeTruthy();
        expect(submitButton.nativeElement.disabled).toBeTruthy();
    });

    it('should allow submitting the upload if required properties are set', () => {
        component.currentDocument = jestMocks.folderDocument;

        const testData = generateMockUploadData();
        let dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeFalsy();

        mockUploadDialogService.newUploads.next(testData);
        fixture.detectChanges();

        dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeTruthy();

        const { titleElement, uploadListElement, uploadPropertiesEditorElement, closeDialogButton, submitButton } = getDialogComponents();

        expect(titleElement).toBeTruthy();
        expect(titleElement.nativeElement.textContent.trim()).toBe('FILE_UPLOAD.DIALOG.TITLE.MULTIPLE_FILES');
        expect(uploadListElement).toBeTruthy();
        expect(uploadPropertiesEditorElement).toBeTruthy();
        expect(closeDialogButton).toBeTruthy();
        expect(closeDialogButton.nativeElement.disabled).toBeFalsy();
        expect(submitButton).toBeTruthy();
        expect(submitButton.nativeElement.disabled).toBeTruthy();

        testData[0].documentModel.document.sys_path = jestMocks.folderDocument.sys_path;
        testData[1].documentModel.document.sys_path = jestMocks.folderDocument.sys_path;

        component.onUploadUpdate(testData);
        fixture.detectChanges();

        expect(submitButton.nativeElement.disabled).toBeFalsy();
    });

    it('should cancel upload if deleted from the list', async () => {
        const uploadDialogService = TestBed.inject(UploadDialogService);
        component.currentDocument = jestMocks.folderDocument;
        const onUploadSelectionSpy = jest.spyOn(component, 'onUploadSelection');
        const onUploadDeleteSelectionSpy = jest.spyOn(component, 'onUploadDelete');
        let dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeFalsy();

        const testData = [...generateMockUploadData()];
        mockUploadDialogService.newUploads.next(testData);
        fixture.detectChanges();

        await fixture.whenStable();
        fixture.detectChanges();
        dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeTruthy();
        expect(uploadDialogService.cancelUpload).not.toHaveBeenCalled();
        expect(onUploadDeleteSelectionSpy).not.toHaveBeenCalled();

        onUploadSelectionSpy.mockClear();

        const checkboxList = await CheckboxHarnessUtils.getAllCheckboxes({
            fixture,
            checkboxFilters: {
                checked: false,
            },
        });

        expect(checkboxList).toHaveLength(3);
        await checkboxList[1].check();
        fixture.detectChanges();

        expect(onUploadSelectionSpy).toHaveBeenCalled();
        expect(onUploadDeleteSelectionSpy).not.toHaveBeenCalled();
        expect(uploadDialogService.cancelUpload).not.toHaveBeenCalled();

        const { deleteSelectionButton } = getDialogComponents();

        expect(deleteSelectionButton).toBeTruthy();

        deleteSelectionButton.nativeElement.click();
        fixture.detectChanges();

        expect(onUploadDeleteSelectionSpy).toHaveBeenCalled();
        expect(uploadDialogService.cancelUpload).toHaveBeenCalled();
    });

    it('should reopen dialog if new uploads are added', async () => {
        mockUploadDialogService.isUploadOngoing.mockReturnValue(true);
        component.currentDocument = jestMocks.folderDocument;

        const testData = generateMockUploadData();
        const closeDialogSpy = jest.spyOn(component, 'close');
        let dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeFalsy();

        mockUploadDialogService.newUploads.next(testData);
        fixture.detectChanges();

        component.onUploadUpdate(testData);
        fixture.detectChanges();

        dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeTruthy();

        let { closeDialogButton, submitButton } = getDialogComponents();

        expect(closeDialogButton).toBeTruthy();
        expect(closeDialogButton.nativeElement.disabled).toBeFalsy();
        expect(submitButton).toBeTruthy();
        expect(submitButton.nativeElement.disabled).toBeFalsy();

        submitButton.nativeElement.click();
        fixture.detectChanges();
        await fixture.whenStable();
        dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        ({ closeDialogButton, submitButton } = getDialogComponents());

        expect(closeDialogSpy).toHaveBeenCalled();
        expect(dialogPanel).toBeFalsy();

        mockUploadDialogService.newUploads.next(testData);
        fixture.detectChanges();
        dialogPanel = fixture.debugElement.query(By.css('.hxp-workspace-upload-dialog'));

        expect(dialogPanel).toBeTruthy();
    });

    it('should pass accessibility checks', async () => {
        component.currentDocument = jestMocks.folderDocument;
        mockUploadDialogService.newUploads.next(generateMockUploadData());
        fixture.detectChanges();

        const res = await a11yReport('.hxp-workspace-upload-dialog');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
