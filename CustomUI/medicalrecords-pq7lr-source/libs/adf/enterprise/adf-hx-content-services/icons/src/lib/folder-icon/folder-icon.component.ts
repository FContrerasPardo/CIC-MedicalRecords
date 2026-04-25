/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input } from '@angular/core';
import { MimeTypeIconComponent } from '../mime-type-icon/mime-type-icon.component';
import { DefaultIcon } from '../configs/icons.config';

/**
 * Component representing a folder icon.
 *
 * To use the `FolderIconComponent`, you need first to import the component in your module
 *
 * ```ts
 * import { FolderIconComponent } from '@alfresco/adf-hx-content-services/icons';
 * @NgModule({
 *     imports: [
 *         FolderIconComponent,
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
 * <hxp-folder-icon [isExpanded]="false"></hxp-folder-icon>
 */
@Component({
    selector: 'hxp-folder-icon',
    templateUrl: './folder-icon.component.html',
    imports: [MimeTypeIconComponent],
})
export class FolderIconComponent {
    /**
     * Indicates whether the folder is expanded.
     * @type {boolean}
     */
    @Input()
    isExpanded = false;

    protected readonly folderIcon: DefaultIcon = DefaultIcon.FOLDER;
    protected readonly openFolderIcon: DefaultIcon = DefaultIcon.OPEN_FOLDER;
}
