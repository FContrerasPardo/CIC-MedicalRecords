/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow trivial component existence tests',
            category: 'Best Practices',
            recommended: true,
        },
        messages: {
            noTrivialTest:
                'Trivial component existence tests using expect(component).{{matcher}}() are not allowed. ' +
                'Write meaningful tests that verify actual component behavior instead.',
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                // Check if this is a call to toBeTruthy() or toBeDefined()
                if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.property.type === 'Identifier' &&
                    (node.callee.property.name === 'toBeTruthy' || node.callee.property.name === 'toBeDefined')
                ) {
                    // Check if the object is expect(component)
                    const expectCall = node.callee.object;
                    if (
                        expectCall.type === 'CallExpression' &&
                        expectCall.callee.type === 'Identifier' &&
                        expectCall.callee.name === 'expect' &&
                        expectCall.arguments.length === 1 &&
                        expectCall.arguments[0].type === 'Identifier' &&
                        expectCall.arguments[0].name === 'component'
                    ) {
                        context.report({
                            node,
                            messageId: 'noTrivialTest',
                            data: {
                                matcher: node.callee.property.name,
                            },
                        });
                    }
                }
            },
        };
    },
};
