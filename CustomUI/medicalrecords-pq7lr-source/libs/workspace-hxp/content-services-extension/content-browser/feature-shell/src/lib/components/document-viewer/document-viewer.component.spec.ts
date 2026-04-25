/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Document, ModelApi } from '@hylandsoftware/hxcs-js-client';
import { DocumentViewerComponent } from './document-viewer.component';
import { MockProvider, MockService, ngMocks } from 'ng-mocks';
import { CardViewItem, NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import { a11yReport, generateMockResponse, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import localeEn from '@angular/common/locales/en';
import localeEnExtra from '@angular/common/locales/extra/en';
import { signal } from '@angular/core';
import { mockHxcsJsClientConfigurationService, ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import {
    DocumentService,
    DocumentUpdateInfo,
    RenditionsService,
    UserService,
    RouterExtService,
    DocumentPropertiesService,
    BlobDownloadService,
    PermissionsManagementFacade,
    DocumentRouterService,
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
    DocumentCacheService,
    DOCUMENT_PROPERTIES_SERVICE,
    IDENTITY_USER_SERVICE_TOKEN,
    ManageVersionsButtonActionService,
    UserResolverService,
    SidebarService,
    HXP_DOCUMENT_INFO_ACTION_SERVICE,
    DocumentModelService,
    DocumentModel,
} from '@alfresco/adf-hx-content-services/services';
import { DeleteButtonActionService, ContentPropertyViewerActionService } from '@alfresco/adf-hx-content-services/ui';
import { provideAdfEnterpriseAdfHxContentServices } from '@alfresco/adf-hx-content-services';
import { provideContentServicesExtensionContentBrowserFeatureShell } from '../../content-services-extension-content-browser-feature-shell.providers';
import { ActivatedRoute } from '@angular/router';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatDividerHarness } from '@angular/material/divider/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

registerLocaleData(localeEn, 'en', localeEnExtra);

interface ExtendedCardViewItem extends CardViewItem {
    isEmpty: () => boolean;
}

// https://hyland.atlassian.net/browse/HXCS-3944
const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('DocumentViewerComponent', () => {
    let documentViewer: DocumentViewerComponent;
    let fixture: ComponentFixture<DocumentViewerComponent>;
    let loader: HarnessLoader;
    let downloadBlobSpy: jest.SpyInstance;
    let listRenditionsSpy: jest.SpyInstance;
    let requestRenditionCreationSpy: jest.SpyInstance;
    let getRenditionSpy: jest.SpyInstance;
    let extractSchemasSpy: jest.SpyInstance;
    let defaultPropertiesSpy: jest.SpyInstance;
    let otherPropertiesSpy: jest.SpyInstance;
    let sidebarPanelSpy: any;
    let togglePanelSpy: jest.Mock;
    let closePanelSpy: jest.Mock;

    const mockManageVersionsButtonActionService = MockService(ManageVersionsButtonActionService);
    const mockUserResolverService = MockService(UserResolverService);
    const mockBlobDownloadService = MockService(BlobDownloadService);
    const mockDocumentService = MockService(DocumentService);
    const mockRenditionsService = MockService(RenditionsService);
    const mockModelApi: ModelApi = MockService(ModelApi);
    const mockDocumentPropertiesService = MockService(DocumentPropertiesService);
    const mockRouterExtService = MockService(RouterExtService);
    const mockDocumentRouterService = MockService(DocumentRouterService);
    const mockDocumentModel = new DocumentModel(jestMocks.modelApi as any);
    const mockDocumentModelService = {
        getModel: jest.fn().mockReturnValue(of(mockDocumentModel)),
    };

    const panelSignal = signal<any>(null);
    const mockSidebarService: any = {
        panel: panelSignal.asReadonly(),
        togglePanel: jest.fn().mockImplementation((panelType: any) => {
            panelSignal.set(panelType);
        }),
        closePanel: jest.fn().mockImplementation(() => {
            panelSignal.set(null);
        }),
    };

    const documentLoaded$ = new Subject<Document>();
    const documentDeleted$ = new Subject<string>();
    const documentUpdated$ = new Subject<DocumentUpdateInfo>();
    const documentRestored$ = new Subject<Document>();
    const mockDefaultCardViewItems: ExtendedCardViewItem[] = [
        {
            label: '"Title"',
            value: 'Test-2023',
            key: 'sys_title',
            type: 'text',
            displayValue: 'Test-2023',
            isEmpty: () => false,
        },
        {
            label: 'Filename',
            value: 'Jun-2023.pdf',
            key: 'sysfile_blob.filename',
            type: 'text',
            displayValue: 'Filename',
            isEmpty: () => false,
        },
    ];
    const mockOtherCardViewItems: ExtendedCardViewItem[] = [
        {
            label: 'DOCUMENT.PROPERTIES.TEST.STRING',
            value: 'test string',
            key: 'test_string',
            type: 'text',
            displayValue: 'TEST_STRING',
            isEmpty: () => false,
        },
        {
            label: 'DOCUMENT.PROPERTIES.TEST.BOOLEAN',
            value: 'test boolean',
            key: 'test_boolean',
            type: 'boolean',
            displayValue: 'TEST_BOOLEAN',
            isEmpty: () => false,
        },
    ];

    let mockActivatedRoute: any;
    let windowScrollTo: typeof globalThis.scrollTo;
    beforeEach(() => {
        windowScrollTo = globalThis.scrollTo;
        globalThis.scrollTo = jest.fn();
        mockActivatedRoute = {
            url: new Subject(),
        };

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, DocumentViewerComponent, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                provideAdfEnterpriseAdfHxContentServices(),
                provideContentServicesExtensionContentBrowserFeatureShell(),
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: RouterExtService, useValue: mockRouterExtService },
                MockProvider(UserService),
                mockHxcsJsClientConfigurationService,
                { provide: DocumentService, useValue: mockDocumentService },
                {
                    provide: BlobDownloadService,
                    useValue: mockBlobDownloadService,
                },
                { provide: RenditionsService, useValue: mockRenditionsService },
                {
                    provide: PermissionsManagementFacade,
                    useValue: {
                        api: {
                            title$: of('Fake title'),
                            isUntouched$: of(false),
                        },
                        onInitializePermissionsManagement: () => {},
                    },
                },
                {
                    provide: DocumentRouterService,
                    useValue: mockDocumentRouterService,
                },
                DocumentCacheService,
                {
                    provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
                    useClass: DeleteButtonActionService,
                },
                {
                    provide: DOCUMENT_PROPERTIES_SERVICE,
                    useValue: mockDocumentPropertiesService,
                },
                {
                    provide: ManageVersionsButtonActionService,
                    useValue: mockManageVersionsButtonActionService,
                },
                {
                    provide: UserResolverService,
                    useValue: mockUserResolverService,
                },
                {
                    provide: SidebarService,
                    useValue: mockSidebarService,
                },
                {
                    provide: HXP_DOCUMENT_INFO_ACTION_SERVICE,
                    useClass: ContentPropertyViewerActionService,
                },
                {
                    provide: IDENTITY_USER_SERVICE_TOKEN,
                    useValue: {
                        getCurrentUserInfo: () => ({
                            id: '0000-fake-user-uuid-0000',
                        }),
                    },
                },
                {
                    provide: DocumentModelService,
                    useValue: mockDocumentModelService,
                },
                provideMockFeatureFlags({
                    'cic-workspace-document-layout-toggle': false,
                }),
            ],
        });

        mockDocumentService.documentLoaded$ = documentLoaded$.asObservable();
        mockDocumentService.documentUpdated$ = documentUpdated$.asObservable();
        mockDocumentService.documentDeleted$ = documentDeleted$.asObservable();
        mockDocumentService.documentRestored$ = documentRestored$.asObservable();

        sidebarPanelSpy = mockSidebarService.panel;
        togglePanelSpy = mockSidebarService.togglePanel as jest.Mock;
        closePanelSpy = mockSidebarService.closePanel as jest.Mock;

        ngMocks.autoSpy('jest');
        downloadBlobSpy = jest.spyOn(mockBlobDownloadService, 'downloadBlob')
            .mockImplementation(() => of(new Blob()));

        listRenditionsSpy = jest.spyOn(mockRenditionsService, 'listRenditions').mockReturnValue(of([]));

        requestRenditionCreationSpy = jest.spyOn(mockRenditionsService, 'requestRenditionCreation')
            .mockReturnValue(of(jestMocks.renditionPending));

        getRenditionSpy = jest.spyOn(mockRenditionsService, 'getRendition')
            .mockReturnValue(of(jestMocks.renditionCompleted));

        jest.spyOn(mockDocumentService, 'getAncestors')
            .mockImplementation((docId: string) => {
                if (docId === jestMocks.versionSupportedDocument.sys_id) {
                    return of([ROOT_DOCUMENT, jestMocks.versionSupportedDocument]);
                }
                return of([ROOT_DOCUMENT, jestMocks.fileDocument]);
            });

        jest.spyOn(mockDocumentService, 'getDocumentById').mockReturnValue(of(ROOT_DOCUMENT));

        jest.spyOn(mockModelApi, 'getModel').mockReturnValue(generateMockResponse({ data: jestMocks.modelApi }));

        extractSchemasSpy = jest.spyOn(mockDocumentPropertiesService, 'extractSchemas').mockReturnValue(of([]));

        jest.spyOn(mockDocumentPropertiesService, 'getRequiredProperties').mockReturnValue([]);

        defaultPropertiesSpy = jest.spyOn(mockDocumentPropertiesService, 'getDefaultPropertiesFromDocument').mockReturnValue(of(mockDefaultCardViewItems));

        otherPropertiesSpy = jest.spyOn(mockDocumentPropertiesService, 'getPropertiesFromDocument').mockReturnValue(of(mockOtherCardViewItems));

        fixture = TestBed.createComponent(DocumentViewerComponent);
        documentViewer = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
        fixture.detectChanges();
    });

    afterEach(() => {
        extractSchemasSpy.mockClear();
        downloadBlobSpy.mockClear();
        defaultPropertiesSpy.mockClear();
        otherPropertiesSpy.mockClear();
        listRenditionsSpy.mockClear();
        requestRenditionCreationSpy.mockClear();
        getRenditionSpy.mockClear();
        togglePanelSpy.mockClear();
        closePanelSpy.mockClear();
        panelSignal.set(null);
        fixture.destroy();
        globalThis.scrollTo = windowScrollTo;
    });

    it("should not fetch blob if document doesn't have one", () => {
        expect(documentViewer).toBeTruthy();
        expect(downloadBlobSpy).not.toHaveBeenCalled();

        const fileWithoutBlob = {
            ...jestMocks.fileDocument,
            sysfile_blob: undefined,
        };

        documentViewer.document = fileWithoutBlob;
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        const viewer = fixture.debugElement.query(By.css('adf-viewer'));
        expect(viewer).toBeTruthy();

        expect(downloadBlobSpy).not.toHaveBeenCalled();
    });

    it('should fetch document main blob to preview', () => {
        expect(documentViewer).toBeTruthy();
        expect(downloadBlobSpy).not.toHaveBeenCalled();

        documentViewer.document = jestMocks.fileDocument;
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        expect(downloadBlobSpy).toHaveBeenCalled();
    });

    it('should display the document breadcrumb', async () => {
        expect(documentViewer).toBeTruthy();

        documentViewer.document = jestMocks.fileDocument;
        documentLoaded$.next(jestMocks.fileDocument);
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        const documentBreadcrumb = fixture.debugElement.query(By.css('hxp-breadcrumb'));
        expect(documentBreadcrumb).toBeTruthy();
    });

    it('should display document actions', async () => {
        expect(documentViewer).toBeTruthy();

        documentViewer.document = jestMocks.fileDocument;
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        const customActions = fixture.debugElement.query(By.css('#document-viewer-custom-actions'));
        expect(customActions).toBeTruthy();
        expect(customActions.children).toHaveLength(5); // 5 actions: download, share, delete, manage versions, properties

        await ButtonHarnessUtils.getButton({
            fixture,
            buttonFilters: {
                selector: '#document-viewer-fullscreen',
            },
        });
    });

    it('should navigate to parent on back', async () => {
        expect(documentViewer).toBeTruthy();

        const redirectToRefererSpy = jest.spyOn(mockRouterExtService, 'redirectToReferer');
        jest.spyOn(documentViewer, 'onClose');

        const urlForParentSpy = jest.spyOn(mockDocumentRouterService, 'urlForParent').mockReturnValue('parent_document_url');

        documentViewer.document = jestMocks.fileDocument;
        (documentViewer as any).refererURL = 'your_referer_url';
        fixture.detectChanges();

        expect(redirectToRefererSpy).not.toHaveBeenCalled();
        expect(urlForParentSpy).not.toHaveBeenCalled();

        await ButtonHarnessUtils.clickButton({
            fixture,
            buttonFilters: {
                selector: '#document-viewer-close-button',
            },
        });

        expect(urlForParentSpy).toHaveBeenCalledWith(jestMocks.fileDocument);
        expect(redirectToRefererSpy).toHaveBeenCalledWith((documentViewer as any).refererURL, 'parent_document_url');
    });

    it('should redirect to search result page when viewer opened from search result', async () => {
        expect(documentViewer).toBeTruthy();
        documentViewer.document = jestMocks.fileDocument;
        (documentViewer as any).refererURL = '/search?query=test';
        fixture.detectChanges();

        const redirectToRefererSpy = jest.spyOn(mockRouterExtService, 'redirectToReferer');
        const urlForParentSpy = jest.spyOn(mockDocumentRouterService, 'urlForParent').mockReturnValue('parent_document_url');

        await ButtonHarnessUtils.clickButton({
            fixture,
            buttonFilters: {
                selector: '#document-viewer-close-button',
            },
        });

        expect(urlForParentSpy).toHaveBeenCalledWith(jestMocks.fileDocument);
        expect(redirectToRefererSpy).toHaveBeenCalledWith('/search?query=test', 'parent_document_url');
    });

    it('should set editablePropertiesSidebar to true if document has READ_WRITE permission', () => {
        documentViewer.document = { ...jestMocks.fileDocument, sys_effectivePermissions: ['ReadWrite'] };
        documentViewer.ngOnChanges();
        expect((documentViewer as any).editablePropertiesSidebar).toBe(true);
    });

    it('should set editablePropertiesSidebar to false if document does not have READ_WRITE permission', () => {
        documentViewer.document = { ...jestMocks.fileDocument, sys_effectivePermissions: ['Read'] };
        documentViewer.ngOnChanges();
        expect((documentViewer as any).editablePropertiesSidebar).toBe(false);
    });

    it('should update actionContext when document changes', () => {
        documentViewer.document = jestMocks.fileDocument;
        documentViewer.ngOnChanges();
        expect(documentViewer.actionContext.documents).toEqual([jestMocks.fileDocument]);
        expect(documentViewer.actionContext.shouldRedirect).toBe(true);
        expect(documentViewer.actionContext.refererURL).toBeUndefined(); // refererURL is not set in this mock document, it should be undefined
    });

    it('should display document properties sidebar on clicking document-properties-viewer-info-button', async () => {
        documentViewer.document = jestMocks.fileDocument;
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        expect(sidebarPanelSpy()).toBeNull();

        await ButtonHarnessUtils.clickButton({
            fixture,
            buttonFilters: {
                selector: '[data-automation-id="document-properties-viewer-button"]',
            },
        });

        expect(togglePanelSpy).toHaveBeenCalledWith('property');
        expect(sidebarPanelSpy()).toBe('property');

        fixture.detectChanges();
        await fixture.whenStable();

        const metadataSidebar = fixture.debugElement.query(By.css('hxp-metadata-sidebar'));

        expect(metadataSidebar).toBeTruthy();
    });

    it('should not call rendition if mimeType is natively supported', () => {
        documentViewer.document = jestMocks.viewerSupportedDocument;
        expect(downloadBlobSpy).not.toHaveBeenCalled();

        documentViewer.ngOnChanges();
        fixture.detectChanges();

        expect(listRenditionsSpy).not.toHaveBeenCalled();
        expect(requestRenditionCreationSpy).not.toHaveBeenCalled();
        expect(getRenditionSpy).not.toHaveBeenCalled();

        expect(downloadBlobSpy).toHaveBeenCalled();
    });

    it('should call rendition if mimeType is not natively supported', fakeAsync(() => {
        documentViewer.document = jestMocks.viewerNotSupportedDocument;
        expect(listRenditionsSpy).not.toHaveBeenCalled();
        expect(requestRenditionCreationSpy).not.toHaveBeenCalled();
        expect(getRenditionSpy).not.toHaveBeenCalled();

        documentViewer.ngOnChanges();
        fixture.detectChanges();

        expect(listRenditionsSpy).toHaveBeenCalled();
        expect(requestRenditionCreationSpy).toHaveBeenCalled();

        tick();

        expect(getRenditionSpy).toHaveBeenCalled();
    }));

    it('should not request rendition if already exists', fakeAsync(() => {
        documentViewer.document = jestMocks.viewerNotSupportedDocument;
        listRenditionsSpy.mockReturnValue(of([jestMocks.renditionCompleted]));

        expect(listRenditionsSpy).not.toHaveBeenCalled();
        expect(requestRenditionCreationSpy).not.toHaveBeenCalled();
        expect(getRenditionSpy).not.toHaveBeenCalled();

        documentViewer.ngOnChanges();
        fixture.detectChanges();

        expect(listRenditionsSpy).toHaveBeenCalled();

        tick();

        expect(requestRenditionCreationSpy).not.toHaveBeenCalled();

        tick();

        expect(getRenditionSpy).toHaveBeenCalled();
    }));

    it('should poll for rendition while pending', fakeAsync(() => {
        documentViewer.document = jestMocks.viewerNotSupportedDocument;
        listRenditionsSpy.mockReturnValue(of([jestMocks.renditionPending]));
        getRenditionSpy.mockReturnValue(of(jestMocks.renditionPending));

        expect(listRenditionsSpy).not.toHaveBeenCalled();
        expect(requestRenditionCreationSpy).not.toHaveBeenCalled();
        expect(getRenditionSpy).not.toHaveBeenCalled();

        documentViewer.ngOnChanges();
        fixture.detectChanges();

        expect(listRenditionsSpy).toHaveBeenCalled();

        tick();

        expect(getRenditionSpy).toHaveBeenCalled();

        tick(2000);

        expect(getRenditionSpy).toHaveBeenCalledTimes(3); // Check if component is polling for rendition

        discardPeriodicTasks();
    }));

    it('should retain panel state across document updates', async () => {
        documentViewer.document = jestMocks.fileDocument;
        documentViewer.ngOnChanges();
        fixture.detectChanges();
        expect(sidebarPanelSpy()).toBeNull();

        // Open properties panel
        togglePanelSpy('property');
        fixture.detectChanges();
        expect(sidebarPanelSpy()).toBe('property');

        // Simulate document update
        const updatedProperties = new Map<string, any>([['sys_primaryType', 'SysFolder']]);
        documentUpdated$.next({ document: { ...jestMocks.fileDocument, sys_primaryType: 'SysFolder' }, updatedProperties });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(documentViewer.document.sys_primaryType).toBe('SysFolder');
        // Panel remains open (since SidebarService unchanged)
        expect(sidebarPanelSpy()).toBe('property');
    });

    it('should pass accessibility checks', async () => {
        documentViewer.document = jestMocks.viewerSupportedDocument;
        documentViewer.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        const res = await a11yReport('#hxp-viewer');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });

    it('should update properties when document sys_id matches', () => {
        const updatedDoc = jestMocks.fileDocument;
        documentViewer.document = updatedDoc;
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        documentUpdated$.next({
            document: updatedDoc,
            updatedProperties: undefined,
        });

        expect(documentViewer.document).toEqual(updatedDoc);
        expect(documentViewer['editablePropertiesSidebar']).toBe(true);
        expect(documentViewer.actionContext.documents).toEqual([updatedDoc]);
    });

    it('should not update properties when document sys_id does not match', () => {
        const initialDoc = jestMocks.fileDocument;
        documentViewer.document = initialDoc;
        documentViewer.ngOnChanges();
        fixture.detectChanges();

        const initialSidebarState = documentViewer['editablePropertiesSidebar'];
        const initialActionContext = { ...documentViewer.actionContext };
        const updatedDoc = {
            sys_id: '456',
            sys_primaryType: 'SysFile',
        } as Document;

        documentUpdated$.next({
            document: updatedDoc,
            updatedProperties: undefined,
        });

        expect(documentViewer.document).toEqual(initialDoc);
        expect(documentViewer['editablePropertiesSidebar']).toBe(initialSidebarState);
        expect(documentViewer.actionContext).toEqual(initialActionContext);
    });

    describe('More menu availability', () => {
        it('should initialize hasMoreMenu signal as false', () => {
            expect(documentViewer.hasMoreMenu()).toBe(false);
        });

        it('should update hasMoreMenu when availabilityStatus event is emitted with false', () => {
            documentViewer.hasMoreMenu.set(false);

            expect(documentViewer.hasMoreMenu()).toBe(false);
        });

        it('should update hasMoreMenu when availabilityStatus event is emitted with true', () => {
            documentViewer.hasMoreMenu.set(true);

            expect(documentViewer.hasMoreMenu()).toBe(true);
        });

        it('should conditionally show toolbar divider when hasMoreMenu is true', async () => {
            documentViewer.document = jestMocks.fileDocument;
            documentViewer.hasMoreMenu.set(false);
            fixture.detectChanges();
            const dividersWhenFalse = (await loader.getAllHarnesses(MatDividerHarness)).length;
            documentViewer.hasMoreMenu.set(true);
            fixture.detectChanges();
            const dividersWhenTrue = (await loader.getAllHarnesses(MatDividerHarness)).length;

            expect(dividersWhenTrue).toBe(dividersWhenFalse + 1);
        });

        it('should pass availabilityStatus event handler to hxp-document-more-action component', () => {
            documentViewer.document = jestMocks.fileDocument;
            fixture.detectChanges();
            const moreActionComponent = fixture.debugElement.query(By.css('hxp-document-more-action'));

            expect(moreActionComponent).toBeTruthy();
        });
    });
});
