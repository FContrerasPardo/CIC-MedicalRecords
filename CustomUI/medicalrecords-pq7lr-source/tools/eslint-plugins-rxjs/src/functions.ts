/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { ESLintUtils, TSESTree as es, ParserServicesWithTypeInformation, TSESLint } from '@typescript-eslint/utils';
import * as ts from 'typescript';

type Predicate = (type: string) => 'break' | 'continue' | 'return';
type RuleContext<TMessageIds extends string, TOptions extends readonly unknown[]> = TSESLint.RuleContext<TMessageIds, TOptions>;

export interface TypeServices {
    couldBeBehaviorSubject: (node: es.Node) => boolean;
    couldBeError: (node: es.Node) => boolean;
    couldBeFunction: (node: es.Node) => boolean;
    couldBeMonoTypeOperatorFunction: (node: es.Node) => boolean;
    couldBeObservable: (node: es.Node) => boolean;
    couldBeSubject: (node: es.Node) => boolean;
    couldBeSubscription: (node: es.Node) => boolean;
    couldBeType: (node: es.Node, name: string | RegExp, qualified?: { name: RegExp }) => boolean;
    couldReturnObservable: (node: es.Node) => boolean;
    couldReturnType: (node: es.Node, name: string | RegExp, qualified?: { name: RegExp }) => boolean;
    esTreeNodeToTSNodeMap: ParserServicesWithTypeInformation['esTreeNodeToTSNodeMap'];
    getType: (node: es.Node) => ts.Type | undefined;
    isAny: (node: es.Node) => boolean;
    isReferenceType: (node: es.Node) => boolean;
    isUnknown: (node: es.Node) => boolean;
    program: ts.Program;
    typeChecker: ts.TypeChecker;
}

export function getTypeServices(context: RuleContext<string, readonly unknown[]>): TypeServices {
    const services = ESLintUtils.getParserServices(context) as ParserServicesWithTypeInformation;
    const { esTreeNodeToTSNodeMap, program } = services;
    const typeChecker = program.getTypeChecker();

    const getType = (node: es.Node): ts.Type | undefined => {
        try {
            const tsNode = esTreeNodeToTSNodeMap.get(node);
            return tsNode ? typeChecker.getTypeAtLocation(tsNode) : undefined;
        } catch {
            return undefined;
        }
    };

    const couldBeType = (node: es.Node, name: string | RegExp, qualified?: { name: RegExp }): boolean => {
        try {
            const type = getType(node);
            if (!type) {
                return false;
            }

            const typeString = typeChecker.typeToString(type);

            if (typeof name === 'string') {
                if (!typeString.includes(name)) {
                    return false;
                }
            } else {
                if (!name.test(typeString)) {
                    return false;
                }
            }

            if (qualified?.name) {
                return qualified.name.test(typeString);
            }

            return true;
        } catch {
            return false;
        }
    };

    const couldReturnType = (node: es.Node, name: string | RegExp, qualified?: { name: RegExp }): boolean => {
        try {
            const tsNode = esTreeNodeToTSNodeMap.get(node);
            if (!tsNode) {
                return false;
            }

            let tsTypeNode: ts.Node | undefined;

            if (ts.isArrowFunction(tsNode) || ts.isFunctionDeclaration(tsNode) || ts.isMethodDeclaration(tsNode) || ts.isFunctionExpression(tsNode)) {
                tsTypeNode = tsNode.type ?? tsNode.body;
            } else if (ts.isCallSignatureDeclaration(tsNode) || ts.isMethodSignature(tsNode)) {
                tsTypeNode = tsNode.type;
            }

            if (!tsTypeNode) {
                return false;
            }

            const type = typeChecker.getTypeAtLocation(tsTypeNode);
            const typeString = typeChecker.typeToString(type);

            if (typeof name === 'string') {
                if (!typeString.includes(name)) {
                    return false;
                }
            } else {
                if (!name.test(typeString)) {
                    return false;
                }
            }

            if (qualified?.name) {
                return qualified.name.test(typeString);
            }

            return true;
        } catch {
            return false;
        }
    };

    const couldBeFunction = (node: es.Node): boolean => {
        if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
            return true;
        }

        try {
            const type = getType(node);
            if (!type) {
                return false;
            }
            const signatures = typeChecker.getSignaturesOfType(type, ts.SignatureKind.Call);
            return signatures.length > 0;
        } catch {
            return false;
        }
    };

    const isAny = (node: es.Node): boolean => {
        try {
            const type = getType(node);
            if (!type) {
                return false;
            }
            return typeChecker.typeToString(type) === 'any';
        } catch {
            return false;
        }
    };

    const isUnknown = (node: es.Node): boolean => {
        try {
            const type = getType(node);
            if (!type) {
                return false;
            }
            return typeChecker.typeToString(type) === 'unknown';
        } catch {
            return false;
        }
    };

    const isReferenceType = (node: es.Node): boolean => {
        try {
            const type = getType(node);
            if (!type) {
                return false;
            }
            const typeString = typeChecker.typeToString(type);
            const primitives = ['string', 'number', 'boolean', 'null', 'undefined', 'void', 'symbol', 'bigint', 'any', 'unknown', 'never'];
            return !primitives.includes(typeString) && (type as ts.ObjectType).objectFlags !== undefined;
        } catch {
            return false;
        }
    };

    return {
        couldBeBehaviorSubject: (node: es.Node) => couldBeType(node, 'BehaviorSubject'),
        couldBeError: (node: es.Node) => couldBeType(node, 'Error'),
        couldBeFunction,
        couldBeMonoTypeOperatorFunction: (node: es.Node) => couldBeType(node, 'MonoTypeOperatorFunction'),
        couldBeObservable: (node: es.Node) => couldBeType(node, 'Observable'),
        couldBeSubject: (node: es.Node) => couldBeType(node, 'Subject'),
        couldBeSubscription: (node: es.Node) => couldBeType(node, 'Subscription'),
        couldBeType,
        couldReturnObservable: (node: es.Node) => couldReturnType(node, 'Observable'),
        couldReturnType,
        esTreeNodeToTSNodeMap,
        getType,
        isAny,
        isReferenceType,
        isUnknown,
        program,
        typeChecker,
    };
}

