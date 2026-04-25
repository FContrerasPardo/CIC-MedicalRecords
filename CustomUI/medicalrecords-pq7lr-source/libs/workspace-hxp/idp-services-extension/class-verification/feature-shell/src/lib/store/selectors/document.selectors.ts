/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { documentAdapter, isDocumentValid } from '../states/document.state';
import {
    DocumentClassMetadata,
    IdpConfigClass,
    IdpDocument,
    IdpDocumentPage,
    REJECTED_CLASS_ID,
    UNCLASSIFIED_CLASS_ID,
} from '../../models/screen-models';
import { documentClassAdapter } from '../states/document-class.state';
import { documentClassFeatureSelector, documentFeatureSelector, screenFeatureSelector } from './class-verification-root.selectors';
import { IdpLoadState, getHasMachineTextLayerProperty } from '@hxp/workspace-hxp/idp-services-extension/shared';

const IDP_DEFAULT_REVIEW_THRESHOLD = 0.8;
const IDP_DEFAULT_CLASS_ASSIGNMENT_THRESHOLD = 0.8;
const IDP_DEFAULT_CLASS_CANDIDATES_MIN_DISTANCE = 0.05;

const documentFeature = documentFeatureSelector;
const documentClassFeature = documentClassFeatureSelector;
const screenFeature = screenFeatureSelector;

export const selectDocumentsRawState = createSelector(documentAdapter.getSelectors(documentFeature).selectAll, (documents) => documents);

export const selectClassificationSettings = createSelector(screenFeature, (state) => {
    const classificationSettings = state.taskInputData?.configuration;
    return {
        reviewThreshold: classificationSettings?.reviewThreshold ?? IDP_DEFAULT_REVIEW_THRESHOLD,
        classAssignmentThreshold: classificationSettings?.classAssignmentThreshold ?? IDP_DEFAULT_CLASS_ASSIGNMENT_THRESHOLD,
        classCandidatesMinDistance: classificationSettings?.classCandidatesMinDistance ?? IDP_DEFAULT_CLASS_CANDIDATES_MIN_DISTANCE,
    };
});

export const selectAllDocumentClasses = createSelector(
    documentClassFeature,
    documentClassAdapter.getSelectors(documentClassFeature).selectAll,
    selectClassificationSettings,
    (state, classes, classificationSettings) => {
        if (state.loadState === IdpLoadState.NotInitialized) {
            return [];
        }
        return classes.map<IdpConfigClass>((docClass) => {
            return {
                ...docClass,
                isSelected: state.selectedClassId === docClass.id,
                isExpanded: state.expandedClassId === docClass.id,
                isPreviewed: state.previewedClassId === docClass.id,
                reviewThreshold: docClass.reviewThreshold ?? classificationSettings.reviewThreshold,
                classAssignmentThreshold: docClass.classAssignmentThreshold ?? classificationSettings.classAssignmentThreshold,
            };
        });
    }
);

/**
 * All selectors that return either document or page should derive from this selection.
 * This selector converts the store state to type expected by consumers.
 */
export const selectAllDocuments = createSelector(
    documentFeature,
    documentAdapter.getSelectors(documentFeature).selectAll,
    selectAllDocumentClasses,
    (state, documents, allDocumentClasses) => {
        if (state.loadState === IdpLoadState.NotInitialized) {
            return [];
        }
        return documents
            .filter((doc) => !doc.markAsDeleted)
            .map<IdpDocument>((doc) => {
                const documentValid = isDocumentValid(doc, allDocumentClasses);
                let isDocumentSelected = false;
                let isDocumentCut = true;
                const pages: IdpDocumentPage[] = [];
                const docActivePages = doc.pages.filter((page) => !page.markAsDeleted);
                for (const page of docActivePages) {
                    const updatedPage = {
                        id: page.id,
                        name: page.name,
                        documentId: doc.id,
                        fileReference: page.fileReference,
                        sourcePageIndex: page.sourcePageIndex,
                        rotation: page.rotation,
                        viewerRotation: page.viewerRotation,
                        ...getHasMachineTextLayerProperty(page.hasMachineTextLayer),
                        hasIssue: !documentValid,
                        isSelected: state.selectedPageIds.includes(page.id),
                        isCut: state.cutPageIds.includes(page.id),
                        width: page.width,
                        height: page.height,
                    };
                    pages.push(updatedPage);
                    isDocumentSelected ||= updatedPage.isSelected;
                    isDocumentCut &&= updatedPage.isCut;
                }

                return {
                    id: doc.id,
                    name: doc.name,
                    class: doc.class,
                    classificationConfidence: doc.classificationConfidence,
                    classificationClassCandidates: doc.classificationClassCandidates,
                    classificationSelectionReason: doc.classificationSelectionReason,
                    verificationStatus: doc.verificationStatus,
                    hasIssue: !documentValid,
                    pages,
                    rejectedReasonId: doc.rejectedReasonId,
                    rejectNote: doc.rejectNote,
                    isSelected: isDocumentSelected,
                    isExpanded: state.expandedDocumentIds.includes(doc.id),
                    isPreviewed: state.previewedDocumentId === doc.id,
                    isDragging: state.draggedDocumentIds.includes(doc.id),
                    isCut: isDocumentCut,
                };
            });
    }
);

