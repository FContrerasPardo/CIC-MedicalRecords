/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

/**
 * Check if a scope imports a specific name from a source pattern
 */
function isImport(
    scope: any,
    name: string,
    source: string | RegExp
): boolean {
    const variable = scope.variables.find((v: any) => v.name === name);
    if (!variable) {
        return scope.upper ? isImport(scope.upper, name, source) : false;
    }

    return variable.defs.some((def: any) => {
        if (def.type !== 'ImportBinding') {return false;}

        const parent = def.parent;
        if (parent?.type !== 'ImportDeclaration') {return false;}

        const sourceValue = parent.source.value;
        return typeof source === 'string'
            ? sourceValue === source
            : source.test(sourceValue);
    });
}

const rule = ruleCreator<Options, MessageIds>({
    // eslint-disable-next-line @cspell/spellchecker
    name: 'no-ignored-takewhile-value',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids ignoring the value within `takeWhile`.',
        },
        messages: {
            forbidden: 'Ignoring the value within takeWhile is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        function checkNode(expression: es.ArrowFunctionExpression | es.FunctionExpression) {
            const scope = context.sourceCode.getScope(expression);

            if (!isImport(scope, 'takeWhile', /^rxjs\/?/)) {
                return;
            }

            let ignored = true;
            const [param] = expression.params;

            if (param) {
                if (param.type === AST_NODE_TYPES.Identifier) {
                    const variable = scope.variables.find(({ name }) => name === param.name);
                    if (variable && variable.references.length > 0) {
                        ignored = false;
                    }
                } else if (
                    param.type === AST_NODE_TYPES.ArrayPattern ||
                    param.type === AST_NODE_TYPES.ObjectPattern
                ) {
                    ignored = false;
                }
            }

            if (ignored) {
                context.report({
                    messageId: 'forbidden',
                    node: expression,
                });
            }
        }

        return {
            "CallExpression[callee.name='takeWhile'] > ArrowFunctionExpression": checkNode,
            "CallExpression[callee.name='takeWhile'] > FunctionExpression": checkNode,
        };
    },
});

export default rule;
