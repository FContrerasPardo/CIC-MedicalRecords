/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { type Pagination } from '../../misc';

export interface NodeData {
    entry: NodeDataEntry;
}

export interface NodeDataEntry {
    isFile: boolean;
    isFolder: boolean;
    createdByUser: User;
    modifiedAt: string;
    nodeType: 'cm:content' | 'cm:folder';
    content: any;
    parentId: string;
    aspectNames: [];
    createdAt: string;
    modifiedByUser: User;
    name: string;
    id: string;
    properties: any;
    allowableOperations: [];
}

export interface User {
    id: string;
    displayName: string;
}

export interface PaginatedList {
    list: {
        pagination: Pagination;
    };
    context: any;
    entries: NodeDataEntry[];
}

export interface SiteData {
    entry: SiteDataEntry;
}

export interface SiteDataEntry {
    role: string;
    visibility: 'PUBLIC' | 'PRIVATE' | 'MODERATED';
    guid: string;
    id: string;
    preset: string;
    title: string;
}
