/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const ConditionStatementType = {
    CorrelationKey: 'CORRELATION_KEY',
    ProcessFinish: 'PROCESS_FINISH',
    Variable: 'VARIABLE',
    Expression: 'EXPRESSION',
    Value: 'VALUE',
} as const;

export type ConditionStatementType = typeof ConditionStatementType[keyof typeof ConditionStatementType];

export interface ConditionStatement {
    type: ConditionStatementType;
    value: any;
    display?: string;
}

export const ConditionOperator = {
    EQ: ' eq ',
    NE: ' ne ',
    GT: ' gt ',
    GE: ' ge ',
    LT: ' lt ',
    LE: ' le ',
    CT: ' contains ',
    NC: ' !contains ',
} as const;

export type ConditionOperator = typeof ConditionOperator[keyof typeof ConditionOperator];

export const ConditionOperatorKey = {
    Equals: 'EQUALS',
    NotEquals: 'NOT_EQUALS',
    GreaterThan: 'GREATER_THAN',
    GreaterEqualsThan: 'GREATER_EQUALS_THAN',
    LessThan: 'LESS_THAN',
    LessEqualsThan: 'LESS_EQUALS_THAN',
    IsSet: 'IS_SET',
    NotSet: 'NOT_SET',
    Contains: 'CONTAINS',
    NotContains: 'NOT_CONTAINS',
} as const;

export type ConditionOperatorKey = typeof ConditionOperatorKey[keyof typeof ConditionOperatorKey];

export const reservedWords = ['and', 'or', 'not', 'eq', 'ne', 'lt', 'gt', 'le', 'ge', 'true', 'false', 'null', 'instanceof', 'empty', 'div', 'mod'];
export interface Condition {
    left: ConditionStatement;
    operator: ConditionOperator;
    right: ConditionStatement;
    asHTML?: string;
    hasNullOperator?: boolean;
}
export interface ConditionProcessFinish {
    type: ConditionStatementType;
    value: string;
    asHTML?: string;
}

export interface StartProcessCondition {
    type: 'CORRELATION_KEY';
    value: string;
}

export const ExpressionParsedOperator = {
    Every: ' && ',
    Some: ' || ',
    None: ' && !',
} as const;

export type ExpressionParsedOperator = typeof ExpressionParsedOperator[keyof typeof ExpressionParsedOperator];

export const PredicateOperator = {
    Every: 'every',
    Some: 'some',
    None: 'none',
} as const;

export type PredicateOperator = typeof PredicateOperator[keyof typeof PredicateOperator];

export interface PredicateProcessFinish {
    conditions: ConditionProcessFinish[];
}

export interface Predicate {
    conditions: Condition[];
    operator: PredicateOperator | ExpressionParsedOperator;
}

export interface ExpressionParsed extends Predicate {
    variables: any[];
    operator: ExpressionParsedOperator;
}

export interface ParsingExpression {
    regexp: RegExp;
    operator: ConditionOperator;
    referenceGroups: {
        left: number;
        right: number;
    };
}
