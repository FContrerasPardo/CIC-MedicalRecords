/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';
import { Permissions } from './file-permissions.model';

export interface PendingDocument {
    document: Document;
    originalPermissions: Permissions;
    pendingBy: string;
    persisted: boolean;
}

export const isPendingDocument = (item: unknown): item is PendingDocument => {
    return (
        typeof item === 'object' &&
        item !== null &&
        'document' in item &&
        'originalPermissions' in item &&
        'pendingBy' in item &&
        'persisted' in item
    );
};
