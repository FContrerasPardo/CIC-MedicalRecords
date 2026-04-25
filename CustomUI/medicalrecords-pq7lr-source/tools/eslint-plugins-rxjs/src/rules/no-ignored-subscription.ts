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
    name: 'no-ignored-subscription',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids ignoring the subscription returned by `subscribe`.',
        },
        messages: {
            forbidden: 'Ignoring returned subscriptions is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable, couldBeType } = getTypeServices(context);

        return {
            "ExpressionStatement > CallExpression > MemberExpression[property.name='subscribe']": (
                node: es.MemberExpression
            ) => {
                if (couldBeObservable(node.object)) {
                    const callExpression = node.parent as es.CallExpression;

                    if (
                        callExpression.arguments.length === 1 &&
                        couldBeType(callExpression.arguments[0], 'Subscriber')
                    ) {
                        return;
                    }

                    context.report({
                        messageId: 'forbidden',
                        node: node.property,
                    });
                }
            },
        };
    },
});

export default rule;
