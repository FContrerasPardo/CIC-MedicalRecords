/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Condition, ConditionOperator, ConditionStatement, ConditionStatementType, Predicate, PredicateOperator } from '../../model/conditions.model';
import { FormFieldTypes, FormRulesEvent } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { FormProcessFinishEventData, OnProcessFinishCondition } from '../interfaces';
import { VariableResolverService } from '../variable-resolver/variable-resolver.service';

@Injectable({
    providedIn: 'root',
})
export class EventFiltersService {
    private readonly numericOperators: ConditionOperator[] = [
        ConditionOperator.EQ,
        ConditionOperator.GE,
        ConditionOperator.GT,
        ConditionOperator.LE,
        ConditionOperator.LT,
        ConditionOperator.NE,
    ];

    private readonly variableResolver = inject(VariableResolverService);

    eventMatchesRule(event: FormRulesEvent, filter: string | Predicate | undefined, data?: FormProcessFinishEventData) {
        if (filter) {
            if (typeof filter === 'string') {
                return this.testExpression(filter, event);
            } else if (filter.conditions && filter.conditions.length > 0) {
                switch (filter.operator) {
                    case PredicateOperator.None: {
                        return !filter.conditions.some((condition) => this.testCondition(condition, event, data));
                    }
                    case PredicateOperator.Some: {
                        return filter.conditions.some((condition) => this.testCondition(condition, event, data));
                    }
                    default: {
                        return filter.conditions.every((condition) => this.testCondition(condition, event, data));
                    }
                }
            }
        }
        return true;
    }

    private testExpression(expression: string, event: FormRulesEvent): boolean {
        return !!this.variableResolver.resolveExpressionString(expression, event);
    }

    private testCondition(condition: Condition | OnProcessFinishCondition, event: FormRulesEvent, data?: FormProcessFinishEventData): boolean {
        if (this.isOnProcessFinishCondition(condition)) {
            return condition.value === data?.process.correlationKey;
        }

        let leftValue = this.getConditionStatementValue(condition?.left, event);

        if (event?.field?.type === FormFieldTypes.DROPDOWN && leftValue === 'empty') {
            leftValue = null;
        }

        if (condition.hasNullOperator) {
            return condition.operator === ConditionOperator.NE ? this.hasValue(leftValue) : !this.hasValue(leftValue);
        }

        if (
            (event?.field?.type === FormFieldTypes.DATE || event?.field?.type === FormFieldTypes.DATETIME) &&
            leftValue === null &&
            condition.right.type === ConditionStatementType.Expression
        ) {
            leftValue = '';
        }

        let rightValue = this.getConditionStatementValue(condition?.right, event);

        if (this.areNumeric(leftValue, rightValue) && this.numericOperators.includes(condition.operator)) {
            leftValue = Number(leftValue);
            rightValue = Number(rightValue);
        }

        switch (condition.operator) {
            case ConditionOperator.EQ: {
                return leftValue === rightValue;
            }
            case ConditionOperator.GE: {
                return leftValue >= rightValue;
            }
            case ConditionOperator.GT: {
                return leftValue > rightValue;
            }
            case ConditionOperator.LE: {
                return leftValue <= rightValue;
            }
            case ConditionOperator.LT: {
                return leftValue < rightValue;
            }
            case ConditionOperator.NE: {
                return leftValue !== rightValue;
            }
            case ConditionOperator.CT: {
                return this.statementContainsValue(leftValue, rightValue);
            }
            case ConditionOperator.NC: {
                return !this.statementContainsValue(leftValue, rightValue);
            }
            default: {
                return !!leftValue;
            }
        }
    }

    private areNumeric(...values: string[]): boolean {
        return values.every((value) => String(value).trim() !== '' && !Number.isNaN(Number(value)));
    }

    private statementContainsValue(leftValue: unknown, rightValue: unknown): boolean {
        if (typeof leftValue === 'string' && typeof rightValue === 'string') {
            return leftValue.includes(rightValue);
        } else if (Array.isArray(leftValue)) {
            return leftValue.some((value) => value.id === rightValue || value.name === rightValue);
        }
        return false;
    }

    private getConditionStatementValue(conditionStatement: ConditionStatement, event: FormRulesEvent): any {
        if (!conditionStatement) {
            return conditionStatement;
        }
        switch (conditionStatement.type) {
            case ConditionStatementType.Expression: {
                return this.variableResolver.resolveExpressionString(conditionStatement.value, event);
            }
            case ConditionStatementType.Variable: {
                return this.variableResolver.resolveExpression(conditionStatement.value.id, event, true);
            }
            default: {
                return conditionStatement.value;
            }
        }
    }

    private hasValue(value: unknown): boolean {
        if (value == null || value === '') {
            return false;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (typeof value === 'object') {
            return Object.keys(value).length > 0;
        }
        return true;
    }

    private isOnProcessFinishCondition(condition: Condition | OnProcessFinishCondition): condition is OnProcessFinishCondition {
        return condition?.['type'] === 'CORRELATION_KEY';
    }
}
