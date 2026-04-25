/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { PermissionsManagementRow } from '@alfresco/adf-hx-content-services/services';
import { NgIf, NgTemplateOutlet } from '@angular/common';
import { AfterContentChecked, Component, ContentChild, Input, TemplateRef, ViewEncapsulation } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-permissions-table',
    templateUrl: './permissions-table.component.html',
    styleUrls: ['./permissions-table.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [NgIf, MatTableModule, NgTemplateOutlet, TranslatePipe],
})
export class PermissionsTableComponent implements AfterContentChecked {
    @Input()
    title = '';

    @Input()
    activePermissionsManagementRows: PermissionsManagementRow[] = [];

    // HEADER INJECTED CONTENTS

    // unicorn/no-null rule is disabled because TemplateRef cannot be undefined, unless a default ref is provided in the template.
    // Headers have no default reference
    @ContentChild('entityColumnHeader', { static: false })

    entityColumnHeaderTemplateRef: TemplateRef<any> | null = null;

    @ContentChild('inheritedPermissionColumnHeader', { static: false })

    inheritedPermissionColumnHeaderTemplateRef: TemplateRef<any> | null = null;

    @ContentChild('fileColumnHeader', { static: false })

    fileColumnHeaderTemplateRef: TemplateRef<any> | null = null;

    @ContentChild('emptyTable', { static: false })

    emptyTableTemplateRef?: TemplateRef<any>;

    // CELL INJECTED CONTENTS

    @ContentChild('entityCell', { static: false })
    entityCellTemplateRef?: TemplateRef<any>;

    @ContentChild('inheritedPermissionCell', { static: false })
    // in this case the column is optional, therefore there is no default ref.

    inheritedPermissionCellTemplateRef: TemplateRef<any> | null = null;

    @ContentChild('fileCell', { static: false })
    fileCellTemplateRef?: TemplateRef<any>;

    protected displayedColumns: string[] = ['permissionEntity', 'permission'];

    ngAfterContentChecked() {
        this.displayedColumns = this.getAvailableColumns();
    }

    private getAvailableColumns(): string[] {
        return this.inheritedPermissionCellTemplateRef
            ? ['permissionEntity', 'inheritedPermission', 'permission']
            : ['permissionEntity', 'permission'];
    }
}
