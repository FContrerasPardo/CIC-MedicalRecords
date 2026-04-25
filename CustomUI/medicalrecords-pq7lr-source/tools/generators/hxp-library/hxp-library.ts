/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { libraryGenerator } from '@nx/angular/generators';
import { Tree, formatFiles, workspaceRoot, readProjectConfiguration, offsetFromRoot } from '@nx/devkit';
import { NormalizedSchema } from './models/normalized-schema';
import { LibraryGeneratorSchema } from './schema';
import { addCommonFiles } from './utils/add-common-files';
import { editLibraryProjectJson } from './utils/edit-library-project-json';
import { editEslintConfig } from './utils/edit-eslint-config';
import { normalizeOptions } from './utils/normalizers';
import { addUnitTestRunnerFiles } from './utils/test-runner';
import { updateTsConfigFile } from './utils/update-ts-config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async function (tree: Tree, options: LibraryGeneratorSchema) {
    const normalizedOptions: NormalizedSchema = normalizeOptions(tree, options);
    const rootPackageJsonPath = join(workspaceRoot, 'package.json');
    const originalRootPackageJson = readFileSync(rootPackageJsonPath, 'utf8');

    await libraryGenerator(tree, normalizedOptions);

    // After libraryGenerator creates the project, read the actual projectRoot
    const projectConfig = readProjectConfiguration(tree, normalizedOptions.projectName);
    normalizedOptions.projectRoot = projectConfig.root;
    normalizedOptions.offsetFromRoot = offsetFromRoot(projectConfig.root);

    editLibraryProjectJson(tree, normalizedOptions);
    editEslintConfig(tree, normalizedOptions);
    addCommonFiles(tree, normalizedOptions);
    addUnitTestRunnerFiles(tree, normalizedOptions);
    updateTsConfigFile('tsconfig.adf.json', tree, normalizedOptions);

    if (!normalizedOptions.skipFormat) {
        await formatFiles(tree);
    }

    tree.write('package.json', originalRootPackageJson);

    return;
}
