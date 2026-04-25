/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    ContentLinkModel,
    ErrorWidgetComponent,
    FormFieldModel,
    FormModel,
    FormService,
    JwtHelperService,
    NoopTranslateModule,
    ThumbnailService,
    ViewerComponent,
    ViewUtilService,
} from '@alfresco/adf-core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MockComponents, MockProvider } from 'ng-mocks';
import { Subject, firstValueFrom, of } from 'rxjs';
import { DOCUMENT_MOCK, DOCUMENT_WITH_NO_BLOB_MOCK } from '../../mocks/document.mock';
import { FormWidgetService } from '../../services/form-widget/form-widget.service';
import { AttachedFileViewModel, AttachFileWidgetComponent } from './attach-file.widget';
import {
    SharedAttachFileDialogService,
    SharedDownloadService,
    PermissionEnum,
    FormSubmitterIdValue,
    PendingDocumentCleanupService,
    PendingDocument,
    PENDING_DOCUMENT_SERVICE,
} from '@hxp/shared-hxp/services';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TableSkeletonLoaderComponent } from '@alfresco/adf-hx-content-services/ui';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { ButtonHarnessUtils, MenuHarnessUtils, TableHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { BlobDownloadService, DOCUMENT_SERVICE, RenditionsService } from '@alfresco/adf-hx-content-services/services';
import { mockedForm } from '../../mocks/form.mock';
import { FileSourceServiceId } from './models/file-source-service-id';
import { TranslatePipe } from '@ngx-translate/core';
import { STUDIO_SHARED } from '@features';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';

describe('AttachFileWidgetComponent', () => {
    let component: AttachFileWidgetComponent;
    let fixture: ComponentFixture<AttachFileWidgetComponent>;
    let openAttachFileDialogSpy: jasmine.Spy;
    let getValueFromLocalIdTokenSpy: jasmine.Spy;

    const setupTestBed = (isPendingDocFFEnabled = false): void => {
        getValueFromLocalIdTokenSpy = jasmine.createSpy('getValueFromLocalIdToken').and.returnValue('test-user-id');
        TestBed.configureTestingModule({
            imports: [
                TranslatePipe,
                CommonModule,
                MatIconTestingModule,
                MatTooltipModule,
                MatTableModule,
                MatMenuModule,
                MatButtonModule,
                MatProgressBarModule,
                TableSkeletonLoaderComponent,
                NoopAnimationsModule,
                NoopTranslateModule,
                AttachFileWidgetComponent,
                ...MockComponents(ErrorWidgetComponent, ViewerComponent),
            ],
            providers: [
                MockProvider(FormService, {
                    formContentClicked: new Subject<ContentLinkModel>(),
                    formEvents: new Subject(),
                    formRulesEvent: new Subject(),
                }),
                MockProvider(ThumbnailService, {
                    getMimeTypeIcon: () => '',
                }),
                MockProvider(SharedDownloadService),
                MockProvider(SharedAttachFileDialogService, {
                    openDialog: () => {},
                    closeDialog: () => {},
                    downloadDocuments: () => {},
                }),
                MockProvider(DOCUMENT_SERVICE, {
                    getDocumentById: (documentId: string) => {
                        return documentId === DOCUMENT_MOCK.sys_id
                            ? of({ ...DOCUMENT_MOCK, sys_id: documentId })
                            : of({
                                  ...DOCUMENT_WITH_NO_BLOB_MOCK,
                                  sys_id: documentId,
                              });
                    },
                    getDocumentByPath: (path: string) => {
                        return path === DOCUMENT_MOCK.sys_path ? of(DOCUMENT_MOCK) : of(DOCUMENT_WITH_NO_BLOB_MOCK);
                    },
                }),
                FormWidgetService,
                provideMockFeatureFlags({
                    [STUDIO_SHARED.FORMS_DEFERRED_DOC_CREATION]: isPendingDocFFEnabled,
                }),
                MockProvider(ViewUtilService),
                MockProvider(BlobDownloadService),
                MockProvider(RenditionsService),
                MockProvider(JwtHelperService, {
                    getValueFromLocalIdToken: getValueFromLocalIdTokenSpy,
                } as Partial<JwtHelperService>),
                MockProvider(PendingDocumentCleanupService, {
                    track: () => {},
                    untrackAndDelete: () => Promise.resolve(),
                    clearTracking: () => {},
                    cleanupUnpersisted: () => Promise.resolve(),
                }),
                {
                    provide: PENDING_DOCUMENT_SERVICE,
                    useValue: {
                        restorePermissions: () => Promise.resolve(DOCUMENT_MOCK),
                        deleteDocument: () => Promise.resolve(),
                    },
                },
            ],
        });

        fixture = TestBed.createComponent(AttachFileWidgetComponent);
        openAttachFileDialogSpy = spyOn(TestBed.inject(SharedAttachFileDialogService), 'openDialog');
        component = fixture.componentInstance;
        component.field = new FormFieldModel(new FormModel(), {
            id: 'fakeField',
            value: null,
            params: {
                multiple: true,
                menuOptions: { show: true, download: true, remove: true },
            },
        });

        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
        setupTestBed(true);
    });

        async function setFiles(value: any) {
            component.field.value = value;
            component.fieldChanged.emit(component.field);
            await fixture.whenStable();
            fixture.detectChanges();
        }

        describe('loading state', () => {
            it('should set isLoading to false after initial files load', async () => {
                await fixture.whenStable();
                expect(component.isLoading()).toBe(false);
            });

            it('should set isLoading back to false after fieldChanged triggers a reload', async () => {
                component.field.value = [DOCUMENT_MOCK];
                component.fieldChanged.emit(component.field);
                await fixture.whenStable();
                fixture.detectChanges();

                expect(component.isLoading()).toBe(false);
                expect(component.hasAttachedFiles()).toBe(true);
            });

            it('should show skeleton loader while loading', () => {
                component.isLoading.set(true);
                fixture.detectChanges();

                const skeleton = fixture.nativeElement.querySelector('hxp-table-skeleton-loader');
                expect(skeleton).not.toBeNull();
            });

            it('should hide skeleton loader after loading completes', async () => {
                await fixture.whenStable();
                fixture.detectChanges();

                const skeleton = fixture.nativeElement.querySelector('hxp-table-skeleton-loader');
                expect(skeleton).toBeNull();
            });

            it('should not show NO_FILE_ATTACHED message while loading in readOnly mode', () => {
                component.field.readOnly = true;
                component.isLoading.set(true);
                fixture.detectChanges();

                const emptyMessage = fixture.nativeElement.querySelector(`[id="adf-attach-empty-list-${component.field.id}"]`);
                expect(emptyMessage).toBeNull();
            });

            it('should show NO_FILE_ATTACHED message after loading completes with no files in readOnly mode', async () => {
                component.field.readOnly = true;
                await fixture.whenStable();
                fixture.detectChanges();

                const emptyMessage = fixture.nativeElement.querySelector(`[id="adf-attach-empty-list-${component.field.id}"]`);
                expect(emptyMessage).not.toBeNull();
            });

            it('should hide file table while loading even if files were previously loaded', async () => {
                await setFiles([DOCUMENT_MOCK]);

                const tableBefore = fixture.nativeElement.querySelector(`[id="table-${component.field.id}"]`);
                expect(tableBefore).not.toBeNull();

                component.isLoading.set(true);
                fixture.detectChanges();

                const tableWhileLoading = fixture.nativeElement.querySelector(`[id="table-${component.field.id}"]`);
                expect(tableWhileLoading).toBeNull();
            });
        });

        it('should not show attach button if the field is readonly', async () => {
            component.field.readOnly = true;
            fixture.detectChanges();

            const allButtons = await ButtonHarnessUtils.getAllButtons({
                fixture,
                buttonFilters: { selector: '[id="fakeField"]' },
            });

            expect(allButtons.length).toBe(0);
        });

        it('should show attach button if the field is not readonly', async () => {
            component.field.readOnly = false;
            fixture.detectChanges();

            const attachButton = await ButtonHarnessUtils.getButton({
                fixture,
                buttonFilters: { selector: '[id="fakeField"]' },
            });

            expect(attachButton).not.toBeNull();
        });

        it('should enable attach button if multiple is true and any amount of files have been attached', async () => {
            let attachButton = await ButtonHarnessUtils.getButton({
                fixture,
                buttonFilters: { selector: '[id="fakeField"]' },
            });

            expect(await attachButton.isDisabled()).toBeFalsy();

            await setFiles([DOCUMENT_MOCK, DOCUMENT_MOCK]);
            attachButton = await ButtonHarnessUtils.getButton({
                fixture,
                buttonFilters: { selector: '[id="fakeField"]' },
            });

            expect(await attachButton.isDisabled()).toBeFalsy();
        });

        it('should disable attach button if multiple is false and a file has been attached', async () => {
            component.field.params.multiple = false;
            fixture.detectChanges();

            let attachButton = await ButtonHarnessUtils.getButton({
                fixture,
                buttonFilters: { selector: '[id="fakeField"]' },
            });

            expect(await attachButton.isDisabled()).toBeFalsy();

            await setFiles([DOCUMENT_MOCK]);

            attachButton = await ButtonHarnessUtils.getButton({
                fixture,
                buttonFilters: { selector: '[id="fakeField"]' },
            });

            expect(await attachButton.isDisabled()).toBeTruthy();
        });

        it('should not show file table if there are no files attached', async () => {
            const allTables = await TableHarnessUtils.getAllTables({
                fixture,
                tableFilters: {
                    selector: '[id="table-fakeField"]',
                },
            });

            expect(allTables.length).toBe(0);
        });

        it('should show file table if there are files attached', async () => {
            await setFiles([DOCUMENT_MOCK]);

            const table = await TableHarnessUtils.getTable({
                fixture,
                tableFilters: {
                    selector: '[id="table-fakeField"]',
                },
            });

            expect(table).not.toBeNull();
        });

        it('should show file table with the correct number of rows', async () => {
            await setFiles([DOCUMENT_MOCK, DOCUMENT_MOCK]);

            const table = await TableHarnessUtils.getTable({
                fixture,
                tableFilters: {
                    selector: '[id="table-fakeField"]',
                },
            });
            const rows = await table.getRows();

            expect(rows.length).toBe(2);
        });

        it('should show correct title in title column', async () => {
            await setFiles([DOCUMENT_MOCK, DOCUMENT_WITH_NO_BLOB_MOCK]);

            const table = await TableHarnessUtils.getTable({
                fixture,
                tableFilters: {
                    selector: '[id="table-fakeField"]',
                },
            });
            const titles = await table.getCellTextByColumnName();

            expect(titles['title'].text).toEqual([DOCUMENT_MOCK.sysfile_blob.title, DOCUMENT_WITH_NO_BLOB_MOCK.sys_title]);
        });

        it('should show correct name in name column', async () => {
            await setFiles([DOCUMENT_MOCK, DOCUMENT_WITH_NO_BLOB_MOCK]);

            const table = await TableHarnessUtils.getTable({
                fixture,
                tableFilters: {
                    selector: '[id="table-fakeField"]',
                },
            });
            const names = await table.getCellTextByColumnName();

            expect(names['name'].text).toEqual([DOCUMENT_MOCK.sysfile_blob.filename, DOCUMENT_WITH_NO_BLOB_MOCK.sys_name]);
        });

        it('should show actions menu button in actions column if at least one menu option is enabled', async () => {
            await setFiles([DOCUMENT_MOCK]);

            const actionsMenuButton = await ButtonHarnessUtils.getButton({
                fixture,
                buttonFilters: {
                    selector: `[id="file-${DOCUMENT_MOCK.sys_id}-option-menu"]`,
                },
            });

            expect(actionsMenuButton).not.toBeNull();
        });

        it('should not show actions menu button in actions column if no menu option is enabled', async () => {
            await setFiles([DOCUMENT_MOCK]);
            component.field.params.menuOptions = {
                show: false,
                download: false,
                remove: false,
            };
            fixture.detectChanges();

            const allButtons = await ButtonHarnessUtils.getAllButtons({
                fixture,
                buttonFilters: {
                    selector: `[id="file-${DOCUMENT_MOCK.sys_id}-option-menu"]`,
                },
            });

            expect(allButtons.length).toBe(0);
        });

        it('should show remove option if remove is enabled and field is not readOnly', async () => {
            await setFiles([DOCUMENT_MOCK]);
            component.field.params.menuOptions = {
                show: true,
                download: true,
                remove: true,
            };
            component.field.readOnly = false;
            fixture.detectChanges();

            const menu = await MenuHarnessUtils.getMenu({
                fixture,
                menuFilters: {
                    selector: `[id="file-${DOCUMENT_MOCK.sys_id}-option-menu"]`,
                },
            });
            await menu.open();
            const items = await menu.getItems();

            expect(items.length).toBe(3);
            expect(await items[0].getText()).toContain('FORM.FIELD.VIEW_FILE');
            expect(await items[1].getText()).toContain('FORM.FIELD.DOWNLOAD_FILE');
            expect(await items[2].getText()).toContain('FORM.FIELD.REMOVE_FILE');
        });

        it('should not show remove option if remove is enabled and field is readOnly', async () => {
            await setFiles([DOCUMENT_MOCK]);
            component.field.params.menuOptions = {
                show: true,
                download: true,
                remove: true,
            };
            component.field.readOnly = true;
            fixture.detectChanges();

            const menu = await MenuHarnessUtils.getMenu({
                fixture,
                menuFilters: {
                    selector: `[id="file-${DOCUMENT_MOCK.sys_id}-option-menu"]`,
                },
            });
            await menu.open();
            const items = await menu.getItems();

            expect(items.length).toBe(2);
            expect(await items[0].getText()).toContain('FORM.FIELD.VIEW_FILE');
            expect(await items[1].getText()).toContain('FORM.FIELD.DOWNLOAD_FILE');
        });

        it('should untrack and delete a pending document from cleanup service when removed', async () => {
            const pendingDoc: PendingDocument = {
                document: DOCUMENT_MOCK,
                originalPermissions: [],
                pendingBy: 'user-123', persisted: false,
            };
            await setFiles([pendingDoc]);

            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const documentOps = TestBed.inject(PENDING_DOCUMENT_SERVICE);
            const deleteSpy = spyOn(cleanupService, 'untrackAndDelete').and.returnValue(Promise.resolve());

            component.onRemoveOptionClicked({
                id: DOCUMENT_MOCK.sys_id as string,
                title: DOCUMENT_MOCK.sys_title as string,
                fileName: DOCUMENT_MOCK.sys_name as string,
                icon: '',
                isPending: true,
                isBlobMissing: false,
                source: pendingDoc,
            });

            expect(deleteSpy).toHaveBeenCalledWith(DOCUMENT_MOCK.sys_id as string, documentOps);
            expect(component.field.value.length).toBe(0);
        });

        it('should call cleanupUnpersisted when component is destroyed with pending doc feature enabled', () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const cleanupSpy = spyOn(cleanupService, 'cleanupUnpersisted').and.returnValue(Promise.resolve());

            fixture.destroy();

            const documentOps = TestBed.inject(PENDING_DOCUMENT_SERVICE);
            expect(cleanupSpy).toHaveBeenCalledWith(documentOps);
        });

        it('should not call untrackAndDelete when removing a plain document', async () => {
            await setFiles([DOCUMENT_MOCK]);

            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const deleteSpy = spyOn(cleanupService, 'untrackAndDelete');

            component.onRemoveOptionClicked({
                id: DOCUMENT_MOCK.sys_id as string,
                title: DOCUMENT_MOCK.sys_title as string,
                fileName: DOCUMENT_MOCK.sys_name as string,
                icon: '',
                isPending: false,
                isBlobMissing: false,
                source: DOCUMENT_MOCK,
            });

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(component.field.value.length).toBe(0);
        });

        describe('mapToViewModel', () => {
            it('should map a plain Document to a view model with isPending false', async () => {
                await setFiles([DOCUMENT_MOCK]);

                const files = component.attachedFiles();

                expect(files[0].id).toBe(DOCUMENT_MOCK.sys_id as string);
                expect(files[0].title).toBe(DOCUMENT_MOCK.sysfile_blob.title);
                expect(files[0].fileName).toBe(DOCUMENT_MOCK.sysfile_blob.filename);
                expect(files[0].isPending).toBe(false);
                expect(files[0].isBlobMissing).toBe(false);
            });

            it('should map a PendingDocument to a view model with isPending true', async () => {
                const pendingDoc: PendingDocument = {
                    document: DOCUMENT_MOCK,
                    originalPermissions: [],
                    pendingBy: 'user-123',
                    persisted: false,
                };

                await setFiles([pendingDoc]);

                const files = component.attachedFiles();

                expect(files[0].id).toBe(DOCUMENT_MOCK.sys_id as string);
                expect(files[0].isPending).toBe(true);
                expect(files[0].source).toBe(pendingDoc);
            });

            it('should set isBlobMissing true and use fallback title and fileName for a Document without a blob', async () => {
                await setFiles([DOCUMENT_WITH_NO_BLOB_MOCK]);

                const files = component.attachedFiles();

                expect(files[0].isBlobMissing).toBe(true);
                expect(files[0].title).toBe(DOCUMENT_WITH_NO_BLOB_MOCK.sys_title as string);
                expect(files[0].fileName).toBe(DOCUMENT_WITH_NO_BLOB_MOCK.sys_name as string);
            });
        });

        const buildFileVm = (
            overrides: Partial<AttachedFileViewModel> = {}
        ): AttachedFileViewModel => ({
            id: DOCUMENT_MOCK.sys_id as string,
            title: '',
            fileName: '',
            icon: '',
            isPending: false,
            isBlobMissing: false,
            source: DOCUMENT_MOCK,
            ...overrides,
        });

        describe('selectedId', () => {
            it('should be null when no file has been clicked', () => {
                expect(component.selectedId()).toBeNull();
            });

            it('should equal the id of the last clicked file', () => {
                component.field.value = [DOCUMENT_MOCK];
                component.onRowClicked(buildFileVm());

                expect(component.selectedId()).toBe(DOCUMENT_MOCK.sys_id as string);
            });

            it('should not equal the id of a file that has not been clicked', () => {
                component.field.value = [DOCUMENT_MOCK];
                component.onRowClicked(buildFileVm());

                expect(component.selectedId()).not.toBe('other-id');
            });

            it('should equal the inner document id of a clicked pending document row', () => {
                const pendingDoc: PendingDocument = {
                    document: DOCUMENT_MOCK,
                    originalPermissions: [],
                    pendingBy: 'user-123',
                    persisted: false,
                };
                component.field.value = [pendingDoc];
                component.onRowClicked(buildFileVm({ isPending: true, source: pendingDoc }));

                expect(component.selectedId()).toBe(DOCUMENT_MOCK.sys_id as string);
            });
        });

        describe('onViewOptionClicked', () => {
            it('should call getViewerContentFromDocument with the Document when isPending is false', () => {
                const formWidgetService = TestBed.inject(FormWidgetService);
                const viewerSpy = spyOn(formWidgetService, 'getViewerContentFromDocument').and.returnValue(of(null));

                component.onViewOptionClicked(buildFileVm());

                expect(viewerSpy).toHaveBeenCalledWith(DOCUMENT_MOCK);
            });

            it('should call getViewerContentFromDocument with the inner document when isPending is true', () => {
                const pendingDoc: PendingDocument = {
                    document: DOCUMENT_MOCK,
                    originalPermissions: [],
                    pendingBy: 'user-123',
                    persisted: false,
                };
                const formWidgetService = TestBed.inject(FormWidgetService);
                const viewerSpy = spyOn(formWidgetService, 'getViewerContentFromDocument').and.returnValue(of(null));

                component.onViewOptionClicked(
                    buildFileVm({ isPending: true, source: pendingDoc })
                );

                expect(viewerSpy).toHaveBeenCalledWith(DOCUMENT_MOCK);
            });
        });

        it('should sync field value to form values after removing a file', () => {
            component.field.value = [DOCUMENT_MOCK];
            component.field.form.values = { [component.field.id]: [DOCUMENT_MOCK] };

            component.onRemoveOptionClicked({
                id: DOCUMENT_MOCK.sys_id as string,
                title: DOCUMENT_MOCK.sys_title as string,
                fileName: DOCUMENT_MOCK.sys_name as string,
                icon: '',
                isPending: false,
                isBlobMissing: false,
                source: DOCUMENT_MOCK,
            });

            expect(component.field.form.values[component.field.id]).toEqual([]);
        });

        it('should sync field value to form values after selecting files', () => {
            component.field.value = null;
            component.field.form.values = {};
            const selectionSubject$ = new Subject<(Document | PendingDocument)[]>();
            spyOn(component as unknown as { openUploadFileDialog: () => Subject<(Document | PendingDocument)[]> }, 'openUploadFileDialog').and.returnValue(selectionSubject$);

            component.openSelectDialog();
            selectionSubject$.next([DOCUMENT_MOCK]);

            expect(component.field.form.values[component.field.id]).toEqual([DOCUMENT_MOCK]);
        });

        it('should set the selected files when the current field value is null', () => {
            setFiles(null);
            const selectionSubject$ = new Subject<Document[]>();
            spyOn(component as unknown as { openUploadFileDialog: () => Subject<Document[]> }, 'openUploadFileDialog').and.returnValue(selectionSubject$);
            spyOn(component.fieldChanged, 'emit');

            component.openSelectDialog();

            selectionSubject$.next([DOCUMENT_MOCK]);

            expect(component.field.value).toEqual([DOCUMENT_MOCK]);
        });

        it('should set the selected files when the current field value is undefined', () => {
            setFiles(undefined);
            const selectionSubject$ = new Subject<Document[]>();
            spyOn(component as unknown as { openUploadFileDialog: () => Subject<Document[]> }, 'openUploadFileDialog').and.returnValue(selectionSubject$);
            spyOn(component.fieldChanged, 'emit');

            component.openSelectDialog();

            selectionSubject$.next([DOCUMENT_MOCK]);

            expect(component.field.value).toEqual([DOCUMENT_MOCK]);
        });

        it('should set the selected files when the current field value is not an array', () => {
            setFiles({});
            const selectionSubject$ = new Subject<Document[]>();
            spyOn(component as unknown as { openUploadFileDialog: () => Subject<Document[]> }, 'openUploadFileDialog').and.returnValue(selectionSubject$);
            spyOn(component.fieldChanged, 'emit');

            component.openSelectDialog();

            selectionSubject$.next([DOCUMENT_MOCK]);

            expect(component.field.value).toEqual([DOCUMENT_MOCK]);
        });

        it('should set the selected files without duplication the current field value is an empty array', () => {
            setFiles([]);
            const selectionSubject$ = new Subject<Document[]>();
            spyOn(component as unknown as { openUploadFileDialog: () => Subject<Document[]> }, 'openUploadFileDialog').and.returnValue(selectionSubject$);
            spyOn(component.fieldChanged, 'emit');

            component.openSelectDialog();

            selectionSubject$.next([DOCUMENT_MOCK]);

            expect(component.field.value).toEqual([DOCUMENT_MOCK]);
        });

        it('should not duplicate the files when selecting an already selected file', () => {
            setFiles([DOCUMENT_MOCK]);
            const selectionSubject$ = new Subject<Document[]>();
            spyOn(component as unknown as { openUploadFileDialog: () => Subject<Document[]> }, 'openUploadFileDialog').and.returnValue(selectionSubject$);
            spyOn(component.fieldChanged, 'emit');

            component.openSelectDialog();

            selectionSubject$.next([DOCUMENT_MOCK, DOCUMENT_MOCK]);

            expect(component.field.value).toEqual([DOCUMENT_MOCK]);
        });

        describe('default folder', () => {
            const path = DOCUMENT_MOCK.sys_path as string;
            const stringVariable = 'stringVar';
            const contentVariableById = 'contentVarById';
            const contentVariableByPath = 'contentVarByPath';
            const fieldForm = {
                ...mockedForm.formRepresentation.formDefinition,
                processVariables: [
                    {
                        id: '3e6894c4-49c2-4b51-bc7d-34dec0cbef53',
                        name: 'variables.contentVarById',
                        type: 'content',
                        model: {
                            $ref: '#/$defs/primitive/content',
                        },
                        value: {
                            uri: `hxpr:/${DOCUMENT_MOCK.sys_id}`,
                        },
                    },
                    {
                        id: 'fd079c5c-e502-4484-9250-c8bd51bf9365',
                        name: 'variables.contentVarByPath',
                        type: 'content',
                        model: {
                            $ref: '#/$defs/primitive/content',
                        },
                        value: {
                            uri: `hxpr:/path${DOCUMENT_MOCK.sys_path}`,
                        },
                    },
                ],
            };

            async function checkDefaultFolder() {
                component.openSelectDialog();

                const receivedPath = await firstValueFrom(openAttachFileDialogSpy.calls.first().args[0].defaultDocumentPath$);

                expect(receivedPath).toEqual(path);
            }

            function setFieldParam(type: string, value: string, serviceId: FileSourceServiceId = FileSourceServiceId.ALL_FILE_SOURCES) {
                component.field.params = {
                    fileSource: {
                        name: 'HxP Content and Local',
                        serviceId,
                        destinationFolderPath: {
                            type,
                            value,
                        },
                    },
                } as FormFieldModel['params'];
                Object.defineProperty(component.field, 'form', {
                    value: fieldForm,
                });
                fixture.detectChanges();
            }

            describe('File sources', () => {
                it('should enable content and local file sources when serviceId is all', () => {
                    setFieldParam('static', path, FileSourceServiceId.ALL_FILE_SOURCES);

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.isLocalUploadAvailable).toBeTruthy();
                    expect(data.isContentUploadAvailable).toBeTruthy();
                });

                it('should enable only content file source when serviceId is content', async () => {
                    setFieldParam('static', path, FileSourceServiceId.HXP_CONTENT);

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.isLocalUploadAvailable).toBeFalsy();
                    expect(data.isContentUploadAvailable).toBeTruthy();
                });

                it('should enable only local file source when serviceId is local', () => {
                    setFieldParam('static', path, FileSourceServiceId.HXP_LOCAL);

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.isLocalUploadAvailable).toBeTruthy();
                    expect(data.isContentUploadAvailable).toBeFalsy();
                });
            });

            describe('Content type', () => {
                it('should pass contentType to the attach file dialog when contentType is provided', () => {
                    const contentType = 'SysFile';
                    component.field.params.contentType = contentType;

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.contentType).toBe(contentType);
                });

                it('should not include contentType in the attach file dialog when contentType is not provided', () => {
                    component.field.params.contentType = undefined;

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.contentType).toBeUndefined();
                });

                it('should not include contentType in the attach file dialog when contentType is null', () => {
                    component.field.params.contentType = null;

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.contentType).toBeUndefined();
                });

                it('should not include contentType in the attach file dialog when contentType is empty string', () => {
                    component.field.params.contentType = '';

                    component.openSelectDialog();
                    const data = openAttachFileDialogSpy.calls.first().args[0];

                    expect(data.contentType).toBeUndefined();
                });
            });

            describe('Static default folder', () => {
                beforeEach(() => {
                    setFieldParam('static', path);
                });

                it('should set the proper destination folder from the static path for the attach file dialog', async () => {
                    await checkDefaultFolder();
                });
            });

            describe('String variable default folder', () => {
                beforeEach(() => {
                    setFieldParam('string-variable', stringVariable);
                });

                it('should set the proper destination folder from the string variable for the attach file dialog', async () => {
                    await checkDefaultFolder();
                });
            });

            describe('Content variable default folder', () => {
                describe('Content reference by id', () => {
                    beforeEach(() => {
                        setFieldParam('content-variable', contentVariableById);
                    });

                    it('should set the proper destination folder from the content variable referencing the id for the attach file dialog', async () => {
                        await checkDefaultFolder();
                    });
                });
                describe('Content reference by path', () => {
                    beforeEach(() => {
                        setFieldParam('content-variable', contentVariableByPath);
                    });

                    it('should set the proper destination folder from the content variable referencing the path for the attach file dialog', async () => {
                        await checkDefaultFolder();
                    });
                });
            });
        });

        describe('getFilePermissions', () => {
            it('should include empty array in dialog data when filePermissions is null', async () => {
                component.field.params = {};
                getValueFromLocalIdTokenSpy.and.returnValue('test-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toEqual([]);
            });

            it('should include empty array in dialog data when filePermissions is undefined', async () => {
                component.field.params = { filePermissions: undefined };
                getValueFromLocalIdTokenSpy.and.returnValue('test-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toEqual([]);
            });

            it('should include empty array in dialog data when filePermissions is not an array', async () => {
                component.field.params = { filePermissions: 'not-an-array' };
                getValueFromLocalIdTokenSpy.and.returnValue('test-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toEqual([]);
            });

            it('should remove __FormSubmitter__ entries when userId is null', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        user: { id: 'regular-user-id' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue(null);

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(1);
                expect(dialogData.filePermissions[0].user.id).toBe('regular-user-id');
            });

            it('should remove __FormSubmitter__ entries when userId is empty string', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        user: { id: 'regular-user-id' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(1);
                expect(dialogData.filePermissions[0].user.id).toBe('regular-user-id');
            });

            it('should remove __FormSubmitter__ entries when userId is just white space', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        user: { id: 'regular-user-id' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('  ');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(1);
                expect(dialogData.filePermissions[0].user.id).toBe('regular-user-id');
            });

            it('should replace __FormSubmitter__ with actual user ID when userId exists', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        user: { id: 'regular-user-id' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('actual-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(2);
                expect(dialogData.filePermissions[0].user.id).toBe('actual-user-id');
                expect(dialogData.filePermissions[1].user.id).toBe('regular-user-id');
            });

            it('should preserve all permission properties when replacing __FormSubmitter__', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.EVERYTHING,
                        granted: false,
                        user: { id: FormSubmitterIdValue },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('actual-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(1);
                expect(dialogData.filePermissions[0].permission).toBe(PermissionEnum.EVERYTHING);
                expect(dialogData.filePermissions[0].granted).toBe(false);
                expect(dialogData.filePermissions[0].user.id).toBe('actual-user-id');
            });

            it('should not modify permissions without __FormSubmitter__ when userId exists', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: 'user-1' },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        group: { name: 'group-1' },
                    },
                    {
                        permission: PermissionEnum.DELETE,
                        granted: true,
                        user: { id: '__Everyone__' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('actual-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(3);
                expect(dialogData.filePermissions[0].user.id).toBe('user-1');
                expect(dialogData.filePermissions[1].group.name).toBe('group-1');
                expect(dialogData.filePermissions[2].user.id).toBe('__Everyone__');
            });

            it('should handle mixed permissions with multiple __FormSubmitter__ entries', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: false,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.DELETE,
                        granted: true,
                        user: { id: 'regular-user-id' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('actual-user-id');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(3);
                expect(dialogData.filePermissions[0].user.id).toBe('actual-user-id');
                expect(dialogData.filePermissions[0].permission).toBe(PermissionEnum.READ);
                expect(dialogData.filePermissions[1].user.id).toBe('actual-user-id');
                expect(dialogData.filePermissions[1].permission).toBe(PermissionEnum.WRITE);
                expect(dialogData.filePermissions[2].user.id).toBe('regular-user-id');
            });

            it('should include empty array in dialog data when all permissions are __FormSubmitter__ and userId is null', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue(null);

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toEqual([]);
            });

            it('should preserve group permissions when userId is null', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        group: { name: 'group-1' },
                    },
                    {
                        permission: PermissionEnum.DELETE,
                        granted: false,
                        user: { id: 'regular-user-id' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue(null);

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(2);
                expect(dialogData.filePermissions[0].group.name).toBe('group-1');
                expect(dialogData.filePermissions[0].permission).toBe(PermissionEnum.WRITE);
                expect(dialogData.filePermissions[1].user.id).toBe('regular-user-id');
                expect(dialogData.filePermissions[1].permission).toBe(PermissionEnum.DELETE);
            });

            it('should preserve group permissions when userId is empty string', async () => {
                const filePermissions = [
                    {
                        permission: PermissionEnum.READ,
                        granted: true,
                        user: { id: FormSubmitterIdValue },
                    },
                    {
                        permission: PermissionEnum.WRITE,
                        granted: true,
                        group: { name: 'test-group' },
                    },
                ];
                component.field.params = { filePermissions };
                getValueFromLocalIdTokenSpy.and.returnValue('');

                await component.openSelectDialog();

                const dialogData = openAttachFileDialogSpy.calls.first().args[0];
                expect(dialogData.filePermissions).toBeDefined();
                expect(dialogData.filePermissions.length).toBe(1);
                expect(dialogData.filePermissions[0].group.name).toBe('test-group');
                expect(dialogData.filePermissions[0].permission).toBe(PermissionEnum.WRITE);
            });
        });

    describe('Feature Flag Disabled (FORMS_DEFERRED_DOC_CREATION)', () => {
        beforeEach(() => {
            TestBed.resetTestingModule();
            setupTestBed(false);
        });

        it('should not call cleanupUnpersisted when component is destroyed with pending doc feature disabled', () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const cleanupSpy = spyOn(cleanupService, 'cleanupUnpersisted');

            fixture.destroy();

            expect(cleanupSpy).not.toHaveBeenCalled();
        });
    });
});
