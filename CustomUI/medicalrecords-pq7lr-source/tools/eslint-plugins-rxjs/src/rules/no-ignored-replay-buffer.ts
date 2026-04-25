/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-ignored-replay-buffer',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids using `ReplaySubject`, `publishReplay` or `shareReplay` without specifying the buffer size.',
        },
        messages: {
            forbidden: 'Ignoring the buffer size is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        function checkNode(node: es.Node, args: es.Node[]) {
            if (args.length === 0) {
                context.report({
                    messageId: 'forbidden',
                    node,
                });
            }
        }

        return {
            "NewExpression > Identifier[name='ReplaySubject']": (node: es.Identifier) => {
                const newExpression = node.parent as es.NewExpression;
                checkNode(node, newExpression.arguments);
            },

            "NewExpression > MemberExpression > Identifier[name='ReplaySubject']": (node: es.Identifier) => {
                const memberExpression = node.parent as es.MemberExpression;
                const newExpression = memberExpression.parent as es.NewExpression;
                checkNode(node, newExpression.arguments);
            },

            'CallExpression > Identifier[name=/^(publishReplay|shareReplay)$/]': (
                node: es.Identifier
            ) => {
                const callExpression = node.parent as es.CallExpression;
                checkNode(node, callExpression.arguments);
            },
        };
    },
});

export default rule;
