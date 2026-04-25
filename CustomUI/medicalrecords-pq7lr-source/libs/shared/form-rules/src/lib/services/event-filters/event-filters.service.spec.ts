/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { EventFiltersService } from './event-filters.service';
import { VariableResolverService } from '../variable-resolver/variable-resolver.service';
import { Condition, ConditionOperator, ConditionStatementType, PredicateOperator } from '../../model/conditions.model';
import { FormFieldTypes, FormRulesEvent } from '@alfresco/adf-core';
import { HandleRuleEventOnProcessFinishData, OnProcessFinishCondition } from '../interfaces';

describe('EventFiltersService', () => {
    let service: EventFiltersService;
    let variableResolver: jest.Mocked<VariableResolverService>;

    beforeEach(() => {
        const spy: jest.Mocked<VariableResolverService> = {
            resolveExpressionString: jest.fn(),
            resolveExpression: jest.fn(),
        } as any;
        TestBed.configureTestingModule({
            providers: [EventFiltersService, { provide: VariableResolverService, useValue: spy }],
        });
        service = TestBed.inject(EventFiltersService);
        variableResolver = TestBed.inject(VariableResolverService) as jest.Mocked<VariableResolverService>;
    });

    it('should return true if no filter is provided', () => {
        expect(service.eventMatchesRule({} as any, undefined)).toBeTruthy();
    });

    it('should test string filter using testExpression', () => {
        variableResolver.resolveExpressionString.mockReturnValue(true);
        expect(service.eventMatchesRule({} as any, 'someExpr')).toBeTruthy();
        variableResolver.resolveExpressionString.mockReturnValue(false);
        expect(service.eventMatchesRule({} as any, 'someExpr')).toBeFalsy();
    });

    it('should handle PredicateOperator.None', () => {
        const filter = {
            operator: PredicateOperator.None,
            conditions: [
                {
                    left: { type: ConditionStatementType.Value, value: 1 },
                    operator: ConditionOperator.EQ,
                    right: { type: ConditionStatementType.Value, value: 1 },
                },
            ],
        };
        jest.spyOn(service as any, 'testCondition').mockReturnValue(true);
        expect(service.eventMatchesRule({} as any, filter)).toBeFalsy();
    });

    it('should handle PredicateOperator.Some', () => {
        const filter = {
            operator: PredicateOperator.Some,
            conditions: [
                {
                    left: { type: ConditionStatementType.Value, value: 1 },
                    operator: ConditionOperator.EQ,
                    right: { type: ConditionStatementType.Value, value: 1 },
                },
            ],
        };
        jest.spyOn(service as any, 'testCondition').mockReturnValue(true);
        expect(service.eventMatchesRule({} as any, filter)).toBeTruthy();
    });

    it('should handle PredicateOperator default (every)', () => {
        const filter = {
            operator: PredicateOperator.Every,
            conditions: [
                {
                    left: { type: ConditionStatementType.Value, value: 1 },
                    operator: ConditionOperator.EQ,
                    right: { type: ConditionStatementType.Value, value: 1 },
                },
            ],
        };
        jest.spyOn(service as any, 'testCondition').mockReturnValue(true);
        expect(service.eventMatchesRule({} as any, filter)).toBeTruthy();
    });

    it('should test EQ operator with integer type ', () => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: { type: 'integer' } },
            operator: ConditionOperator.EQ,
            right: { type: ConditionStatementType.Value, value: 1 },
        };
        jest.spyOn(service as any, 'getConditionStatementValue')
            .mockReturnValueOnce('1')
            .mockReturnValueOnce(1);
        expect((service as any).testCondition(condition, {})).toBeTruthy();
    });

    it('should return true for EQ operator when left is string "1" and right is number 1', () => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: { type: 'integer' } },
            operator: ConditionOperator.EQ,
            right: { type: ConditionStatementType.Value, value: 1 },
        };
        jest.spyOn(service as any, 'getConditionStatementValue')
            .mockReturnValueOnce('1') // left value as string
            .mockReturnValueOnce(1); // right value as number
        expect((service as any).testCondition(condition, {})).toBeTruthy();
    });

    it('should test NE operator with integer type', () => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: { type: 'integer' } },
            operator: ConditionOperator.NE,
            right: { type: ConditionStatementType.Value, value: 2 },
        };
        jest.spyOn(service as any, 'getConditionStatementValue')
            .mockReturnValueOnce(1)
            .mockReturnValueOnce(2);
        expect((service as any).testCondition(condition, {})).toBeTruthy();
    });

    it('should return false for NE operator when left is string and right is number', () => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: { type: 'integer' } },
            operator: ConditionOperator.NE,
            right: { type: ConditionStatementType.Value, value: 1 },
        };
        jest.spyOn(service as any, 'getConditionStatementValue')
            .mockReturnValueOnce('1') // left value as string
            .mockReturnValueOnce(1); // right value as number
        expect((service as any).testCondition(condition, {})).toBeFalsy();
    });

    it('should test CT and NC operators', () => {
        expect((service as any).statementContainsValue('abc', 'a')).toBeTruthy();
        expect((service as any).statementContainsValue(['a', 'b'], 'a')).toBeFalsy();
        expect((service as any).statementContainsValue([{ id: '1' }], '1')).toBeTruthy();
    });

    it('should resolve expression in getConditionStatementValue', () => {
        variableResolver.resolveExpressionString.mockReturnValue('resolved');
        const statement = { type: ConditionStatementType.Expression, value: 'expr' };
        expect((service as any).getConditionStatementValue(statement, {})).toBe('resolved');
    });

    it('should resolve variable in getConditionStatementValue', () => {
        variableResolver.resolveExpression.mockReturnValue('var');
        const statement = { type: ConditionStatementType.Variable, value: { id: 'id' } };
        expect((service as any).getConditionStatementValue(statement, {})).toBe('var');
    });

    it('should return value in getConditionStatementValue', () => {
        const statement = { type: ConditionStatementType.Value, value: 123 };
        expect((service as any).getConditionStatementValue(statement, {})).toBe(123);
    });

    it('should identify OnProcessFinishCondition', () => {
        const condition = { type: 'CORRELATION_KEY', value: 'key' };
        expect((service as any).isOnProcessFinishCondition(condition)).toBeTruthy();
    });

    it('should return true for OnProcessFinishCondition when correlationKey matches', () => {
        const condition: OnProcessFinishCondition = { type: 'CORRELATION_KEY', value: 'key' };
        const data = { process: { correlationKey: 'key' } } as HandleRuleEventOnProcessFinishData;

        const match = service.eventMatchesRule(
            {} as FormRulesEvent,
            {
                conditions: [condition],
                operator: PredicateOperator.Every,
            },
            data
        );
        expect(match).toBe(true);
    });

    it('should return false for OnProcessFinishCondition when correlationKey does not match', () => {
        const condition = { type: 'CORRELATION_KEY', value: 'key' } as unknown as Condition;
        const data = { process: { correlationKey: 'other' } } as HandleRuleEventOnProcessFinishData;

        const match = service.eventMatchesRule(
            {} as FormRulesEvent,
            {
                conditions: [condition],
                operator: PredicateOperator.Every,
            },
            data
        );
        expect(match).toBe(false);
    });

    it('should set leftValue to null for DROPDOWN with empty value', () => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: 'empty' },
            operator: ConditionOperator.EQ,
            right: { type: ConditionStatementType.Value, value: null },
        };
        const event = { field: { type: FormFieldTypes.DROPDOWN } } as FormRulesEvent;

        const match = service.eventMatchesRule(event, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(true);
    });

    it('should set leftValue to empty string for DATE/DATETIME with null left and right is Expression', () => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: null },
            operator: ConditionOperator.EQ,
            right: { type: ConditionStatementType.Expression, value: 'expr' },
        };
        const event = { field: { type: FormFieldTypes.DATE } } as FormRulesEvent;
        variableResolver.resolveExpressionString.mockReturnValue('');

        const match = service.eventMatchesRule(event, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(true);
        expect(variableResolver.resolveExpressionString).toHaveBeenCalledWith('expr', event);
    });

    it.each([
        { left: 2, right: 1, expected: true },
        { left: 1, right: 2, expected: false },
        { left: ' 3', right: 2, expected: true },
        { left: '2', right: '2', expected: true },
        { left: -1, right: -2, expected: true },
        { left: 0, right: 0, expected: true },
        { left: 'a', right: 'b', expected: false },
        { left: 2, right: '1', expected: true },
        { left: '2', right: 1, expected: true },
    ])('should test GE operator with left: $left, right: $right', ({ left, right, expected }) => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: left },
            operator: ConditionOperator.GE,
            right: { type: ConditionStatementType.Value, value: right },
        };
        const match = service.eventMatchesRule({} as FormRulesEvent, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(expected);
    });

    it.each([
        { left: 2, right: 1, expected: false },
        { left: 1, right: 2, expected: true },
        { left: ' 3', right: 2, expected: false },
        { left: '2', right: '2', expected: true },
        { left: -1, right: -2, expected: false },
        { left: 0, right: 0, expected: true },
        { left: 'a', right: 'b', expected: true },
        { left: 2, right: '1', expected: false },
        { left: '2', right: 1, expected: false },
    ])('should test LE operator with left: $left, right: $right', ({ left, right, expected }) => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: left },
            operator: ConditionOperator.LE,
            right: { type: ConditionStatementType.Value, value: right },
        };
        const match = service.eventMatchesRule({} as FormRulesEvent, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(expected);
    });

    it.each([
        { left: 2, right: 1, expected: false },
        { left: 1, right: 2, expected: true },
        { left: ' 3', right: 2, expected: false },
        { left: '2', right: '2', expected: false },
        { left: -1, right: -2, expected: false },
        { left: 0, right: 0, expected: false },
        { left: 'a', right: 'b', expected: true },
        { left: 2, right: '1', expected: false },
        { left: '2', right: 1, expected: false },
    ])('should test LT operator with left: $left, right: $right', ({ left, right, expected }) => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: left },
            operator: ConditionOperator.LT,
            right: { type: ConditionStatementType.Value, value: right },
        };
        const match = service.eventMatchesRule({} as FormRulesEvent, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(expected);
    });

    it.each([
        { left: 2, right: 2, expected: true },
        { left: 1, right: 2, expected: false },
        { left: ' 3', right: 3, expected: true },
        { left: '2', right: '2', expected: true },
        { left: -1, right: -1, expected: true },
        { left: 0, right: 0, expected: true },
        { left: 'a', right: 'a', expected: true },
        { left: 2, right: '2', expected: true },
        { left: '2', right: 2, expected: true },
    ])('should test EQ operator with left: $left, right: $right', ({ left, right, expected }) => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: left },
            operator: ConditionOperator.EQ,
            right: { type: ConditionStatementType.Value, value: right },
        };
        const match = service.eventMatchesRule({} as FormRulesEvent, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(expected);
    });

    it.each([
        { left: 2, right: 2, expected: false },
        { left: 1, right: 2, expected: true },
        { left: ' 3', right: 3, expected: false },
        { left: '2', right: '2', expected: false },
        { left: -1, right: -1, expected: false },
        { left: 0, right: 0, expected: false },
        { left: 'a', right: 'a', expected: false },
        { left: 2, right: '2', expected: false },
        { left: '2', right: 2, expected: false },
    ])('should test NE operator with left: $left, right: $right', ({ left, right, expected }) => {
        const condition = {
            left: { type: ConditionStatementType.Value, value: left },
            operator: ConditionOperator.NE,
            right: { type: ConditionStatementType.Value, value: right },
        };
        const match = service.eventMatchesRule({} as FormRulesEvent, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(expected);
    });

    describe('IS_SET (NE + hasNullOperator)', () => {
        it('should return true when field has a value', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('some value');
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field is null', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(null);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when dropdown field has a selected value', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${dropdown}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('option1');
            const event = { field: { type: FormFieldTypes.DROPDOWN } } as FormRulesEvent;
            const match = service.eventMatchesRule(event, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when dropdown field value is "empty"', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${dropdown}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('empty');
            const event = { field: { type: FormFieldTypes.DROPDOWN } } as FormRulesEvent;
            const match = service.eventMatchesRule(event, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return false when field value is empty string (empty string is treated as not set)', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('');
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return false when field is undefined', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(undefined);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when field value is numeric zero (falsy but set)', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(0);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return true when field value is boolean false (falsy but set)', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(false);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field value is an empty array', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue([]);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when field value is a non-empty array', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(['item1']);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field value is an empty object', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue({});
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when field value is a non-empty object', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.NE,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue({ key: 'value' });
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });
    });

    describe('NOT_SET (EQ + hasNullOperator)', () => {
        it('should return true when field is null', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(null);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field has a value', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('some value');
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when dropdown field value is "empty"', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${dropdown}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('empty');
            const event = { field: { type: FormFieldTypes.DROPDOWN } } as FormRulesEvent;
            const match = service.eventMatchesRule(event, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return true when field is undefined', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(undefined);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return true when field value is empty string', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue('');
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field value is numeric zero (falsy but set)', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(0);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return false when field value is boolean false (falsy but set)', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(false);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when field value is an empty array', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue([]);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field value is a non-empty array', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue(['item1']);
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });

        it('should return true when field value is an empty object', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue({});
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(true);
        });

        it('should return false when field value is a non-empty object', () => {
            const condition: Condition = {
                left: { type: ConditionStatementType.Expression, value: '${field}' },
                operator: ConditionOperator.EQ,
                right: { type: ConditionStatementType.Expression, value: null },
                hasNullOperator: true,
            };
            variableResolver.resolveExpressionString.mockReturnValue({ key: 'value' });
            const match = service.eventMatchesRule({} as FormRulesEvent, {
                conditions: [condition],
                operator: PredicateOperator.Every,
            });
            expect(match).toBe(false);
        });
    });

    it.each([
        { left: 2, right: 1, expected: true },
        { left: 1, right: 2, expected: false },
        { left: ' 3', right: 2, expected: true },
        { left: '50', right: '100', expected: false },
        { left: '50.1', right: '50.0', expected: true },
        { left: '50.0', right: '50.1', expected: false },
        { left: -1, right: -2, expected: true },
        { left: 0, right: 0, expected: false },
        { left: 'a', right: 'b', expected: false },
        { left: 2, right: '1', expected: true },
        { left: '2', right: 1, expected: true },
    ])('should test GT operator with left: $left, right: $right', ({ left, right, expected }) => {
        const condition: Condition = {
            left: { type: ConditionStatementType.Value, value: left },
            operator: ConditionOperator.GT,
            right: { type: ConditionStatementType.Value, value: right },
        };

        const match = service.eventMatchesRule({} as FormRulesEvent, {
            conditions: [condition],
            operator: PredicateOperator.Every,
        });
        expect(match).toBe(expected);
    });
});
