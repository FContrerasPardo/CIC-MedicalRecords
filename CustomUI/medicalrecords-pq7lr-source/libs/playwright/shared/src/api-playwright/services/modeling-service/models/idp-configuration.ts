/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export const IDP_EXECUTION_PROFILES_DEFAULT = {
    recognition: {
        profileId: 'fe81797f-2d99-450a-92f1-fe4cde5bfc79',
        versionId: '1.0',
    },
    separation: {
        profileId: 'c23262c9-4ee9-49cb-acc4-76575e89f485',
        versionId: '1.0',
    },
    classification: {
        profileId: '078abc02-212b-42fa-92fb-f42edd6bb42d',
        versionId: '2.0',
    },
    extraction: {
        profileId: '078abc02-212b-42fa-92fb-f42edd6bb42d',
        versionId: '1.0',
    },
};

export type IdpExecutionProfiles = typeof IDP_EXECUTION_PROFILES_DEFAULT;

export class IdpConfiguration implements ModelVariation {
    displayName = 'IDP Configuration';
    namePrefix = 'pw-e2e-idp-configuration-';
    type = 'IDP_CONFIGURATION';
    contentType = 'application/json';
    contentExtension = 'json';

    getDefaultContent(entityName: string) {
        return JSON.stringify({
            name: entityName,
            description: '',
            configuration: {},
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }

    preprocessImportContent(content: string, options?: Record<string, unknown>): string {
        const json = JSON.parse(content);
        json.configuration = json.configuration || {};
        json.configuration.profiles =
            (options?.profiles as IdpExecutionProfiles) ?? IDP_EXECUTION_PROFILES_DEFAULT;
        return JSON.stringify(json, null, 2);
    }
}
