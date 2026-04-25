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
    name: 'no-create',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the calling of `Observable.create`.',
        },
        messages: {
            forbidden: 'Observable.create is forbidden; use new Observable.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable } = getTypeServices(context);

        return {
            "CallExpression > MemberExpression[object.name='Observable'] > Identifier[name='create']": (
                node: es.Identifier
            ) => {
                const memberExpression = node.parent as es.MemberExpression;
                if (couldBeObservable(memberExpression.object)) {
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
