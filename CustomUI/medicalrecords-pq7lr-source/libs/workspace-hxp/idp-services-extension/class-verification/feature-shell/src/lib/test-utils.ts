/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { ClassificationCandidate, ClassSelectionReasonCode } from './models/contracts/class-verification-models';
import { IdpConfigClass } from './models/screen-models';
import { DocumentEntity, DocumentEntityPage } from './store/states/document.state';
import { cloneDeep } from 'es-toolkit/compat';

export function createMockDocumentEntity(
    id: string,
    options: {
        name?: string;
        class?: IdpConfigClass;
        classificationConfidence?: number;
        verificationStatus?: IdpVerificationStatus;
        rejected?: boolean;
        rejectedReasonId?: string;
        rejectNote?: string;
        markAsDeleted?: boolean;
        markAsResolved?: boolean;
        isCut?: boolean;
        isDragging?: boolean;
        classificationClassCandidates?: ClassificationCandidate[] | null;
        classificationSelectionReason?: ClassSelectionReasonCode;
        isGenerated?: boolean;
        isImported?: boolean;
        isPreviewed?: boolean;
        withPages?: DocumentEntityPage[];
        withGeneratedPages?: {
            count: number;
            contentFileReferenceIndex?: number;
        };
    } = {}
): DocumentEntity {
    const pages: DocumentEntityPage[] = [];
    if (options.withPages) {
        pages.push(...cloneDeep(options.withPages));
    }
    if (options.withGeneratedPages && options.withGeneratedPages.count > 0) {
        const { count, contentFileReferenceIndex } = options.withGeneratedPages;
        pages.push(...Array.from({ length: count }, (_, index) => createMockDocumentEntityPage(contentFileReferenceIndex ?? 0, index)));
    }

    return {
        id,
        name: options.name ?? `Document ${id}`,
        class: options.class ?? {
            id: `class_${id}`,
            name: `Class ${id}`,
            isSpecialClass: false,
        },
        classificationConfidence: options.classificationConfidence ?? 0.95,
        classificationClassCandidates: options.classificationClassCandidates,
        classificationSelectionReason: options.classificationSelectionReason,
        verificationStatus: options.verificationStatus ?? IdpVerificationStatus.AutoValid,
        pages,
        rejectedReasonId: options.rejected && !options.rejectedReasonId ? `reject-${id}` : options.rejectedReasonId,
        rejectNote: options.rejectNote,
        markAsDeleted: options.markAsDeleted ?? false,
        markAsResolved: options.markAsResolved ?? false,
        isCut: options.isCut ?? false,
        isDragging: options.isDragging ?? false,
        isGenerated: options.isGenerated ?? false,
        isImported: options.isImported ?? false,
        isPreviewed: options.isPreviewed ?? false,
    };
}

export function createMockDocumentEntityPage(
    contentFileReferenceIndex: number,
    sourcePageIndex: number,
    options: {
        id?: string;
        name?: string;
        fileReference?: string;
        rotation?: number;
        viewerRotation?: number;
        markAsDeleted?: boolean;
        height?: number;
        width?: number;
    } = {}
): DocumentEntityPage {
    return {
        id: options.id ?? `${contentFileReferenceIndex}_${sourcePageIndex}`,
        name: options.name ?? `Page ${contentFileReferenceIndex}_${sourcePageIndex}`,
        contentFileReferenceIndex,
        sourcePageIndex,
        fileReference: options.fileReference ?? `file-${contentFileReferenceIndex}`,
        rotation: options.rotation ?? 0,
        viewerRotation: options.viewerRotation ?? 0,
        markAsDeleted: options.markAsDeleted ?? false,
        height: options.height ?? 1000,
        width: options.width ?? 800,
    };
}
