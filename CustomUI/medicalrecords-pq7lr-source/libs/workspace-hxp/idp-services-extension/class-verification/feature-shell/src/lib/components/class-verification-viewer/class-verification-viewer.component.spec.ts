/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ClassVerificationViewerComponent } from './class-verification-viewer.component';
import { IdpDocumentService } from '../../services/document/idp-document.service';
import { IdpImageLoadingService } from '../../services/image/idp-image-loading.service';
import { IdpDocumentToolbarService } from '../../services/document/idp-document-toolbar.service';
import { mockIdpDocuments } from '../../models/mocked/mocked-documents';
import { provideMockStore } from '@ngrx/store/testing';
import { classVerificationStateName, initialClassVerificationRootState } from '../../store/states/root.state';
import { documentAdapter, initialDocumentState } from '../../store/states/document.state';
import { documentClassAdapter, initialDocumentClassState } from '../../store/states/document-class.state';
import { IdpSharedImageLoadingService } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpViewerEventTypes } from '@hyland/idp-document-viewer';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ClassVerificationViewerComponent', () => {
    let component: ClassVerificationViewerComponent;
    let fixture: ComponentFixture<ClassVerificationViewerComponent>;
    let idpDocumentToolbarServiceMock: jasmine.SpyObj<IdpDocumentToolbarService>;
    let idpImageLoadingService: jasmine.SpyObj<IdpImageLoadingService>;
    let idpDocumentServiceMock: jasmine.SpyObj<IdpDocumentService>;
    let selectedDocumentsSubject: BehaviorSubject<any>;

    const mockedDocuments = mockIdpDocuments();

    beforeEach(() => {
        idpDocumentToolbarServiceMock = jasmine.createSpyObj<IdpDocumentToolbarService>(
            'IdpDocumentToolbarService',
            ['handleMovePageAndCreateNewDoc', 'handlePageSplit', 'handlePageSplit', 'handleMovePages'],
            {
                documentToolBarItems$: of([]),
            }
        );

        selectedDocumentsSubject = new BehaviorSubject(mockedDocuments);
        idpDocumentServiceMock = jasmine.createSpyObj<IdpDocumentService>(
            'IdpDocumentService',
            ['toggleExpandDocument', 'getDocumentsForClass', 'togglePreviewedDocument', 'changeFullScreen', 'updatePagesRotation'],
            {
                selectedDocuments$: selectedDocumentsSubject.asObservable(),
                allDocumentsValid$: of(true),
            }
        );

        const mockState = {
            [classVerificationStateName]: {
                ...initialClassVerificationRootState,
                documents: documentAdapter.setAll([], initialDocumentState),
                documentClasses: documentClassAdapter.setAll([], initialDocumentClassState),
            },
        };

        idpImageLoadingService = jasmine.createSpyObj<IdpImageLoadingService>('IdpImageLoadingService', ['getImageDataForPage$', 'cleanup']);
        idpImageLoadingService.getImageDataForPage$.and.returnValue(of(undefined));
        idpImageLoadingService.cleanup.and.callFake(() => {});

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, ClassVerificationViewerComponent, SatIconModule, MatIconTestingModule],
            providers: [
                provideMockStore({
                    initialState: mockState,
                    selectors: [],
                }),
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                { provide: IdpImageLoadingService, useValue: idpImageLoadingService },
                IdpSharedImageLoadingService,
            ],
        });

        fixture = TestBed.createComponent(ClassVerificationViewerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should call changeFullScreen with true state if full screen enter event has been fired', () => {
        const event = {
            type: IdpViewerEventTypes.FullScreenEnter,
            timestamp: '',
            data: {
                dataSourceRef: [
                    {
                        pageId: '1',
                        documentId: 'documentId',
                    },
                ],
                newValue: {
                    fullscreen: true,
                },
            },
        };
        component.onViewerEvent(event);
        expect(idpDocumentServiceMock.changeFullScreen).toHaveBeenCalledOnceWith(true);
    });

    it('should call changeFullScreen with false state if full screen enter event has been fired', () => {
        const event = {
            type: IdpViewerEventTypes.FullScreenExit,
            timestamp: '',
            data: {
                dataSourceRef: [
                    {
                        pageId: '1',
                        documentId: 'documentId',
                    },
                ],
                newValue: {
                    fullscreen: false,
                },
            },
        };
        component.onViewerEvent(event);
        expect(idpDocumentServiceMock.changeFullScreen).toHaveBeenCalledOnceWith(false);
    });

    it('should call updatePagesRotation when rotation is changed', () => {
        const event = {
            type: IdpViewerEventTypes.RotationChanged,
            timestamp: '',
            data: {
                dataSourceRef: [
                    {
                        pageId: '1',
                        documentId: 'documentId1',
                        viewerRotation: 90,
                    },
                    {
                        pageId: '2',
                        documentId: 'documentId2',
                        viewerRotation: 90,
                    },
                ],
                newValue: {
                    rotationStep: 90,
                },
            },
        };
        const expected = [
            {
                pageId: '1',
                documentId: 'documentId1',
                viewerRotation: 90,
            },
            {
                pageId: '2',
                documentId: 'documentId2',
                viewerRotation: 90,
            },
        ];
        component.onViewerEvent(event);
        expect(idpDocumentServiceMock.updatePagesRotation).toHaveBeenCalledOnceWith(expected, false);
    });

    it('should map hasMachineTextLayer to disableRotation when building datasource pages', async () => {
        const docsWithMachineTextLayer = [
            {
                ...mockedDocuments[0],
                pages: [
                    { ...mockedDocuments[0].pages[0], isSelected: true, hasMachineTextLayer: true },
                    { ...mockedDocuments[0].pages[1], isSelected: true, hasMachineTextLayer: false },
                    ...mockedDocuments[0].pages.slice(2),
                ],
            },
        ];
        selectedDocumentsSubject.next(docsWithMachineTextLayer as any);

        const datasource = await firstValueFrom(component.datasource$);
        const pages = datasource.documents[0]?.pages ?? [];
        expect(pages[0].disableRotation).toBe(true);
        expect(pages[1].disableRotation).toBe(false);
    });
});
