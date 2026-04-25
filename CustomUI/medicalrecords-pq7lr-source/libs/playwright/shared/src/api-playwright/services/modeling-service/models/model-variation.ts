/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface ModelCustomParameters {
    processCategory?: string;
    variables?: object;
    errors?: object;
    entityUUID?: string;
    description?: string;
}

export interface ModelVariation {
    displayName: string;
    namePrefix: string;
    type: string;
    contentType: string;
    contentExtension: string;

    getDefaultContent(entityName: string, entityId: string, customParameters?: ModelCustomParameters): string;
    getDefaultExtensionsContent(customParameters?: ModelCustomParameters): any;
    preprocessImportContent?(content: string, options?: Record<string, unknown>): string;
}
