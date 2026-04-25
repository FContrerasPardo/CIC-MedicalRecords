/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileViewerWidgetComponent } from './file-viewer.widget';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorWidgetComponent, FormEvent, FormFieldModel, FormModel, FormService, NoopTranslateModule, ViewerComponent } from '@alfresco/adf-core';
import { MockComponent, MockProvider } from 'ng-mocks';
import { Subject, of } from 'rxjs';
import { DOCUMENT_DOWNLOAD_DATA_MOCK, DOCUMENT_MOCK } from '../../mocks/document.mock';
import { FormWidgetService } from '../../services/form-widget/form-widget.service';
import { CommonModule } from '@angular/common';

describe('FileViewerWidgetComponent', () => {
    let component: FileViewerWidgetComponent;
    let fixture: ComponentFixture<FileViewerWidgetComponent>;
    let formService: FormService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                NoopTranslateModule,
                FileViewerWidgetComponent,
                MockComponent(ViewerComponent),
                MockComponent(ErrorWidgetComponent),
            ],
            providers: [
                MockProvider(FormService, {
                    formDataRefreshed: new Subject<FormEvent>(),
                }),
                MockProvider(FormWidgetService, {
                    getViewerContentFromField: (field: FormFieldModel) => {
                        return field?.value
                            ? of({
                                  ...DOCUMENT_DOWNLOAD_DATA_MOCK,
                                  mimeType: DOCUMENT_MOCK.sysfile_blob.mimeType,
                              })
                            : of(null);
                    },
                }),
            ],
        });

        fixture = TestBed.createComponent(FileViewerWidgetComponent);
        component = fixture.componentInstance;
        formService = fixture.debugElement.injector.get(FormService);
        fixture.componentRef.setInput(
            'field',
            new FormFieldModel(new FormModel(), {
                id: 'fakeField',
                value: null,
            })
        );
    });

    it('should update file$ when fieldChanged emits', (done) => {
        component.file$.subscribe((file) => {
            expect(file).toEqual({
                ...DOCUMENT_DOWNLOAD_DATA_MOCK,
                mimeType: DOCUMENT_MOCK.sysfile_blob.mimeType,
            });
            done();
        });
        component.field.value = DOCUMENT_MOCK;
        component.fieldChanged.emit(component.field);
    });

    it('should emit fieldChanged when form data was refreshed', (done) => {
        const linkedField = new FormFieldModel(new FormModel(), {
            id: 'linkedUploadWidget',
            value: DOCUMENT_MOCK,
        });

        fixture.componentRef.setInput(
            'field',
            new FormFieldModel(new FormModel(), {
                id: 'fakeField',
                value: null,
                params: {
                    hxpUploadWidget: 'linkedUploadWidget',
                },
            })
        );

        component.ngOnInit();

        component.fieldChanged.subscribe((formFieldModel) => {
            expect(formFieldModel).toBe(component.field);
            expect(formFieldModel.value).toEqual(DOCUMENT_MOCK);
            done();
        });

        const fakeFormEvent = new FormEvent(new FormModel());
        fakeFormEvent.form.fieldsCache = [linkedField];
        formService?.formDataRefreshed.next(fakeFormEvent);
    });

    it('should show adf-viewer only when file is loaded', () => {
        fixture.componentRef.setInput('field', { ...component.field, value: null });
        component.fieldChanged.emit(component.field);
        fixture.detectChanges();

        let adfViewer = fixture.nativeElement.querySelector('adf-viewer');
        let adfPreviewPlaceholder = fixture.nativeElement.querySelector('.adf-preview-placeholder');

        expect(adfViewer).toBeNull();
        expect(adfPreviewPlaceholder).toBeTruthy();

        fixture.componentRef.setInput('field', { ...component.field, value: DOCUMENT_MOCK });
        component.fieldChanged.emit(component.field);
        fixture.detectChanges();

        adfViewer = fixture.nativeElement.querySelector('adf-viewer');
        adfPreviewPlaceholder = fixture.nativeElement.querySelector('.adf-preview-placeholder');
        expect(adfViewer).not.toBeNull();
        expect(adfPreviewPlaceholder).toBeNull();
    });
});
