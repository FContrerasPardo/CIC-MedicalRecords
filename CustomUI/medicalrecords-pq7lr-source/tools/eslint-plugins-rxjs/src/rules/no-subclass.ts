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

const queryNames = [
    'AsyncSubject',
    'BehaviorSubject',
    'Observable',
    'ReplaySubject',
    'Scheduler',
    'Subject',
    'Subscriber',
];

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-subclass',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids subClassing RxJS classes.',
        },
        messages: {
            forbidden: 'SubClassing RxJS classes is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeType } = getTypeServices(context);

        return {
            [`ClassDeclaration[superClass.name=/^(${queryNames.join('|')})$/] > Identifier.superClass`]: (
                node: es.Identifier
            ) => {
                if (queryNames.some((name) => couldBeType(node, name, { name: /[/\\]rxjs[/\\]/ }))) {
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
