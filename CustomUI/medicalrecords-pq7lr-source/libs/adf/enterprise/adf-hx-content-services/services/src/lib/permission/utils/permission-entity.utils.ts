/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Group, User } from '@hylandsoftware/hxcs-js-client';
import { PermissionEntity } from '../models/permissions-management-row.model';

export const getEntityPropertiesFromGroup = (entity: Group): PermissionEntity => {
    return {
        entityId: entity.id ?? '',
        entityType: 'group',
        entityLabel: `${entity.name || ''}`.trim(),
        entity,
    };
};

export const getEntityPropertiesFromUser = (entity: User): PermissionEntity => {
    const entityId = entity.id ?? '';
    const entityLabel = entity.firstName || entity.lastName ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() : entityId;
    return {
        entityId: entityId,
        entityType: 'user',
        entityLabel: entityLabel,
        entity,
    };
};
