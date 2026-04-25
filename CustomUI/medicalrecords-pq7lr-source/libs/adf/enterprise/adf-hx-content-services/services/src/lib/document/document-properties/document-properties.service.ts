/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CardViewItem } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { FieldType } from '@alfresco/adf-hx-content-services/api';
import { Document, PrimaryType } from '@hylandsoftware/hxcs-js-client';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, take, tap } from 'rxjs/operators';
import { ComplexFieldCardViewItemModel, ComplexCardViewItemProperties } from './card-view-complex-property.model';
import { PropertyUtilService } from './document-properties.util.service';
import { SchemaExtractionOptions, SchemaTree, SharedDocumentPropertiesService } from './shared-document-properties.service';
import { DocumentModel } from '../document-model/document-model.model';
import { DocumentModelService } from '../document-model/document-model.service';

type SchemaPrefix = string;
type PrefixedProperty = string;

interface DocumentPropertiesFilteringOptions {
    exclude?: {
        properties?: PrefixedProperty[];
        schemas?: SchemaPrefix[];
    };
    include?: {
        properties?: PrefixedProperty[];
        schemas?: SchemaPrefix[];
    };
}

@Injectable({
    providedIn: 'root',
})
export class DocumentPropertiesService extends SharedDocumentPropertiesService {
    private model: DocumentModel | undefined;

    private readonly documentModelService = inject(DocumentModelService);
    private readonly propertyUtilService = inject(PropertyUtilService);

    getPropertiesFromDocument(document?: Document, options?: DocumentPropertiesFilteringOptions): Observable<CardViewItem[]> {
        if (!document) {
            return of([]);
        }

        return this.fetchDocumentModel().pipe(
            map(() =>
                Object.keys(document)
                    .filter(this.filterProperty(options))
                    .flatMap((property) => this.getCardItem(property, document))
                    .sort(this.sortCardsByLabel.bind(this))
            ),
            catchError((error) => {
                console.error('Error fetching properties from document:', error);
                return of([]);
            })
        );
    }

    getDefaultPropertiesFromDocument(document?: Document): Observable<CardViewItem[]> {
        if (!document) {
            return of([]);
        }

        return this.fetchDocumentModel().pipe(
            map(() => {
                const documentProperties = Object.keys(document);
                const defaultCards = this.propertyUtilService.TOP_DEFAULT_PROPERTIES.filter((property: string) =>
                    documentProperties.includes(property)
                ).flatMap((property: string) => this.getCardItem(property, document));

                const otherCards = Object.keys(document)
                    .filter(
                        this.filterProperty({
                            include: {
                                properties: this.propertyUtilService.OTHER_PROPERTIES,
                            },
                        })
                    )
                    .flatMap((property) => this.getCardItem(property, document))
                    .sort(this.sortCardsByLabel.bind(this));
                return [...defaultCards, ...otherCards];
            }),
            catchError(() => of([]))
        );
    }

    isRequired(property: string): boolean {
        const propertyConstraints = this.model?.getFieldConstraints(property);
        return propertyConstraints?.['nullable'] === false;
    }

    propertyType(property: string): FieldType | undefined {
        return this.model ? this.propertyUtilService.propertyType(this.model, property) : undefined;
    }

    isFieldTypeArray(property: FieldType): boolean | undefined {
        return this?.model?.isFieldTypeArray(property);
    }

    /**
     * Extracts schema information for a given primary type.
     *
     * Returns an array of schema objects, each containing:
     * - schema: The schema name
     * - fields: A record of field names with their initialized values
     *
     * System schemas are always included. Custom schemas can be optionally included.
     *
     * @param primaryType - The primary type to extract schemas for (e.g., 'hyland:document')
     * @param options - Configuration options for schema extraction
     * @returns Observable that emits an array of schema tree objects
     *
     * @example
     * ```typescript
     * // Get system schemas only (default)
     * documentPropertiesService.extractSchemas('hyland:document')
     *   .subscribe(schemas => { ... });
     *
     * // Get both system and custom schemas
     * documentPropertiesService.extractSchemas('hyland:document', { includeCustomProperties: true })
     *   .subscribe(schemas => { ... });
     * ```
     */
    extractSchemas(primaryType: string, options?: SchemaExtractionOptions): Observable<SchemaTree> {
        return this.fetchModelAndSchemas(primaryType).pipe(
            map(({ documentModel, schemas }) => this.buildSchemaTree(documentModel, schemas, options))
        );
    }

