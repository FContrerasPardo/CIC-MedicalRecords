/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentRouterService } from '../document/document-router/document-router.service';

@Injectable({
    providedIn: 'root',
})
export class ContentShareService {
    private readonly documentRouterService = inject(DocumentRouterService);

    getSingleContentShareLink(document?: Document): string | undefined {
        return document ? this.documentRouterService.urlFor(document, { absolute: true }) : undefined;
    }
}
