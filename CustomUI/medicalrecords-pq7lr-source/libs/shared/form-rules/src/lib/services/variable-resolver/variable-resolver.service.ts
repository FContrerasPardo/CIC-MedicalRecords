/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { FIELD_PREFIX, FormRulesContext, PROCESS_VARIABLES_PREFIX, VARIABLE_PREFIX, PayloadBody } from '../../model/form-rules.model';
import { FormModel, FormRulesEvent } from '@alfresco/adf-core';
import { FormProcessFinishEventData } from '../interfaces';
import { ProcessVariableResolverService } from './process-variables/process-variable-resolver.service';
import { create, all, ConfigOptions, BigNumber } from 'mathjs';

const MATH_CONFIG: ConfigOptions = {
    number: 'BigNumber',
    precision: 64,
};

const math = create(all, MATH_CONFIG);

@Injectable({
    providedIn: 'root',
})
export class VariableResolverService {
    private readonly processVariableResolver = inject(ProcessVariableResolverService);
    private context: FormRulesContext | null = null;
    private formulaScope: PayloadBody = {};

    private readonly EXPRESSION_REGEX = /\$\{(\s|\S)+?\}/m;
    private readonly GLOBAL_EXPRESSION_REGEX = /\$\{(\s|\S)+?\}/gm;
    private readonly FORMULA_MATCH_REGEX = /\$\{field\.(\w+)\}/g;
    private readonly TRAILING_ZEROS_REGEX = /\.?0+$/;
    private readonly FIELD_NULL_CMP_REGEX = /\$\{field\.(\w+)\}\s*(!=|==)\s*null/g;
    private readonly NULL_FIELD_CMP_REGEX = /null\s*(!=|==)\s*\$\{field\.(\w+)\}/g;

    buildVariableContext(event: FormRulesEvent): FormRulesContext {
        const form = <FormModel>event.form;
        const context: FormRulesContext = {
            field: {},
            variable: {},
        };
        const formulaScope: PayloadBody = {};
        const formFields = form.getFormFields();

        if (formFields && formFields.length > 0) {
            for (const field of formFields) {
                context.field = { ...context.field, [field.id]: field.value };
                formulaScope[field.id] = field.value === null || field.value === undefined || field.value === '' ? null : field.value;
            }
        }

        if (form.variables) {
            for (const variable of form.variables) {
                context.variable = {
                    ...context.variable,
                    [variable.id]: form.getProcessVariableValue(variable.name),
                    [variable.name]: form.getProcessVariableValue(variable.name),
                };
            }
        }

        this.context = context;
        this.formulaScope = formulaScope;

        return this.context;
    }

    clearContext(): void {
        this.context = null;
    }

    resolveExpression(match: any, event: FormRulesEvent, allowNull?: boolean, data?: FormProcessFinishEventData): any {
        if (typeof match !== 'string') {
            return match;
        }

        this.buildVariableContext(event);

        let expression = match?.trim() || '';

        if (this.isFormula(expression)) {
            return this.resolveFormula(expression);
        }

        if (this.EXPRESSION_REGEX.test(expression)) {
            expression = expression.substring(2, match?.length - 1);
        }

        if (expression.startsWith(FIELD_PREFIX)) {
            const field = expression.slice(FIELD_PREFIX.length);
            if (allowNull) {
                return this.context?.field?.[field];
            }
            return this.context?.field?.[field] ?? (this.context?.field && Object.hasOwn(this.context.field, field) ? '' : match);
        } else if (expression.startsWith(VARIABLE_PREFIX)) {
            const variable = expression.slice(VARIABLE_PREFIX.length);
            return allowNull ? this.context?.variable?.[variable] : this.context?.variable?.[variable] || match;
        } else if (expression.startsWith(PROCESS_VARIABLES_PREFIX)) {
            const processVariableValue = this.processVariableResolver.resolve({
                expression,
                processInstanceVariables: data?.process.variable ?? {},
            });

            return processVariableValue;
        } else {
            return match;
        }
    }

    private isFormula(expression: string): boolean {
        return expression.startsWith('=');
    }

    private cleanExpressionForFormulaResolve(expression: string): string {
        const stripped = expression.replace(/^=/, '');
        const withRawNullComparisons = stripped
            .replace(this.FIELD_NULL_CMP_REGEX, (_, varName, operator) => `${varName} ${operator} null`)
            .replace(this.NULL_FIELD_CMP_REGEX, (_, operator, varName) => `null ${operator} ${varName}`);
        return withRawNullComparisons.replace(this.FORMULA_MATCH_REGEX, (_, varName) => `bignumber(${varName})`);
    }

    private resolveFormula(expression: string): string {
        try {
            const result: BigNumber = math.evaluate(this.cleanExpressionForFormulaResolve(expression), this.formulaScope);

            const resultToNumber: number = typeof result === 'object' ? result.toNumber() : result;

            if (!Number.isFinite(resultToNumber) || Number.isNaN(resultToNumber)) {
                throw new TypeError('Invalid result');
            }

            return result.toFixed(2).replace(this.TRAILING_ZEROS_REGEX, '');
        } catch {
            return '';
        }
    }

    resolveExpressionString(expression: string, event: FormRulesEvent, allowNull?: boolean): any {
        let result = expression || '';

        const matches = result.match(this.GLOBAL_EXPRESSION_REGEX);

        if (matches) {
            for (const match of matches) {
                const expressionResult = this.resolveExpression(match, event, allowNull);
                result = result.replace(match, JSON.stringify(expressionResult));
            }
        }

        try {
            result = JSON.parse(result);
        } catch {}

        return result;
    }
}
