/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-permissions-document-title',
    templateUrl: './permissions-document-title.component.html',
    styleUrls: ['./permissions-document-title.component.scss'],
    imports: [MatDialogModule, TranslatePipe],
})
export class PermissionsDocumentTitleComponent {
    @Input() title = '';
}
