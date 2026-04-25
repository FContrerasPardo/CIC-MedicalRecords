/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    selectTaskInputDataForFieldDefs,
    selectFieldDefinitionsForFieldDefs,
    selectFieldIgnoreForAutoMap,
    selectFieldIgnoreForReviewMap,
    selectRedactedFieldIds,
    selectTableFieldDefinitions,
} from './field-definitions.selectors';
import { IdpFieldRedactionMode } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { screenState, taskData } from '../shared-mock-states';
import { selectFieldDefinitions } from './screen.selectors';

describe('Field Definitions Selectors', () => {
    it('should select task input data via field-defs selector', () => {
        const result = selectTaskInputDataForFieldDefs.projector(screenState);
        expect(result).toEqual(taskData);
    });

    it('should flatten field definitions by class', () => {
        const defs = selectFieldDefinitionsForFieldDefs.projector(taskData);
        expect(Array.isArray(defs)).toBe(true);
        expect(defs.length).toBe(2);
        expect(defs[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String), classId: expect.any(String) }));
        expect(defs.some((d) => d.classId === '1')).toBe(true);
        expect(defs.some((d) => d.classId === '2')).toBe(true);
    });

    it('should build ignoreForAuto map', () => {
        const defs = selectFieldDefinitionsForFieldDefs.projector(taskData);
        const map = selectFieldIgnoreForAutoMap.projector(defs as any);
        expect(map instanceof Map).toBe(true);
        expect(map.get('1')).toBe(false);
    });

    it('should build ignoreForReview map', () => {
        const defs = selectFieldDefinitionsForFieldDefs.projector(taskData);
        const map = selectFieldIgnoreForReviewMap.projector(defs as any);
        expect(map instanceof Map).toBe(true);
        expect(map.get('1')).toBe(false);
    });

    it('should flatten field definitions and build ignore-for-auto map', () => {
        const taskInput = {
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'C1',
                        fieldDefinitions: [
                            { id: 'f1', name: 'Alpha', ignoreForAuto: true },
                            { id: 'f2', name: 'Beta' },
                        ],
                    },
                    {
                        documentClassId: 'C2',
                        fieldDefinitions: [{ id: 'f3', name: 'Gamma', ignoreForAuto: false }],
                    },
                ],
            },
        } as any;

        const flattened = selectFieldDefinitions.projector(taskInput);
        expect(flattened).toEqual([
            { id: 'f1', name: 'Alpha', ignoreForAuto: true, ignoreForReview: false, classId: 'C1' },
            { id: 'f2', name: 'Beta', ignoreForAuto: false, ignoreForReview: false, classId: 'C1' },
            { id: 'f3', name: 'Gamma', ignoreForAuto: false, ignoreForReview: false, classId: 'C2' },
        ]);

        const map = selectFieldIgnoreForAutoMap.projector(flattened);
        expect(map instanceof Map).toBe(true);
        expect(map.get('f1')).toBe(true);
        expect(map.get('f2')).toBe(false);
        expect(map.get('f3')).toBe(false);
    });

    it('should build ignore-for-review map', () => {
        const flattened = [
            { id: 'f1', name: 'Alpha', ignoreForAuto: true, ignoreForReview: true, classId: 'C1' },
            { id: 'f2', name: 'Beta', ignoreForAuto: true, ignoreForReview: false, classId: 'C1' },
        ];
        const map = selectFieldIgnoreForReviewMap.projector(flattened as any);
        expect(map.get('f1')).toBe(true);
        expect(map.get('f2')).toBe(false);
    });

    it('should return table field definitions when table exists', () => {
        const taskInput = {
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'C1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'LineItems',
                                dataType: 'Table',
                                columns: [
                                    { name: 'Description', validation: null },
                                    { name: 'Amount', validation: null },
                                ],
                            },
                        ],
                    },
                ],
            },
        } as any;

        const selector = selectTableFieldDefinitions('table1');
        const result = selector.projector(taskInput);

        expect(result).toEqual([
            {
                name: 'Description',
                validation: null,
            },
            {
                name: 'Amount',
                validation: null,
            },
        ]);
    });

    it('should return empty array when table does not exist', () => {
        const taskInput = {
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'C1',
                        fieldDefinitions: [{ id: 'field1', name: 'Field', dataType: 'String' }],
                    },
                ],
            },
        } as any;

        const selector = selectTableFieldDefinitions('nonExistentTable');
        const result = selector.projector(taskInput);

        expect(result).toEqual([]);
    });

    it('should return empty array when taskInputData is null', () => {
        const selector = selectTableFieldDefinitions('table1');
        const result = selector.projector(null as any);

        expect(result).toEqual([]);
    });

    it('should return empty array when extractionConfiguration is missing', () => {
        const selector = selectTableFieldDefinitions('table1');
        const result = selector.projector({} as any);

        expect(result).toEqual([]);
    });

    it('should find table in second document class', () => {
        const taskInput = {
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'C1',
                        fieldDefinitions: [{ id: 'field1', name: 'Field', dataType: 'String' }],
                    },
                    {
                        documentClassId: 'C2',
                        fieldDefinitions: [
                            {
                                id: 'table2',
                                name: 'Items',
                                dataType: 'Table',
                                columns: [{ name: 'Name', validation: null }],
                            },
                        ],
                    },
                ],
            },
        } as any;

        const selector = selectTableFieldDefinitions('table2');
        const result = selector.projector(taskInput);

        expect(result.length).toBe(1);
    });

    describe('selectRedactedFieldIds', () => {
        it('should include field id when redactionMode is Soft, Hard', () => {
            const taskInput = {
                extractionConfiguration: {
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: 'C1',
                            fieldDefinitions: [
                                { id: 'f1', redactionMode: IdpFieldRedactionMode.Soft },
                                { id: 'f2', redactionMode: IdpFieldRedactionMode.None },
                                { id: 'f3', redactionMode: IdpFieldRedactionMode.Hard },
                            ],
                        },
                    ],
                },
            } as any;

            const result = selectRedactedFieldIds.projector(taskInput);
            expect(result.has('f1')).toBe(true);
            expect(result.has('f2')).toBe(false);
            expect(result.has('f3')).toBe(true);
        });
    });
});
