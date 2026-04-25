/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface GovernanceConfigModel {
    dataSources: DataSource[];
    filePlans: FilePlan[];
    categories: Category[];
}

export interface DataSource {
    createdByUser: any;
    createdAt: string | null;
    modifiedByUser: any;
    modifiedAt: string | null;
    name: string;
    description: string | null;
    type: string | null;
    dataSourceId: string | null;
    repoUrl: string | null;
    id: string;
}

export interface FilePlan {
    createdByUser: any;
    createdAt: string | null;
    modifiedByUser: any;
    modifiedAt: string | null;
    id: string;
    name: string;
    description: string | null;
    key: string | null;
    datasource: DataSource;
    categories: Category[] | null;
    filePlanType: string;
}

export interface Category {
    createdByUser: any;
    createdAt: string | null;
    modifiedByUser: any;
    modifiedAt: string | null;
    name: string;
    description: string | null;
    inheritParentRetention: any;
    parentId: string | null;
    filePlanId: string | null;
    retentionPolicy: RetentionPolicy | null;
    contentFocus: {
        createdByUser: any;
        createdAt: string | null;
        modifiedByUser: any;
        modifiedAt: string | null;
        contentType: string;
    };
    id: string;
    categories: Category[] | null;
}

export interface RetentionPolicy {
    name: string | null;
    description: string | null;
    contentFocus: any | null;
    triggerCondition: {
        immediate: boolean;
        propertyBased: string;
        eventBased: string;
    } | null;
    retentionPeriod: any | null;
    disposition: {
        action: string;
    } | null;
}

export interface GovernanceUser {
    id: string;
    username: string;
    email: string;
}

export interface GovernanceApiContext {
    govUrl: string;
    environmentKey: string;
    environmentId: string;
}
