/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

type Options = [{
    allowProtected?: boolean;
}];

type MessageIds = 'forbidden' | 'forbiddenAllowProtected';

const defaultOptions: Options = [{}];

const defaultAllowedTypesRegExp = /^EventEmitter$/;

/**
 * Check if a node is an identifier
 */
function isIdentifier(node: es.Node): node is es.Identifier {
    return node.type === AST_NODE_TYPES.Identifier;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-exposed-subjects',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids exposed (i.e. non-private) subjects.',
        },
        messages: {
            forbidden: "Subject '{{subject}}' must be private.",
            forbiddenAllowProtected: "Subject '{{subject}}' must be private or protected.",
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowProtected: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions,
    create(context) {
        const [config = {}] = context.options;
        const { allowProtected = false } = config;
        const { couldBeSubject, couldBeType } = getTypeServices(context);

        const messageId = allowProtected ? 'forbiddenAllowProtected' : 'forbidden';
        const accessibilityRegExp = allowProtected ? /^(private|protected)$/ : /^private$/;

        function isSubject(node: es.Node): boolean {
            return couldBeSubject(node) && !couldBeType(node, defaultAllowedTypesRegExp);
        }

        return {
            [`PropertyDefinition[accessibility!=${accessibilityRegExp}]`]: (
                node: es.PropertyDefinition
            ) => {
                if (isSubject(node)) {
                    const { key } = node;
                    if (isIdentifier(key)) {
                        context.report({
                            messageId,
                            node: key,
                            data: {
                                subject: key.name,
                            },
                        });
                    }
                }
            },

            [`MethodDefinition[kind='constructor'] > FunctionExpression > TSParameterProperty[accessibility!=${accessibilityRegExp}] > Identifier`]: (
                node: es.Identifier
            ) => {
                if (isSubject(node)) {
                    const { loc } = node;
                    context.report({
                        messageId,
                        loc: {
                            ...loc,
                            end: {
                                ...loc.start,
                                column: loc.start.column + node.name.length,
                            },
                        },
                        data: {
                            subject: node.name,
                        },
                    });
                }
            },

            [`MethodDefinition[accessibility!=${accessibilityRegExp}][kind=/^(get|set)$/]`]: (
                node: es.MethodDefinition
            ) => {
                if (isSubject(node)) {
                    const key = node.key as es.Identifier;
                    context.report({
                        messageId,
                        node: key,
                        data: {
                            subject: key.name,
                        },
                    });
                }
            },

            [`MethodDefinition[accessibility!=${accessibilityRegExp}][kind='method']`]: (
                node: es.MethodDefinition
            ) => {
                const functionExpression = node.value;
                const returnType = (functionExpression as any).returnType;

                if (!returnType?.typeAnnotation) {
                    return;
                }

                if (isSubject(returnType.typeAnnotation)) {
                    const key = node.key as es.Identifier;
                    context.report({
                        messageId,
                        node: key,
                        data: {
                            subject: key.name,
                        },
                    });
                }
            },
        };
    },
});

export default rule;
