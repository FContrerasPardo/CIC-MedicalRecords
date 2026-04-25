/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden' | 'suggest';

/**
 * Get the replacement import path for an internal RxJS import
 */
function getReplacement(location: string): string | undefined {
    const match = location.match(/^\s*('|")/);
    if (!match) {
        return undefined;
    }

    const [, quote] = match;

    if (/^['"]rxjs\/internal\/ajax/.test(location)) {
        return `${quote}rxjs/ajax${quote}`;
    }
    if (/^['"]rxjs\/internal\/observable\/dom\/fetch/.test(location)) {
        return `${quote}rxjs/fetch${quote}`;
    }
    if (/^['"]rxjs\/internal\/observable\/dom\/webSocket/i.test(location)) {
        return `${quote}rxjs/webSocket${quote}`;
    }
    if (/^['"]rxjs\/internal\/observable/.test(location)) {
        return `${quote}rxjs${quote}`;
    }
    if (/^['"]rxjs\/internal\/operators/.test(location)) {
        return `${quote}rxjs/operators${quote}`;
    }
    if (/^['"]rxjs\/internal\/scheduled/.test(location)) {
        return `${quote}rxjs${quote}`;
    }
    if (/^['"]rxjs\/internal\/scheduler/.test(location)) {
        return `${quote}rxjs${quote}`;
    }
    if (/^['"]rxjs\/internal\/testing/.test(location)) {
        return `${quote}rxjs/testing${quote}`;
    }

    return undefined;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-internal',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the importation of internals.',
        },
        fixable: 'code',
        hasSuggestions: true,
        messages: {
            forbidden: 'RxJS imports from internal are forbidden.',
            suggest: 'Import from a non-internal location.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            'ImportDeclaration Literal[value=/^rxjs\\/internal/]': (node: es.Literal) => {
                const replacement = getReplacement(node.raw);

                if (replacement) {
                    function fix(fixer: any) {
                        return fixer.replaceText(node, replacement as string);
                    }

                    context.report({
                        messageId: 'forbidden',
                        node,
                        fix,
                        suggest: [
                            {
                                messageId: 'suggest',
                                fix,
                            },
                        ],
                    });
                } else {
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
