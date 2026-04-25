/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { ruleCreator } from '../utils';

type Options = [{
    allowConfig?: boolean;
}];

type MessageIds = 'forbidden' | 'forbiddenWithoutConfig';

const defaultOptions: Options = [{}];

const rule = ruleCreator<Options, MessageIds>({
    // eslint-disable-next-line @cspell/spellchecker
    name: 'no-shareeplay',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids using the `shareReplay` operator.',
        },
        messages: {
            forbidden: 'shareReplay is forbidden.',
            forbiddenWithoutConfig: 'shareReplay is forbidden unless a config argument is passed.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowConfig: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions,
    create(context) {
        const [config = {}] = context.options;
        const { allowConfig = true } = config;

        return {
            "CallExpression[callee.name='shareReplay']": (node: es.CallExpression) => {
                let report = true;

                if (allowConfig) {
                    report = node.arguments.length !== 1 || node.arguments[0].type !== AST_NODE_TYPES.ObjectExpression;
                }

                if (report) {
                    context.report({
                        messageId: allowConfig ? 'forbiddenWithoutConfig' : 'forbidden',
                        node: node.callee,
                    });
                }
            },
        };
    },
});

export default rule;
