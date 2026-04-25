/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { IdpConfigClass } from '../../models/screen-models';
import { IdpLoadState } from '@hxp/workspace-hxp/idp-services-extension/shared';

export interface DocumentClassState extends EntityState<IdpConfigClass> {
    selectedClassId?: string;
    expandedClassId?: string;
    previewedClassId?: string;
    loadState: IdpLoadState;
}

export const documentClassAdapter = createEntityAdapter<IdpConfigClass>();

export const initialDocumentClassState: DocumentClassState = documentClassAdapter.getInitialState({
    selectedClassId: undefined,
    expandedClassId: undefined,
    loadState: IdpLoadState.NotInitialized,
});
