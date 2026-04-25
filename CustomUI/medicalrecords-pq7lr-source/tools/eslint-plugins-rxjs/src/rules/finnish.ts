/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

interface ValidateConfig {
    functions: boolean;
    methods: boolean;
    parameters: boolean;
    properties: boolean;
    variables: boolean;
}

interface FinnishOptions {
    functions?: boolean;
    methods?: boolean;
    names?: Record<string, boolean>;
    parameters?: boolean;
    properties?: boolean;
    strict?: boolean;
    types?: Record<string, boolean>;
    variables?: boolean;
}

interface NameRule {
    regExp: RegExp;
    validate: boolean;
}

type Options = [FinnishOptions?];
type MessageIds = 'shouldBeFinnish' | 'shouldNotBeFinnish';

const defaultOptions: Options = [{}];

/**
 * Parse name rules from configuration
 */
function parseNameRules(config?: Record<string, boolean>): NameRule[] {
    if (config) {
        return Object.entries(config).map(([key, validate]) => ({
            regExp: new RegExp(key),
            validate,
        }));
    }

    return [
        {
            regExp: /^(canActivate|canActivateChild|canDeactivate|canLoad|intercept|resolve|validate)$/,
            validate: false,
        },
    ];
}

/**
 * Parse type rules from configuration
 */
function parseTypeRules(config?: Record<string, boolean>): NameRule[] {
    if (config) {
        return Object.entries(config).map(([key, validate]) => ({
            regExp: new RegExp(key),
            validate,
        }));
    }

    return [
        {
            regExp: /^EventEmitter$/,
            validate: false,
        },
    ];
}

/**
 * Get validation configuration with defaults
 */
function getValidateConfig(config: FinnishOptions): ValidateConfig {
    return {
        functions: config.functions ?? true,
        methods: config.methods ?? true,
        parameters: config.parameters ?? true,
        properties: config.properties ?? true,
        variables: config.variables ?? true,
    };
}

/**
 * Check if identifier text has Finnish notation (ends with $)
 */
function hasFinnishNotation(text: string): boolean {
    return /\$$/.test(text);
}

/**
 * Find parent node of specified types
 */
