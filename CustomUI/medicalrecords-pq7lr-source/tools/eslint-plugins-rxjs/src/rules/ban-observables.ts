/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { ruleCreator } from '../utils';

type BanConfig = Record<string, boolean | string>;
type Options = [BanConfig?];
type MessageIds = 'forbidden';

interface Ban {
    explanation: string;
    regExp: RegExp;
}

const defaultOptions: Options = [{}];

/**
 * Converts the configuration object into a list of ban rules
 */
function parseBanConfig(config: BanConfig): Ban[] {
    const bans: Ban[] = [];

    for (const [key, value] of Object.entries(config)) {
        if (value !== false) {
            bans.push({
                explanation: typeof value === 'string' ? value : '',
                regExp: new RegExp(`^${key}$`),
            });
        }
    }

    return bans;
}

/**
 * Check if an observable name is banned and return error details
 */
function getBanFailure(
    name: string,
    bans: Ban[]
): { messageId: MessageIds; data: { name: string; explanation: string } } | undefined {
    for (const ban of bans) {
        if (ban.regExp.test(name)) {
            const explanation = ban.explanation ? `: ${ban.explanation}` : '';
            return {
                messageId: 'forbidden',
                data: { name, explanation },
            };
        }
    }
    return undefined;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'ban-observables',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the use of banned observables.',
        },
        messages: {
            forbidden: 'RxJS observable is banned: {{name}}{{explanation}}.',
        },
        schema: [
            {
                type: 'object',
                description:
                    'An object containing keys that are names of observable factory functions ' +
                    'and values that are either booleans or strings containing the explanation for the ban.',
                additionalProperties: {
                    oneOf: [{ type: 'boolean' }, { type: 'string' }],
                },
            },
        ],
    },
    defaultOptions,
    create(context) {
        const [config = {}] = context.options;
        const bans = parseBanConfig(config);

        if (bans.length === 0) {
            return {};
        }

        return {
            'ImportDeclaration[source.value="rxjs"] > ImportSpecifier': (
                node: es.ImportSpecifier
            ) => {
                const identifier = node.imported as any;
                const failure = getBanFailure(identifier.name, bans);

                if (failure) {
                    context.report({
                        node: identifier,
                        ...failure,
                    });
                }
            },
        };
    },
});

export default rule;
