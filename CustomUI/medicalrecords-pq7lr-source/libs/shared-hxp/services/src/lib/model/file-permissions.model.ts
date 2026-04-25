/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const PermissionEnum = {
    READ: 'Read',
    DELETE: 'Delete',
    WRITE: 'Write',
    EVERYTHING: 'Everything',
} as const;

export type PermissionEnum = typeof PermissionEnum[keyof typeof PermissionEnum];

export interface IdentityUserModel {
    id?: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    readonly?: boolean;
}

export interface IdentityGroupModel {
    id?: string;
    name: string;
    readonly?: boolean;
}

export interface GroupPermission {
    permission: PermissionEnum;
    granted: boolean;
    group: IdentityGroupModel;
}

export interface UserPermission {
    permission: PermissionEnum;
    granted: boolean;
    user: IdentityUserModel;
}

export type EveryoneId = '__Everyone__';
export const EveryoneIdValue: EveryoneId = '__Everyone__';
export type FormSubmitterId = '__FormSubmitter__';
export const FormSubmitterIdValue: FormSubmitterId = '__FormSubmitter__';
export type permissionByType = 'user' | 'group' | 'everyone' | 'formSubmitter';

export interface EveryonePermission {
    permission: PermissionEnum;
    granted: boolean;
    user: {
        id: EveryoneId;
    };
}

export interface FormSubmitterPermission {
    permission: PermissionEnum;
    granted: boolean;
    status?: PermissionStatus;
    user: {
        id: FormSubmitterId;
    };
}

export type Permission = GroupPermission | UserPermission | EveryonePermission | FormSubmitterPermission;
export type Permissions = Permission[];
