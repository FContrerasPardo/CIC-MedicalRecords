/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '@alfresco/adf-core';

@Pipe({
    name: 'hxpFileUploadError',
    pure: true,
})
export class HxpFileUploadErrorPipe implements PipeTransform {
    private readonly translation = inject(TranslationService);

    transform(errorCode: number): string {
        return this.translation.instant(`FILE_UPLOAD.ERRORS.${errorCode || 'GENERIC'}`);
    }
}
