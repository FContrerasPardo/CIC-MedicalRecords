/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TSESTree as es } from '@typescript-eslint/utils';
import { getTypeServices } from '../functions';
import { ruleCreator } from '../utils';

type Options = [];
type MessageIds = 'forbidden';

/**
 * Get the location of the async keyword in a function
 */
function getAsyncKeywordLocation(node: es.FunctionExpression | es.ArrowFunctionExpression): es.SourceLocation {
    const { loc } = node;
    return {
        ...loc,
        end: {
            ...loc.start,
            column: loc.start.column + 5,
        },
    };
}

const rule = ruleCreator<Options, MessageIds>({
    name: 'no-async-subscribe',
    meta: {
        type: 'problem',
        docs: {
            description: 'Forbids passing `async` functions to `subscribe`.',
        },
        messages: {
            forbidden: 'Passing async functions to subscribe is forbidden.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const { couldBeObservable } = getTypeServices(context);

        function checkNode(node: es.FunctionExpression | es.ArrowFunctionExpression) {
            const parentNode = node.parent as es.CallExpression;
            const callee = parentNode.callee as es.MemberExpression;

            if (couldBeObservable(callee.object)) {
                context.report({
                    messageId: 'forbidden',
                    loc: getAsyncKeywordLocation(node),
                });
            }
        }

        return {
            "CallExpression[callee.property.name='subscribe'] > FunctionExpression[async=true]": checkNode,
            "CallExpression[callee.property.name='subscribe'] > ArrowFunctionExpression[async=true]": checkNode,
        };
    },
});

export default rule;
