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
    name: 'no-ignored-observable',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the ignoring of observables returned by functions.',
        },
        messages: {
            forbidden: 'Ignoring a returned Observable is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable } = getTypeServices(context);

        return {
            'ExpressionStatement > CallExpression': (node: es.CallExpression) => {
                if (couldBeObservable(node)) {
                    context.report({
                        messageId: 'forbidden',
                        node,
                    });
                }
            },
        };
    },
});

export default rule;
