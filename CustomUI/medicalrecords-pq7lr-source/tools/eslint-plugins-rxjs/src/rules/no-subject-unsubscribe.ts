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
    name: 'no-subject-unsubscribe',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids calling the `unsubscribe` method of a subject instance.',
        },
        messages: {
            forbidden: 'Calling unsubscribe on a subject is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeSubject, couldBeSubscription } = getTypeServices(context);

        return {
            "MemberExpression[property.name='unsubscribe']": (node: es.MemberExpression) => {
                if (couldBeSubject(node.object)) {
                    context.report({
                        messageId: 'forbidden',
                        node: node.property,
                    });
                }
            },

            "CallExpression[callee.property.name='add'][arguments.length > 0]": (
                node: es.CallExpression
            ) => {
                const memberExpression = node.callee as es.MemberExpression;

                if (couldBeSubscription(memberExpression.object)) {
                    const [arg] = node.arguments;

                    if (couldBeSubject(arg)) {
                        context.report({
                            messageId: 'forbidden',
                            node: arg,
                        });
                    }
                }
            },
        };
    },
});

export default rule;
