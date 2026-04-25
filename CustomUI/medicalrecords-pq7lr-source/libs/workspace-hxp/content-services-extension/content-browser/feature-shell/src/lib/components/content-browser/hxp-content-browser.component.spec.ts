/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MockProvider, MockService, ngMocks } from 'ng-mocks';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { ContentBrowserComponent } from './hxp-content-browser.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ContentPropertyViewerActionService, DeleteButtonActionService, HxpDocumentListComponent } from '@alfresco/adf-hx-content-services/ui';
import { NoopTranslateModule, UserPreferencesService } from '@alfresco/adf-core';
import { TranslateService } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { IsFolderishDocumentPipe } from './is-folderish-document.pipe';
import { IsViewableAsFilePipe } from './is-viewable-as-file.pipe';
import { a11yReport, generateMockError, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { provideContentServicesExtensionContentBrowserFeatureShell } from '../../content-services-extension-content-browser-feature-shell.providers';
import { UPLOAD_MIDDLEWARE_SERVICE } from '@hxp/shared-hxp/services';
import { NotFeaturesDirective, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { PaginatorHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import {
    DocumentService,
    DocumentFetchResults,
    isFile,
    isFolder,
    HXP_DOCUMENT_INFO_ACTION_SERVICE,
    DocumentPermissions,
    DocumentRouterService,
    DocumentCacheService,
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
    ContextMenuActionsService,
    HxpNotificationService,
    UserResolverPipe,
    provideAdfEnterpriseAdfHxContentServicesServices,
    ManageVersionsButtonActionService,
    DocumentUpdateInfo,
    SidebarService,
    DocumentModelService,
    DocumentModel,
} from '@alfresco/adf-hx-content-services/services';
import { ROOT_DOCUMENT, documentApiProvider, mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEnExtra from '@angular/common/locales/extra/en';
import { DocumentViewerComponent } from '../document-viewer/document-viewer.component';
import { signal } from '@angular/core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

registerLocaleData(localeEn, 'en', localeEnExtra);

// https://hyland.atlassian.net/browse/HXCS-3943
const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [{ 'aria-required-children': 3 }];

describe('ContentBrowserComponent', () => {
    const REFRESH_DEBOUNCE = 1000;
    const mockDocumentService: DocumentService = MockService(DocumentService);
    const documentRouterService: DocumentRouterService = MockService(DocumentRouterService);
    const mockContentPropertyViewerActionService: ContentPropertyViewerActionService = MockService(ContentPropertyViewerActionService);

    const mockManageVersionsButtonActionService = MockService(ManageVersionsButtonActionService);

    const documentUpdated$ = new Subject<DocumentUpdateInfo>();
    const documentRestored$ = new Subject<Document>();

    let mockSidebarService: { panel: () => string | null; togglePanel: jest.Mock; closePanel: jest.Mock };

    const mockDeleteDocumentSpy = (spy: jest.SpyInstance) => {
        return spy.mockImplementation((documentId) => {
            (mockDocumentService.documentDeleted$ as Subject<string>).next(documentId);
            return of(documentId);
        });
    };

    const mockCreateDocumentSpy = (spy: jest.SpyInstance, document: Document) => {
        return spy.mockImplementation(() => {
            (mockDocumentService.documentCreated$ as Subject<Document>).next(document);
            return of(document);
        });
    };

    const configureTestingModule = async (providers: any[]) => {
        const panelSignal = signal<any>(null);
        mockSidebarService = {
            panel: panelSignal.asReadonly(),
            togglePanel: jest.fn().mockImplementation((panelType: any) => {
                panelSignal.set(panelType);
            }),
            closePanel: jest.fn().mockImplementation(() => {
                panelSignal.set(null);
            }),
        };

        await TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                RouterTestingModule,
                NoopTranslateModule,
                DocumentViewerComponent,
                IsFolderishDocumentPipe,
                ContentBrowserComponent,
                MatIconTestingModule,
            ],
            providers: [
                provideContentServicesExtensionContentBrowserFeatureShell(),
                provideAdfEnterpriseAdfHxContentServicesServices(),
                mockHxcsJsClientConfigurationService,
                MockProvider(ContextMenuActionsService),
                { provide: DocumentService, useValue: mockDocumentService },
                MockProvider(UPLOAD_MIDDLEWARE_SERVICE),
                MockProvider(UserPreferencesService, {
                    select: () => of('en-En') as any,
                    localeSignal: signal('en'),
                }),
                MockProvider(DocumentModelService, {
                    getModel: () =>
                        of(
                            new DocumentModel({
                                primaryTypes: {
                                    SysFile: {
                                        name: 'SysFile',
                                        extends: 'SysContent',
                                        mixins: ['SysFilish'],
                                    },
                                    SysFolder: {
                                        name: 'SysFolder',
                                        extends: 'SysContent',
                                        mixins: ['SysFilish', 'SysFolderish'],
                                    },
                                    SysRoot: {
                                        name: 'SysRoot',
                                        extends: 'SysFolder',
                                        mixins: ['SysFilish', 'SysFolderish'],
                                    },
                                    SysContent: {
                                        name: 'SysContent',
                                        mixins: [],
                                    },
                                    CustomFile: {
                                        name: 'CustomFile',
                                        extends: 'SysFile',
                                        mixins: ['SysFilish'],
                                    },
                                    CustomFolder: {
                                        name: 'CustomFolder',
                                        extends: 'SysFolder',
                                        mixins: ['SysFilish', 'SysFolderish'],
                                    },
                                    CustomContentWithBothMixins: {
                                        name: 'CustomContentWithBothMixins',
                                        extends: 'SysContent',
                                        mixins: ['SysFilish', 'SysFolderish'],
                                    },
                                    CustomContentWithFilishOnly: {
                                        name: 'CustomContentWithFilishOnly',
                                        extends: 'SysContent',
                                        mixins: ['SysFilish'],
                                    },
                                    CustomContentWithFolderishOnly: {
                                        name: 'CustomContentWithFolderishOnly',
                                        extends: 'SysContent',
                                        mixins: ['SysFolderish'],
                                    },
                                },
                            } as any)
                        ),
                }),
                {
                    provide: DocumentRouterService,
                    useValue: documentRouterService,
                },
                {
                    provide: HXP_DOCUMENT_INFO_ACTION_SERVICE,
                    useValue: mockContentPropertyViewerActionService,
                },
                {
                    provide: ManageVersionsButtonActionService,
                    useValue: mockManageVersionsButtonActionService,
                },
                {
                    provide: SidebarService,
                    useValue: mockSidebarService,
                },
                NotFeaturesDirective,
                DocumentCacheService,
                {
                    provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
                    useClass: DeleteButtonActionService,
                },
                provideMockFeatureFlags({
                    'cic-workspace-document-layout-toggle': false,
                    [ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K]: true,
                }),
                ...providers,
            ],
        }).compileComponents();

        jest.spyOn(mockDocumentService, 'getAncestors').mockImplementation((docId: string) => {
            if (docId === jestMocks.fileDocument.sys_id) {
                return of([ROOT_DOCUMENT, jestMocks.fileDocument]);
            }
            if (docId === jestMocks.folderDocument.sys_id) {
                return of([ROOT_DOCUMENT, jestMocks.folderDocument]);
            }
            return of([ROOT_DOCUMENT]);
        });

        mockDocumentService.documentDeleted$ = new Subject();
        mockDocumentService.documentCreated$ = new Subject();
        mockDocumentService.documentLoaded$ = new Subject();
        mockDocumentService.documentUpdated$ = documentUpdated$.asObservable();
        mockDocumentService.documentRestored$ = documentRestored$.asObservable();
        mockDocumentService.documentRequestReload$ = new Subject();
        mockDocumentService.clearDocumentSelection$ = new Subject<void>();
    };

    describe('as authorized user', () => {
        let contentBrowser: ContentBrowserComponent;
        let fixture: ComponentFixture<ContentBrowserComponent>;
        let translateService: TranslateService;

        let getAllChildrenSpy: jest.Mock;
        let createDocumentSpy: jest.SpyInstance;
        let deletedDocumentSpy: jest.SpyInstance;

        beforeEach(async () => {
            await configureTestingModule([[UserResolverPipe]]);

            translateService = TestBed.inject(TranslateService);
            jest.spyOn(translateService, 'instant').mockImplementation((key: string, params: any) => {
                const template = '{{startIndex}} – {{endIndex}} of {{totalPages}}';
                return template
                    .replace('{{startIndex}}', String(params.startIndex))
                    .replace('{{endIndex}}', String(params.endIndex))
                    .replace('{{totalPages}}', String(params.totalPages));
            });

            ngMocks.autoSpy('jest');
            getAllChildrenSpy = jest.spyOn(mockDocumentService, 'getAllChildren').mockImplementation((docId: string, options: any) => {
                if (docId === jestMocks.nestedDocument.sys_id) {
                    return of({
                        documents: [...jestMocks.nestedDocumentAncestors2].reverse(),
                        limit: 25,
                        offset: 0,
                        totalCount: 2,
                    });
                }
                if (docId === jestMocks.folderDocument.sys_id) {
                    return of({
                        documents: [],
                        limit: 25,
                        offset: 0,
                        totalCount: 0,
                    });
                }
                if (docId === ROOT_DOCUMENT.sys_id && options?.sort?.length > 0) {
                    return of({
                        documents: [...jestMocks.nestedDocumentAncestors],
                        limit: 25,
                        offset: 0,
                        totalCount: 2,
                    });
                }
                return of({
                    documents: [...jestMocks.nestedDocumentAncestors].reverse(),
                    limit: 25,
                    offset: 0,
                    totalCount: 2,
                });
            }) as any;

            jest.spyOn(mockDocumentService, 'getDocumentById').mockReturnValue(of(ROOT_DOCUMENT));

            deletedDocumentSpy = jest.spyOn(mockDocumentService, 'deleteDocument');
            mockDeleteDocumentSpy(deletedDocumentSpy);
            createDocumentSpy = jest.spyOn(mockDocumentService, 'createDocument');
            mockCreateDocumentSpy(createDocumentSpy, jestMocks.fileDocument);

            fixture = TestBed.createComponent(ContentBrowserComponent);
            contentBrowser = fixture.componentInstance;
            fixture.detectChanges();
        });

        afterEach(() => {
            getAllChildrenSpy.mockClear();
            createDocumentSpy.mockClear();
            deletedDocumentSpy.mockClear();
            fixture.destroy();
        });

        it('should refresh on document creation', fakeAsync(() => {
            expect(contentBrowser).toBeTruthy();

            (contentBrowser as any).document = ROOT_DOCUMENT;
            contentBrowser.fetchChildren();
            fixture.detectChanges();

            let rows = fixture.debugElement.queryAll(By.css('.adf-datatable-body adf-datatable-row'));
            expect(rows).toBeTruthy();
            expect(rows).toHaveLength(2);

            expect(createDocumentSpy).not.toHaveBeenCalled();

            getAllChildrenSpy.mockClear();

            getAllChildrenSpy.mockReturnValue(
                of({
                    documents: [...jestMocks.nestedDocumentAncestors, jestMocks.fileDocument],
                    limit: 25,
                    offset: 0,
                    totalCount: 3,
                })
            );

            mockDocumentService.createDocument({ sys_primaryType: 'SysFile' });
            tick(REFRESH_DEBOUNCE);
            fixture.detectChanges();

            expect(getAllChildrenSpy).toHaveBeenCalledTimes(1);
            expect(createDocumentSpy).toHaveBeenCalled();

            rows = fixture.debugElement.queryAll(By.css('.adf-datatable-body adf-datatable-row'));
            expect(rows).toBeTruthy();
            expect(rows).toHaveLength(3);
        }));

        it('should refresh on document delete', fakeAsync(() => {
            expect(contentBrowser).toBeTruthy();

            (contentBrowser as any).document = ROOT_DOCUMENT;
            contentBrowser.fetchChildren();
            fixture.detectChanges();

            let rows = fixture.debugElement.queryAll(By.css('.adf-datatable-body adf-datatable-row'));
            expect(rows).toBeTruthy();
            expect(rows).toHaveLength(2);

            expect(deletedDocumentSpy).not.toHaveBeenCalled();

            getAllChildrenSpy.mockClear();

            getAllChildrenSpy.mockReturnValue(
                of({
                    documents: [jestMocks.nestedDocumentAncestors[0]],
                    limit: 25,
                    offset: 0,
                    totalCount: 1,
                })
            );

            mockDocumentService.deleteDocument(jestMocks.nestedDocumentAncestors[1].sys_id);
            tick(REFRESH_DEBOUNCE);
            fixture.detectChanges();

            expect(getAllChildrenSpy).toHaveBeenCalledTimes(1);
            expect(deletedDocumentSpy).toHaveBeenCalled();

            rows = fixture.debugElement.queryAll(By.css('.adf-datatable-body adf-datatable-row'));
            expect(rows).toBeTruthy();
            expect(rows).toHaveLength(1);
        }));

        it('should clear item selection when `clearDocumentSelection` emitted', () => {
            expect(contentBrowser).toBeTruthy();
            (contentBrowser as any).document = ROOT_DOCUMENT;
            fixture.detectChanges();

            // Create a spy for the clearSelection method of the HxpDocumentListComponent
            const documentListDebugElement = fixture.debugElement.query(By.directive(HxpDocumentListComponent));
            const documentListComponent = documentListDebugElement.componentInstance;
            jest.spyOn(documentListComponent, 'resetSelection');

            const clearDocumentSelection$ = mockDocumentService.clearDocumentSelection$ as Subject<void>;
            clearDocumentSelection$.next();

            fixture.detectChanges();

            expect(documentListComponent.resetSelection).toHaveBeenCalled();
        });

        it('should navigate to document on row click', () => {
            expect(contentBrowser).toBeTruthy();

            const navigateToSpy = jest.spyOn(documentRouterService, 'navigateTo');

            (contentBrowser as any).document = ROOT_DOCUMENT;
            fixture.detectChanges();

            expect(documentRouterService.navigateTo).not.toHaveBeenCalled();

            const documentList = fixture.debugElement.query(By.css('hxp-document-list'));
            expect(documentList).toBeTruthy();

            documentList.componentInstance.rowClicked.emit(jestMocks.nestedDocumentAncestors[0]);
            fixture.detectChanges();

            expect(navigateToSpy).toHaveBeenCalledWith(jestMocks.nestedDocumentAncestors[0]);
        });

        it('should display document previewer if document is filish', () => {
            expect(contentBrowser).toBeTruthy();
            expect(isFile(jestMocks.fileDocument)).toBeTruthy();

            (contentBrowser as any).document = jestMocks.fileDocument;
            fixture.detectChanges();

            const documentList = fixture.debugElement.query(By.css('hxp-document-list'));
            expect(documentList).toBeFalsy();

            const documentViewer = fixture.debugElement.query(By.css('hxp-document-viewer'));
            expect(documentViewer).toBeTruthy();
        });

        it('should not display document previewer if document is folderish', () => {
            expect(contentBrowser).toBeTruthy();
            expect(isFolder(ROOT_DOCUMENT)).toBeTruthy();

            (contentBrowser as any).document = ROOT_DOCUMENT;
            fixture.detectChanges();

            const documentList = fixture.debugElement.query(By.css('hxp-document-list'));
            expect(documentList).toBeTruthy();

            const documentViewer = fixture.debugElement.query(By.css('hxp-document-viewer'));
            expect(documentViewer).toBeFalsy();
        });

        it('should allow upload for document creation if document has `CreateChild` permission', () => {
            expect(contentBrowser).toBeTruthy();

            const document: Document = {
                ...jestMocks.folderDocument,
                sys_effectivePermissions: [DocumentPermissions.CREATE_CHILD],
            };
            (contentBrowser as any).document = document;
            contentBrowser.ngOnChanges();
            fixture.detectChanges();

            const documentList = fixture.debugElement.query(By.css('hxp-document-list'));
            expect(documentList).toBeTruthy();

            const uploadDragArea = fixture.debugElement.query(By.css('hxp-content-upload-drag-area'));
            expect(uploadDragArea).toBeTruthy();
            expect(uploadDragArea.componentInstance.disabled).toBeUndefined();
        });

        it("should not allow upload for document creation if document doesn't have CreateChild permission", () => {
            expect(contentBrowser).toBeTruthy();

            (contentBrowser as any).document = {
                ...jestMocks.folderDocument,
                sys_effectivePermissions: [],
            };
            contentBrowser.ngOnChanges();
            fixture.detectChanges();

            const documentList = fixture.debugElement.query(By.css('hxp-document-list'));

            expect(documentList).toBeTruthy();

            const uploadDragArea = fixture.debugElement.query(By.css('hxp-content-upload-drag-area'));

            expect(uploadDragArea).toBeTruthy();
            expect(uploadDragArea.componentInstance.disabled).toBeTruthy();
        });

        it('should set editable value depending the document permissions', () => {
            (contentBrowser as any).document = ROOT_DOCUMENT;
            contentBrowser.fetchChildren();
            fixture.detectChanges();

            expect((contentBrowser as any).selection).toHaveLength(0);

            let contentRepositoryComponent = fixture.debugElement.query(By.css('hxp-content-repository'));
            contentRepositoryComponent.triggerEventHandler('selectionChanged', [
                { ...jestMocks.nestedDocumentAncestors[0], sys_effectivePermissions: ['Read'] },
            ]);
            fixture.detectChanges();

            expect((contentBrowser as any).selection).toHaveLength(1);
            expect((contentBrowser as any).editablePropertiesSidebar).toBe(false);

            contentRepositoryComponent = fixture.debugElement.query(By.css('hxp-content-repository'));
            contentRepositoryComponent.triggerEventHandler('selectionChanged', [
                { ...jestMocks.nestedDocumentAncestors[0], sys_effectivePermissions: ['ReadWrite'] },
            ]);
            fixture.detectChanges();

            expect((contentBrowser as any).selection).toHaveLength(1);
            expect((contentBrowser as any).editablePropertiesSidebar).toBe(true);
        });

        it('should update document list on paginator events', async () => {
            expect(contentBrowser).toBeTruthy();

            getAllChildrenSpy.mockClear();

            getAllChildrenSpy.mockReturnValue(
                of({
                    documents: Array.from({ length: 25 }).fill(jestMocks.nestedDocumentAncestors[0]),
                    limit: 25,
                    offset: 0,
                    totalCount: 30,
                } as DocumentFetchResults)
            );

            (contentBrowser as any).document = ROOT_DOCUMENT;
            contentBrowser.fetchChildren();
            fixture.detectChanges();

            const paginator = await PaginatorHarnessUtils.getPaginator({
                fixture,
            });
            expect(await paginator.getRangeLabel()).toEqual('1 – 25 of 30');

            const datatable = fixture.debugElement.query(By.css('adf-datatable'));
            expect(datatable).toBeTruthy();

            let rows = fixture.debugElement.queryAll(By.css('.adf-datatable-body adf-datatable-row'));
            expect(rows).toBeTruthy();
            expect(rows).toHaveLength(25);
            for (const row of rows) {
                expect(row.query(By.css('.adf-datatable-cell[title="DOCUMENT_LIST.COLUMNS.TITLE"]')).nativeElement.textContent.trim()).toEqual(
                    jestMocks.nestedDocumentAncestors[0].sys_title
                );
            }

            getAllChildrenSpy.mockClear();

            getAllChildrenSpy.mockReturnValue(
                of({
                    documents: Array.from({ length: 5 }).fill(jestMocks.nestedDocumentAncestors[1]),
                    limit: 25,
                    offset: 25,
                    totalCount: 30,
                } as DocumentFetchResults)
            );

            await paginator.goToNextPage();
            expect(await paginator.getRangeLabel()).toEqual('26 – 30 of 30');

            rows = fixture.debugElement.queryAll(By.css('.adf-datatable-body adf-datatable-row'));
            expect(rows).toBeTruthy();
            expect(rows).toHaveLength(5);
            for (const row of rows) {
                expect(row.query(By.css('.adf-datatable-cell[title="DOCUMENT_LIST.COLUMNS.TITLE"]')).nativeElement.textContent.trim()).toEqual(
                    jestMocks.nestedDocumentAncestors[1].sys_title
                );
            }
        });

        it('should reset pagination offset when the content changes', async () => {
            expect(contentBrowser).toBeTruthy();

            (contentBrowser as any).document = ROOT_DOCUMENT;
            (contentBrowser as any).paginatorConfig.offset = 10;
            fixture.detectChanges();

            expect((contentBrowser as any).paginatorConfig.offset).toBe(10);

            (contentBrowser as any).document = jestMocks.folderDocument;
            contentBrowser.ngOnChanges();
            fixture.detectChanges();

            expect((contentBrowser as any).paginatorConfig.offset).toBe(0);
        });

        it('should close the right property panel upon triggering the close function', () => {
            mockSidebarService.togglePanel('property');
            expect(mockSidebarService.panel()).toBe('property');

            contentBrowser.handleCloseSidebarPanel();

            expect(mockSidebarService.closePanel).toHaveBeenCalled();
            expect(mockSidebarService.panel()).toBeNull();
        });

        it('should close the manage version panel upon triggering the close function', () => {
            mockSidebarService.togglePanel('version');
            expect(mockSidebarService.panel()).toBe('version');

            contentBrowser.handleCloseSidebarPanel();

            expect(mockSidebarService.closePanel).toHaveBeenCalled();
            expect(mockSidebarService.panel()).toBeNull();
        });

        it('should refresh document list when a child document is updated', fakeAsync(() => {
            (contentBrowser as any).document = ROOT_DOCUMENT;
            fixture.detectChanges();

            getAllChildrenSpy.mockClear();

            const updatedChildDocument = {
                sys_id: 'child-id',
                sys_primaryType: 'SysFile',
                sys_parentId: ROOT_DOCUMENT.sys_id,
            };
            documentUpdated$.next({
                document: updatedChildDocument,
                updatedProperties: undefined,
            });

            tick();
            expect(getAllChildrenSpy).toHaveBeenCalled();
        }));

        it('should not refresh document list when an unrelated document is updated', fakeAsync(() => {
            (contentBrowser as any).document = ROOT_DOCUMENT;
            fixture.detectChanges();

            getAllChildrenSpy.mockClear();

            const unrelatedDocument = {
                sys_id: 'unrelated-id',
                sys_primaryType: 'SysFile',
                sys_parentId: 'different-parent-id',
            };
            documentUpdated$.next({
                document: unrelatedDocument,
                updatedProperties: undefined,
            });

            tick();
            expect(getAllChildrenSpy).not.toHaveBeenCalled();
        }));

        it('should pass accessibility checks', async () => {
            (contentBrowser as any).document = {
                ...jestMocks.folderDocument,
                sys_effectivePermissions: [],
            };
            contentBrowser.ngOnChanges();
            fixture.detectChanges();
            await fixture.whenStable();

            const res = await a11yReport('.hxp-main-content-wrapper');

            expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
        });
    });

    describe('as unauthorized user', () => {
        let fixture: ComponentFixture<ContentBrowserComponent>;
        let routeParamEmitter: Subject<any>;

        let getDocumentByIdSpy: jest.SpyInstance;

        beforeEach(async () => {
            routeParamEmitter = new Subject();
            await configureTestingModule([
                documentApiProvider,
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: routeParamEmitter.asObservable(),
                        url: of([{ path: null }]),
                    },
                },
            ]);

            getDocumentByIdSpy = jest.spyOn(mockDocumentService, 'getDocumentById').mockReturnValue(throwError(generateMockError('Forbidden', 403)));
            jest.spyOn(mockDocumentService, 'getAllChildren').mockReturnValue(throwError(generateMockError('Forbidden', 403)));

            fixture = TestBed.createComponent(ContentBrowserComponent);
            fixture.detectChanges();
        });

        afterEach(() => {
            fixture.destroy();
        });

        it('should display an error message when an unauthorized user try to access a forbidden folder', fakeAsync(() => {
            const hxpNotificationService: HxpNotificationService = TestBed.inject(HxpNotificationService);
            const hxpNotificationServiceSpy = jest.spyOn(hxpNotificationService, 'showError');

            expect(hxpNotificationServiceSpy).not.toHaveBeenCalled();

            routeParamEmitter.next({ id: 'unauthorized-folder-id' });
            fixture.detectChanges();
            tick(REFRESH_DEBOUNCE);

            expect(hxpNotificationServiceSpy).toHaveBeenCalledTimes(1);
            expect(hxpNotificationServiceSpy).toHaveBeenCalledWith('CONTENT_BROWSER.DOCUMENT.LOAD_ERROR.403');
        }));

        it('should display an error message when an unauthenticated user try to access the workspace app', fakeAsync(() => {
            getDocumentByIdSpy.mockImplementation(() => throwError(generateMockError('Unauthenticated user', 401)));
            const hxpNotificationService: HxpNotificationService = TestBed.inject(HxpNotificationService);
            const hxpNotificationServiceSpy = jest.spyOn(hxpNotificationService, 'showError');

            expect(hxpNotificationServiceSpy).not.toHaveBeenCalled();

            routeParamEmitter.next({ id: ROOT_DOCUMENT.sys_id });
            fixture.detectChanges();
            tick(REFRESH_DEBOUNCE);

            expect(hxpNotificationServiceSpy).toHaveBeenCalledTimes(1);
            expect(hxpNotificationServiceSpy).toHaveBeenCalledWith('CONTENT_BROWSER.DOCUMENT.LOAD_ERROR.401');
        }));

        it('should display the root folder despite user have no permissions to access', fakeAsync(() => {
            const hxpNotificationService: HxpNotificationService = TestBed.inject(HxpNotificationService);
            const hxpNotificationServiceSpy = jest.spyOn(hxpNotificationService, 'showError');

            expect(hxpNotificationServiceSpy).not.toHaveBeenCalled();

            routeParamEmitter.next({});
            fixture.detectChanges();
            tick(REFRESH_DEBOUNCE);

            expect(hxpNotificationServiceSpy).not.toHaveBeenCalled();
        }));
    });

    describe('document layout feature flag', () => {
        describe('when feature flag is enabled', () => {
            let contentBrowser: ContentBrowserComponent;
            let fixture: ComponentFixture<ContentBrowserComponent>;
            let deletedDocumentSpy: jest.SpyInstance;
            let createDocumentSpy: jest.SpyInstance;

            beforeEach(async () => {
                await configureTestingModule([
                    [UserResolverPipe, IsViewableAsFilePipe],
                    provideMockFeatureFlags({
                        'cic-workspace-document-layout-toggle': true,
                        [ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K]: true,
                    }),
                ]);

                jest.spyOn(mockDocumentService, 'getDocumentById').mockReturnValue(of(ROOT_DOCUMENT));
                (mockDocumentService.getAncestors as jest.Mock).mockImplementation((docId: string) => {
                    if (docId === 'test-filish') {
                        return of([ROOT_DOCUMENT, { sys_id: 'test-filish' } as Document]);
                    }
                    if (docId === 'test-folderish') {
                        return of([ROOT_DOCUMENT, { sys_id: 'test-folderish' } as Document]);
                    }
                    if (docId === 'test-both') {
                        return of([ROOT_DOCUMENT, { sys_id: 'test-both' } as Document]);
                    }
                    return of([ROOT_DOCUMENT]);
                });

                deletedDocumentSpy = jest.spyOn(mockDocumentService, 'deleteDocument');
                mockDeleteDocumentSpy(deletedDocumentSpy);
                createDocumentSpy = jest.spyOn(mockDocumentService, 'createDocument');
                mockCreateDocumentSpy(createDocumentSpy, jestMocks.fileDocument);

                fixture = TestBed.createComponent(ContentBrowserComponent);
                contentBrowser = fixture.componentInstance;
                await new Promise((resolve) => setTimeout(resolve, 100));
                fixture.detectChanges();
            });

            afterEach(() => {
                fixture.destroy();
            });

            it('should display document viewer for file documents', () => {
                (contentBrowser as any).document = jestMocks.fileDocument;
                fixture.detectChanges();
                const documentViewer = fixture.debugElement.query(By.css('hxp-document-viewer'));

                expect(documentViewer).toBeTruthy();
            });

            it('should display document list for folder documents', () => {
                (contentBrowser as any).document = jestMocks.folderDocument;
                fixture.detectChanges();
                const documentList = fixture.debugElement.query(By.css('hxp-document-list'));

                expect(documentList).toBeTruthy();
            });

            it('should display document viewer when document extending SysFile', () => {
                const customFileDocument: Document = {
                    ...jestMocks.fileDocument,
                    sys_primaryType: 'CustomFile',
                };
                (contentBrowser as any).document = customFileDocument;
                fixture.detectChanges();
                const documentViewer = fixture.debugElement.query(By.css('hxp-document-viewer'));

                expect(documentViewer).toBeTruthy();
            });

            it('should display document list when document extending SysFolder', () => {
                const customFolderDocument: Document = {
                    ...jestMocks.folderDocument,
                    sys_primaryType: 'CustomFolder',
                };
                (contentBrowser as any).document = customFolderDocument;
                fixture.detectChanges();
                const documentList = fixture.debugElement.query(By.css('hxp-document-list'));

                expect(documentList).toBeTruthy();
            });

            it('should display document viewer with SysFilish mixin', () => {
                const docWithFilishMixin: Document = {
                    sys_id: 'test-filish',
                    sys_primaryType: 'CustomContentWithFilishOnly',
                    sys_mixinTypes: ['SysFilish'],
                } as Document;

                (contentBrowser as any).document = docWithFilishMixin;
                fixture.detectChanges();
                const documentViewer = fixture.debugElement.query(By.css('hxp-document-viewer'));

                expect(documentViewer).toBeTruthy();
            });

            it('should display document list with SysFolderish mixin', () => {
                const docWithFolderishMixin: Document = {
                    sys_id: 'test-folderish',
                    sys_primaryType: 'CustomContentWithFolderishOnly',
                    sys_mixinTypes: ['SysFolderish'],
                } as Document;
                (contentBrowser as any).document = docWithFolderishMixin;
                fixture.detectChanges();
                const documentList = fixture.debugElement.query(By.css('hxp-document-list'));

                expect(documentList).toBeTruthy();
            });

            it('should display document viewer with both mixins as filish', () => {
                const docWithBothMixinsAndBlob: Document = {
                    sys_id: 'test-both',
                    sys_primaryType: 'CustomContentWithBothMixins',
                    sys_mixinTypes: ['SysFilish', 'SysFolderish'],
                    sysfile_blob: { mimeType: 'application/pdf', size: 1000 },
                } as Document;
                (contentBrowser as any).document = docWithBothMixinsAndBlob;
                fixture.detectChanges();
                const documentViewer = fixture.debugElement.query(By.css('hxp-document-viewer'));

                expect(documentViewer).toBeTruthy();
            });
        });
    });

    describe('pagination range label', () => {
        let translateService: TranslateService;
        let contentBrowser: ContentBrowserComponent;
        let fixture: ComponentFixture<ContentBrowserComponent>;

        beforeEach(async () => {
            await configureTestingModule([]);

            jest.spyOn(mockDocumentService, 'getDocumentById').mockReturnValue(of(ROOT_DOCUMENT));
            jest.spyOn(mockDocumentService, 'getAllChildren').mockReturnValue(
                of({
                    documents: [],
                    limit: 25,
                    offset: 0,
                    totalCount: 0,
                })
            );

            fixture = TestBed.createComponent(ContentBrowserComponent);
            contentBrowser = fixture.componentInstance;
            translateService = TestBed.inject(TranslateService);
            jest.spyOn(translateService, 'instant').mockImplementation((key: string, params: any) => {
                const template = '{{startIndex}} - {{endIndex}} of {{totalPages}}';
                return template
                    .replace('{{startIndex}}', String(params.startIndex))
                    .replace('{{endIndex}}', String(params.endIndex))
                    .replace('{{totalPages}}', String(params.totalPages));
            });

            fixture.detectChanges();
        });

        it('should return localized range label with properly formatted thousand separator when 100k feature is enabled', () => {
            (contentBrowser as any).paginatorConfig.offset = 25;
            (contentBrowser as any).pageSize = 25;
            (contentBrowser as any).paginatorConfig.totalCount = 10000;

            const label = (contentBrowser as any).createPaginationRangeLabel();

            expect(label).toContain('26');
            expect(label).toContain('50');
            expect(label).toContain('10,000');
        });

        it('should return plain number format without thousand separator when 100k feature is disabled', () => {
            (contentBrowser as any).searchResults100KEnabled = false;
            (contentBrowser as any).paginatorConfig.offset = 25;
            (contentBrowser as any).pageSize = 25;
            (contentBrowser as any).paginatorConfig.totalCount = 10000;

            const label = (contentBrowser as any).createPaginationRangeLabel();

            expect(label).toContain('26');
            expect(label).toContain('50');
            expect(label).toContain('10000');
            expect(label).not.toContain('10,000');
        });
    });
});
