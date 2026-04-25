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
    name: 'no-tap',
    meta: {
        type: 'problem',
        deprecated: true,
        replacedBy: ['ban-operators'],
        docs: {
            description: 'Forbids the use of the `tap` operator.',
        },
        messages: {
            forbidden: 'The tap operator is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            'ImportDeclaration[source.value=/^rxjs(\\/operators)?$/] > ImportSpecifier[imported.name="tap"]': (
                node: es.ImportSpecifier
            ) => {
                const { loc } = node;
                context.report({
                    messageId: 'forbidden',
                    loc: {
                        ...loc,
                        end: {
                            ...loc.start,
                            column: loc.start.column + 3,
                        },
                    },
                });
            },
        };
    },
});

export default rule;
