/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DEFAULT_REPOSITORY_ID } from '@alfresco/adf-hx-content-services/api';
import { DOCUMENT, Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { Document as HxcsDocument } from '@hylandsoftware/hxcs-js-client';

export interface DocumentRouterOptions {
    absolute?: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class DocumentRouterService {
    private readonly location = inject(Location);
    private readonly router = inject(Router);
    private readonly document = inject<Document>(DOCUMENT);

    /**
     * Returns the URL for the given document.
     * By default, the URL is relative to the current location, except when the `absolute` option is set to `true`.
     */
    urlFor(document: HxcsDocument, options: DocumentRouterOptions = { absolute: false }): string {
        return this.urlForId(document?.sys_id || '', document?.sys_repository, options);
    }

    /**
     * Returns the URL for the parent of the given document.
     * By default, the URL is relative to the current location, except when the `absolute` option is set to `true`.
     */
    urlForParent(document: HxcsDocument, options: DocumentRouterOptions = { absolute: false }) {
        return this.urlForId(document?.sys_parentId || '', document?.sys_repository, options);
    }

    /**
     * Navigates to the given document.
     */
    navigateTo(document: HxcsDocument, extras?: NavigationExtras): void {
        const url = this.urlFor(document);
        void this.router.navigateByUrl(url, extras);
    }

    /**
     * Returns the URL for the given document id.
     */
    private urlForId(documentId: string, repositoryId: string = DEFAULT_REPOSITORY_ID, options: DocumentRouterOptions = { absolute: false }): string {
        if (options?.absolute) {
            return this.absoluteUrlForId(documentId, repositoryId);
        }

        const urlTree = this.router.createUrlTree(['/', repositoryId, 'documents', documentId]);
        const relativeUrl = this.router.serializeUrl(urlTree);

        return relativeUrl;
    }

    private absoluteUrlForId(documentId: string = '', repositoryId: string = DEFAULT_REPOSITORY_ID): string {
        const urlTree = this.router.createUrlTree(['/', repositoryId, 'documents']);
        const relativeUrl = this.router.serializeUrl(urlTree);
        const preparedUrl = this.location.prepareExternalUrl(relativeUrl);
        const formattedUrl = preparedUrl.startsWith('/') ? preparedUrl : `/${preparedUrl}`;
        const windowRef = this.document.defaultView;
        if (!windowRef) {
            throw new Error('Window reference is not available');
        }
        const href = windowRef.location.href;
        const origin = windowRef.location.origin;
        const deployedApplicationAndCustomUi = href.slice(origin.length, href.indexOf(formattedUrl));

        return `${origin}${deployedApplicationAndCustomUi}${formattedUrl}/${documentId}`;
    }
}
