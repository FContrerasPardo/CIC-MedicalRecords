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
  allow?: string | string[];
  disallow?: string | string[];
  observable?: string;
}[] = [];

function createRegExpForWords(words: string | string[]): RegExp {
  const wordArray = Array.isArray(words) ? words : [words];
  return new RegExp(`^(${wordArray.join('|')})$`);
}

function decamelize(str: string): string {
  return str.replaceAll(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

const rule = ESLintUtils.RuleCreator.withoutDocs({
  defaultOptions,
  meta: {
    docs: {
      description: 'Forbids unsafe `switchMap` usage in effects and epics.',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      forbidden: 'Unsafe switchMap usage in effects and epics is forbidden.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
          disallow: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
          observable: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
    type: 'problem',
  },
  name: 'no-unsafe-switchmap',
  create: (context) => {
    const defaultDisallow = [
      'add',
      'create',
      'delete',
      'post',
      'put',
      'remove',
      'set',
      'update',
    ];
    const defaultObservable = 'action(s|\\$)?';

    let allowRegExp: RegExp | undefined;
    let disallowRegExp: RegExp | undefined;
    let observableRegExp: RegExp;

    const [config = {}] = context.options;
    if (config.allow || config.disallow) {
      allowRegExp = createRegExpForWords(config.allow ?? []);
      disallowRegExp = createRegExpForWords(config.disallow ?? []);
      observableRegExp = new RegExp(config.observable ?? defaultObservable);
    } else {
      allowRegExp = undefined;
      disallowRegExp = createRegExpForWords(defaultDisallow);
      observableRegExp = new RegExp(defaultObservable);
    }

    function shouldDisallow(args: TSESTree.Node[]): boolean {
      const names = args
        .map((arg) => {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            return arg.value;
          }
          if (arg.type === 'Identifier') {
            return arg.name;
          }
          if (arg.type === 'MemberExpression' && arg.property.type === 'Identifier') {
            return arg.property.name;
          }

          return '';
        })
        .map((name) => decamelize(name));

      if (allowRegExp) {
        return !names.every((name) => allowRegExp?.test(name));
      }
      if (disallowRegExp) {
        return names.some((name) => disallowRegExp?.test(name));
      }

      return false;
    }

    function checkNode(node: TSESTree.CallExpression) {
      if (!node.arguments) {
        return;
      }

      const hasUnsafeOfType = node.arguments.some((arg) => {
        if (
          arg.type === 'CallExpression' &&
          arg.callee.type === 'Identifier' &&
          arg.callee.name === 'ofType'
        ) {
          return shouldDisallow(arg.arguments);
        }
        return false;
      });
      if (!hasUnsafeOfType) {
        return;
      }

      node.arguments.forEach((arg) => {
        if (
          arg.type === 'CallExpression' &&
          arg.callee.type === 'Identifier' &&
          arg.callee.name === 'switchMap'
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
