/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';
import * as ts from 'typescript';

type Options = [];
type MessageIds = 'forbidden' | 'forbiddenIndirect';

function isObservableType(node: ts.Node, typeChecker: ts.TypeChecker): boolean {
    const type = typeChecker.getTypeAtLocation(node);
    const typeName = typeChecker.typeToString(type);
    return typeName.includes('Observable') || typeName.includes('Subject') || typeName.includes('Subscribable');
}

function getBodyFromDeclaration(decl: ts.Declaration): ts.Block | ts.Expression | undefined {
    if (ts.isMethodDeclaration(decl) && decl.body) {
        return decl.body;
    }
    if (ts.isPropertyDeclaration(decl) && decl.initializer) {
        if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
            return decl.initializer.body;
        }
    }
    if (ts.isGetAccessorDeclaration(decl) && decl.body) {
        return decl.body;
    }
    return undefined;
}

function methodContainsSubscribe(node: ts.Node, typeChecker: ts.TypeChecker, visited: Set<ts.Node>): boolean {
    if (visited.has(node)) {
        return false;
    }
    visited.add(node);

    let found = false;

    function walk(n: ts.Node): void {
        if (found) {
            return;
        }

        if (
            ts.isCallExpression(n) &&
            ts.isPropertyAccessExpression(n.expression) &&
            n.expression.name.text === 'subscribe' &&
            isObservableType(n.expression.expression, typeChecker)
        ) {
            found = true;
            return;
        }

        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const symbol = typeChecker.getSymbolAtLocation(n.expression.name);
            if (symbol) {
                const declarations = symbol.getDeclarations();
                if (declarations) {
                    for (const decl of declarations) {
                        const body = getBodyFromDeclaration(decl);
                        if (body && methodContainsSubscribe(body, typeChecker, visited)) {
                            found = true;
                            return;
                        }
                    }
                }
            }
        }

        ts.forEachChild(n, walk);
    }

    walk(node);
    return found;
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-nested-subscribe',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids the calling of `subscribe` within a `subscribe` callback.',
        },
        messages: {
            forbidden: 'Nested subscribe calls are forbidden (direct).',
            forbiddenIndirect: 'Nested subscribe calls are forbidden (indirect via this.{{methodName}}()).',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable, couldBeType, esTreeNodeToTSNodeMap, typeChecker } = getTypeServices(context);
        const argumentsMap = new WeakMap<es.Node, void>();

        return {
            "CallExpression > MemberExpression[property.name='subscribe']": (node: es.MemberExpression) => {
                if (!couldBeObservable(node.object) && !couldBeType(node.object, 'Subscribable')) {
                    return;
                }

                const callExpression = node.parent as es.CallExpression;
                let parent = callExpression.parent;

                while (parent) {
                    if (argumentsMap.has(parent)) {
                        context.report({
                            messageId: 'forbidden',
                            node: node.property,
                        });
                        return;
                    }
                    if ('parent' in parent && parent.parent) {
                        parent = parent.parent;
                    } else {
                        break;
                    }
                }

                for (const arg of callExpression.arguments) {
                    argumentsMap.set(arg);
                }
            },

            "CallExpression[callee.object.type='ThisExpression'][callee.property.type='Identifier']": (node: es.CallExpression) => {
                let ancestor = node.parent;
                while (ancestor) {
                    if (argumentsMap.has(ancestor)) {
                        const callee = node.callee as es.MemberExpression;
                        const methodName = callee.property as es.Identifier;

                        try {
                            const tsNode = esTreeNodeToTSNodeMap.get(methodName);
                            if (tsNode) {
                                const symbol = typeChecker.getSymbolAtLocation(tsNode);
                                if (symbol) {
                                    const declarations = symbol.getDeclarations();
                                    if (declarations) {
                                        for (const decl of declarations) {
                                        const body = getBodyFromDeclaration(decl);
                                        if (body && methodContainsSubscribe(body, typeChecker, new Set())) {
                                                    context.report({
                                                        messageId: 'forbiddenIndirect',
                                                        node: methodName,
                                                        data: { methodName: methodName.name },
                                                    });
                                                    return;
                                                }
                                        }
                                    }
                                }
                            }
                        } catch {
                            return;
                        }
                        return;
                    }
                    if ('parent' in ancestor && ancestor.parent) {
                        ancestor = ancestor.parent;
                    } else {
                        break;
                    }
                }
            },
        };
    },
});

export default rule;
