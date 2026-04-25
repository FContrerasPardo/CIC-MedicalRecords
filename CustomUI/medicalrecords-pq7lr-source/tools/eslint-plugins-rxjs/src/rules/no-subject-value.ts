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
    name: 'no-subject-value',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids accessing the `value` property of a `BehaviorSubject` instance.',
        },
        messages: {
            forbidden: 'Accessing the value property of a BehaviorSubject is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeBehaviorSubject } = getTypeServices(context);

        return {
            'Identifier[name=/^(value|getValue)$/]': (node: es.Identifier) => {
                const parent = node.parent;

                if (!parent || !('object' in parent)) {
                    return;
                }

                if (couldBeBehaviorSubject(parent.object)) {
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
