/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpFileUploadSnackbarComponent extends BaseComponent {
    static rootElement = '#upload-dialog';

    constructor(page: Page) {
        super(page, HxpFileUploadSnackbarComponent.rootElement);
    }

    fileNames = this.getChild('span.hxp-upload-snackbar-list-row__name');
    retryButton = this.getRootLocator.getByTestId('retry-upload');

    getUploadStatus = (status: string) => this.getChild(`hxp-upload-snackbar-list-row [title="${status}"]`);
}
