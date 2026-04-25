/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

type Options = [{
    alias?: string[];
    allow?: string[];
}];

type MessageIds = 'forbidden';

const defaultOptions: Options = [{}];

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-unsafe-takeuntil',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the application of operators after `takeUntil`.',
        },
        messages: {
            forbidden: 'Applying operators after takeUntil is forbidden.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    alias: { type: 'array', items: { type: 'string' } },
                    allow: { type: 'array', items: { type: 'string' } },
                },
                additionalProperties: false,
                description: 'An optional object with optional `alias` and `allow` properties. ' +
                    'The `alias` property is an array containing the names of operators that aliases for `takeUntil`. ' +
                    'The `allow` property is an array containing the names of the operators that are allowed to follow `takeUntil`.',
            },
        ],
    },
    defaultOptions,
    create(context) {
        let checkedOperatorsRegExp = /^takeUntil$/;
        const allowedOperators = [
            'count',
            'defaultIfEmpty',
            'endWith',
            'every',
            'finalize',
            'finally',
            'isEmpty',
            'last',
            'max',
            'min',
            'publish',
            'publishBehavior',
            'publishLast',
            'publishReplay',
            'reduce',
            'share',
            'shareReplay',
            'skipLast',
            'takeLast',
            'throwIfEmpty',
            'toArray',
        ];

        const [config = {}] = context.options;
        const { alias, allow = allowedOperators } = config;

        if (alias) {
            checkedOperatorsRegExp = new RegExp(`^(${[...alias, 'takeUntil'].join('|')})$`);
        }

        const { couldBeObservable } = getTypeServices(context);

        function checkNode(node: es.CallExpression): void {
            const pipeCallExpression = node.parent as es.CallExpression;

            if (!pipeCallExpression.arguments || !couldBeObservable(pipeCallExpression)) {
                return;
            }

            type State = 'allowed' | 'disallowed' | 'taken';

            pipeCallExpression.arguments.reduceRight((state, arg) => {
                if (state === 'taken') {
                    return state;
                }

                if (arg.type !== AST_NODE_TYPES.CallExpression) {
                    return 'disallowed';
                }

                let operatorName: string;

                if (arg.callee.type === AST_NODE_TYPES.Identifier) {
                    operatorName = arg.callee.name;
                } else if (
                    arg.callee.type === AST_NODE_TYPES.MemberExpression &&
                    arg.callee.property.type === AST_NODE_TYPES.Identifier
                ) {
                    operatorName = arg.callee.property.name;
                } else {
                    return 'disallowed';
                }

                if (checkedOperatorsRegExp.test(operatorName)) {
                    if (state === 'disallowed') {
                        context.report({
                            messageId: 'forbidden',
                            node: arg.callee,
                        });
                    }
                    return 'taken';
                }

                if (!allow.includes(operatorName)) {
                    return 'disallowed';
                }

                return state;
            }, 'allowed' as State);
        }

        return {
            [`CallExpression[callee.property.name='pipe'] > CallExpression[callee.name=${checkedOperatorsRegExp}]`]: checkNode,
            [`CallExpression[callee.property.name='pipe'] > CallExpression[callee.property.name=${checkedOperatorsRegExp}]`]: checkNode,
        };
    },
});

export default rule;
