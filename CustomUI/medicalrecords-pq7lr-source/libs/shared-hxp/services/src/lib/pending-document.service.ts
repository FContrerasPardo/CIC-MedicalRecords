/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { Permissions } from './model/file-permissions.model';

@Injectable()
export abstract class HxpPendingDocumentService {
    abstract restorePermissions(documentId: string, originalPermissions: Permissions): Promise<Document>;
    abstract deleteDocument(documentId: string): Promise<void>;
}
