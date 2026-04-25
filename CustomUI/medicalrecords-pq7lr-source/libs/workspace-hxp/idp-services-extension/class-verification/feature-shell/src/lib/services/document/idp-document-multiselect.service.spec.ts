/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { IdpDocumentMultiselectService } from './idp-document-multiselect.service';
import { IdpDocumentService } from './idp-document.service';
import { IdpDocumentClassService } from '../document-class/idp-document-class.service';
import { IdpConfigClass, IdpDocument } from '../../models/screen-models';
import { IdpScreenViewSortOption } from '../../models/common-models';
import { createMockDocument } from '../../models/mocked/mocked-documents';

describe('IdpDocumentMultiselectService', () => {
    let service: IdpDocumentMultiselectService;
    let mockDocumentService: jasmine.SpyObj<IdpDocumentService>;

    let mockDocumentServiceAllDocuments$: BehaviorSubject<IdpDocument[]>;
    let mockDocumentServiceAllDocumentsForSelectedClass$: BehaviorSubject<IdpDocument[]>;
    let mockDocumentServiceSelectedDocuments$: BehaviorSubject<IdpDocument[]>;
    let mockDocumentClassServiceSelectedClass$: BehaviorSubject<IdpConfigClass | undefined>;
    let mockDocumentServiceSortOption$: BehaviorSubject<IdpScreenViewSortOption>;

    let document1: IdpDocument;
    let document2: IdpDocument;
    let document3: IdpDocument;

    const class1: IdpConfigClass = { id: 'class1', name: 'Class 1', isSpecialClass: false };
    const class2: IdpConfigClass = { id: 'class2', name: 'Class 2', isSpecialClass: false };

    function getPageIds(targetDocument: IdpDocument): string[] {
        return targetDocument.pages.map((page) => page.id);
    }

    beforeEach(() => {
        document1 = createMockDocument('document1', 3);
        document2 = createMockDocument('document2', 2, { rejected: true });
        document3 = createMockDocument('document3', 2);

        mockDocumentServiceAllDocuments$ = new BehaviorSubject<IdpDocument[]>([document1, document2, document3]);
        mockDocumentServiceAllDocumentsForSelectedClass$ = new BehaviorSubject<IdpDocument[]>([document1, document2, document3]);
        mockDocumentServiceSelectedDocuments$ = new BehaviorSubject<IdpDocument[]>([document1]);
        mockDocumentServiceSortOption$ = new BehaviorSubject<IdpScreenViewSortOption>(IdpScreenViewSortOption.Original);
        mockDocumentService = jasmine.createSpyObj<IdpDocumentService>('IdpDocumentService', ['setSelectedPages', 'getSortOption'], {
            allDocuments$: mockDocumentServiceAllDocuments$.asObservable(),
            allDocumentsForSelectedClass$: mockDocumentServiceAllDocumentsForSelectedClass$.asObservable(),
            selectedDocuments$: mockDocumentServiceSelectedDocuments$.asObservable(),
        });
        mockDocumentService.getSortOption.and.returnValue(mockDocumentServiceSortOption$.asObservable());

        mockDocumentClassServiceSelectedClass$ = new BehaviorSubject<IdpConfigClass | undefined>(class1);
        const mockDocumentClassService = jasmine.createSpyObj<IdpDocumentClassService>('IdpDocumentClassService', [], {
            selectedClass$: mockDocumentClassServiceSelectedClass$.asObservable(),
            allClasses$: of([]),
            documentClassMetadata$: of([]),
        });

        TestBed.configureTestingModule({
            providers: [
                IdpDocumentMultiselectService,
                DestroyRef,
                { provide: IdpDocumentService, useValue: mockDocumentService },
                { provide: IdpDocumentClassService, useValue: mockDocumentClassService },
            ],
        });

        service = TestBed.inject(IdpDocumentMultiselectService);
        mockDocumentService.setSelectedPages.calls.reset();
    });

    it('should select all pages from a document in single mode', () => {
        service.documentSelected(document1.id, 'single');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith(getPageIds(document1));
    });

    it('should append document pages when multi selecting', () => {
        service.documentSelected(document1.id, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        service.documentSelected(document2.id, 'multi');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([...getPageIds(document1), ...getPageIds(document2)]);
    });

    it('should toggle document pages off when toggling in multi mode', () => {
        service.documentSelected(document1.id, 'multi');
        mockDocumentService.setSelectedPages.calls.reset();

        service.documentSelected(document1.id, 'multi', true);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([]);
    });

    it('should add a page when toggling in multi mode without prior selection', () => {
        const pageId = document1.pages[1].id;

        service.pageSelected(pageId, 'multi', true);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([pageId]);
    });

    it('should ignore unknown document ids', () => {
        service.documentSelected('missing', 'single');

        expect(mockDocumentService.setSelectedPages).not.toHaveBeenCalled();
    });

    it('should select a single page in single mode', () => {
        const targetPageId = document1.pages[0].id;

        service.pageSelected(targetPageId, 'single');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([targetPageId]);
    });

    it('should append pages when multi selecting', () => {
        const firstPageId = document1.pages[0].id;
        const secondPageId = document2.pages[0].id;

        service.pageSelected(firstPageId, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        service.pageSelected(secondPageId, 'multi');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([firstPageId, secondPageId]);
    });

    it('should toggle a page off when toggling in multi mode', () => {
        const pageId = document1.pages[0].id;

        service.pageSelected(pageId, 'multi');
        mockDocumentService.setSelectedPages.calls.reset();

        service.pageSelected(pageId, 'multi', true);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([]);
    });

    it('should toggle page selection when using single mode with toggle flag', () => {
        const pageId = document1.pages[0].id;

        mockDocumentService.setSelectedPages.calls.reset();
        service.pageSelected(pageId, 'single', true);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([pageId]);

        mockDocumentService.setSelectedPages.calls.reset();

        service.pageSelected(pageId, 'single', true);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([]);
    });

    it('should select a range using last selections as anchor with original sort ordering', () => {
        mockDocumentServiceSelectedDocuments$.next([document1]);
        service.documentSelected(document1.id, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        const rangeTargetPageId = document3.pages[1].id;
        service.pageSelected(rangeTargetPageId, 'multiRange');

        const expectedPageIds = [...getPageIds(document1), document3.pages[0].id, document3.pages[1].id];

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith(expectedPageIds);
    });

    it('should select a range using anchor flags when sorting by classes', () => {
        mockDocumentServiceSelectedDocuments$.next([document1]);
        service.documentSelected(document1.id, 'single');
        service.pageSelected(document2.pages[0].id, 'multiRange');
        mockDocumentService.setSelectedPages.calls.reset();

        mockDocumentServiceSortOption$.next(IdpScreenViewSortOption.Classes);

        service.documentSelected(document2.id, 'multiRange');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([...getPageIds(document1), ...getPageIds(document2)]);
    });

    it('should stop capturing after encountering the anchor and skip empty documents', () => {
        const selectedDocument = createMockDocument('range-selected', 2);
        const emptyDocument = createMockDocument('range-empty', 0);
        const middleDocument = createMockDocument('range-middle', 2);
        const anchorDocument = createMockDocument('range-anchor', 2);

        const customDocuments = [selectedDocument, emptyDocument, middleDocument, anchorDocument];
        mockDocumentServiceAllDocuments$.next(customDocuments);
        mockDocumentServiceAllDocumentsForSelectedClass$.next(customDocuments);
        mockDocumentServiceSelectedDocuments$.next([anchorDocument]);

        service.pageSelected(anchorDocument.pages[0].id, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        service.pageSelected(selectedDocument.pages[0].id, 'multiRange');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([
            ...getPageIds(selectedDocument),
            ...getPageIds(middleDocument),
            anchorDocument.pages[0].id,
        ]);
    });

    it('should not create a range when no anchor is available', () => {
        const potentialRangePageId = document1.pages[0].id;

        service.pageSelected(potentialRangePageId, 'multiRange');

        expect(mockDocumentService.setSelectedPages).not.toHaveBeenCalled();
    });

    it('should limit unsorted range results to rejected documents when selection is rejected', () => {
        mockDocumentServiceSelectedDocuments$.next([document2]);
        service.documentSelected(document2.id, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        service.pageSelected(document3.pages[0].id, 'multiRange');

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith(getPageIds(document2));
    });

    it('should select all pages across documents', () => {
        service.selectAll('document');

        const expectedPageIds = [...getPageIds(document1), ...getPageIds(document2), ...getPageIds(document3)];

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith(expectedPageIds);
    });

    it('should select all pages for a specific document', () => {
        service.selectAll('page', document2.id);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith(getPageIds(document2));
    });

    it('should throw when selecting all pages without a document id', () => {
        expect(() => service.selectAll('page')).toThrowError('Document id is required when selecting all pages');
    });

    it('should ignore selecting all pages when document is not found', () => {
        service.selectAll('page', 'missing');

        expect(mockDocumentService.setSelectedPages).not.toHaveBeenCalled();
    });

    it('should clear selection when clearSelection is called', () => {
        service.pageSelected(document1.pages[0].id, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        service.clearSelection();

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([]);
    });

    it('should reset selection when class changes in non-original sort order', () => {
        mockDocumentServiceSortOption$.next(IdpScreenViewSortOption.Classes);
        service.pageSelected(document1.pages[0].id, 'single');
        mockDocumentService.setSelectedPages.calls.reset();

        mockDocumentClassServiceSelectedClass$.next(class2);

        expect(mockDocumentService.setSelectedPages).toHaveBeenCalledOnceWith([]);
    });
});
