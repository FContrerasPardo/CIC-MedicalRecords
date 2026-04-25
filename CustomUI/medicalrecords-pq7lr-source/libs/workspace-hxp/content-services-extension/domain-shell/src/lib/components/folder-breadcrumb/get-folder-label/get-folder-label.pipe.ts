/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { isRoot } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
    name: 'getFolderLabel',
})
export class GetFolderLabelPipe implements PipeTransform {
    private readonly translateService = inject(TranslateService);

    transform(document: Document): string {
        return isRoot(document) ? this.translateService.instant('MOVE.DIALOG.ROOT_FOLDER_NAME') : document.sys_title || document.sys_name || '';
    }
}
