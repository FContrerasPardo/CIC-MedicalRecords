/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelCustomParameters, ModelVariation } from './';

export class Authentication implements ModelVariation {
    displayName = 'Authentication';
    namePrefix = 'pw-e2e-authentication-';
    type = 'AUTHENTICATION';
    contentType = 'application/json';
    contentExtension = 'json';

    getDefaultContent(entityName: string, _entityId: string, customParameters?: ModelCustomParameters) {
        return JSON.stringify({
            id: '',
            name: `${entityName}`,
            description: customParameters?.description ?? '',
            authProperties: {
                authenticationType: 'basic',
                username: '',
                password: '',
            },
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
