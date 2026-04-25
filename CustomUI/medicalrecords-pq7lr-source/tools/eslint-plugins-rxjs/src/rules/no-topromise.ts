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
    // eslint-disable-next-line @cspell/spellchecker
    name: 'no-topromise',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the use of the `toPromise` method.',
        },
        messages: {
            forbidden: 'The toPromise method is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable } = getTypeServices(context);

        return {
            'MemberExpression[property.name="toPromise"]': (node: es.MemberExpression) => {
                if (couldBeObservable(node.object)) {
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
