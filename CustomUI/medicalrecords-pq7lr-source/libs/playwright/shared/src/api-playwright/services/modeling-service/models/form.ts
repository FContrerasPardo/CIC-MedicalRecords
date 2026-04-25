/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export class Form implements ModelVariation {
    displayName = 'Form';
    namePrefix = 'pw-e2e-aps-form-';
    type = 'FORM';
    contentType = 'application/json';
    contentExtension = 'json';

    getDefaultContent(entityName: string, entityId: string) {
        return JSON.stringify({
            formRepresentation: {
                id: this.type.toLowerCase() + '-' + entityId,
                name: entityName,
                version: 0,
                standAlone: true,
                formDefinition: {
                    tabs: [],
                    fields: [],
                    outcomes: [],
                    metadata: {},
                    variables: [],
                },
            },
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
