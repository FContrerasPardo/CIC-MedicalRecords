/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/* eslint-disable @cspell/spellchecker */

import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/types';

const defaultOptions: readonly {
  observable?: string;
}[] = [];

const rule = ESLintUtils.RuleCreator.withoutDocs({
  defaultOptions,
  meta: {
    docs: {
      description: 'Forbids unsafe `catchError` usage in effects and epics.',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      forbidden: 'Unsafe catchError usage in effects and epics are forbidden.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          observable: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    type: 'problem',
  },
  name: 'no-unsafe-catch',
  create: (context) => {
    const invalidOperatorsRegExp = /^(catchError)$/;
    const defaultObservable = 'action(s|\\$)?';

    const [config = {}] = context.options;
    const { observable = defaultObservable } = config;
    const observableRegExp = new RegExp(observable);

    function isUnsafe(arg: TSESTree.Node | undefined): boolean {
      if (!arg) {return false;}
      if (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression') {
        return arg.params.length < 2;
      }
      return false;
    }

    function checkNode(node: TSESTree.CallExpression) {
      if (!node.arguments) {
        return;
      }

      node.arguments.forEach((arg: TSESTree.Node) => {
        if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier' &&
            invalidOperatorsRegExp.test(arg.callee.name) &&
            isUnsafe(arg.arguments[0])
          ) {
            context.report({
              messageId: 'forbidden',
              node: arg.callee,
            });
          }
      });
    }

    return {
      [`CallExpression[callee.property.name='pipe'][callee.object.name=${observableRegExp}]`]:
        checkNode,
      [`CallExpression[callee.property.name='pipe'][callee.object.property.name=${observableRegExp}]`]:
        checkNode,
    };
  },
});

export = rule;
