/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Tree } from '@nx/devkit';
import { NormalizedSchema } from '../models/normalized-schema';
import { isComponentLibrary, isProcessExtensionCategory, getForbiddenTypeDependencies } from '../models/library-types';
import { BANNED_ADF_IMPORTS } from '../models/dependency-constraints';
import { join } from 'node:path';

export function editEslintConfig(tree: Tree, options: NormalizedSchema): void {
    const eslintPath = join(options.projectRoot, 'eslint.config.mjs');

    if (!tree.exists(eslintPath)) {
        return;
    }

    tree.write(eslintPath, generateEslintConfig(options));
}

function generateEslintConfig(options: NormalizedSchema): string {
    const importPath = `${options.offsetFromRoot}eslint.config.mjs`;
    const isComponent = isComponentLibrary(options.type);
    const isBuildable = options.buildable;

    const blocks: string[] = [buildTsBlock(options, isComponent)];

    blocks.push(buildJsonBlock());

    if (isBuildable) {
        blocks.push(buildIgnoresBlock());
    }

    return `import baseConfig from '${importPath}';

export default [
    ...baseConfig,
    ${blocks.join('')}
];
`;
}

function buildTsBlock(options: NormalizedSchema, isComponent: boolean): string {
    const selectorRules = isComponent ? buildSelectorRules(options.prefix) : '';

    return `{
        files: ['**/*.ts'],
        rules: {${selectorRules}
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    depConstraints: [
                        ${buildDepConstraints(options)}
                    ],
                },
            ],
        },
    },
`;
}

function buildSelectorRules(prefix: string): string {
    return `
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: '${prefix}',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: '${prefix}',
                    style: 'kebab-case',
                },
            ],`;
}

function buildDepConstraints(options: NormalizedSchema): string {
    const constraints: string[] = [];
    const isSharedCategory = options.category.toLowerCase().includes('shared');

    if (isSharedCategory) {
        constraints.push(`{
            sourceTag: 'category:${options.category}',
            notDependOnLibsWithTags: ['category:studio-hxp', 'scope:idp', 'scope:rpa', 'scope:cicgov'],
        }`);
    }

    const bannedImports = isProcessExtensionCategory(options.category)
        ? ''
        : `
            bannedExternalImports: [${BANNED_ADF_IMPORTS.map((i) => `'${i}'`).join(', ')}],`;

    const forbiddenDeps = getForbiddenTypeDependencies(options.type);
    if (forbiddenDeps.length > 0) {
        constraints.push(`{
            sourceTag: 'type:${options.type}',
            notDependOnLibsWithTags: [${forbiddenDeps.map((t) => `'${t}'`).join(', ')}],
        }`);
    }

    constraints.push(`{
            sourceTag: 'scope:${options.name}',
            onlyDependOnLibsWithTags: [],${bannedImports}
        }`);

    return constraints.join(',\n');
}

function buildJsonBlock(): string {
    return `{
        files: ['**/*.json'],
        rules: {
            '@nx/dependency-checks': 'error',
        },
    },
`;
}

function buildIgnoresBlock(): string {
    return `{
        ignores: ['!**/package.json'],
    },
`;
}
