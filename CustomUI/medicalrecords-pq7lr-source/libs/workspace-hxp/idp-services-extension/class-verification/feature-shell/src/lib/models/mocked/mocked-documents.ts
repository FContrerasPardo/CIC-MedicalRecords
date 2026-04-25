/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { ClassificationCandidate, ClassSelectionReasonCode } from '../contracts/class-verification-models';
import { IdpConfigClass, IdpDocument, IdpDocumentPage } from '../screen-models';
import { mockIdpConfigClasses } from './mocked-classes';

export function createMockDocument(
    id: string,
    pageCount: number,
    options: {
        class?: IdpConfigClass;
        hasIssue?: boolean;
        rejectedReasonId?: string;
        rejectNote?: string;
        verificationStatus?: IdpVerificationStatus;
        classificationConfidence?: number;
        classificationClassCandidates?: ClassificationCandidate[] | null;
        classificationSelectionReason?: ClassSelectionReasonCode;
        isSelected?: boolean;
        isExpanded?: boolean;
        isPreviewed?: boolean;
        isDragging?: boolean;
        rejected?: boolean;
    } = {}
): IdpDocument {
    const pages = Array.from({ length: pageCount }, (_, index) =>
        createMockPage(id, index, {
            hasIssue: options.hasIssue,
            isSelected: options.isSelected,
        })
    );

    const rejectedReasonId = options.rejected && !options.rejectedReasonId ? `reject-${id}` : options.rejectedReasonId;

    const documentClass = options.class ?? {
        id: `class_${id}`,
        name: `Class ${id}`,
        isSpecialClass: false,
    };

    return {
        id,
        name: `Document ${id}`,
        class: documentClass,
        verificationStatus: options.verificationStatus ?? IdpVerificationStatus.AutoValid,
        classificationConfidence: options.classificationConfidence ?? 0.5,
        classificationClassCandidates: options.classificationClassCandidates,
        classificationSelectionReason: options.classificationSelectionReason,
        pages,
        hasIssue: options.hasIssue ?? false,
        isSelected: options.isSelected ?? false,
        isExpanded: options.isExpanded ?? false,
        isPreviewed: options.isPreviewed ?? false,
        isDragging: options.isDragging ?? false,
        rejectedReasonId,
        rejectNote: options.rejectNote,
    };
}

export function createMockPage(
    documentId: string,
    index: number,
    options: {
        hasIssue?: boolean;
        isSelected?: boolean;
        rotation?: number;
        viewerRotation?: number;
        fileReference?: string;
        width?: number;
        height?: number;
    } = {}
): IdpDocumentPage {
    return {
        id: `${documentId}_p${index}`,
        name: `Page ${index + 1} of ${documentId}`,
        documentId,
        fileReference: options.fileReference ?? `${documentId}-file-${index + 1}`,
        sourcePageIndex: index,
        rotation: options.rotation ?? 0,
        viewerRotation: options.viewerRotation ?? 0,
        hasIssue: options.hasIssue ?? false,
        isSelected: options.isSelected ?? false,
        width: options.width ?? 1000,
        height: options.height ?? 500,
    };
}

export function mockIdpDocuments(): IdpDocument[] {
    const classes = mockIdpConfigClasses();

    return [
        {
            id: 'd_cf1',
            name: 'Document 1',
            class: undefined,
            verificationStatus: IdpVerificationStatus.AutoInvalid,
            classificationConfidence: 0,
            pages: [
                {
                    id: 'cf1_0',
                    name: 'Page 1 of Document 1',
                    documentId: 'd_cf1',
                    fileReference: 'cf1',
                    sourcePageIndex: 0,
                    hasIssue: true,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
                {
                    id: 'cf1_1',
                    name: 'Page 2 of Document 1',
                    documentId: 'd_cf1',
                    fileReference: 'cf1',
                    sourcePageIndex: 1,
                    hasIssue: true,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
                {
                    id: 'cf1_2',
                    name: 'Page 3 of Document 1',
                    documentId: 'd_cf1',
                    fileReference: 'cf1',
                    sourcePageIndex: 2,
                    hasIssue: true,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
            ],
            hasIssue: true,
            isSelected: false,
            isExpanded: false,
            isPreviewed: false,
            isDragging: false,
            rejectedReasonId: undefined,
            rejectNote: undefined,
        },
        {
            id: 'd_cf2',
            name: 'Document 2',
            class: classes[2],
            verificationStatus: IdpVerificationStatus.AutoInvalid,
            classificationConfidence: 0.4,
            pages: [
                {
                    id: 'cf2_0',
                    name: 'Page 1 of Document 2',
                    documentId: 'd_cf2',
                    fileReference: 'cf2',
                    sourcePageIndex: 0,
                    hasIssue: true,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
                {
                    id: 'cf2_1',
                    name: 'Page 2 of Document 2',
                    documentId: 'd_cf2',
                    fileReference: 'cf2',
                    sourcePageIndex: 1,
                    hasIssue: true,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
            ],
            hasIssue: true,
            isSelected: false,
            isExpanded: false,
            isPreviewed: false,
            isDragging: false,
            rejectedReasonId: undefined,
            rejectNote: undefined,
        },
        {
            id: 'd_cf3',
            name: 'Document 3',
            class: classes[2],
            verificationStatus: IdpVerificationStatus.AutoValid,
            classificationConfidence: 0.9,
            pages: [
                {
                    id: 'cf3_0',
                    name: 'Page 1 of Document 3',
                    documentId: 'd_cf3',
                    fileReference: 'cf3',
                    sourcePageIndex: 0,
                    hasIssue: false,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
                {
                    id: 'cf3_1',
                    name: 'Page 2 of Document 3',
                    documentId: 'd_cf3',
                    fileReference: 'cf3',
                    sourcePageIndex: 1,
                    hasIssue: false,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
                {
                    id: 'cf3_2',
                    name: 'Page 3 of Document 3',
                    documentId: 'd_cf3',
                    fileReference: 'cf3',
                    sourcePageIndex: 2,
                    hasIssue: false,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
            ],
            hasIssue: false,
            isSelected: false,
            isExpanded: false,
            isPreviewed: false,
            isDragging: false,
            rejectedReasonId: undefined,
            rejectNote: undefined,
        },
        {
            id: 'd_cf4',
            name: 'Document 4',
            class: classes[3],
            verificationStatus: IdpVerificationStatus.AutoValid,
            classificationConfidence: 0.9,
            pages: [
                {
                    id: 'cf4_0',
                    name: 'Page 1 of Document 4',
                    documentId: 'd_cf4',
                    fileReference: 'cf4',
                    sourcePageIndex: 0,
                    hasIssue: false,
                    isSelected: false,
                    rotation: 0,
                    viewerRotation: 0,
                    width: 1000,
                    height: 500,
                },
            ],
            hasIssue: false,
            isSelected: false,
            isExpanded: false,
            isPreviewed: false,
            isDragging: false,
            rejectedReasonId: undefined,
            rejectNote: undefined,
        },
    ];
}
