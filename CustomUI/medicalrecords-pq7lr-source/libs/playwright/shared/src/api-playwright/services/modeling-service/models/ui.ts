/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export class Ui implements ModelVariation {
    displayName = 'Ui';
    namePrefix = 'pw-e2e-ui-';
    type = 'UI';
    contentType = 'application/json';
    contentExtension = 'json';

    getDefaultContent(entityName: string, entityId: string) {
        return JSON.stringify({
            id: this.type.toLowerCase() + '-' + entityId,
            name: entityName,
            'adf-template': 'content',
            plugins: [],
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
