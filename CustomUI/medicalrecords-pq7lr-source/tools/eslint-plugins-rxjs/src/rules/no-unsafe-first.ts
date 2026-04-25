/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { defaultObservable } from '../constants';
import { ruleCreator } from '../utils';

type Options = [{
    observable?: string;
}];

type MessageIds = 'forbidden';

const defaultOptions: Options = [{}];

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-unsafe-first',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids unsafe `first`/`take` usage in effects and epics.',
        },
        messages: {
            forbidden: 'Unsafe first and take usage in effects and epics are forbidden.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    observable: { type: 'string' },
                },
                additionalProperties: false,
                description: 'An optional object with an optional observable property. ' +
                    'The property can be specified as a regular expression string and is used to identify ' +
                    'the action observables from which effects and epics are composed.',
            },
        ],
    },
    defaultOptions,
    create(context) {
        const invalidOperatorsRegExp = /^(take|first)$/;

        const [config = {}] = context.options;
        const { observable = defaultObservable } = config;
        const observableRegExp = new RegExp(observable);

        const { couldBeObservable } = getTypeServices(context);
        const nodeStack: es.CallExpression[] = [];

        function checkNode(node: es.CallExpression): void {
            if (!node.arguments || node.arguments.length === 0) {
                return;
            }

            if (!couldBeObservable(node)) {
                return;
            }

            for (const arg of node.arguments) {
                if (
                    arg.type === AST_NODE_TYPES.CallExpression &&
                    arg.callee.type === AST_NODE_TYPES.Identifier &&
                    invalidOperatorsRegExp.test(arg.callee.name)
                ) {
                    context.report({
                        messageId: 'forbidden',
                        node: arg.callee,
                    });
                }
            }
        }

        function createSelector(propertyPath: string): string {
            return `CallExpression[callee.property.name='pipe'][callee.${propertyPath}.name=${observableRegExp}]`;
        }

        return {
            [createSelector('object')]: (node: es.Node) => {
                const callExpr = node as es.CallExpression;
                if (nodeStack.push(callExpr) === 1) {
                    checkNode(callExpr);
                }
            },
            [`${createSelector('object')}:exit`]: () => {
                nodeStack.pop();
            },

            [createSelector('object.property')]: (node: es.Node) => {
                const callExpr = node as es.CallExpression;
                if (nodeStack.push(callExpr) === 1) {
                    checkNode(callExpr);
                }
            },
            [`${createSelector('object.property')}:exit`]: () => {
                nodeStack.pop();
            },
        };
    },
});

export default rule;
