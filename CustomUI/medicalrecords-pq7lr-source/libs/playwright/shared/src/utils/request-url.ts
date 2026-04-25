/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppNames } from '../config/config-helpers';

export const getRequestUrlFromAppName = (appName: AppNames) => {
    let url: RegExp;
    switch (appName) {
        case AppNames.WorkspaceHxPContent:
        case AppNames.WorkspaceHxPIdp:
        case AppNames.WorkspaceHxPGovernance:
        case AppNames.WorkspaceHxP:
        case AppNames.AdminHxp:
        case AppNames.HxViewer: {
            url = /idp\/connect\/token/;
            break;
        }
        case AppNames.HxpStudioIdp:
        case AppNames.HxPStudio: {
            url = /projects\?maxItems/;
            break;
        }
        default: {
            throw new Error(`There's no url defined with the app name ${appName}`);
        }
    }
    return url;
};
