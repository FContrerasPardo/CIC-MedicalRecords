/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export class Schema implements ModelVariation {
    displayName = 'Schema';
    namePrefix = 'pw-e2e-schema-';
    type = 'HXP_SCHEMA';
    contentType = 'application/json';
    contentExtension = 'json';
    prefix = 'prefix';

    getDefaultContent(prefix: string) {
        return JSON.stringify({
            type: 'object',
            $id: prefix,
            properties: {},
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