function findParentOfType(node: es.Node, ...types: AST_NODE_TYPES[]): es.Node | undefined {
    let current = node.parent;
    while (current) {
        if (types.includes(current.type as AST_NODE_TYPES)) {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'finnish',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces the use of Finnish notation.',
        },
        messages: {
            shouldBeFinnish: 'Finnish notation should be used here.',
            shouldNotBeFinnish: 'Finnish notation should not be used here.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    functions: { type: 'boolean' },
                    methods: { type: 'boolean' },
                    names: {
                        type: 'object',
                        additionalProperties: { type: 'boolean' },
                    },
                    parameters: { type: 'boolean' },
                    properties: { type: 'boolean' },
                    strict: { type: 'boolean' },
                    types: {
                        type: 'object',
                        additionalProperties: { type: 'boolean' },
                    },
                    variables: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions,
    create(context) {
        const typeServices = getTypeServices(context);
        const [config = {}] = context.options;

        const strict = config.strict ?? false;
        const validate = getValidateConfig(config);
        const nameRules = parseNameRules(config.names);
        const typeRules = parseTypeRules(config.types);

        /**
         * Check if a node should use Finnish notation based on its type
         */
        function shouldUseFinnish(nameNode: es.Node, typeNode?: es.Node): boolean {
            const nodeToCheck = typeNode ?? nameNode;

            // Check if it's an Observable or returns an Observable
            if (
                !typeServices.couldBeObservable(nodeToCheck) &&
                !typeServices.couldReturnObservable(nodeToCheck)
            ) {
                return false;
            }

            // Check name exclusions
            if (nameNode.type === AST_NODE_TYPES.Identifier) {
                const name = nameNode.name;
                for (const currentRule of nameRules) {
                    if (currentRule.regExp.test(name) && !currentRule.validate) {
                        return false;
                    }
                }
            }

            // Check type exclusions
            for (const typeRule of typeRules) {
                if (
                    (typeServices.couldBeType(nodeToCheck, typeRule.regExp) ||
                     typeServices.couldReturnType(nodeToCheck, typeRule.regExp)) &&
                    !typeRule.validate
                ) {
                    return false;
                }
            }

            return true;
        }

        /**
         * Validate a node for Finnish notation
         */
        function checkNode(nameNode: es.Node, typeNode?: es.Node): void {
            if (nameNode.type !== AST_NODE_TYPES.Identifier) {
                return;
            }

            const text = nameNode.name;
            const hasFinnish = hasFinnishNotation(text);

            // In non-strict mode, allow existing Finnish notation
            if (hasFinnish && !strict) {
                return;
            }

            const shouldHaveFinnish = shouldUseFinnish(nameNode, typeNode);

            if (shouldHaveFinnish && !hasFinnish) {
                context.report({
                    node: nameNode,
                    messageId: 'shouldBeFinnish',
                });
            } else if (!shouldHaveFinnish && hasFinnish) {
                context.report({
                    node: nameNode,
                    messageId: 'shouldNotBeFinnish',
                });
            }
        }

        return {
            'ArrayPattern > Identifier': (node: es.Identifier) => {
                const found = findParentOfType(
                    node,
                    AST_NODE_TYPES.ArrowFunctionExpression,
                    AST_NODE_TYPES.FunctionDeclaration,
                    AST_NODE_TYPES.FunctionExpression,
                    AST_NODE_TYPES.VariableDeclarator
                );

                if (!found) {return;}

                if (!validate.variables && found.type === AST_NODE_TYPES.VariableDeclarator) {
                    return;
                }

                if (!validate.parameters) {return;}

                checkNode(node);
            },

            // Arrow function parameters
            'ArrowFunctionExpression > Identifier': (node: es.Identifier) => {
                if (!validate.parameters) {return;}

                const parent = node.parent as es.ArrowFunctionExpression;
                if (node !== parent.body) {
                    checkNode(node);
                }
            },

            // Class properties
            'PropertyDefinition[computed=false]': (node: es.PropertyDefinition) => {
                if (validate.properties) {
                    checkNode(node.key);
                }
            },

            // Function declarations
            'FunctionDeclaration > Identifier': (node: es.Identifier) => {
                const parent = node.parent as es.FunctionDeclaration;

                if (node === parent.id) {
                    if (validate.functions) {
                        checkNode(node, parent);
                    }
                } else {
                    if (validate.parameters) {
                        checkNode(node);
                    }
                }
            },

            // Function expressions
            'FunctionExpression > Identifier': (node: es.Identifier) => {
                const parent = node.parent as es.FunctionExpression;

                if (node === parent.id) {
                    if (validate.functions) {
                        checkNode(node, parent);
                    }
                } else {
                    if (validate.parameters) {
                        checkNode(node);
                    }
                }
            },

            // Getters
            "MethodDefinition[kind='get'][computed=false]": (node: es.MethodDefinition) => {
                if (validate.properties) {
                    checkNode(node.key, node);
                }
            },

            // Methods
            "MethodDefinition[kind='method'][computed=false]": (node: es.MethodDefinition) => {
                if (validate.methods) {
                    checkNode(node.key, node);
                }
            },

            // Setters
            "MethodDefinition[kind='set'][computed=false]": (node: es.MethodDefinition) => {
                if (validate.properties) {
                    checkNode(node.key, node);
                }
            },

            // Object properties
            'ObjectExpression > Property[computed=false] > Identifier': (
                node: es.Identifier
            ) => {
                if (!validate.properties) {return;}

                const parent = node.parent as es.Property;
                if (node === parent.key) {
                    checkNode(node);
                }
            },

            // Object destructuring in parameters/variables
            'ObjectPattern > Property > Identifier': (node: es.Identifier) => {
                const found = findParentOfType(
                    node,
                    AST_NODE_TYPES.ArrowFunctionExpression,
                    AST_NODE_TYPES.FunctionDeclaration,
                    AST_NODE_TYPES.FunctionExpression,
                    AST_NODE_TYPES.VariableDeclarator
                );

                if (!found) {return;}

                if (!validate.variables && found.type === AST_NODE_TYPES.VariableDeclarator) {
                    return;
                }

                if (!validate.parameters) {return;}

                const parent = node.parent as es.Property;
                if (node === parent.value) {
                    checkNode(node);
                }
            },

            // TypeScript call signatures
            'TSCallSignatureDeclaration > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    checkNode(node);
                }
            },

            // TypeScript construct signatures
            'TSConstructSignatureDeclaration > Identifier': (node: es.Identifier) => {
                if (validate.parameters) {
                    checkNode(node);
                }
            },

            // TypeScript method signatures
            'TSMethodSignature[computed=false]': (node: es.TSMethodSignature) => {
                if (validate.methods) {
                    checkNode(node.key, node);
                }
                if (validate.parameters) {
                    for (const param of node.params) {checkNode(param);}
                }
            },

            // TypeScript parameter properties
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
                if (!validate.variables) {return;}

                const parent = node.parent as es.VariableDeclarator;
                if (node === parent.id) {
                    checkNode(node);
                }
            },
        };
    },
});

export default rule;
