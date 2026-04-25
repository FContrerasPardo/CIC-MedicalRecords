/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Observable } from 'rxjs';
import { CardViewItem } from '@alfresco/adf-core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { FieldType } from '@alfresco/adf-hx-content-services/api';
import { Injectable, InjectionToken } from '@angular/core';

export const DOCUMENT_PROPERTIES_SERVICE = new InjectionToken<SharedDocumentPropertiesService>('DOCUMENT_PROPERTIES_SERVICE');

export type SchemaTree = Array<{ schema: string; fields: Record<string, any> }>;

export interface SchemaExtractionOptions {
    /**
     * Include custom schemas in addition to system schemas.
     * @default false
     */
    includeCustomProperties?: boolean;
    /**
     * Include system schemas in the extraction.
     * @default true
     */
    includeSystemProperties?: boolean;
}

@Injectable()
export abstract class SharedDocumentPropertiesService {
    abstract getPropertiesFromDocument(document?: Document | null, options?: any): Observable<CardViewItem[]>;
    abstract getDefaultPropertiesFromDocument(document?: Document | null): Observable<CardViewItem[]>;
    abstract propertyType(property: string): FieldType | undefined;
    abstract getRequiredProperties(): string[];
    abstract extractCustomSchemaFields(primaryType: string): Observable<Record<string, any>>;
    abstract extractSchemas(primaryType: string, options?: SchemaExtractionOptions): Observable<SchemaTree>;
    abstract isRequired(property: string): boolean;
}