export function getParserServices(context: any): ParserServicesWithTypeInformation {
    return ESLintUtils.getParserServices(context) as ParserServicesWithTypeInformation;
}

export function hasTypeAnnotation<T extends es.Node>(node: T): node is T & { typeAnnotation: es.TSTypeAnnotation } {
    return 'typeAnnotation' in node && node.typeAnnotation !== undefined;
}

export function isImport(scope: any, name: string, source: string | RegExp): boolean {
    const variable = scope.variables?.find((v: any) => v.name === name);
    if (variable) {
        return variable.defs.some(
            (def: any) =>
                def.type === 'ImportBinding' &&
                def.parent?.type === 'ImportDeclaration' &&
                (typeof source === 'string' ? def.parent.source.value === source : source.test(def.parent.source.value as string))
        );
    }
    return scope.upper ? isImport(scope.upper, name, source) : false;
}

export function getLoc(node: ts.Node): es.SourceLocation {
    const sourceFile = node.getSourceFile();
    const start = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
    const end = ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd());
    return {
        start: {
            line: start.line + 1,
            column: start.character,
        },
        end: {
            line: end.line + 1,
            column: end.character,
        },
    };
}

export function findParent(node: es.Node, ...types: string[]): es.Node | undefined;
export function findParent(node: es.Node, predicate: Predicate): es.Node | undefined;
export function findParent(node: es.Node, ...args: (string | Predicate)[]): es.Node | undefined {
    const [arg] = args;
    const predicate: Predicate = typeof arg === 'function' ? arg : (type) => (args.includes(type) ? 'return' : 'continue');

    let parent = node.parent;
    while (parent) {
        switch (predicate(parent.type)) {
            case 'break': {
                return undefined;
            }
            case 'return': {
                return parent;
            }
            default: {
                break;
            }
        }
        parent = parent.parent;
    }
    return undefined;
}

export function getParent(node: es.Node): es.Node | undefined {
    return node.parent;
}

export function isArrayExpression(node: es.Node): node is es.ArrayExpression {
    return node.type === 'ArrayExpression';
}

export function isArrayPattern(node: es.Node): node is es.ArrayPattern {
    return node.type === 'ArrayPattern';
}

export function isArrowFunctionExpression(node: es.Node): node is es.ArrowFunctionExpression {
    return node.type === 'ArrowFunctionExpression';
}

export function isAssignmentExpression(node: es.Node): node is es.AssignmentExpression {
    return node.type === 'AssignmentExpression';
}

export function isBlockStatement(node: es.Node): node is es.BlockStatement {
    return node.type === 'BlockStatement';
}

export function isCallExpression(node: es.Node): node is es.CallExpression {
    return node.type === 'CallExpression';
}

export function isExportNamedDeclaration(node: es.Node): node is es.ExportNamedDeclaration {
    return node.type === 'ExportNamedDeclaration';
}

