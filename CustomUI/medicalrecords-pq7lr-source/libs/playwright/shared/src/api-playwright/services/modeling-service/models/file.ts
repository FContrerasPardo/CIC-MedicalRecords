/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export class File implements ModelVariation {
    displayName = 'File';
    namePrefix = 'pw-e2e-file-';
    type = 'FILE';
    contentType = 'application/octet-stream';
    contentExtension = 'bin';

    getDefaultContent(entityName: string, entityId: string): string {
        return JSON.stringify({
            id: this.type.toLowerCase() + '-' + entityId,
            name: entityName,
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
