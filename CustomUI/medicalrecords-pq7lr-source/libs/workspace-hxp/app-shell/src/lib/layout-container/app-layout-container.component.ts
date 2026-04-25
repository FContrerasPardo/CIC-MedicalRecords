/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation } from '@angular/core';
import { ShellLayoutComponent } from '@alfresco/adf-core/shell';
import { ApplicationChromeComponent } from '@hxp/shared-hxp/navigation/application-chrome';

@Component({
    selector: 'hxp-app-layout',
    imports: [ApplicationChromeComponent, ShellLayoutComponent],
    templateUrl: './app-layout-container.component.html',
    styleUrls: ['./app-layout-container.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppLayoutContainerComponent {}
