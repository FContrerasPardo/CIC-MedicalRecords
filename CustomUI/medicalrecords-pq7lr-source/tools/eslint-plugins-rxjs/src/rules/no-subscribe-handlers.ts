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
    name: 'no-subscribe-handlers',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the passing of handlers to `subscribe`.',
        },
        messages: {
            forbidden: 'Passing handlers to subscribe is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable, couldBeType } = getTypeServices(context);

        return {
            "CallExpression[arguments.length > 0][callee.property.name='subscribe']": (
                node: es.CallExpression
            ) => {
                const callee = node.callee as es.MemberExpression;

                if (couldBeObservable(callee.object) || couldBeType(callee.object, 'Subscribable')) {
                    context.report({
                        messageId: 'forbidden',
                        node: callee.property,
                    });
                }
            },
        };
    },
});

export default rule;