    /**
     * Extracts custom schema fields for a given primary type as a flat record.
     *
     * Returns a single flattened object containing all custom schema fields merged together,
     * with field names as keys and their initialized values.
     *
     * @param primaryType - The primary type to extract schema fields for (e.g., 'hyland:document')
     * @returns Observable that emits a flat record of custom schema fields
     *
     * @example
     * ```typescript
     * documentPropertiesService.extractCustomSchemaFields('hyland:document')
     *   .subscribe(fields => {
     *     console.log('All custom fields:', fields);
     *   });
     * ```
     */
    extractCustomSchemaFields(primaryType: string): Observable<Record<string, any>> {
        return this.fetchModelAndSchemas(primaryType).pipe(
            map(({ documentModel, schemas }) => this.getCustomSchemaFields(documentModel, schemas, { includeCustomProperties: true }))
        );
    }

    getRequiredProperties(): string[] {
        return this.propertyUtilService.REQUIRED_PROPERTIES;
    }

    private buildSchemaTree(documentModel: DocumentModel, schemas: string[], options?: SchemaExtractionOptions): SchemaTree {
        const schemaFields: SchemaTree = [];
        const allSchemas = documentModel.documentModel.schemas || {};
        const includeSystem = options?.includeSystemProperties !== false;
        const includeCustom = options?.includeCustomProperties === true;

        for (const schemaName of schemas) {
            const isSystemSchema = this.propertyUtilService.DEFAULT_EXCLUDED_SCHEMAS.includes(schemaName);
            const isCustomSchema = !isSystemSchema;
            const shouldInclude = (isSystemSchema && includeSystem) || (isCustomSchema && includeCustom);

            if (shouldInclude && allSchemas[schemaName] !== undefined) {
                const properties: Record<string, any> = {};
                this.populateCustomSchemaFields(documentModel, properties, allSchemas[schemaName].fields);
                schemaFields.push({ schema: schemaName, fields: properties });
            }
        }
        return schemaFields;
    }

    private fetchModelAndSchemas(primaryType: string): Observable<{ documentModel: DocumentModel; schemas: string[] }> {
        return this.fetchDocumentModel().pipe(
            map((documentModel: DocumentModel) => {
                const schemas = this.getCustomSchemas(documentModel, primaryType);
                return { documentModel, schemas };
            })
        );
    }

    private getCustomSchemas(customModel: DocumentModel, primaryType: string): string[] {
        const primaryTypeFileSchema = this.extractCustomSchema(primaryType, customModel.documentModel.primaryTypes);
        return primaryTypeFileSchema.filter((schemaName: string) => !this.propertyUtilService.DEFAULT_EXCLUDED_SCHEMAS.includes(schemaName));
    }

    private getCustomSchemaFields(customModel: DocumentModel, schemas: string[], options?: SchemaExtractionOptions): Record<string, any> {
        const customSchemaFields: Record<string, any> = {};
        const allCustomSchemas = customModel.documentModel.schemas || {};
        const includeSystem = options?.includeSystemProperties !== false;
        const includeCustom = options?.includeCustomProperties === true;

        for (const schemaName of schemas) {
            const isSystemSchema = this.propertyUtilService.DEFAULT_EXCLUDED_SCHEMAS.includes(schemaName);
            const isCustomSchema = !isSystemSchema;
            const shouldInclude = (isSystemSchema && includeSystem) || (isCustomSchema && includeCustom);

            if (shouldInclude && allCustomSchemas[schemaName] !== undefined) {
                this.populateCustomSchemaFields(customModel, customSchemaFields, allCustomSchemas[schemaName].fields);
            }
        }
        return customSchemaFields;
    }

