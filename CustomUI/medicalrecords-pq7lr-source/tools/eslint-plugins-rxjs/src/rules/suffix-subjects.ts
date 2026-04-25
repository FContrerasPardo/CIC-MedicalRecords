/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { escapeRegExp, ruleCreator } from '../utils';

type Options = [{
    parameters?: boolean;
    properties?: boolean;
    suffix?: string;
    types?: Record<string, boolean>;
    variables?: boolean;
}];

type MessageIds = 'forbidden';

const defaultOptions: Options = [{}];

/**
 * Find parent node of specific types
 */
function findParent(
    node: es.Node,
    ...types: string[]
): es.Node | undefined {
    let current = node.parent;
    while (current) {
        if (types.includes(current.type)) {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'suffix-subjects',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces the use of a suffix in subject identifiers.',
        },
        messages: {
            forbidden: 'Subject identifiers must end with "{{suffix}}".',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    parameters: { type: 'boolean' },
                    properties: { type: 'boolean' },
                    suffix: { type: 'string' },
                    types: { type: 'object' },
                    variables: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions,
    create(context) {
        const typeServices = getTypeServices(context) as any;
        const couldBeType = typeServices.couldBeType?.bind(typeServices) || (() => false);

        const [config = {}] = context.options;

        const validate = {
            parameters: true,
            properties: true,
            variables: true,
            ...(config as Record<string, unknown>),
        };

        const types: { regExp: RegExp; toValidate: boolean }[] = [];
        if (config.types) {
            Object.entries(config.types).forEach(([key, toValidate]: [string, boolean]) => {
                types.push({ regExp: new RegExp(key), toValidate });
            });
        } else {
            types.push({
                regExp: /^EventEmitter$/,
                toValidate: false,
            });
        }

        const { suffix = 'Subject' } = config;
        const suffixRegex = new RegExp(String.raw`${escapeRegExp(suffix)}\$?$`, 'i');

        function checkNode(nameNode: es.Node, typeNode?: es.Node): void {
            if (nameNode.type !== AST_NODE_TYPES.Identifier) {
                return;
            }

            const text = nameNode.name;
            if (!suffixRegex.test(text) && couldBeType(typeNode || nameNode, 'Subject')) {
                for (const type of types) {
                    const { regExp, toValidate } = type;
                    if (couldBeType(typeNode || nameNode, regExp) && !toValidate) {
                        return;
                    }
                }
                context.report({
                    data: { suffix },
                    messageId: 'forbidden',
                    node: nameNode,
                });
            }
        }

        return {
            'ArrayPattern > Identifier': (node: es.Identifier) => {
                const found = findParent(
                    node,
                    AST_NODE_TYPES.ArrowFunctionExpression,
                    AST_NODE_TYPES.FunctionDeclaration,
                    AST_NODE_TYPES.FunctionExpression,
                    AST_NODE_TYPES.VariableDeclarator
                );
                if (!found) {
                    return;
                }
                if (!validate.variables && found.type === AST_NODE_TYPES.VariableDeclarator) {
                    return;
                }
                if (!validate.parameters) {
                    return;
                }
                checkNode(node);
            },

            'ArrowFunctionExpression > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    const parent = node.parent as es.ArrowFunctionExpression;
                    if (node !== parent.body) {
                        checkNode(node);
                    }
                }
            },

            'PropertyDefinition[computed=false]': (node: es.PropertyDefinition) => {
                if (validate.properties) {
                    checkNode(node.key);
                }
            },

            'FunctionDeclaration > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    const parent = node.parent as es.FunctionDeclaration;
                    if (node !== parent.id) {
                        checkNode(node);
                    }
                }
            },

            'FunctionExpression > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    const parent = node.parent as es.FunctionExpression;
                    if (node !== parent.id) {
                        checkNode(node);
                    }
                }
            },

            "MethodDefinition[kind='get'][computed=false]": (node: es.MethodDefinition) => {
                if (validate.properties) {
                    checkNode(node.key, node);
                }
            },

            "MethodDefinition[kind='set'][computed=false]": (node: es.MethodDefinition) => {
                if (validate.properties) {
                    checkNode(node.key, node);
                }
            },

            'ObjectExpression > Property[computed=false] > Identifier': (node: es.Identifier) => {
                if (validate.properties) {
                    const parent = node.parent as es.Property;
                    if (node === parent.key) {
                        checkNode(node);
                    }
                }
            },

            'ObjectPattern > Property > Identifier': (node: es.Identifier) => {
                const found = findParent(
                    node,
                    AST_NODE_TYPES.ArrowFunctionExpression,
                    AST_NODE_TYPES.FunctionDeclaration,
                    AST_NODE_TYPES.FunctionExpression,
                    AST_NODE_TYPES.VariableDeclarator
                );
                if (!found) {
                    return;
                }
                if (!validate.variables && found.type === AST_NODE_TYPES.VariableDeclarator) {
                    return;
                }
                if (!validate.parameters) {
                    return;
                }
                const parent = node.parent as es.Property;
                if (node === parent.value) {
                    checkNode(node);
                }
            },

            'TSCallSignatureDeclaration > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    checkNode(node);
                }
            },

            'TSConstructSignatureDeclaration > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    checkNode(node);
                }
            },

            'TSMethodSignature > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    checkNode(node);
                }
            },

            'TSParameterProperty > Identifier': (node: es.Identifier) => {
                if (validate.parameters || validate.properties) {
                    checkNode(node);
                }
            },

            'TSPropertySignature[computed=false]': (node: es.TSPropertySignature) => {
                if (validate.properties) {
                    checkNode(node.key);
                }
            },

            'VariableDeclarator > Identifier': (node: es.Identifier) => {
                const parent = node.parent as es.VariableDeclarator;
                if (validate.variables && node === parent.id) {
                    checkNode(node);
                }
            },
        };
    },
});

export default rule;
