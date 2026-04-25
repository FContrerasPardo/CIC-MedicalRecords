/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AST_NODE_TYPES, TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import * as tsutils from 'tsutils';
import { couldBeType, isReferenceType, isUnionType } from 'tsutils-etc';
import * as ts from 'typescript';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-unsafe-subject-next',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids unsafe optional `next` calls.',
        },
        messages: {
            forbidden: 'Unsafe optional next calls are forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { esTreeNodeToTSNodeMap, typeChecker } = getTypeServices(context);

        return {
            "CallExpression[callee.property.name='next']": (node: es.CallExpression) => {
                if (node.arguments.length > 0) {
                    return;
                }

                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
                    return;
                }

                const type = typeChecker.getTypeAtLocation(
                    esTreeNodeToTSNodeMap.get(node.callee.object)
                );

                if (!isReferenceType(type) || !couldBeType(type, 'Subject')) {
                    return;
                }

                const [typeArg] = typeChecker.getTypeArguments(type);

                if (tsutils.isTypeFlagSet(typeArg, ts.TypeFlags.Any)) {
                    return;
                }

                if (tsutils.isTypeFlagSet(typeArg, ts.TypeFlags.Unknown)) {
                    return;
                }

                if (tsutils.isTypeFlagSet(typeArg, ts.TypeFlags.Void)) {
                    return;
                }

                if (isUnionType(typeArg) && typeArg.types.some((t) => tsutils.isTypeFlagSet(t, ts.TypeFlags.Void))) {
                    return;
                }

                context.report({
                    messageId: 'forbidden',
                    node: node.callee.property,
                });
            },
        };
    },
});

export default rule;
