/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ModelVariation } from './';

export class Agent implements ModelVariation {
    displayName = 'Agent';
    namePrefix = 'pw-e2e-agent-';
    type = 'AGENT';
    contentType = 'application/json';
    contentExtension = 'json';

    getDefaultContent(entityName: string, entityId: string): string {
        return JSON.stringify({
            id: this.type.toLowerCase() + '-' + entityId,
            name: entityName,
            type: 'reasoning',
            behaviorAndConstraints: '',
            model: 'anthropic.claude-3-haiku-20240307-v1:0',
            tools: [],
        });
    }

    getDefaultExtensionsContent() {
        return {};
    }
}
