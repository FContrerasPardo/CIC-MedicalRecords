/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    BasePage,
    MatDialogContainer,
    MenuComponent,
    MatSelectComponent,
    HxpFiltersContainerComponent,
    SatoriHeaderComponent,
} from '@alfresco-dbp/playwright/shared';
import { AppSideNavComponent, HxpWorkspaceHeaderComponent } from '../components';
import { SatPlatformNavPanelComponent } from '@hxp/playwright/shared-hxp';

export abstract class HomePage extends BasePage {
    contentSideNavbar = new AppSideNavComponent(this.page);
    matMenuComponent = new MenuComponent(this.page);
    matDialogContainer = new MatDialogContainer(this.page);
    headerComponent = new SatoriHeaderComponent(this.page);
    matSelectPanel = new MatSelectComponent(this.page);
    filterContainer = new HxpFiltersContainerComponent(this.page);
    hxpWorkspaceHeaderComponent = new HxpWorkspaceHeaderComponent(this.page);
    satPlatformNavPanelComponent = new SatPlatformNavPanelComponent(this.page);
}
