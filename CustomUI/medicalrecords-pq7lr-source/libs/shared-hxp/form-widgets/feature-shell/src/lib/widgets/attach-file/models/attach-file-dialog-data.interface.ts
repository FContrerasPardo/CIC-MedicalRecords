/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';
import { Observable, Subject } from 'rxjs';
import { Permissions, PendingDocument } from '@hxp/shared-hxp/services';

export const SelectionMode = {
    single: 'single',
    multiple: 'multiple',
} as const;

export type SelectionMode = typeof SelectionMode[keyof typeof SelectionMode];

export interface AttachFileDialogData {
    defaultDocumentPath$: Observable<string | undefined>;
    selectionMode: SelectionMode;
    selectionSubject$: Subject<(Document | PendingDocument)[]>;
    isLocalUploadAvailable: boolean;
    isContentUploadAvailable: boolean;
    filePermissions?: Permissions;
    contentType?: string;
}
