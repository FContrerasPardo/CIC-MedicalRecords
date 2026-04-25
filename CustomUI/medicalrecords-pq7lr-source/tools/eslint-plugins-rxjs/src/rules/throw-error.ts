/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { couldBeFunction, couldBeType, isAny, isUnknown } from 'tsutils-etc';
import * as ts from 'typescript';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

const rule = ruleCreator<Options, MessageIds>({
    name: 'throw-error',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces the passing of `Error` values to error notifications.',
        },
        messages: {
            forbidden: 'Passing non-Error values are forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { esTreeNodeToTSNodeMap, typeChecker, couldBeObservable } = getTypeServices(context);

        function getType(node: es.Node) {
            const tsNode = esTreeNodeToTSNodeMap.get(node);
            return typeChecker.getTypeAtLocation(tsNode);
        }

        function checkNode(node: es.Node) {
            let type = getType(node);
            if (couldBeFunction(type)) {
                const tsNode = esTreeNodeToTSNodeMap.get(node);
                const annotation = (tsNode as ts.ArrowFunction).type;
                const body = (tsNode as ts.ArrowFunction).body;
                type = typeChecker.getTypeAtLocation(annotation ?? body);
            }
            if (!isAny(type) && !isUnknown(type) && !couldBeType(type, /^(Error|DOMException)$/)) {
                context.report({
                    messageId: 'forbidden',
                    node,
                });
            }
        }

        return {
            'ThrowStatement > *': checkNode,
            "CallExpression[callee.name='throwError']": (node: es.CallExpression) => {
                if (couldBeObservable(node)) {
                    const [arg] = node.arguments;
                    if (arg) {
                        checkNode(arg);
                    }
                }
            },
        };
    },
});

export default rule;
