/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { IdpTable } from '../../models/screen-models';
import { IdpLoadState } from '@hxp/workspace-hxp/idp-services-extension/shared';

export type DocumentTableEntity = Omit<IdpTable, 'rows'> & {
    rows: string[][];
};

export interface DocumentTableState extends EntityState<DocumentTableEntity> {
    loadState: IdpLoadState;
}

export const documentTableAdapter = createEntityAdapter<DocumentTableEntity>();

export const initialDocumentTableState: DocumentTableState = documentTableAdapter.getInitialState({
    loadState: IdpLoadState.NotInitialized,
});