    private extractCustomSchema(
        primaryType: string,
        primaryTypes?: {
            [key: string]: PrimaryType;
        },
        visited: string[] = []
    ): string[] {
        // If no primary types are defined, return empty array.
        // Or, if circular inheritance is detected, stop recursion to prevent stack overflow.
        if (!primaryTypes?.[primaryType] || visited.includes(primaryType)) {
            return [];
        }
        visited.push(primaryType);
        const primaryTypeFileSchema = primaryTypes[primaryType].schemas ?? [];
        const parentPrimaryType = primaryTypes[primaryType].extends || '';
        const parentSchemas = parentPrimaryType.length > 0 ? this.extractCustomSchema(parentPrimaryType, primaryTypes, visited) : [];
        return [...parentSchemas, ...primaryTypeFileSchema];
    }

    private populateCustomSchemaFields(customModel: DocumentModel, customSchemaFields: Record<string, any>, schemaFields: any): void {
        for (const fieldName in schemaFields) {
            if (schemaFields[fieldName] !== undefined) {
                const fieldType = this.propertyType(fieldName);
                if (fieldType === FieldType.Complex) {
                    this.handleComplexFieldType(customModel, customSchemaFields, fieldName, schemaFields);
                } else {
                    customSchemaFields[fieldName] = '';
                }
            }
        }
    }

    private handleComplexFieldType(customModel: DocumentModel, customSchemaFields: Record<string, any>, fieldName: string, schemaFields: any): void {
        const complexField = schemaFields[fieldName];

        if (complexField.fields) {
            customSchemaFields[fieldName] = {};
            const inlineFields = Object.keys(complexField.fields);
            for (const inlineField of inlineFields) {
                customSchemaFields[fieldName][inlineField] = '';
            }
        } else {
            const nestedFields = this.getNestedFields(schemaFields[fieldName], customModel.documentModel.types);
            customSchemaFields[fieldName] = nestedFields;
        }
    }

    private getNestedFields(fieldProperties: any, types: any): Record<string, any> {
        const fieldsWithType = types[fieldProperties.type].fields;
        const result: Record<string, any> = {};
        for (const key in fieldsWithType) {
            if (fieldsWithType[key]) {
                result[key] = '';
            }
        }
        return result;
    }

    private fetchDocumentModel(): Observable<DocumentModel> {
        return this.documentModelService.getModel().pipe(
            take(1),
            tap((model: DocumentModel) => (this.model = model)),
            shareReplay()
        );
    }

    private getCardItem(property: string, document: Document): CardViewItem[] {
        const type = this.propertyType(property);
        switch (type) {
            case FieldType.Complex: {
                return this.createComplexCardItems(property, document);
            }
            default: {
                return this.propertyUtilService.createCardItemUtil(property, this.model, document);
            }
        }
    }

    private createComplexCardItems(property: string, document: Document): CardViewItem[] {
        const complexCardViewItemProperties: ComplexCardViewItemProperties = {
            document,
            model: this.model,
            propertyUtilService: this.propertyUtilService,
        };
        const complexFieldGroupCardViewItem = new ComplexFieldCardViewItemModel(
            {
                label: this.propertyUtilService.translateProperty(property),
                value: this.model?.getComplexFieldDetails(property),
                key: property,
            },
            complexCardViewItemProperties
        );

        return complexFieldGroupCardViewItem.displayValue;
    }

    private filterProperty(options?: DocumentPropertiesFilteringOptions): (property: string) => boolean {
        const exclude = options?.exclude;
        const include = options?.include;

        return (property: string) => {
            if (exclude?.schemas?.some((schemaPrefix) => property.startsWith(schemaPrefix))) {
                return false;
            }
            if (exclude?.properties?.includes(property)) {
                return false;
            }

            if (include?.schemas && !include.schemas.some((schemaPrefix) => property.startsWith(schemaPrefix))) {
                return false;
            }
            if (include?.properties && !include.properties.includes(property)) {
                return false;
            }
            return true;
        };
    }

    private sortCardsByLabel(card1: CardViewItem, card2: CardViewItem): number {
        return card1.label.localeCompare(card2.label);
    }
}
