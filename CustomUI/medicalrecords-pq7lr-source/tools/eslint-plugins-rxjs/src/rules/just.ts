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

/**
 * Check if an import specifier has been renamed
 */
function isImportRenamed(node: es.ImportSpecifier): boolean {
    return (
        node.local.range[0] !== node.imported.range[0] ||
        node.local.range[1] !== node.imported.range[1]
    );
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'just',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces the use of a `just` alias for `of`.',
        },
        fixable: 'code',
        messages: {
            forbidden: 'Use just alias.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            "ImportDeclaration[source.value='rxjs'] > ImportSpecifier[imported.name='of']": (
                node: es.ImportSpecifier
            ) => {
                if (isImportRenamed(node)) {
                    return;
                }

                context.report({
                    node,
                    messageId: 'forbidden',
                    fix: (fixer) => fixer.replaceTextRange(node.range, 'of as just'),
                });

                const [ofImport] = context.sourceCode.getDeclaredVariables(node);

                if (ofImport) {
                    for (const ref of ofImport.references) {
                        context.report({
                            node: ref.identifier,
                            messageId: 'forbidden',
                            fix: (fixer) => fixer.replaceTextRange(ref.identifier.range, 'just'),
                        });
                    }
                }
            },
        };
    },
});

export default rule;
