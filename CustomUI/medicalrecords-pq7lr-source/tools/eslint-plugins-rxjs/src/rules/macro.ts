/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'macro';

const rule = ruleCreator<Options, MessageIds>({
    name: 'macro',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces the use of the RxJS Tools Babel macro.',
        },
        fixable: 'code',
        messages: {
            macro: 'Use the RxJS Tools Babel macro.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        let hasFailure = false;
        let hasMacroImport = false;
        let program: es.Program | undefined;

        function fix(fixer: any) {
            if (!program) {
                throw new Error('Program node is not defined');
            }
            return fixer.insertTextBefore(
                program,
                'import "babel-plugin-rxjs-tools/macro";\n'
            );
        }

        return {
            'Program': (node: es.Program) => {
                program = node;
            },

            "ImportDeclaration[source.value='babel-plugin-rxjs-tools/macro']": () => {
                hasMacroImport = true;
            },

            'ImportDeclaration[source.value=/^rxjs/]': (node: es.ImportDeclaration) => {
                if (hasFailure || hasMacroImport) {
                    return;
                }
                hasFailure = true;
                context.report({
                    node,
                    messageId: 'macro',
                    fix,
                });
            },

            'CallExpression[callee.property.name=/^(pipe|subscribe)$/]': (node: es.CallExpression) => {
                if (hasFailure || hasMacroImport) {
                    return;
                }
                hasFailure = true;
                context.report({
                    node: node.callee,
                    messageId: 'macro',
                    fix,
                });
            },
        };
    },
});

export default rule;
