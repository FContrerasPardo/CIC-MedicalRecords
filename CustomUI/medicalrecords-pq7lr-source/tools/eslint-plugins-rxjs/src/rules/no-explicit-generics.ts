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
 * Check if a node is an array expression
 */
function isArrayExpression(node: es.Node): node is es.ArrayExpression {
    return node.type === AST_NODE_TYPES.ArrayExpression;
}

/**
 * Check if a node is an object expression
 */
function isObjectExpression(node: es.Node): node is es.ObjectExpression {
    return node.type === AST_NODE_TYPES.ObjectExpression;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-explicit-generics',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids explicit generic type arguments.',
        },
        messages: {
            forbidden: 'Explicit generic type arguments are forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        function report(node: es.Node) {
            context.report({
                messageId: 'forbidden',
                node,
            });
        }

        function checkBehaviorSubjects(node: es.Identifier) {
            const parent = node.parent as es.NewExpression;
            const [value] = parent.arguments;

            if (isArrayExpression(value) || isObjectExpression(value)) {
                return;
            }

            report(node);
        }

        function checkNotifications(node: es.Identifier) {
            const parent = node.parent as es.NewExpression;
            const [, value] = parent.arguments;

            if (isArrayExpression(value) || isObjectExpression(value)) {
                return;
            }

            report(node);
        }

        return {
            "CallExpression[callee.property.name='pipe'] > CallExpression[typeParameters.params.length > 0] > Identifier": report,
            "NewExpression[typeParameters.params.length > 0] > Identifier[name='BehaviorSubject']": checkBehaviorSubjects,
            'CallExpression[typeParameters.params.length > 0] > Identifier[name=/^(from|of)$/]': report,
            "NewExpression[typeParameters.params.length > 0][arguments.0.value='N'] > Identifier[name='Notification']": checkNotifications,
        };
    },
});

export default rule;
