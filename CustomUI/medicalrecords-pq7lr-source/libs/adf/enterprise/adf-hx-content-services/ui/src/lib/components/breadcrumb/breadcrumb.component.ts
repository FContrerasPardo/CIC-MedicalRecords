/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { DocumentService, isVersion } from '@alfresco/adf-hx-content-services/services';
import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewEncapsulation, inject } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HxpUiBreadcrumbComponent } from '../../ui-components/breadcrumb/breadcrumb.component';

/**
 * Component that displays a series of clickable links that represent the path to a given `Document`.
 * To use the `HxpBreadcrumbComponent`, you need first to import the component in your module
 *
 * ```ts
 * import { HxpBreadcrumbComponent } from '@alfresco/adf-hx-content-services/icons';
 * @NgModule({
 *     imports: [
 *         HxpBreadcrumbComponent
 *         ...
 *     ],
 *    [...]
 * })
 * export class AppModule {}
 * ```
 *
 * Then use it in your Angular template as shown in the example below:
 *
 * @example
 * <hxp-breadcrumb [document]="document"></hxp-breadcrumb>
 *
 */
@Component({
    selector: 'hxp-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [HxpUiBreadcrumbComponent],
})
export class HxpBreadcrumbComponent implements OnInit, OnChanges {
    /**
     * The `Document` object for which the breadcrumb is displayed.
     * The breadcrumb will be built based on the ancestors of the given `Document`.
     */
    @Input() document: Document = ROOT_DOCUMENT;

    /**
     * If true, breadcrumb elements are grouped together and displayed as ellipsis, except for the first and last entry.
     */
    @Input() compact = false;

    protected breadcrumbElements: Array<Document> = [];

    private readonly documentService = inject(DocumentService);

    ngOnInit(): void {
        this._buildBreadcrumb(this.document);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['document']) {
            this._buildBreadcrumb(this.document);
        }
    }

    private _buildBreadcrumb(document: Document): void {
        if (!document) {
            this.breadcrumbElements = [];
            return;
        }

        this.documentService
            .getAncestors(document?.sys_id ?? '')
            .pipe(
                catchError(() => of([{ ...ROOT_DOCUMENT }])),
                map((ancestors) => (isVersion(document) ? ancestors.filter((ancestor) => ancestor.sys_id !== document.sys_parentId) : ancestors))
            )
            .subscribe({
                next: (ancestors) => {
                    this.breadcrumbElements = ancestors;
                },
            });
    }
}
