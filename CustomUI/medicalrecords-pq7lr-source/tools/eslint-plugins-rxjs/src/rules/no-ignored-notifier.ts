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

interface Entry {
    node: es.Node;
    param: es.Identifier;
    sightings: number;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-ignored-notifier',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids observables not composed from the `repeatWhen` or `retryWhen` notifier.',
        },
        messages: {
            forbidden: 'Ignoring the notifier is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeMonoTypeOperatorFunction } = getTypeServices(context);

        const entries: Entry[] = [];

        function getEntry(): Entry | undefined {
            return entries.at(-1);
        }

        return {
            'CallExpression[callee.name=/^(repeatWhen|retryWhen)$/]': (node: es.CallExpression) => {
                if (couldBeMonoTypeOperatorFunction(node)) {
                    const [arg] = node.arguments;

                    if (
                        arg.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                        arg.type === AST_NODE_TYPES.FunctionExpression
                    ) {
                        const [param] = arg.params as es.Identifier[];

                        if (param) {
                            entries.push({
                                node,
                                param,
                                sightings: 0,
                            });
                        } else {
                            context.report({
                                messageId: 'forbidden',
                                node: node.callee,
                            });
                        }
                    }
                }
            },

            'CallExpression[callee.name=/^(repeatWhen|retryWhen)$/]:exit': (node: es.CallExpression) => {
                const entry = getEntry();

                if (!entry) {
                    return;
                }

                if (entry.node === node) {
                    if (entry.sightings < 2) {
                        context.report({
                            messageId: 'forbidden',
                            node: node.callee,
                        });
                    }
                    entries.pop();
                }
            },

            'Identifier': (node: es.Identifier) => {
                const entry = getEntry();

                if (!entry) {
                    return;
                }

                if (node.name === entry.param.name) {
                    ++entry.sightings;
                }
            },
        };
    },
});

export default rule;
