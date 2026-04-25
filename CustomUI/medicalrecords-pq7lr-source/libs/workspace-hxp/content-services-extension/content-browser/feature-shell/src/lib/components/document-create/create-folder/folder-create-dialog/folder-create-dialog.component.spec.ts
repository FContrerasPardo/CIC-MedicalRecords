/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxPCreateFolderDialogComponent } from './folder-create-dialog.component';
import { BrowserModule, By } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DocumentModelService, DocumentService, RouterExtService } from '@alfresco/adf-hx-content-services/services';
import { MockService } from 'ng-mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DocumentCategoryPickerComponent } from '../../../document-category-picker/document-category-picker.component';
import { DocumentLocationPickerComponent } from '../../../document-location-picker/document-location-picker.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { a11yReport, generateMockResponse, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ButtonHarnessUtils, SelectHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { mockHxcsJsClientConfigurationService, MODEL_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { ModelApi } from '@hylandsoftware/hxcs-js-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { CancelFolderDialogComponent } from '../cancel-dialog/cancel-folder-dialog.component';
import { FolderIconComponent, MimeTypeIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { FeaturesServiceToken, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('CreateFolderDialogComponent', () => {
    let fixture: ComponentFixture<HxPCreateFolderDialogComponent>;
    let component: HxPCreateFolderDialogComponent;
    const mockDocumentService = MockService(DocumentService);
    const mockRouterExtService = MockService(RouterExtService);
    const mockModelApi: ModelApi = MockService(ModelApi);
    const matDialogRefMock = { close: jest.fn() };
    const featureFlagSubject = new BehaviorSubject<boolean>(false);

    const setupTestingModule = () => {
        return async () => {
            await TestBed.configureTestingModule({
                imports: [
                    CommonModule,
                    BrowserModule,
                    FormsModule,
                    OverlayModule,
                    ReactiveFormsModule,
                    NoopAnimationsModule,
                    NoopTranslateModule,
                    FolderIconComponent,
                    MimeTypeIconComponent,
                    DocumentCategoryPickerComponent,
                    DocumentLocationPickerComponent,
                    MatDialogModule,
                    MatButtonModule,
                    MatIconTestingModule,
                    MatFormFieldModule,
                    MatInputModule,
                    HxPCreateFolderDialogComponent,
                ],
                providers: [
                    mockHxcsJsClientConfigurationService,
                    {
                        provide: DocumentService,
                        useValue: mockDocumentService,
                    },
                    { provide: MODEL_API_TOKEN, useValue: mockModelApi },
                    { provide: MatDialogRef, useValue: matDialogRefMock },
                    { provide: MAT_DIALOG_DATA, useValue: {} },
                    {
                        provide: RouterExtService,
                        useValue: mockRouterExtService,
                    },
                    DocumentModelService,
                    provideMockFeatureFlags({
                        [ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE]: false,
                    }),
                    {
                        provide: FeaturesServiceToken,
                        useValue: { isOn$: () => featureFlagSubject.asObservable(), getFlags$: () => featureFlagSubject.asObservable() },
                    },
                ],
            }).compileComponents();

            mockDocumentService.documentLoaded$ = new Subject();

            jest.spyOn(mockModelApi, 'getModel').mockReturnValue(generateMockResponse({ data: jestMocks.modelApi }));

            fixture = TestBed.createComponent(HxPCreateFolderDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        };
    };

    beforeEach(setupTestingModule());
    it('should display if feature flag enabled', () => {
        const createFolderDialog = fixture.debugElement.query(By.css('.hxp-create-folder-dialog'));
        const existingCreateDialog = fixture.debugElement.query(By.css('hxp-create-document-dialog'));

        expect(createFolderDialog).toBeTruthy();

        expect(existingCreateDialog).toBeFalsy();
    });

    it('should enable create button when all the fields have value', async () => {
        const folderName = component.createDocumentForm.controls['sys_title'];
        folderName.setValue('Test Folder');

        const location = fixture.debugElement.query(By.css('#hxp-document-location-picker-selector'));
        location.componentInstance.document = jestMocks.folderDocument;
        location.componentInstance.selectedLocation.emit(jestMocks.folderDocument);

        await SelectHarnessUtils.clickDropdownOptions({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
            optionsFilters: {
                text: 'SysFolder',
            },
        });

        fixture.detectChanges();

        expect(component.selectedLocation).toBeTruthy();

        expect(fixture.debugElement.query(By.css('#hxp-new-folder-name')).nativeElement.value).toBe('Test Folder');

        expect(component.selectedDocumentCategory).toBe('SysFolder');

        const createButton = fixture.debugElement.query(By.css('#hxp-create-folder-button'));

        expect(createButton.nativeElement.disabled).toBe(false);
    });

    it('should create a folder on `Create Folder` button click', async () => {
        const folderName = component.createDocumentForm.controls['sys_title'];
        folderName.setValue('Test Folder');

        const location = fixture.debugElement.query(By.css('#hxp-document-location-picker-selector'));
        location.componentInstance.document = jestMocks.folderDocument;
        location.componentInstance.selectedLocation.emit(jestMocks.folderDocument);

        await SelectHarnessUtils.clickDropdownOptions({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
            optionsFilters: {
                text: 'SysFolder',
            },
        });

        jest.spyOn(mockDocumentService, 'createDocument');
        fixture.detectChanges();

        const createButton = fixture.debugElement.query(By.css('#hxp-create-folder-button'));

        expect(createButton.nativeElement.disabled).toBe(false);

        await ButtonHarnessUtils.clickButton({
            fixture,
            buttonFilters: {
                selector: '#hxp-create-folder-button',
            },
        });
        const spyCreate = jest.spyOn(component, 'onCreateDocument');
        component.onCreateDocument();

        fixture.detectChanges();

        expect(spyCreate).toHaveBeenCalled();
    });

    it('should open cancel popup when cancel button clicked', async () => {
        await ButtonHarnessUtils.clickButton({
            fixture,
            buttonFilters: {
                selector: '[data-automation-id="hxp-create-folder-cancel-button"]',
            },
        });

        const dialog = TestBed.inject(MatDialog);
        const cancelDialog = dialog.openDialogs.find((d) => d.componentInstance instanceof CancelFolderDialogComponent);

        expect(cancelDialog).toBeTruthy();
    });

    it('should filter system folderish categories', async () => {
        const folderName = component.createDocumentForm.controls['sys_title'];
        folderName.setValue('Test Folder');

        const location = fixture.debugElement.query(By.css('#hxp-document-location-picker-selector'));
        location.componentInstance.document = jestMocks.folderDocument;
        location.componentInstance.selectedLocation.emit(jestMocks.folderDocument);

        const dropdown = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        await dropdown.open();
        const optionElements = await dropdown.getOptions();
        const options = await Promise.all(optionElements.map((option) => option.getText()));

        expect(options).toEqual(['SuperSpecialFolder', 'SysFolder']);
    });

    it('should filter system folderish categories excluding sysfilish mixin when feature flag is on', async () => {
        featureFlagSubject.next(true);

        const folderName = component.createDocumentForm.controls['sys_title'];
        folderName.setValue('Test Folder');

        const location = fixture.debugElement.query(By.css('#hxp-document-location-picker-selector'));
        location.componentInstance.document = jestMocks.folderDocument;
        location.componentInstance.selectedLocation.emit(jestMocks.folderDocument);

        const dropdown = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        await dropdown.open();
        const optionElements = await dropdown.getOptions();
        const options = await Promise.all(optionElements.map((option) => option.getText()));

        expect(options).toContain('SysFolder');
        expect(options).toContain('SuperSpecialFolder');

        expect(options).not.toContain('SysFile');
        expect(options).not.toContain('SpecialFile');
        expect(options).not.toContain('SuperSpecialFile');

        expect(options).not.toContain('SysOrderedFolder');
        expect(options).not.toContain('SysRenditionsContainer');
        expect(options).not.toContain('SysVocabulary');

        expect(options).toEqual(['SuperSpecialFolder', 'SysFolder']);
    });

    it('should not filter sysfilish mixin when feature flag is off', async () => {
        featureFlagSubject.next(false);

        const folderName = component.createDocumentForm.controls['sys_title'];
        folderName.setValue('Test Folder');

        const location = fixture.debugElement.query(By.css('#hxp-document-location-picker-selector'));
        location.componentInstance.document = jestMocks.folderDocument;
        location.componentInstance.selectedLocation.emit(jestMocks.folderDocument);

        const dropdown = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        await dropdown.open();
        const optionElements = await dropdown.getOptions();
        const options = await Promise.all(optionElements.map((option) => option.getText()));

        expect(options).toContain('SysFolder');
        expect(options).toContain('SuperSpecialFolder');

        expect(options).not.toContain('SysOrderedFolder');
        expect(options).not.toContain('SysRenditionsContainer');
        expect(options).not.toContain('SysVocabulary');
    });

    it('should pass accessibility checks', async () => {
        const res = await a11yReport('.hxp-create-folder-dialog');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
