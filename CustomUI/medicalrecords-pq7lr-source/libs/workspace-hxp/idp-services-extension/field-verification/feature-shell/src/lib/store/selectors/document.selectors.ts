/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { documentFeatureSelector } from './field-verification-root.selectors';
import { selectFieldsWithIssue } from './document-field.selectors';
import { IdpDocument } from '../../models/screen-models';
import { getHasMachineTextLayerProperty } from '@hxp/workspace-hxp/idp-services-extension/shared';

export const selectHasDocumentIssue = createSelector(selectFieldsWithIssue, (fieldsWithIssue) => fieldsWithIssue.length > 0);

export const selectDocument = createSelector(documentFeatureSelector, selectHasDocumentIssue, (state, hasIssue) => {
    const document: IdpDocument = {
        id: state.id,
        name: state.name,
        class: state.class,
        rejectReasonId: state.rejectReasonId,
        markAsRejected: state.markAsRejected,
        rejectNote: state.rejectNote,
        hasIssue,
        pages: state.pages.map((page) => {
            return {
                id: page.id,
                name: page.name,
                documentId: state.id,
                fileReference: page.fileReference,
                sourcePageIndex: page.sourcePageIndex,
                rotation: page.rotation,
                viewerRotation: page.viewerRotation,
                ...getHasMachineTextLayerProperty(page.hasMachineTextLayer),
                hasIssue,
                isSelected: state.selectedPageIds.includes(page.id),
                height: page.height,
                width: page.width,
            };
        }),
    };
    return document;
});

export const selectDocumentValid = createSelector(selectDocument, (document) => !document.hasIssue);

export const selectFormModelKey = createSelector(selectDocument, (document) => document.class.formModelKey);

export const selectPageById = (id: string) =>
    createSelector(selectDocument, (document) => {
        return document.pages.find((page) => page.id === id);
    });
