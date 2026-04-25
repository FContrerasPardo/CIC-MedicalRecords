/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { selectDocument, selectDocumentValid, selectPageById } from './document.selectors';
import { RejectReason } from '@hxp/workspace-hxp/idp-services-extension/shared';

describe('Document Selectors', () => {
    const defaultRejectReason: RejectReason = { id: '1', value: 'blurry image' };

    const initialDocState = {
        id: 'doc1',
        name: 'Document 1',
        class: { id: 'classA', name: 'Class A' },
        rejectReason: defaultRejectReason,
        selectedPageIds: ['page1'],
        loadState: 'Loaded' as const,
        pages: [
            { id: 'page1', name: 'Page 1', fileReference: 'file1', contentFileReferenceIndex: 0, sourcePageIndex: 0 },
            { id: 'page2', name: 'Page 2', fileReference: 'file2', contentFileReferenceIndex: 1, sourcePageIndex: 1 },
        ],
    };

    it('should select the document', () => {
        const result = (selectDocument.projector as any)(initialDocState, true);
        expect(result).toEqual({
            id: 'doc1',
            name: 'Document 1',
            class: { id: 'classA', name: 'Class A' },
            hasIssue: true,
            pages: [
                {
                    id: 'page1',
                    name: 'Page 1',
                    documentId: 'doc1',
                    fileReference: 'file1',
                    sourcePageIndex: 0,
                    rotation: undefined,
                    viewerRotation: undefined,
                    hasIssue: true,
                    isSelected: true,
                    height: undefined,
                    width: undefined,
                },
                {
                    id: 'page2',
                    name: 'Page 2',
                    documentId: 'doc1',
                    fileReference: 'file2',
                    sourcePageIndex: 1,
                    rotation: undefined,
                    viewerRotation: undefined,
                    hasIssue: true,
                    isSelected: false,
                    height: undefined,
                    width: undefined,
                },
            ],
            rejectReasonId: undefined,
            markAsRejected: undefined,
            rejectNote: undefined,
        });
    });

    it('should select document validity', () => {
        const document = (selectDocument.projector as any)(initialDocState, true);
        const result = selectDocumentValid.projector(document);
        expect(result).toBe(false);
    });

    it('should select page by id', () => {
        const document = (selectDocument.projector as any)(initialDocState, true);
        const result = selectPageById('page1').projector(document);
        expect(result).toEqual({
            id: 'page1',
            name: 'Page 1',
            documentId: 'doc1',
            fileReference: 'file1',
            sourcePageIndex: 0,
            rotation: undefined,
            viewerRotation: undefined,
            hasIssue: true,
            isSelected: true,
            height: undefined,
            width: undefined,
        });
    });

    it('should support a boolean issue input without depending on full field arrays', () => {
        const document = (selectDocument.projector as any)(initialDocState, false);

        expect(document.hasIssue).toBe(false);
        expect(document.pages.every((page: { hasIssue: boolean }) => page.hasIssue === false)).toBe(true);
    });
});
