/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

type Options = [
    {
        allowExplicitAny?: boolean;
    },
];

type MessageIds = 'explicitAny' | 'implicitAny' | 'narrowed' | 'suggestExplicitUnknown';

const defaultOptions: Options = [{}];

/**
 * Check if a node is wrapped in parentheses
 */
function isParenthesised(sourceCode: Readonly<any>, node: es.Node): boolean {
    const before = sourceCode['getTokenBefore'](node);
    const after = sourceCode['getTokenAfter'](node);
    return Boolean(
        before && after && before.value === '(' && before.range[1] <= node.range[0] && after.value === ')' && after.range[0] >= node.range[1]
    );
}

/**
 * Check if parameter has a type annotation
 */
function hasTypeAnnotation(param: es.Node): param is es.Identifier & { typeAnnotation: es.TSTypeAnnotation } {
    return 'typeAnnotation' in param && param.typeAnnotation !== undefined;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-implicit-any-catch',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Forbids implicit `any` error parameters in `catchError` operators.',
        },
        fixable: 'code',
        hasSuggestions: true,
        messages: {
            explicitAny: 'Explicit `any` in `catchError`.',
            implicitAny: 'Implicit `any` in `catchError`.',
            narrowed: 'Error type must be `unknown` or `any`.',
            suggestExplicitUnknown: 'Use `unknown` instead, this will force you to explicitly and safely assert the type is correct.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowExplicitAny: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions,
    create(context) {
        const [config = {}] = context.options;
        const { allowExplicitAny = false } = config;
        const { couldBeObservable } = getTypeServices(context);
        const sourceCode = context.sourceCode;

        function checkCallback(callback: es.Node) {
            if (callback.type !== AST_NODE_TYPES.ArrowFunctionExpression && callback.type !== AST_NODE_TYPES.FunctionExpression) {
                return;
            }

            const [param] = callback.params;
            if (!param) {
                return;
            }

            if (hasTypeAnnotation(param)) {
                const { typeAnnotation } = param;
                const { typeAnnotation: typeNode } = typeAnnotation;

                if (typeNode.type === AST_NODE_TYPES.TSAnyKeyword) {
                    if (allowExplicitAny) {
                        return;
                    }

                    function fix(fixer: any) {
                        return fixer.replaceText(typeAnnotation, ': unknown');
                    }

                    context.report({
                        fix,
                        messageId: 'explicitAny',
                        node: param,
                        suggest: [
                            {
                                messageId: 'suggestExplicitUnknown',
                                fix,
                            },
                        ],
                    });
                } else if (typeNode.type !== AST_NODE_TYPES.TSUnknownKeyword) {
                    function fix(fixer: any) {
                        return fixer.replaceText(typeAnnotation, ': unknown');
                    }

                    context.report({
                        messageId: 'narrowed',
                        node: param,
                        suggest: [
                            {
                                messageId: 'suggestExplicitUnknown',
                                fix,
                            },
                        ],
                    });
                }
            } else {
                function fix(fixer: any) {
                    if (isParenthesised(sourceCode, param)) {
                        return fixer.insertTextAfter(param, ': unknown');
                    }
                    return [fixer.insertTextBefore(param, '('), fixer.insertTextAfter(param, ': unknown)')];
                }

                context.report({
                    fix,
                    messageId: 'implicitAny',
                    node: param,
                    suggest: [
                        {
                            messageId: 'suggestExplicitUnknown',
                            fix,
                        },
                    ],
                });
            }
        }

        return {
            "CallExpression[callee.name='catchError']": (node: es.CallExpression) => {
                const [callback] = node.arguments;
                if (callback) {
                    checkCallback(callback);
                }
            },

            "CallExpression[callee.property.name='subscribe'],CallExpression[callee.name='tap']": (node: es.CallExpression) => {
                const { callee } = node;

                if (callee.type === AST_NODE_TYPES.MemberExpression && !couldBeObservable(callee.object)) {
                    return;
                }

                const [observer, callback] = node.arguments;

                if (callback) {
                    checkCallback(callback);
                } else if (observer && observer.type === AST_NODE_TYPES.ObjectExpression) {
                    const errorProperty = observer.properties.find(
                        (property): property is es.Property =>
                            property.type === AST_NODE_TYPES.Property &&
                            property.key.type === AST_NODE_TYPES.Identifier &&
                            property.key.name === 'error'
                    );

                    if (errorProperty) {
                        checkCallback(errorProperty.value);
                    }
                }
            },
        };
    },
});

export default rule;
