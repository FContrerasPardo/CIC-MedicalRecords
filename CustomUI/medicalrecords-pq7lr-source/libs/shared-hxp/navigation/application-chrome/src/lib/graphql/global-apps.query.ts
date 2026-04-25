/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const GLOBAL_APPS = `
  query GlobalApps {
    currentUser {
      id
      accountApps {
        id
        launchUrl
        appKey
        provisioningStatus
        app {
          id
          localizedName
          appType
        }
      }

      subscribedApps {
        id
        launchUrl
        appKey
        provisioningStatus
        environment {
          id
          name
        }
        app {
          id
          localizedName
          appType
        }
      }
      platformHomeUrl
    }
  }
`;
