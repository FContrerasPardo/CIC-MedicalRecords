/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SubscribedApp } from '../interfaces/subscribed-app.interface';
import { AppType } from '../types/app-type.type';
import { ProvisioningStatus } from '../types/provisioning-status.type';

export function filterSubscribedApps(subscribedApps: SubscribedApp[]) {
    return subscribedApps.filter(
        (app: SubscribedApp) =>
            (app.provisioningStatus === ProvisioningStatus.Provisioned || app.provisioningStatus === ProvisioningStatus.Carriedover) &&
            app.app.appType !== AppType.Template &&
            app.app.appType !== AppType.Service
    );
}
