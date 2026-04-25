/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createReducer, on } from '@ngrx/store';
import { IdpLoadState, getHasMachineTextLayerProperty } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { initialDocumentState } from '../states/document.state';

export const documentReducer = createReducer(
    initialDocumentState,

    on(systemActions.documentLoad, (state, { documentState }) => ({
        ...state,
        ...documentState,
        loadState: IdpLoadState.Loaded,
    })),

    on(systemActions.documentLoadError, (state) => ({
        ...state,
        loadState: IdpLoadState.Error,
    })),

    on(userActions.pageSelect, (state, { pageId }) => ({
        ...state,
        selectedPageIds: [pageId],
    })),

    on(userActions.rejectReasonUpdate, (state, { rejectReasonId, rejectNote }) => ({
        ...state,
        rejectReasonId,
        rejectNote,
    })),

    on(userActions.updatePagesRotation, (state, { pages }) => ({
        ...state,
        pages: state.pages.map((page) => {
            const pageUpdate = pages.find((p) => p.pageId === page.id);
            if (!pageUpdate) {
                return page;
            }

            const hasMachineTextLayer = pageUpdate.hasMachineTextLayer ?? page.hasMachineTextLayer;
            const viewerRotationUpdate = hasMachineTextLayer ? { viewerRotation: 0 } : { viewerRotation: pageUpdate?.viewerRotation ?? page.viewerRotation };

            return {
                ...page,
                rotation: pageUpdate?.rotation ?? page.rotation,
                ...viewerRotationUpdate,
                ...getHasMachineTextLayerProperty(pageUpdate.hasMachineTextLayer),
            };
        }),
    }))
);
