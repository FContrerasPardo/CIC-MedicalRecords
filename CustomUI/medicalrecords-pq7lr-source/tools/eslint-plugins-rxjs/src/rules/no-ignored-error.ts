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
    name: 'no-ignored-error',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the calling of `subscribe` without specifying an error handler.',
        },
        messages: {
            forbidden: 'Calling subscribe without an error handler is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable, couldBeFunction } = getTypeServices(context);

        return {
            "CallExpression[arguments.length > 0] > MemberExpression > Identifier[name='subscribe']": (
                node: es.Identifier
            ) => {
                const memberExpression = node.parent as es.MemberExpression;
                const callExpression = memberExpression.parent as es.CallExpression;

                if (
                    callExpression.arguments.length < 2 &&
                    couldBeObservable(memberExpression.object) &&
                    couldBeFunction(callExpression.arguments[0])
                ) {
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
