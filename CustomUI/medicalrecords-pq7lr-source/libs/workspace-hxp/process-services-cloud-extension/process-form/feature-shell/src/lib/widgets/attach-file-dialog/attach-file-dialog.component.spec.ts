/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
    DataColumnComponent,
    DataColumnListComponent,
    DownloadService,
    EmptyListComponent,
    JwtHelperService,
    NoopTranslateModule,
    RedirectAuthService,
    UserPreferencesService,
} from '@alfresco/adf-core';
import { CommonModule } from '@angular/common';
import { AttachFileDialogComponent, CONTENT_REPOSITORY_DEFAULT_PATH } from './attach-file-dialog.component';
import { AttachFileDialogData, SelectionMode } from '@hxp/shared-hxp/form-widgets/feature-shell';
import {
    DocumentFetchResults,
    DocumentService,
    HxpNotificationService,
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
} from '@alfresco/adf-hx-content-services/services';
import { BehaviorSubject, EMPTY, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MockComponents, MockProvider } from 'ng-mocks';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatTabHarness } from '@angular/material/tabs/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
    HxpUploadDragAreaComponent,
    HxpUploadService,
    HxpUploadingDialogComponent,
    UploadHxpButtonComponent,
} from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { DeleteButtonActionService, HxpDocumentListComponent } from '@alfresco/adf-hx-content-services/ui';
import {
    SharedDownloadService,
    SharedAttachFileDialogService,
    UploadSuccessData,
    PermissionEnum,
    UserPermission,
    GroupPermission,
    EveryonePermission,
    PendingDocument,
    PendingDocumentCleanupService,
    UPLOAD_MIDDLEWARE_SERVICE,
} from '@hxp/shared-hxp/services';
import { UploadFileDocumentCreatorService } from '@alfresco-dbp/workspace-hxp/process-services-cloud-extension/process-form/data-access';
import { DeferredUploadMiddlewareService } from './services/deferred-upload-middleware.service';
import { AttachFileDialogService } from './services/attach-file-dialog.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { documentApiProvider, mockHxcsJsClientConfigurationService, uploadApiProvider } from '@alfresco/adf-hx-content-services/api';
import { TranslatePipe } from '@ngx-translate/core';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const FILE_DOCUMENT_MOCK: Document = {
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

const FOLDER_DOCUMENT_MOCK: Document = {
    sys_isFolderish: true,
    sys_primaryType: 'SysFolder',
};

const CONTENT_REPOSITORY_DEFAULT_FOLDER_MOCK: Document = {
    sys_isFolderish: true,
    sys_primaryType: 'SysFolder',
    sys_path: CONTENT_REPOSITORY_DEFAULT_PATH,
};

const FOLDER_DOCUMENT_COLLECTION_MOCK: DocumentFetchResults = {
    documents: [
        {
            sys_id: '1a191015-5ea2-45a9-85ef-5b6dec180774',
            sys_isFolderish: true,
            sys_name: 'Nested Folder 1',
            sys_title: 'Nested Folder 1',
            sys_primaryType: 'SysFolder',
            sys_path: '/Folder 1/Nested Folder 1',
        },
        {
            sys_id: 'e43b6a72-f7a7-4f5a-8cd1-a3b84cc6af84',
            sys_isFolderish: true,
            sys_name: 'Folder 1',
            sys_title: 'Folder 1',
            sys_primaryType: 'SysFolder',
            sys_path: '/Folder 1',
        },
    ],
    limit: 10,
    offset: 0,
    totalCount: 2,
};

describe('AttachFileDialogComponent', () => {
    let component: AttachFileDialogComponent;
    let fixture: ComponentFixture<AttachFileDialogComponent>;
    let loader: HarnessLoader;

    let documentService: DocumentService;
    let getDocumentByPathSpy: jest.SpyInstance;
    let getAllChildrenSpy: jest.SpyInstance;

    let notificationService: HxpNotificationService;
    let showErrorSpy: jest.SpyInstance;
    let uploadServiceMock: Partial<HxpUploadService>;
    let documentCreatorServiceMock: { onUploadFile: jest.Mock };

    const mockDialogRef = {
        close: jest.fn(),
        open: jest.fn(),
    };

    const uploadedDocument: Document = {
        sys_id: 'uploaded-doc-id',
        sys_isFolderish: false,
        sys_primaryType: 'SysFile',
        sys_title: 'uploaded-file.pdf',
    };
    const uploadSuccessEvent = { middlewareResults: uploadedDocument } as UploadSuccessData<Document>;

    const deleteDocumentSubject = new BehaviorSubject<string>('fake-id');
    const uploadSuccessSubject = new Subject<UploadSuccessData<Document>>();
    const uploadEventSubject = new Subject<void>();

    beforeEach(() => {
        documentCreatorServiceMock = {
            onUploadFile: jest.fn().mockResolvedValue(uploadedDocument),
        };
        uploadServiceMock = {
            fileUploadAborted: EMPTY,
            fileUploadError: EMPTY,
            fileUploadStarting: uploadEventSubject.asObservable() as any,
            fileUploadComplete: EMPTY,
            fileUploadSuccess: uploadSuccessSubject.asObservable(),
            isUploading: jest.fn().mockReturnValue(false),
        };
        TestBed.configureTestingModule({
            imports: [
                TranslatePipe,
                CommonModule,
                MatDialogModule,
                MatButtonModule,
                MatTabsModule,
                MatSnackBarModule,
                NoopAnimationsModule,
                MatProgressSpinnerModule,
                NoopTranslateModule,
                MatIconTestingModule,
                AttachFileDialogComponent,
                ...MockComponents(
                    HxpUploadDragAreaComponent,
                    HxpUploadingDialogComponent,
                    HxpDocumentListComponent,
                    EmptyListComponent,
                    UploadHxpButtonComponent,
                    DataColumnListComponent,
                    DataColumnComponent
                ),
            ],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                MockProvider(MAT_DIALOG_DATA),
                {
                    provide: DocumentService,
                    useValue: {
                        getDocumentByPath: () => of(FOLDER_DOCUMENT_MOCK),
                        getAllChildren: () => of(FOLDER_DOCUMENT_COLLECTION_MOCK),
                        documentDeleted$: deleteDocumentSubject.asObservable(),
                        updateDocument: () => of(uploadedDocument),
                    },
                },
                {
                    provide: SharedDownloadService,
                    useClass: DownloadService,
                },
                {
                    provide: SharedAttachFileDialogService,
                    useClass: AttachFileDialogService,
                },
                { provide: HxpUploadService, useValue: uploadServiceMock },
                mockHxcsJsClientConfigurationService,
                uploadApiProvider,
                documentApiProvider,
                {
                    provide: RedirectAuthService,
                    useValue: { onLogin: EMPTY, onTokenReceived: of() },
                },
                MockProvider(UserPreferencesService, {
                    select: () => of('en-En'),
                }),
                { provide: FeaturesServiceToken, useValue: { isOn$: jest.fn().mockReturnValue(of(false)) } },
                { provide: JwtHelperService, useValue: { getValueFromLocalIdToken: jest.fn().mockReturnValue('test-user') } },
                MockProvider(PendingDocumentCleanupService, { track: jest.fn(), clearTracking: jest.fn() }),
            ],
        }).overrideComponent(AttachFileDialogComponent, {
            set: {
                providers: [
                    {
                        provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
                        useClass: DeleteButtonActionService,
                    },
                    { provide: HxpUploadService, useValue: uploadServiceMock },
                    { provide: UploadFileDocumentCreatorService, useValue: documentCreatorServiceMock },
                    DeferredUploadMiddlewareService,
                    {
                        provide: UPLOAD_MIDDLEWARE_SERVICE,
                        useExisting: DeferredUploadMiddlewareService,
                    },
                ],
            },
        });
    });

    afterEach(() => {
        fixture.destroy();
    });

    describe('post upload', () => {
        const mockDialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.single,
            selectionSubject$: new Subject<Document[]>(),
            isLocalUploadAvailable: true,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(undefined),
        };

        beforeEach(() => {
            TestBed.overrideProvider(MAT_DIALOG_DATA, {
                useValue: mockDialogData,
            });
            documentService = TestBed.inject(DocumentService);

            getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            component.displayedDocument$ = of(FILE_DOCUMENT_MOCK);

            fixture.detectChanges();
        });

        afterEach(() => {
            fixture.destroy();
        });

        it('should refresh document list after upload', () => {
            component.documentNavigationStack = [{ sys_primaryType: 'mock', sys_path: '/some/path' }];
            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
            component.ngOnInit();
            const navigationStackBeforeRefresh = component.documentNavigationStack;

            uploadSuccessSubject.next(uploadSuccessEvent);

            expect(getDocumentByPathSpy).toHaveBeenCalledWith('/some/path');
            expect(component.documentNavigationStack.length).toBe(1);
            expect(component.documentNavigationStack).toBe(navigationStackBeforeRefresh);
        });

        it('should update document collection and displayedDocument after upload', async () => {
            component.navigateForward(FOLDER_DOCUMENT_MOCK);
            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FILE_DOCUMENT_MOCK));
            fixture.detectChanges();

            uploadSuccessSubject.next(uploadSuccessEvent);

            const documentCollection = await firstValueFrom(component.fetchDocumentCollection$);
            const displayedDocument = await firstValueFrom(component.displayedDocument$);

            expect(documentCollection.length).toEqual(2);
            expect(documentCollection[0].sys_title).toEqual('Nested Folder 1');
            expect(documentCollection[1].sys_title).toEqual('Folder 1');

            expect(displayedDocument).toEqual(FILE_DOCUMENT_MOCK);
            expect(component.documentNavigationStack.length).toBe(1);
        });

        it('should cleanup upload complete subscription after destruction', () => {
            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));

            fixture.destroy();
            uploadSuccessSubject.next(uploadSuccessEvent);

            expect(getDocumentByPathSpy).not.toHaveBeenCalled();
        });

        it('should update documentCollection when navigateForward called', fakeAsync(() => {
            component.navigateForward(FOLDER_DOCUMENT_MOCK);
            fixture.detectChanges();

            let collection: Document[] = [];
            component.fetchDocumentCollection$.subscribe((col: Document[] | null) => {
                collection = col || [];
            });

            tick();

            expect(collection.length).toEqual(2);
            expect(collection[0].sys_title).toEqual('Nested Folder 1');
        }));

        it('should refresh document list when a document is deleted', async () => {
            component.documentNavigationStack = [{ sys_primaryType: 'mock', sys_path: '/some/path' }];
            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
            fixture.detectChanges();

            await firstValueFrom(documentService.documentDeleted$);
            deleteDocumentSubject.next('fake_doc_id');

            expect(getDocumentByPathSpy).toHaveBeenCalled();
        });
    });

    describe('navigation', () => {
        const folderWithId: Document = {
            sys_id: 'folder-1',
            sys_isFolderish: true,
            sys_primaryType: 'SysFolder',
            sys_name: 'Folder 1',
            sys_title: 'Folder 1',
        };
        const subfolderWithId: Document = {
            sys_id: 'subfolder-1',
            sys_isFolderish: true,
            sys_primaryType: 'SysFolder',
            sys_name: 'Subfolder',
            sys_title: 'Subfolder',
        };
        const mockDialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.single,
            selectionSubject$: new Subject<Document[]>(),
            isLocalUploadAvailable: false,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of('/path'),
        };

        beforeEach(() => {
            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: mockDialogData });
            documentService = TestBed.inject(DocumentService);
            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(folderWithId));
            getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));
            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
        });

        it('should not push to documentNavigationStack in navigateForward', fakeAsync(() => {
            let getAllChildrenCallCount = 0;
            getAllChildrenSpy.mockImplementation(() => {
                getAllChildrenCallCount++;
                return getAllChildrenCallCount === 1
                    ? of(FOLDER_DOCUMENT_COLLECTION_MOCK)
                    : of(FOLDER_DOCUMENT_COLLECTION_MOCK).pipe(delay(100));
            });
            fixture.detectChanges();
            tick();
            const stackLengthAfterInit = component.documentNavigationStack.length;
            component.navigateForward(subfolderWithId);
            expect(component.documentNavigationStack.length).toBe(stackLengthAfterInit);
            tick(100);
            expect(component.documentNavigationStack.length).toBe(stackLengthAfterInit + 1);
        }));

        it('should push folder to documentNavigationStack only when its children have been loaded', fakeAsync(() => {
            let getAllChildrenCallCount = 0;
            getAllChildrenSpy.mockImplementation(() => {
                getAllChildrenCallCount++;
                return getAllChildrenCallCount === 1
                    ? of(FOLDER_DOCUMENT_COLLECTION_MOCK)
                    : of(FOLDER_DOCUMENT_COLLECTION_MOCK).pipe(delay(100));
            });
            fixture.detectChanges();
            tick();
            expect(component.documentNavigationStack.some((d) => d.sys_id === folderWithId.sys_id)).toBe(true);

            component.navigateForward(subfolderWithId);
            expect(component.documentNavigationStack.some((d) => d.sys_id === subfolderWithId.sys_id)).toBe(false);
            tick(100);
            expect(component.documentNavigationStack.some((d) => d.sys_id === subfolderWithId.sys_id)).toBe(true);
        }));

        it('should not duplicate folder in documentNavigationStack when folder is already in stack', fakeAsync(() => {
            fixture.detectChanges();
            tick();
            component.navigateBack(folderWithId);
            const stackLength = component.documentNavigationStack.length;
            tick();
            expect(component.documentNavigationStack.length).toBe(stackLength);
        }));
    });

    describe('when local upload is not available', () => {
        const testPath = '/test/path';
        const mockDialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.single,
            selectionSubject$: new Subject<Document[]>(),
            isLocalUploadAvailable: false,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(testPath),
        };

        beforeEach(() => {
            TestBed.overrideProvider(MAT_DIALOG_DATA, {
                useValue: mockDialogData,
            });
            documentService = TestBed.inject(DocumentService);
            notificationService = TestBed.inject(HxpNotificationService);

            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(CONTENT_REPOSITORY_DEFAULT_FOLDER_MOCK));

            getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            loader = TestbedHarnessEnvironment.loader(fixture);
        });

        it('should get data from MAT_DIALOG_DATA as an input to the dialog', async () => {
            fixture.detectChanges();
            expect(component.data).toEqual(mockDialogData);
            expect(await firstValueFrom(component.data['defaultDocumentPath$'])).toEqual(testPath);
            expect(component.data['selectionMode']).toEqual(SelectionMode.single);
            expect(component.data['selectionSubject$']).toEqual(expect.any(Subject));
            expect(component.data['isLocalUploadAvailable']).toEqual(false);
        });

        it('should open the dialog in provided path', () => {
            fixture.detectChanges();
            expect(getDocumentByPathSpy).toHaveBeenCalledWith(testPath);
            expect(component.documentNavigationStack).toEqual([CONTENT_REPOSITORY_DEFAULT_FOLDER_MOCK]);
        });

        it('should show loading on document list while fetching folder children and hide when loaded', fakeAsync(() => {
            getAllChildrenSpy.mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK).pipe(delay(50)));
            fixture.detectChanges();
            const documentList = fixture.debugElement.query(By.css('hxp-document-list'));
            expect(documentList?.componentInstance?.isLoading).toBe(true);
            tick(50);
            fixture.detectChanges();
            expect(documentList?.componentInstance?.isLoading).toBe(false);
        }));
    });

    describe('when local upload is available', () => {
        describe('and defaultDocumentPath is not specified', () => {
            const mockDialogData: AttachFileDialogData = {
                selectionMode: SelectionMode.single,
                selectionSubject$: new Subject<Document[]>(),
                isLocalUploadAvailable: true,
                isContentUploadAvailable: true,
                defaultDocumentPath$: of(undefined),
            };

            beforeEach(() => {
                TestBed.overrideProvider(MAT_DIALOG_DATA, {
                    useValue: mockDialogData,
                });
                notificationService = TestBed.inject(HxpNotificationService);

                showErrorSpy = jest.spyOn(notificationService, 'showError').mockImplementation();

                fixture = TestBed.createComponent(AttachFileDialogComponent);
                component = fixture.componentInstance;
                loader = TestbedHarnessEnvironment.loader(fixture);
            });

            it('should get data from MAT_DIALOG_DATA as an input to the dialog', async () => {
                fixture.detectChanges();
                expect(component.data).toEqual(mockDialogData);
                const defaultDocumentPath = await firstValueFrom(component.data['defaultDocumentPath$']);
                expect(defaultDocumentPath).toBeUndefined();
                expect(component.data['selectionMode']).toEqual(SelectionMode.single);
                expect(component.data['selectionSubject$']).toEqual(expect.any(Subject));
                expect(component.data['isLocalUploadAvailable']).toEqual(true);
            });

            it('should display error and close the dialog', () => {
                fixture.detectChanges();

                expect(showErrorSpy).toHaveBeenCalledWith('ATTACH_FILE_DIALOG.FOLDER_DOES_NOT_EXIST');
                expect(mockDialogRef.close).toHaveBeenCalled();
            });
        });

        describe('and defaultDocumentPath is specified', () => {
            const mockDialogData: AttachFileDialogData = {
                selectionMode: SelectionMode.single,
                selectionSubject$: new Subject<Document[]>(),
                isLocalUploadAvailable: true,
                isContentUploadAvailable: true,
                defaultDocumentPath$: of('/some/path'),
            };

            beforeEach(() => {
                TestBed.overrideProvider(MAT_DIALOG_DATA, {
                    useValue: mockDialogData,
                });
                documentService = TestBed.inject(DocumentService);
                notificationService = TestBed.inject(HxpNotificationService);

                getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
                showErrorSpy = jest.spyOn(notificationService, 'showError').mockImplementation();
                getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

                fixture = TestBed.createComponent(AttachFileDialogComponent);
                component = fixture.componentInstance;
                loader = TestbedHarnessEnvironment.loader(fixture);
            });

            it('should get data from MAT_DIALOG_DATA as an input to the dialog', async () => {
                fixture.detectChanges();
                expect(component.data).toEqual(mockDialogData);
                expect(await firstValueFrom(component.data['defaultDocumentPath$'])).toEqual('/some/path');
                expect(component.data['selectionMode']).toEqual(SelectionMode.single);
                expect(component.data['selectionSubject$']).toEqual(expect.any(Subject));
                expect(component.data['isLocalUploadAvailable']).toEqual(true);
            });

            it('should open the dialog in provided defaultDocumentPath if resolved', () => {
                fixture.detectChanges();
                expect(getDocumentByPathSpy).toHaveBeenCalledWith('/some/path');
                expect(getAllChildrenSpy).toHaveBeenCalled();
                expect(component.documentNavigationStack).toEqual([FOLDER_DOCUMENT_MOCK]);
            });

            it('should enable upload tab', async () => {
                fixture.detectChanges();

                const tabs = await loader.getAllHarnesses(MatTabHarness);
                expect(tabs.length).toBe(2);

                const uploadTab = tabs[1];
                expect(await uploadTab.getLabel()).toBe('ATTACH_FILE_DIALOG.TABS.LOCAL_STORAGE');
                expect(await uploadTab.isDisabled()).toBe(false);
            });

            it('should show the upload button when upload tab is selected', () => {
                fixture.detectChanges();

                let uploadButton = fixture.nativeElement.querySelector('hxp-upload-button');
                expect(uploadButton).toBeNull();

                component.selectedTabIndex = 1;
                fixture.detectChanges();

                uploadButton = fixture.nativeElement.querySelector('hxp-upload-button');
                expect(uploadButton).not.toBeNull();
            });

            it('should display error and close the dialog if path did not resolve', () => {
                getDocumentByPathSpy.mockReturnValue(throwError(() => ''));

                fixture.detectChanges();

                expect(getDocumentByPathSpy).toHaveBeenCalledWith('/some/path');
                expect(showErrorSpy).toHaveBeenCalledWith('ATTACH_FILE_DIALOG.FOLDER_NAME_DOES_NOT_EXIST', undefined, { folderName: 'path' });
                expect(mockDialogRef.close).toHaveBeenCalled();
            });

            it('should display error and close the dialog if content service is unavailable', () => {
                getDocumentByPathSpy.mockReturnValue(throwError(() => 'code 503'));

                fixture.detectChanges();

                expect(getDocumentByPathSpy).toHaveBeenCalledWith('/some/path');
                expect(showErrorSpy).toHaveBeenCalledWith('ATTACH_FILE_DIALOG.CONTENT_SERVICE_UNAVAILABLE');
                expect(mockDialogRef.close).toHaveBeenCalled();
            });

            it('should display error inside dialog if user dont have access', () => {
                mockDialogRef.close.mockClear();
                getDocumentByPathSpy.mockReturnValue(throwError(() => 'code 403'));

                fixture.detectChanges();

                expect(getDocumentByPathSpy).toHaveBeenCalledWith('/some/path');
                expect(component.insideErrorMessage).toEqual('ATTACH_FILE_DIALOG.FOLDER_ACCESS_DENIED');
                expect(fixture.nativeElement.querySelector('.hxp-attach-file-dialog-error').textContent.trim()).toEqual(
                    'ATTACH_FILE_DIALOG.FOLDER_ACCESS_DENIED'
                );
                expect(mockDialogRef.close).not.toHaveBeenCalled();
            });
        });
    });

    describe('attach button', () => {
        const mockDialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.single,
            selectionSubject$: new Subject<Document[]>(),
            isLocalUploadAvailable: false,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(undefined),
        };

        beforeEach(() => {
            TestBed.overrideProvider(MAT_DIALOG_DATA, {
                useValue: mockDialogData,
            });
            documentService = TestBed.inject(DocumentService);
            notificationService = TestBed.inject(HxpNotificationService);

            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
            getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            loader = TestbedHarnessEnvironment.loader(fixture);

            component.displayedDocumentSubject$.next(FOLDER_DOCUMENT_MOCK);
            fixture.detectChanges();
        });

        it('should disable the attach button when no document is selected', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            expect(await attachButton.isDisabled()).toBe(true);
        });

        it('should enable the attach button when selection mode is single and only one document is selected', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            component.data.selectionMode = SelectionMode.single;

            component.chosenDocuments$.next([]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(true);

            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(false);

            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK, FILE_DOCUMENT_MOCK]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(true);
        });

        it('should enable the attach button when selection mode is multiple and at least one document is selected', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            component.data.selectionMode = SelectionMode.multiple;

            component.chosenDocuments$.next([]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(true);

            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(false);

            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK, FILE_DOCUMENT_MOCK]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(false);

            component.data.selectionMode = SelectionMode.single;
        });

        it('should disable attach button while uploads are in progress even when documents are selected', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            component.data.selectionMode = SelectionMode.multiple;
            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK]);
            (uploadServiceMock.isUploading as jest.Mock).mockReturnValue(true);
            uploadEventSubject.next();
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(true);
        });

        it('should enable attach button when all uploads complete and documents are selected', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            component.data.selectionMode = SelectionMode.multiple;
            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK]);
            (uploadServiceMock.isUploading as jest.Mock).mockReturnValue(true);
            uploadEventSubject.next();
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(true);

            (uploadServiceMock.isUploading as jest.Mock).mockReturnValue(false);
            uploadEventSubject.next();
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(false);
        });

        it('should not affect attach button for repository tab selection (no uploads active)', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            component.data.selectionMode = SelectionMode.multiple;
            (uploadServiceMock.isUploading as jest.Mock).mockReturnValue(false);
            component.chosenDocuments$.next([FILE_DOCUMENT_MOCK]);
            fixture.detectChanges();
            expect(await attachButton.isDisabled()).toBe(false);
        });
    });

    describe('when content upload is not available', () => {
        const testPath = '/test/path';
        const mockDialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.single,
            selectionSubject$: new Subject<Document[]>(),
            isLocalUploadAvailable: true,
            isContentUploadAvailable: false,
            defaultDocumentPath$: of(testPath),
        };

        beforeEach(async () => {
            TestBed.overrideProvider(MAT_DIALOG_DATA, {
                useValue: mockDialogData,
            });
            documentService = TestBed.inject(DocumentService);
            notificationService = TestBed.inject(HxpNotificationService);

            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(CONTENT_REPOSITORY_DEFAULT_FOLDER_MOCK));

            getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            loader = TestbedHarnessEnvironment.loader(fixture);
        });

        it('should enable local tab only', async () => {
            const tabs = await loader.getAllHarnesses(MatTabHarness);
            expect(tabs.length).toBe(2);

            const contentTab = tabs[0];
            const uploadTab = tabs[1];
            expect(await contentTab.getLabel()).toBe('ATTACH_FILE_DIALOG.TABS.REPOSITORY');
            expect(await contentTab.isDisabled()).toBe(true);
            expect(await contentTab.isSelected()).toBe(false);
            expect(await uploadTab.getLabel()).toBe('ATTACH_FILE_DIALOG.TABS.LOCAL_STORAGE');
            expect(await uploadTab.isDisabled()).toBe(false);
            expect(await uploadTab.isSelected()).toBe(true);
        });

        it('should attach button be visible', async () => {
            const attachButton = await loader.getHarness(
                MatButtonHarness.with({
                    text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH',
                })
            );
            expect(attachButton).toBeDefined();
        });
    });

    describe('onSuccessUpload', () => {
        const mockFilePermissions = [
            {
                permission: PermissionEnum.WRITE,
                granted: true,
                user: {
                    id: 'ce96ab1c-2c1c-4b42-b896-8fbf36a46215',
                    firstName: 'test-admin',
                    lastName: 'test-admin',
                    username: 'test-admin',
                    email: 'test-admin@hyland.com',
                    displayName: 'test-admin test-admin',
                },
            } as UserPermission,
            {
                permission: PermissionEnum.WRITE,
                granted: true,
                group: {
                    id: 'c417a65b-e42f-4b7f-a028-b0ef6a1d5340',
                    name: 'hr',
                },
            } as GroupPermission,
            {
                permission: PermissionEnum.EVERYTHING,
                granted: false,
                user: {
                    id: '__Everyone__',
                },
            } as EveryonePermission,
        ];
        const mockDialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.multiple,
            selectionSubject$: new Subject<Document[]>(),
            isLocalUploadAvailable: true,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(undefined),
            filePermissions: mockFilePermissions,
        };

        const existingDocument1: Document = {
            sys_id: 'existing-doc-1',
            sys_isFolderish: false,
            sys_primaryType: 'SysFile',
            sys_title: 'existing-file-1.pdf',
        };

        beforeEach(() => {
            TestBed.overrideProvider(MAT_DIALOG_DATA, {
                useValue: mockDialogData,
            });

            documentService = TestBed.inject(DocumentService);

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('should add uploaded document to chosen documents when no duplicates exist in multiple selection mode', async () => {
            component.chosenDocuments$.next([existingDocument1]);

            const uploadSuccessData = { middlewareResults: uploadedDocument } as UploadSuccessData<Document>;
            component.onSuccessUpload(uploadSuccessData);

            const chosenDocuments = await firstValueFrom(component.chosenDocuments$);
            expect(chosenDocuments.length).toBe(2);
            expect(chosenDocuments).toContain(existingDocument1);
            expect(chosenDocuments).toContain(uploadedDocument);
        });

        it('should remove duplicate documents based on sys_id when uploading in multiple selection mode', async () => {
            component.chosenDocuments$.next([existingDocument1, existingDocument1, uploadedDocument]);

            const uploadSuccessData = { middlewareResults: uploadedDocument } as UploadSuccessData<Document>;
            component.onSuccessUpload(uploadSuccessData);

            const chosenDocuments = await firstValueFrom(component.chosenDocuments$);
            expect(chosenDocuments.length).toBe(2);
            expect(chosenDocuments).toContain(existingDocument1);
            expect(chosenDocuments).toContain(uploadedDocument);
        });

        it('should add PendingDocument to chosen documents in multiple selection mode', async () => {
            const featuresService = TestBed.inject(FeaturesServiceToken);
            (featuresService.isOn$ as jest.Mock).mockReturnValue(of(true));

            const pendingDocument: PendingDocument = {
                document: { sys_id: 'pending-doc-id', sys_isFolderish: false, sys_primaryType: 'SysFile' },
                originalPermissions: [],
                pendingBy: 'user-123', persisted: false,
            };

            component.chosenDocuments$.next([existingDocument1]);

            const uploadSuccessData = { middlewareResults: pendingDocument } as UploadSuccessData<Document | PendingDocument>;
            component.onSuccessUpload(uploadSuccessData);

            const chosenDocuments = await firstValueFrom(component.chosenDocuments$);
            expect(chosenDocuments.length).toBe(2);
            expect(chosenDocuments).toContain(pendingDocument);
        });

        it('should deduplicate PendingDocuments by inner document sys_id', async () => {
            const featuresService = TestBed.inject(FeaturesServiceToken);
            (featuresService.isOn$ as jest.Mock).mockReturnValue(of(true));

            const pendingDocument: PendingDocument = {
                document: { sys_id: 'pending-doc-id', sys_isFolderish: false, sys_primaryType: 'SysFile' },
                originalPermissions: [],
                pendingBy: 'user-123', persisted: false,
            };

            component.chosenDocuments$.next([pendingDocument]);

            const uploadSuccessData = { middlewareResults: pendingDocument } as UploadSuccessData<Document | PendingDocument>;
            component.onSuccessUpload(uploadSuccessData);

            const chosenDocuments = await firstValueFrom(component.chosenDocuments$);
            expect(chosenDocuments.length).toBe(1);
        });

        it('should do nothing when middlewareResults is absent (no-middleware flow)', async () => {
            component.chosenDocuments$.next([existingDocument1]);

            const uploadSuccessData = {} as UploadSuccessData<Document>;
            component.onSuccessUpload(uploadSuccessData);

            const chosenDocuments = await firstValueFrom(component.chosenDocuments$);
            expect(chosenDocuments.length).toBe(1);
        });
    });

    describe('deferred document creation on upload tab', () => {
        const rawUploadData: UploadSuccessData = {
            uploadedFile: { id: 'binary-upload-id', fileName: 'uploaded-file.pdf' } as any,
            uploadFileOptions: {} as any,
        };

        let deferredDialogData: AttachFileDialogData;
        let deferredMiddleware: DeferredUploadMiddlewareService;

        beforeEach(async () => {
            deferredDialogData = {
                selectionMode: SelectionMode.multiple,
                selectionSubject$: new Subject<(Document | PendingDocument)[]>(),
                isLocalUploadAvailable: true,
                isContentUploadAvailable: false,
                defaultDocumentPath$: of('/some/path'),
            };

            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: deferredDialogData });
            TestBed.overrideProvider(FeaturesServiceToken, {
                useValue: { isOn$: jest.fn().mockReturnValue(of(true)) },
            });

            documentService = TestBed.inject(DocumentService);
            notificationService = TestBed.inject(HxpNotificationService);
            showErrorSpy = jest.spyOn(notificationService, 'showError').mockImplementation();
            getDocumentByPathSpy = jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
            getAllChildrenSpy = jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));
            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            deferredMiddleware = fixture.debugElement.injector.get(DeferredUploadMiddlewareService);
            loader = TestbedHarnessEnvironment.loader(fixture);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should disable attach button when no files have been uploaded yet', async () => {
            const attachButton = await loader.getHarness(MatButtonHarness.with({ text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH' }));
            expect(await attachButton.isDisabled()).toBe(true);
        });

        it('should enable attach button once a file is queued in middleware', async () => {
            const attachButton = await loader.getHarness(MatButtonHarness.with({ text: 'ATTACH_FILE_DIALOG.ACTIONS.ATTACH' }));
            expect(await attachButton.isDisabled()).toBe(true);

            await deferredMiddleware.onUploadFile(rawUploadData);
            fixture.detectChanges();

            expect(await attachButton.isDisabled()).toBe(false);
        });

        it('should not call documentCreatorService before attach is clicked', async () => {
            await deferredMiddleware.onUploadFile(rawUploadData);
            expect(documentCreatorServiceMock.onUploadFile).not.toHaveBeenCalled();
        });

        it('should call documentCreatorService.onUploadFile for each pending upload on attach click', async () => {
            await deferredMiddleware.onUploadFile(rawUploadData);
            await deferredMiddleware.onUploadFile(rawUploadData);

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(documentCreatorServiceMock.onUploadFile).toHaveBeenCalledTimes(2);
            expect(documentCreatorServiceMock.onUploadFile).toHaveBeenCalledWith(rawUploadData);
        });

        it('should emit created documents to selectionSubject$ on attach click', async () => {
            const selectionSpy = jest.fn();
            deferredDialogData.selectionSubject$.subscribe(selectionSpy);

            await deferredMiddleware.onUploadFile(rawUploadData);
            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(selectionSpy).toHaveBeenCalledTimes(1);
            const emittedDocs = selectionSpy.mock.calls[0][0];
            expect(emittedDocs).toContainEqual(uploadedDocument);
        });

        it('should not show error notification when all document creations succeed', async () => {
            await deferredMiddleware.onUploadFile(rawUploadData);

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(showErrorSpy).not.toHaveBeenCalled();
        });

        it('should show error notification with failed count when some document creations fail', async () => {
            documentCreatorServiceMock.onUploadFile
                .mockResolvedValueOnce(uploadedDocument)
                .mockRejectedValueOnce(new Error('creation failed'));

            await deferredMiddleware.onUploadFile(rawUploadData);
            await deferredMiddleware.onUploadFile(rawUploadData);

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(showErrorSpy).toHaveBeenCalledWith('ATTACH_FILE_DIALOG.DOCUMENT_CREATION_FAILED', undefined, {
                count: 1,
            });
        });

        it('should report the correct count when multiple document creations fail', async () => {
            documentCreatorServiceMock.onUploadFile.mockRejectedValue(new Error('creation failed'));

            await deferredMiddleware.onUploadFile(rawUploadData);
            await deferredMiddleware.onUploadFile(rawUploadData);

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(showErrorSpy).toHaveBeenCalledWith('ATTACH_FILE_DIALOG.DOCUMENT_CREATION_FAILED', undefined, {
                count: 2,
            });
        });

        it('should show error notification and close when all document creations fail', async () => {
            documentCreatorServiceMock.onUploadFile.mockRejectedValue(new Error('creation failed'));

            await deferredMiddleware.onUploadFile(rawUploadData);

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(showErrorSpy).toHaveBeenCalledWith('ATTACH_FILE_DIALOG.DOCUMENT_CREATION_FAILED', undefined, {
                count: 1,
            });
            expect(mockDialogRef.close).toHaveBeenCalled();
        });
    });

    describe('deferred upload - tab-agnostic flush', () => {
        const rawUploadData: UploadSuccessData = {
            uploadedFile: { id: 'binary-upload-id', fileName: 'repo-file.pdf' } as any,
            uploadFileOptions: {} as any,
        };

        const repoDocument: Document = {
            sys_id: 'repo-doc-1',
            sys_isFolderish: false,
            sys_primaryType: 'SysFile',
            sys_title: 'repo-file.pdf',
        };

        let tabFlushDialogData: AttachFileDialogData;
        let deferredMiddleware: DeferredUploadMiddlewareService;

        beforeEach(async () => {
            tabFlushDialogData = {
                selectionMode: SelectionMode.multiple,
                selectionSubject$: new Subject<(Document | PendingDocument)[]>(),
                isLocalUploadAvailable: true,
                isContentUploadAvailable: true,
                defaultDocumentPath$: of('/some/path'),
            };

            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: tabFlushDialogData });
            TestBed.overrideProvider(FeaturesServiceToken, {
                useValue: { isOn$: jest.fn().mockReturnValue(of(true)) },
            });

            documentService = TestBed.inject(DocumentService);
            jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
            jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            deferredMiddleware = fixture.debugElement.injector.get(DeferredUploadMiddlewareService);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should merge flushed documents with repo-selected documents on attach from repo tab', async () => {
            const selectionSpy = jest.fn();
            tabFlushDialogData.selectionSubject$.subscribe(selectionSpy);

            await deferredMiddleware.onUploadFile(rawUploadData);
            component.chosenDocuments$.next([repoDocument]);
            component.selectedTabIndex = 0;

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(selectionSpy).toHaveBeenCalledTimes(1);
            const emittedDocs = selectionSpy.mock.calls[0][0];
            expect(emittedDocs).toContain(repoDocument);
            expect(emittedDocs).toContainEqual(uploadedDocument);
        });

        it('should flush deferred queue even when on upload tab', async () => {
            const selectionSpy = jest.fn();
            tabFlushDialogData.selectionSubject$.subscribe(selectionSpy);

            await deferredMiddleware.onUploadFile(rawUploadData);
            component.selectedTabIndex = 1;

            component.onAttachButtonClick();
            await fixture.whenStable();

            expect(selectionSpy).toHaveBeenCalledTimes(1);
            const emittedDocs = selectionSpy.mock.calls[0][0];
            expect(emittedDocs).toContainEqual(uploadedDocument);
        });

        it('should preserve queued files when switching tabs', async () => {
            await deferredMiddleware.onUploadFile(rawUploadData);

            component.onTabSelectionChange(0);
            fixture.detectChanges();

            component.onTabSelectionChange(1);
            fixture.detectChanges();

            expect(documentCreatorServiceMock.onUploadFile).not.toHaveBeenCalled();
            const hasPending = await firstValueFrom(deferredMiddleware.hasPendingUploads$);
            expect(hasPending).toBe(true);
        });
    });

    describe('deferred upload - cleanup on destroy', () => {
        const rawUploadData: UploadSuccessData = {
            uploadedFile: { id: 'binary-upload-id' } as any,
            uploadFileOptions: {} as any,
        };

        let cleanupDialogData: AttachFileDialogData;
        let deferredMiddleware: DeferredUploadMiddlewareService;

        beforeEach(async () => {
            cleanupDialogData = {
                selectionMode: SelectionMode.multiple,
                selectionSubject$: new Subject<(Document | PendingDocument)[]>(),
                isLocalUploadAvailable: true,
                isContentUploadAvailable: false,
                defaultDocumentPath$: of('/some/path'),
            };

            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: cleanupDialogData });
            TestBed.overrideProvider(FeaturesServiceToken, {
                useValue: { isOn$: jest.fn().mockReturnValue(of(true)) },
            });

            documentService = TestBed.inject(DocumentService);
            jest.spyOn(documentService, 'getDocumentByPath').mockReturnValue(of(FOLDER_DOCUMENT_MOCK));
            jest.spyOn(documentService, 'getAllChildren').mockReturnValue(of(FOLDER_DOCUMENT_COLLECTION_MOCK));

            fixture = TestBed.createComponent(AttachFileDialogComponent);
            component = fixture.componentInstance;
            deferredMiddleware = fixture.debugElement.injector.get(DeferredUploadMiddlewareService);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should call discardUploads when component is destroyed', async () => {
            const discardSpy = jest.spyOn(deferredMiddleware, 'discardUploads');

            await deferredMiddleware.onUploadFile(rawUploadData);

            fixture.destroy();

            expect(discardSpy).toHaveBeenCalled();
        });
    });
});