export function isExpressionStatement(node: es.Node): node is es.ExpressionStatement {
    return node && node.type === 'ExpressionStatement';
}

export function isFunctionDeclaration(node: es.Node): node is es.FunctionDeclaration {
    return node.type === 'FunctionDeclaration';
}

export function isFunctionExpression(node: es.Node): node is es.FunctionExpression {
    return node.type === 'FunctionExpression';
}

export function isIdentifier(node: es.Node): node is es.Identifier {
    return node.type === 'Identifier';
}

export function isLiteral(node: es.Node): node is es.Literal {
    return node.type === 'Literal';
}

export function isMemberExpression(node: es.Node): node is es.MemberExpression {
    return node.type === 'MemberExpression';
}

export function isNewExpression(node: es.Node): node is es.NewExpression {
    return node.type === 'NewExpression';
}

export function isObjectExpression(node: es.Node): node is es.ObjectExpression {
    return node.type === 'ObjectExpression';
}

export function isObjectPattern(node: es.Node): node is es.ObjectPattern {
    return node.type === 'ObjectPattern';
}

export function isProgram(node: es.Node): node is es.Program {
    return node.type === 'Program';
}

export function isProperty(node: es.Node): node is es.Property {
    return node.type === 'Property';
}

export function isPrivateIdentifier(node: es.Node): node is es.PrivateIdentifier {
    return node.type === 'PrivateIdentifier';
}

export function isRestElement(node: es.Node): node is es.RestElement {
    return node.type === 'RestElement';
}

export function isThisExpression(node: es.Node): node is es.ThisExpression {
    return node.type === 'ThisExpression';
}

export function isTSTypeLiteral(node: es.Node): node is es.TSTypeLiteral {
    return node.type === 'TSTypeLiteral';
}

export function isTSTypeReference(node: es.Node): node is es.TSTypeReference {
    return node.type === 'TSTypeReference';
}

export function isVariableDeclarator(node: es.Node): node is es.VariableDeclarator {
    return node.type === 'VariableDeclarator';
}

export function fromFixture<TMessageIds extends string>(
    fixture: string,
    invalidTestCase?: {
        output?: string;
        suggestions?: readonly any[] | null;
    }
): any;

export function fromFixture<TMessageIds extends string, TOptions extends readonly unknown[]>(
    fixture: string,
    invalidTestCase: Omit<any, 'code' | 'errors'> & {
        suggestions?: readonly any[] | null;
    }
): any;

export function fromFixture<TMessageIds extends string, TOptions extends readonly unknown[]>(
    fixture: string,
    invalidTestCase: Omit<any, 'code' | 'errors'> & {
        suggestions?: readonly any[] | null;
    } = {}
): any {
    const { suggestions, ...rest } = invalidTestCase;
    return {
        ...rest,
        ...parseFixture(fixture, suggestions),
    };
}

function getSuggestions<TMessageIds extends string>(suggestions: readonly any[] | null | undefined, suggest: boolean, indices: string | undefined) {
    if (!suggestions || !suggest) {
        return {};
    }
    if (!indices) {
        return { suggestions } as const;
    }
    return {
        suggestions: indices.split(/\s+/).map((index) => suggestions[Number.parseInt(index, 10)]),
    } as const;
}

function parseFixture<TMessageIds extends string>(fixture: string, suggestions?: readonly any[] | null) {
    const errorRegExp = /^(\s*)(~+)\s*\[(\w+)\s*(.*?)(?:\s*(suggest)\s*([\d\s]*))?\]\s*$/;
    const lines: string[] = [];
    const errors: any[] = [];
    let suggestFound = false;

    for (const line of fixture.split('\n')) {
        const match = line.match(errorRegExp);
        if (match) {
            const indent = match[1];
            const error = match[2];
            const id = match[3];
            const data = match[4];
            const suggest = match[5];
            const indices = match[6];
            const column = indent.length + 1;
            const endColumn = column + error.length;
            const { length } = lines;
            errors.push({
                column,
                data: JSON.parse(data || '{}'),
                endColumn,
                endLine: length,
                line: length,
                messageId: id as TMessageIds,
                ...(getSuggestions(suggestions, Boolean(suggest), indices?.trim()) as any),
            });
            if (suggest) {
                suggestFound = true;
            }
        } else {
            lines.push(line);
        }
    }

    if (suggestions && !suggestFound) {
        throw new Error("Suggestions specified but no 'suggest' annotation found.");
    }

    return {
        code: lines.join('\n'),
        errors,
    };
}
