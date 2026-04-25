/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { CacheLabelService } from './cache-label-service';
import { NoopTranslateModule, TranslationService } from '@alfresco/adf-core';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Subject } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';

describe('CacheLabelService', () => {
    let cacheLabelService: CacheLabelService;
    let documentUpdatedSubject: Subject<{ document: Document | undefined }>;
    const mockTranslationService = { instant: jest.fn((key: string) => `${key}_translated`) };
    let mockDocumentService: { documentUpdated$: Subject<{ document: Document | undefined }> };

    beforeEach(() => {
        documentUpdatedSubject = new Subject<{ document: Document | undefined }>();
        mockDocumentService = {
            documentUpdated$: documentUpdatedSubject
        };

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                { provide: TranslationService, useValue: mockTranslationService },
                { provide: DocumentService, useValue: mockDocumentService }
            ],
        });

        cacheLabelService = TestBed.inject(CacheLabelService);
    });

    it('should be created', () => {
        expect(cacheLabelService).toBeTruthy();
    });

    describe('getTranslation', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should return cached value when available', () => {
            const doc = { sys_id: '123', sys_primaryType: 'SysRoot' };
            const translationKey = 'root.translation.key';

            cacheLabelService.getCache().set(doc.sys_id, 'cached value');

            const result = cacheLabelService.getTranslation(doc, translationKey);

            expect(result).toEqual('cached value');
            expect(mockTranslationService.instant).not.toHaveBeenCalled();
        });

        it('should fetch translation and cache it if not cached', () => {
            const doc = { sys_id: '123', sys_primaryType: 'SysRoot' };
            const translationKey = 'root.translation.key';

            const result = cacheLabelService.getTranslation(doc, translationKey);

            expect(result).toEqual(`${translationKey}_translated`);

            expect(cacheLabelService.getCache().has(doc.sys_id)).toBe(true);
            expect(cacheLabelService.getCache().get(doc.sys_id)).toBe(`${translationKey}_translated`);
        });

        it('should generate a unique key and cache value when sys_id is not present', () => {
            const doc = { sys_title: 'Document Title', sys_primaryType: 'not root' };
            const translationKey = 'root.translation.key';

            const expectedKey = 'sys_primaryType=not root|sys_title=Document Title';

            const result = cacheLabelService.getTranslation(doc, translationKey);

            expect(result).toEqual('Document Title');
            expect(cacheLabelService.getCache().has(expectedKey)).toBe(true);
            expect(cacheLabelService.getCache().get(expectedKey)).toBe('Document Title');
            expect(mockTranslationService.instant).not.toHaveBeenCalled();
        });

        it('should return correct label when isRoot is true', () => {
            const doc = { sys_id: '123', sys_primaryType: 'SysRoot' };
            const translationKey = 'root.translation.key';

            const result = cacheLabelService.getTranslation(doc, translationKey);

            expect(result).toBe(`${translationKey}_translated`);
        });

        it('should return sys_title when isRoot is false', () => {
            const doc = { sys_id: '123', sys_title: 'Custom Title', sys_primaryType: 'not root' };
            const translationKey = 'root.translation.key';

            const result = cacheLabelService.getTranslation(doc, translationKey);

            expect(result).toBe('Custom Title');
        });
    });

    describe('generateUniqueKey', () => {
        it('should generate a unique key based on doc properties', () => {
            const doc = { sys_title: 'Document Title', sys_primaryType: 'SysRoot' };
            jest.spyOn(cacheLabelService.getCache(), 'set');

            cacheLabelService.getTranslation(doc, 'root.translation.key');

            const expectedKey = 'sys_primaryType=SysRoot|sys_title=Document Title';
            const expectedTranslation = 'root.translation.key_translated';
            expect(cacheLabelService.getCache().set).toHaveBeenCalledWith(expectedKey, expectedTranslation);
        });

        it('should sort the entries by key', () => {
            const doc = { sys_title: 'Document Title', sys_changeToken: 'sys_changeToken_value', sys_primaryType: 'SysRoot' };
            jest.spyOn(cacheLabelService.getCache(), 'set');

            cacheLabelService.getTranslation(doc, 'root.translation.key');

            const expectedKey = 'sys_changeToken=sys_changeToken_value|sys_primaryType=SysRoot|sys_title=Document Title';
            const expectedTranslation = 'root.translation.key_translated';
            expect(cacheLabelService.getCache().set).toHaveBeenCalledWith(expectedKey, expectedTranslation);
        });
    });

    describe('document update subscription', () => {
        it('should update cache when documentUpdated$ emits with valid document', () => {
            const document: Document = {
                sys_id: '456',
                sys_title: 'Updated Title',
                sys_primaryType: 'Document'
            };
            cacheLabelService.getCache().set('456', 'Old Title');

            documentUpdatedSubject.next({ document });

            expect(cacheLabelService.getCache().get('456')).toBe('Updated Title');
        });

        it('should update cache for root document when documentUpdated$ emits', () => {
            const rootDocument: Document = {
                sys_id: '789',
                sys_title: 'Root Title',
                sys_primaryType: 'SysRoot'
            };

            documentUpdatedSubject.next({ document: rootDocument });

            expect(cacheLabelService.getCache().get('789')).toBe('DOCUMENT_BREADCRUMB.ROOT_translated');
        });

        it('should not update cache when documentUpdated$ emits document without sys_id', () => {
            const documentWithoutId: Document = {
                sys_title: 'No sys_id Document',
                sys_primaryType: 'Document'
            };

            const initialCacheSize = cacheLabelService.getCache().size;
            documentUpdatedSubject.next({ document: documentWithoutId });

            expect(cacheLabelService.getCache().size).toBe(initialCacheSize);
        });
    });
});
