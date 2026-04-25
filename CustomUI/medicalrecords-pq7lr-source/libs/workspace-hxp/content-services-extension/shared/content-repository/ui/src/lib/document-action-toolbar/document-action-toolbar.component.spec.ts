/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DocumentActionToolbarComponent } from './document-action-toolbar.component';
import {
    DocumentMoreMenuItemsFactoryService,
    DocumentService,
} from '@alfresco/adf-hx-content-services/services';
import { ContentActionRef, ExtensionService } from '@alfresco/adf-extensions';
import { of } from 'rxjs';
import { a11yReport, mocks } from '@hxp/workspace-hxp/shared/testing';
import { HttpClientModule } from '@angular/common/http';
import { NoopTranslateModule, ToolbarComponent } from '@alfresco/adf-core';
import { MockComponent } from 'ng-mocks';
import { SelectedItemCountComponent } from '../selected-item-count/selected-item-count.component';
import {
    ContentDeleteButtonComponent,
    ContentPropertiesViewerButtonComponent,
    ContentShareButtonComponent,
    DocumentMoreActionComponent,
    ManageColumnButtonComponent,
    SingleItemDownloadButtonComponent,
} from '@alfresco/adf-hx-content-services/ui';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { MatButtonModule } from '@angular/material/button';
import { By } from '@angular/platform-browser';

const MockContentPropertiesViewerButtonComponent = MockComponent(ContentPropertiesViewerButtonComponent);
const MockContentDeleteComponent = MockComponent(ContentDeleteButtonComponent);
const MockSingleItemDownloadButtonComponent = MockComponent(SingleItemDownloadButtonComponent);
const MockContentShareButtonComponent = MockComponent(ContentShareButtonComponent);
const MockDocumentMoreActionComponent = MockComponent(DocumentMoreActionComponent);

const DOCUMENT_MORE_ACTION_REF = {
    id: 'app.document.more',
    type: 'menu',
    order: 10000,
    icon: 'more_vert',
    title: 'APP.ACTIONS.MORE',
    children: [
        {
            id: 'document.move',
            order: 200,
            type: 'custom',
            component: 'document.move',
            rules: {
                visible: 'app.canShowMove',
            },
        },
        {
            id: 'document.copy',
            order: 200,
            type: 'custom',
            component: 'document.copy',
        },
        {
            id: 'document.permissions_management',
            order: 200,
            type: 'custom',
            component: 'document.permissions_management',
        },
    ],
};

const EXTENSION_CONFIG = {
    $schema: '../../../extension.schema.json',
    $id: 'app.core',
    $name: 'app.core',
    $version: '0.0.1',
    $vendor: 'Alfresco Software, Ltd.',
    $license: 'LGPL-3.0',
    $runtime: '1.7.0',
    $description: 'Core application extensions and features',
    $references: [],
    $ignoreReferenceList: [],
    features: {
        header: [
            {
                id: 'app.header.more',
                type: 'menu',
                order: 10000,
                icon: 'more_vert',
                title: 'APP.ACTIONS.MORE',
                children: [
                    {
                        id: 'app.logout',
                        order: 200,
                        type: 'custom',
                        component: 'app.logout',
                        rules: {
                            visible: 'app.canShowLogout',
                        },
                    },
                ],
            },
        ],
        document: [DOCUMENT_MORE_ACTION_REF],
    },
};

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('DocumentActionToolbarComponent', () => {
    let component: DocumentActionToolbarComponent;
    let fixture: ComponentFixture<DocumentActionToolbarComponent>;
    let documentMoreMenuItemsFactoryService: DocumentMoreMenuItemsFactoryService;

    beforeEach(() => {
        const mockDocumentService = {
            getDocumentById: jest.fn().mockReturnValue(of(mocks.fileDocument)),
            documentUpdated$: of({ document: mocks.fileDocument }),
        };

        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                NoopTranslateModule,
                ToolbarComponent,
                MatButtonModule,
                MockComponent(ManageColumnButtonComponent),
                DocumentActionToolbarComponent,
                SelectedItemCountComponent,
            ],
            providers: [
                { provide: DocumentService, useValue: mockDocumentService },
                { provide: ExtensionService, useValue: { setup$: of(EXTENSION_CONFIG) } },
                DocumentMoreMenuItemsFactoryService,
                { provide: FeaturesServiceToken, useValue: { isOn$: () => of(true) } },
            ],
        }).overrideComponent(DocumentActionToolbarComponent, {
            remove: {
                imports: [
                    ContentPropertiesViewerButtonComponent,
                    ContentDeleteButtonComponent,
                    SingleItemDownloadButtonComponent,
                    ContentShareButtonComponent,
                    DocumentMoreActionComponent,
                ],
            },
            add: {
                imports: [
                    MockContentPropertiesViewerButtonComponent,
                    MockContentDeleteComponent,
                    MockSingleItemDownloadButtonComponent,
                    MockContentShareButtonComponent,
                    MockDocumentMoreActionComponent,
                ],
            },
        });

        documentMoreMenuItemsFactoryService = TestBed.inject(DocumentMoreMenuItemsFactoryService);
        fixture = TestBed.createComponent(DocumentActionToolbarComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('actionContext', { documents: [] });
        fixture.componentRef.setInput('selection', []);
    });

    it('should load more menu properly', (done) => {
        documentMoreMenuItemsFactoryService.getMoreMenuItems().subscribe({
            next: (actionRef: ContentActionRef) => {
                expect(actionRef.type).toEqual('menu');
                expect(actionRef.children?.length).toBeGreaterThan(0);
                const moveMenuRef = actionRef.children?.find((ref) => (ref.id = 'document.move'));
                const copyMenuRef = actionRef.children?.find((ref) => (ref.id = 'document.copy'));
                const permissionMenuRef = actionRef.children?.find((ref) => (ref.id = 'document.permissions_management'));
                expect(moveMenuRef).toBeDefined();
                expect(copyMenuRef).toBeDefined();
                expect(permissionMenuRef).toBeDefined();
                done();
            },
        });
    });

    it('should hide toolbar when no actions are available', async () => {
        fixture.componentRef.setInput('selection', []);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const toolbar = fixture.debugElement.query(By.css('.hxp-document-action-toolbar'));

        expect(toolbar).toBeTruthy();
        expect(component.hasVisibleActions()).toBe(false);

        const isHidden = toolbar?.nativeElement.classList.contains('hxp-document-action-toolbar-hidden');

        expect(isHidden).toBe(true);
    });

    it('should pass accessibility checks', waitForAsync(async () => {
        fixture.componentRef.setInput('selection', [mocks.fileDocument]);
        await fixture.whenStable();
        fixture.detectChanges();

        const res = await a11yReport('.hxp-document-action-toolbar');

        expect(res.violations).toEqual(EXPECTED_VIOLATIONS);
    }));
});
