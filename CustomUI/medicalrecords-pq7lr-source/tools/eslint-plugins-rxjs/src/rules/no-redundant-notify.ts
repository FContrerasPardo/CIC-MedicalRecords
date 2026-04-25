/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

/**
 * Get the text of the object being called in an expression statement
 */
function getExpressionText(expressionStatement: es.ExpressionStatement, sourceCode: Readonly<any>): string | undefined {
    const { expression } = expressionStatement;

    if (expression.type !== AST_NODE_TYPES.CallExpression || expression.callee.type !== AST_NODE_TYPES.MemberExpression) {
        return undefined;
    }

    return sourceCode['getText'](expression.callee.object);
}

/**
 * Check if an expression statement calls a method on a Subject or Subscriber
 */
function isExpressionObserver(expressionStatement: es.ExpressionStatement, couldBeType: (node: es.Node, name: string | RegExp) => boolean): boolean {
    const { expression } = expressionStatement;

    if (expression.type !== AST_NODE_TYPES.CallExpression || expression.callee.type !== AST_NODE_TYPES.MemberExpression) {
        return false;
    }

    return couldBeType(expression.callee.object, /^(Subject|Subscriber)$/);
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-redundant-notify',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids redundant notifications from completed or errored observables.',
        },
        messages: {
            forbidden: 'Redundant notifications are forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const sourceCode = context.sourceCode;
        const { couldBeType } = getTypeServices(context);

        return {
            'ExpressionStatement[expression.callee.property.name=/^(complete|error)$/] + ExpressionStatement[expression.callee.property.name=/^(next|complete|error)$/]':
                (node: es.ExpressionStatement) => {
                    const parent = node.parent;
                    if (!parent) {
                        return;
                    }

                    if (parent.type !== AST_NODE_TYPES.BlockStatement && parent.type !== AST_NODE_TYPES.Program) {
                        return;
                    }

                    const { body } = parent;
                    const index = body.indexOf(node);
                    const sibling = body[index - 1] as es.ExpressionStatement;

                    if (getExpressionText(sibling, sourceCode) !== getExpressionText(node, sourceCode)) {
                        return;
                    }

                    if (!isExpressionObserver(sibling, couldBeType) || !isExpressionObserver(node, couldBeType)) {
                        return;
                    }

                    const { expression } = node;
                    if (
                        expression.type === AST_NODE_TYPES.CallExpression &&
                        expression.callee.type === AST_NODE_TYPES.MemberExpression &&
                        expression.callee.property.type === AST_NODE_TYPES.Identifier
                    ) {
                        context.report({
                            messageId: 'forbidden',
                            node: expression.callee.property,
                        });
                    }
                },
        };
    },
});

export default rule;