export const selectAllSelectedDocuments = createSelector(selectAllDocuments, (documents) => {
    return documents.filter((doc) => doc.isSelected);
});

export const selectAllSelectedPages = createSelector(selectAllSelectedDocuments, (documents) => {
    return documents.flatMap((doc) => doc.pages).filter((page) => page.isSelected);
});

export const selectAllCutPages = createSelector(selectAllDocuments, (documents) => {
    return documents.flatMap((doc) => doc.pages).filter((page) => page.isCut);
});

export const selectDocumentsReady = createSelector(documentFeature, (state) => {
    return state.loadState === IdpLoadState.Loaded;
});

export const selectDocumentsWithIssue = createSelector(selectAllDocuments, (documents) => {
    return documents.filter((doc) => doc.hasIssue);
});

export const selectAllDocumentsValid = createSelector(selectDocumentsWithIssue, (documents) => {
    return documents.length === 0;
});

export const selectDocumentCountInfo = createSelector(selectAllDocuments, selectDocumentsWithIssue, (documents, documentsWithIssues) => {
    return {
        totalDocuments: documents.length,
        totalPages: documents.flatMap((doc) => doc.pages).length,
        documentsWithIssues: documentsWithIssues.length,
    };
});

export const selectDocumentActionCompleteEvent = createSelector(documentFeature, (state) => {
    return state.lastAction;
});

export const selectDocumentEntityStateForIds = (ids: string[]) =>
    createSelector(documentAdapter.getSelectors(documentFeature).selectAll, (documents) => {
        return documents.filter((doc) => ids.includes(doc.id));
    });

export const selectPageById = (id: string) =>
    createSelector(selectAllDocuments, (documents) => {
        return documents.flatMap((doc) => doc.pages).find((page) => page.id === id);
    });

export const selectSelectedDocumentClass = createSelector(selectAllDocumentClasses, (allClasses) =>
    allClasses.find((docClass) => docClass.isSelected)
);

export const selectClassById = (id: string) =>
    createSelector(selectAllDocumentClasses, (classes) => {
        return classes.find((docClass) => docClass.id === id);
    });

export const selectDocumentsGroupedByClass = createSelector(selectAllDocuments, selectAllDocumentClasses, (documents, classes) => {
    const group: Record<string, IdpDocument[]> = {};
    for (const doc of documents) {
        const isRejected = Boolean(doc.rejectedReasonId);
        const isUnclassified = !doc.class || !classes.some((docClass) => docClass.id === doc.class?.id);
        let classId: string;
        if (isRejected) {
            classId = REJECTED_CLASS_ID;
        } else {
            classId = isUnclassified || !doc.class ? UNCLASSIFIED_CLASS_ID : doc.class.id;
        }

        if (!group[classId]) {
            group[classId] = [];
        }
        group[classId].push(doc);
    }

    return group;
});

export const selectAllDocumentsForClass = (classId: string) =>
    createSelector(selectDocumentsGroupedByClass, (groupedDocs) => {
        return groupedDocs[classId] || [];
    });

export const selectClassMetadata = createSelector(selectDocumentsGroupedByClass, selectAllDocumentClasses, (docGroup, classes) => {
    return classes.map<DocumentClassMetadata>((docClass) => {
        const documents = docGroup[docClass.id] || [];
        const issuesCount = documents.filter((doc) => doc.hasIssue).length;
        return {
            ...docClass,
            documentsCount: documents.length,
            issuesCount,
            canExpand: documents.length > 0,
            disabled: documents.length === 0,
        };
    });
});

export const selectClassIdsWithDocuments = createSelector(selectAllDocuments, (documents) => {
    const classes = documents
        .filter((doc) => doc.class != null && doc.rejectedReasonId == null && doc.class?.id !== 'unclassified')
        .flatMap((doc) => doc.class?.id);
    return new Set(classes);
});

export const selectActivePageCount = createSelector(selectDocumentsRawState, (documents) => {
    return documents.flatMap((document) => document.pages).filter((page) => !page.markAsDeleted).length;
});
