/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HxpContentServicesSidenavComponent } from './hxp-sidenav.component';
import { SidenavExpansionService } from '@hxp/workspace-hxp/shared/services';
import { MockComponent, MockProvider } from 'ng-mocks';
import { DocumentService, DocumentRouterService } from '@alfresco/adf-hx-content-services/services';
import { Subject } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { FolderIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { ChangeDetectorRef } from '@angular/core';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NavigationEnd, Router } from '@angular/router';
import { jestMocks, a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { mockHxcsJsClientConfigurationService, ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { MatExpansionModule } from '@angular/material/expansion';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { HxpWorkspaceDocumentTreeComponent } from '@hxp/workspace-hxp/shared/workspace-document-tree';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

class MockRouter {
    public events = new Subject<any>();
    public url = '/';

    navigate(url: string) {
        this.url = url;
        return Promise.resolve(true);
    }
}

class MockDocumentService {
    public documentLoaded$ = new Subject<Document>();
}

class MockSidenavExpansionService {
    isSideNavExpanded() {
        return true;
    }
}

describe('HxpContentServicesSidenavComponent', () => {
    let component: HxpContentServicesSidenavComponent;
    let fixture: ComponentFixture<HxpContentServicesSidenavComponent>;
    let router: MockRouter;
    let documentService: MockDocumentService;
    let sidenavExpansionService: MockSidenavExpansionService;
    let documentRouterService: DocumentRouterService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                FolderIconComponent,
                NoopTranslateModule,
                MatExpansionModule,
                BrowserAnimationsModule,
                MatIconTestingModule,
                HxpContentServicesSidenavComponent,
            ],
            providers: [
                mockHxcsJsClientConfigurationService,
                SidenavExpansionService,
                ChangeDetectorRef,
                MockProvider(DocumentRouterService, {
                    navigateTo: jest.fn(),
                }),
                { provide: Router, useClass: MockRouter },
                { provide: DocumentService, useClass: MockDocumentService },
                {
                    provide: SidenavExpansionService,
                    useClass: MockSidenavExpansionService,
                },
            ],
        })
            .overrideComponent(HxpContentServicesSidenavComponent, {
                remove: { imports: [HxpWorkspaceDocumentTreeComponent] },
                add: { imports: [MockComponent(HxpWorkspaceDocumentTreeComponent)] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(HxpContentServicesSidenavComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router) as unknown as MockRouter;
        documentService = TestBed.inject(DocumentService) as unknown as MockDocumentService;
        sidenavExpansionService = TestBed.inject(SidenavExpansionService);
        documentRouterService = TestBed.inject(DocumentRouterService);

        fixture.detectChanges();
    });

    afterEach(() => {
        documentService.documentLoaded$.complete();
    });

    it('should initialize with the correct state', () => {
        expect(component['isSideNavExpanded']).toBe(true);
        expect(component['document']).toBeNull();
        expect(component['isContentBrowserRouteActive']).toBe(false);
    });

    it('should update the document when a new document is loaded', () => {
        const mockDocument: Document = jestMocks.fileDocument;
        documentService.documentLoaded$.next(mockDocument);
        fixture.detectChanges();

        expect(component['document']).toEqual(mockDocument);
    });

    it('should navigate to root document', waitForAsync(() => {
        component.navigateToRoot();
        fixture.whenStable().then(() => {
            fixture.detectChanges();
            expect(documentRouterService.navigateTo).toHaveBeenCalledWith(ROOT_DOCUMENT);
        });
    }));

    it('should navigate to a specific document', waitForAsync(() => {
        const mockDocument: Document = jestMocks.fileDocument;
        component.navigateToDocument(mockDocument);
        fixture.whenStable().then(() => {
            fixture.detectChanges();
            expect(documentRouterService.navigateTo).toHaveBeenCalledWith(mockDocument);
        });
    }));

    it('should detect route changes and update state accordingly', () => {
        router.events.next(new NavigationEnd(1, '/documents', '/documents'));
        fixture.detectChanges();
        expect(component['isContentBrowserRouteActive']).toBe(true);

        router.events.next(new NavigationEnd(1, '/other-route', '/other-route'));
        fixture.detectChanges();
        expect(component['isContentBrowserRouteActive']).toBe(false);
    });

    it('should return correct expansion state', () => {
        component.data = { state: 'expanded' };
        expect(component.isExpanded()).toBe(true);

        component.data = { state: 'collapsed' };
        expect(component.isExpanded()).toBe(false);
    });

    it('should initialize with the correct expansion state from the service', () => {
        const isExpanded = sidenavExpansionService.isSideNavExpanded();
        expect(component['isSideNavExpanded']).toBe(isExpanded);
    });

    it('should pass accessibility checks', async () => {
        component.data = { state: 'expanded' };
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport('.hxp-sidenav-content-services-container');

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
