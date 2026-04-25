/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { getTypeServices } from '../functions';
import { defaultObservable } from '../constants';
import { ruleCreator } from '../utils';

type Options = [{
    observable?: string;
}];

type MessageIds = 'forbidden';

const defaultOptions: Options = [{}];

/**
 * Type guard to check if a type is a TypeReference
 */
function isTypeReference(type: ts.Type): type is ts.TypeReference {
    return Boolean((type as any).target);
}

/**
 * Extract action type strings from a TypeScript type
 */
function getActionTypes(type: ts.Type, typeChecker: ts.TypeChecker): string[] {
    if (type.isUnion()) {
        const memberActionTypes: string[] = [];
        for (const memberType of type.types) {
            memberActionTypes.push(...getActionTypes(memberType, typeChecker));
        }
        return memberActionTypes;
    }

    const symbol = typeChecker.getPropertyOfType(type, 'type');
    if (!symbol || !symbol.valueDeclaration) {
        return [];
    }

    const actionType = typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    return [typeChecker.typeToString(actionType)];
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-cyclic-action',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids effects and epics that re-emit filtered actions.',
        },
        messages: {
            forbidden: 'Effects and epics that re-emit filtered actions are forbidden.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    observable: { type: 'string' },
                },
                additionalProperties: false,
                description: 'An optional object with an optional observable property. ' +
                    'The property can be specified as a regular expression string and is used to identify ' +
                    'the action observables from which effects and epics are composed.',
            },
        ],
    },
    defaultOptions,
    create(context) {
        const [config = {}] = context.options;
        const { observable = defaultObservable } = config;
        const observableRegExp = new RegExp(observable);

        const { getType, typeChecker } = getTypeServices(context);

        function checkNode(pipeCallExpression: es.CallExpression) {
            const operatorCallExpression = pipeCallExpression.arguments.find(
                (arg): arg is es.CallExpression =>
                    arg.type === 'CallExpression' &&
                    arg.callee.type === 'Identifier' &&
                    arg.callee.name === 'ofType'
            );

            if (!operatorCallExpression) {
                return;
            }

            const operatorType = getType(operatorCallExpression);
            if (!operatorType) {
                return;
            }

            const [signature] = typeChecker.getSignaturesOfType(operatorType, ts.SignatureKind.Call);
            if (!signature) {
                return;
            }

            const operatorReturnType = typeChecker.getReturnTypeOfSignature(signature);
            if (!isTypeReference(operatorReturnType)) {
                return;
            }

            const [operatorElementType] = typeChecker.getTypeArguments(operatorReturnType);
            if (!operatorElementType) {
                return;
            }

            const pipeType = getType(pipeCallExpression);
            if (!pipeType || !isTypeReference(pipeType)) {
                return;
            }

            const [pipeElementType] = typeChecker.getTypeArguments(pipeType);
            if (!pipeElementType) {
                return;
            }

            const operatorActionTypes = getActionTypes(operatorElementType, typeChecker);
            const pipeActionTypes = getActionTypes(pipeElementType, typeChecker);

            for (const actionType of operatorActionTypes) {
                if (pipeActionTypes.includes(actionType)) {
                    context.report({
                        messageId: 'forbidden',
                        node: pipeCallExpression.callee,
                    });
                    return;
                }
            }
        }

        return {
            [`CallExpression[callee.property.name='pipe'][callee.object.name=${observableRegExp}]`]: checkNode,
            [`CallExpression[callee.property.name='pipe'][callee.object.property.name=${observableRegExp}]`]: checkNode,
        };
    },
});

export default rule;
