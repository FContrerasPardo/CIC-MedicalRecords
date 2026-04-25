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
    name: 'no-compat',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids importation from locations that depend upon `rxjs-compat`.',
        },
        messages: {
            forbidden: "'rxjs-compat'-dependent import locations are forbidden.",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            'ImportDeclaration Literal[value=/^rxjs\\//]:not(Literal[value=/^rxjs\\/(ajax|fetch|operators|testing|webSocket)/])': (
                node: es.Literal
            ) => {
                context.report({
                    messageId: 'forbidden',
                    node,
                });
            },
        };
    },
});

export default rule;
