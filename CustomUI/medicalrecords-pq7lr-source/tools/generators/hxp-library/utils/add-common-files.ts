/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Tree, generateFiles, names, workspaceRoot } from '@nx/devkit';
import { NormalizedSchema } from '../models/normalized-schema';
import { isComponentLibrary } from '../models/library-types';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

export function addCommonFiles(tree: Tree, options: NormalizedSchema) {
    const templateOptions = {
        ...options,
        ...names(options.name),
        tpl: '',
    };
    const filesPath = options.projectRoot;

    generateFiles(tree, join(__dirname, '..', 'files', 'common'), filesPath, templateOptions);
    if (!options.routing) {
        tree.delete(join(filesPath, 'src', 'lib', 'lib.routes.ts'));
    }
    tree.delete(join(filesPath, 'README.md'));

    const shouldGenerateComponent = isComponentLibrary(options.type);
    if (shouldGenerateComponent) {
        // Delete placeholder as component libraries have actual component files
        tree.delete(join(filesPath, 'src', 'lib', '.placeholder-remove-me.ts'));

        // Add license headers to component files
        const componentBaseName = names(options.name).fileName;
        const componentPath = join(filesPath, 'src', 'lib', componentBaseName);
        const licenseHeaderPath = join(workspaceRoot, 'license-header.txt');
        const licenseHeader = readFileSync(licenseHeaderPath, 'utf-8') + '\n';

        // Add license to component.ts
        const componentTsPath = `${componentPath}.component.ts`;
        if (tree.exists(componentTsPath)) {
            const content = tree.read(componentTsPath, 'utf-8');
            if (content && !content.startsWith('/*')) {
                tree.write(componentTsPath, licenseHeader + content);
            }
        }

        // Add license to component.spec.ts
        const componentSpecPath = `${componentPath}.component.spec.ts`;
        if (tree.exists(componentSpecPath)) {
            const content = tree.read(componentSpecPath, 'utf-8');
            if (content && !content.startsWith('/*')) {
                tree.write(componentSpecPath, licenseHeader + content);
            }
        }

        // Add placeholder styles to component.scss
        const componentScssPath = `${componentPath}.component.scss`;
        if (tree.exists(componentScssPath)) {
            const selector = options.prefix + '-' + componentBaseName;
            const scssContent = `.${selector} {\n    height: 100%;\n}\n`;
            tree.write(componentScssPath, scssContent);
        }
    } else {
        tree.delete(join(filesPath, '.stylelintrc.json'));

        const componentBaseName = names(options.name).fileName;
        const componentPath = join(filesPath, 'src', 'lib', componentBaseName);

        tree.delete(`${componentPath}.component.ts`);
        tree.delete(`${componentPath}.component.html`);
        tree.delete(`${componentPath}.component.scss`);
        tree.delete(`${componentPath}.component.spec.ts`);

        // Delete placeholder file for non-component libraries as it will be included from template
        // The placeholder ensures the lib folder exists even when no routing or components are used
    }
}
