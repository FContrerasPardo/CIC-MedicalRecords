/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ESLintUtils } from '@typescript-eslint/utils';

export function createRegExpForWords(config: string | string[]): RegExp | undefined {
    if (!config || config.length === 0) {
        return undefined;
    }
    const flags = 'i';
    if (typeof config === 'string') {
        return new RegExp(config, flags);
    }
    const words = config;
    const joined = words.map((word) => String.raw`(\b|_)${word}(\b|_)`).join('|');
    return new RegExp(`(${joined})`, flags);
}

export function escapeRegExp(text: string): string {
    return text.replaceAll(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export const ruleCreator = ESLintUtils.RuleCreator((name) => {
    const baseUrl = 'https://github.com/Alfresco/hxp-frontend-apps';
    const docsPath = 'blob/main/tools/eslint-plugins-rxjs/docs/rules';
    return `${baseUrl}/${docsPath}/${name}.md`;
});
