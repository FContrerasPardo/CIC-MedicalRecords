/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService, AuthenticationService } from '@alfresco/adf-core';
import { Subject } from 'rxjs';

const mockAppConfigService = {
    status: 'loaded',
    get: (key: string) => {
        return key === 'viewer'
            ? {
                  enableDownloadPrompt: false,
                  enableDownloadPromptReminder: false,
                  downloadPromptDelay: 3,
                  downloadPromptReminderDelay: 2,
              }
            : {};
    },
};

export const mockHxcsJsClientConfigurationService = [
    {
        provide: AuthenticationService,
        useValue: {
            getToken: () => 'fake token',
            onTokenReceived: new Subject<any>(),
        },
    },
    {
        provide: AppConfigService,
        useValue: mockAppConfigService,
    },
];
