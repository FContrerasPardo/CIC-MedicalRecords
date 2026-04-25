/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-connectable',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids operators that return connectable observables.',
        },
        messages: {
            forbidden: 'Connectable observables are forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeFunction } = getTypeServices(context);

        return {
            "CallExpression[callee.name='multicast']": (node: es.CallExpression) => {
                if (node.arguments.length === 1) {
                    context.report({
                        messageId: 'forbidden',
                        node: node.callee,
                    });
                }
            },

            'CallExpression[callee.name=/^(publish|publishBehavior|publishLast|publishReplay)$/]': (
                node: es.CallExpression
            ) => {
                if (!node.arguments.some((arg) => couldBeFunction(arg))) {
                    context.report({
                        messageId: 'forbidden',
                        node: node.callee,
                    });
                }
            },
        };
    },
});

export default rule;
