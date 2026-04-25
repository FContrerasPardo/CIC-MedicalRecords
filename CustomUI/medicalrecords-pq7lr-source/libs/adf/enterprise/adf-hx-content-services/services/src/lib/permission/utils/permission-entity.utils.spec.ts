/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Group, User } from '@hylandsoftware/hxcs-js-client';
import { getEntityPropertiesFromGroup, getEntityPropertiesFromUser } from './permission-entity.utils';

describe('Permission Entity Utils', () => {
    describe('getEntityPropertiesFromGroup', () => {
        it('should return correct PermissionEntity from Group with all properties', () => {
            const group: Group = {
                id: 'group-123',
                name: 'Test Group',
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: 'group-123',
                entityType: 'group',
                entityLabel: 'Test Group',
                entity: group,
            });
        });

        it('should return empty string for entityId when id is undefined', () => {
            const group: Group = {
                name: 'Test Group',
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: '',
                entityType: 'group',
                entityLabel: 'Test Group',
                entity: group,
            });
        });

        it('should return empty string for entityId when id is null', () => {
            const group: Group = {
                id: null as any,
                name: 'Test Group',
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: '',
                entityType: 'group',
                entityLabel: 'Test Group',
                entity: group,
            });
        });

        it('should trim entityLabel when name has leading/trailing whitespace', () => {
            const group: Group = {
                id: 'group-123',
                name: '  Test Group  ',
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: 'group-123',
                entityType: 'group',
                entityLabel: 'Test Group',
                entity: group,
            });
        });

        it('should return empty string for entityLabel when name is undefined', () => {
            const group: Group = {
                id: 'group-123',
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: 'group-123',
                entityType: 'group',
                entityLabel: '',
                entity: group,
            });
        });

        it('should return empty string for entityLabel when name is empty string', () => {
            const group: Group = {
                id: 'group-123',
                name: '',
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: 'group-123',
                entityType: 'group',
                entityLabel: '',
                entity: group,
            });
        });

        it('should return empty string for entityLabel when name is null', () => {
            const group: Group = {
                id: 'group-123',
                name: null as any,
            };

            const result = getEntityPropertiesFromGroup(group);

            expect(result).toEqual({
                entityId: 'group-123',
                entityType: 'group',
                entityLabel: '',
                entity: group,
            });
        });
    });

    describe('getEntityPropertiesFromUser', () => {
        it('should return correct PermissionEntity from User with firstName and lastName', () => {
            const user: User = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result).toEqual({
                entityId: 'user-123',
                entityType: 'user',
                entityLabel: 'John Doe',
                entity: user,
            });
        });

        it('should trim entityLabel when firstName and lastName have whitespace', () => {
            const user: User = {
                id: 'user-123',
                firstName: '  John  ',
                lastName: '  Doe  ',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityLabel).toBe('John     Doe');
        });

        it('should return lastName as entityLabel when firstName is missing', () => {
            const user: User = {
                id: 'user-123',
                lastName: 'Doe',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('user-123');
            expect(result.entityLabel).toBe('Doe');
        });

        it('should return firstName as entityLabel when lastName is missing', () => {
            const user: User = {
                id: 'user-123',
                firstName: 'John',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('user-123');
            expect(result.entityLabel).toBe('John');
        });

        it('should return id as entityLabel when both firstName and lastName are missing', () => {
            const user: User = {
                id: 'user-123',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('user-123');
            expect(result.entityLabel).toBe('user-123');
        });

        it('should return empty string for entityId when id is undefined', () => {
            const user: User = {
                firstName: 'John',
                lastName: 'Doe',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result).toEqual({
                entityId: '',
                entityType: 'user',
                entityLabel: 'John Doe',
                entity: user,
            });
        });

        it('should return empty string for entityId and entityLabel when id is undefined and names are missing', () => {
            const user: User = {
                firstName: undefined,
                lastName: undefined,
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('');
            expect(result.entityLabel).toBe('');
        });

        it('should return empty string for entityId when id is null', () => {
            const user: User = {
                id: null as any,
                firstName: 'John',
                lastName: 'Doe',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('');
        });

        it('should handle empty string for firstName and lastName', () => {
            const user: User = {
                id: 'user-123',
                firstName: '',
                lastName: '',
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('user-123');
            expect(result.entityLabel).toBe('user-123');
        });

        it('should handle null for firstName and lastName', () => {
            const user: User = {
                id: 'user-123',
                firstName: null as any,
                lastName: null as any,
            };

            const result = getEntityPropertiesFromUser(user);

            expect(result.entityId).toBe('user-123');
            expect(result.entityLabel).toBe('user-123');
        });
    });
});
