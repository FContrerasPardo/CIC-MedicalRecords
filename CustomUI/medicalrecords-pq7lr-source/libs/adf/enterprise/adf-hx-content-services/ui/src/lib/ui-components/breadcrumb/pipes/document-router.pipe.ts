/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentRouterOptions, DocumentRouterService } from '@alfresco/adf-hx-content-services/services';

/**
 * Pipe that transforms a Document object into a URL string using the DocumentRouterService.
 *
 * @example
 * * Using the pipe in a component:
 * ```typescript
 * const document: Document = { id: '123', name: 'example.docx' };
 * const options: DocumentRouterOptions = { absolute: true };
 * const url: string = documentRouterPipe.transform(document, options);
 * ```
 * Using the pipe in a template:
 * ```html
 * <a [href]="document | urlFor: { absolute: true }">Document Details</a>
 * ```
 */
@Pipe({
    name: 'urlFor',
})
export class DocumentRouterPipe implements PipeTransform {
    private readonly documentRouterService = inject(DocumentRouterService);

    transform(document: Document, options: DocumentRouterOptions = { absolute: false }): string {
        return this.documentRouterService.urlFor(document, options);
    }
}
