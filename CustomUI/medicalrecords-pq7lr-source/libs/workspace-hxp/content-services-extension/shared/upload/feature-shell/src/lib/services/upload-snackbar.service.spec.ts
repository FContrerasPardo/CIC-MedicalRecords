/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UploadSnackbarService } from './upload-snackbar.service';
import { firstValueFrom } from 'rxjs';

describe('UploadSnackbarService', () => {
    let service: UploadSnackbarService;

    beforeEach(() => {
        service = new UploadSnackbarService();
    });

    it('should emit maximize event when requestMaximize is called', async () => {
        const maximizePromise = firstValueFrom(service.maximize$);
        service.requestMaximize();
        await maximizePromise;
    });

    it('should emit minimize event when requestMinimize is called', async () => {
        const minimizePromise = firstValueFrom(service.minimize$);
        service.requestMinimize();
        await minimizePromise;
    });
});
