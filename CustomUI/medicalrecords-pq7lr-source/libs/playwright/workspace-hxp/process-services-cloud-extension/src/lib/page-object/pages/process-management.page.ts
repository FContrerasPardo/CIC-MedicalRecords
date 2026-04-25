/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { StartProcessDialog } from '../components';
import { HomePage, AppPageLayoutHeaderComponent } from '@hxp/playwright/workspace-hxp/shared';

export abstract class ProcessManagementPage extends HomePage {
    pageLayoutHeaderComponent = new AppPageLayoutHeaderComponent(this.page);
    startProcessDialog = new StartProcessDialog(this.page);
}
