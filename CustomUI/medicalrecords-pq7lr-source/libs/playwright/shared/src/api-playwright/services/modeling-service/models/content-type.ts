/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export class ContentType implements ModelVariation {
    displayName = 'Content Type';
    namePrefix = 'pw-e2e-content-type-';
    type = 'HXP_DOC_TYPE';
    contentType = 'application/json';
    contentExtension = 'json';

    getDefaultContent() {
        return JSON.stringify({
            description: '',
            allOf: [],
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
