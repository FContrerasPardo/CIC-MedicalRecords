/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UnitTestRunner } from '@nx/angular/generators';
import { Tree, names, workspaceRoot } from '@nx/devkit';
import { NormalizedSchema } from '../models/normalized-schema';
import { LibraryGeneratorSchema } from '../schema';
import { relative } from 'node:path';

/**
 * Derives the library name from the import path.
 * @param importPath - The import path (e.g., '@hxp/studio-shared/process-editor/external')
 * @returns The derived library name (e.g., 'studio-shared-process-editor-external')
 */
function deriveLibraryNameFromImportPath(importPath: string): string {
    return importPath
        .replace(/^@hxp\//, '') // Remove @hxp/ prefix
        .replace(/\//g, '-'); // Replace slashes with dashes
}

export function normalizeOptions(tree: Tree, options: LibraryGeneratorSchema): NormalizedSchema {
    // Always use 'hxp' as the prefix for component selectors
    const prefix = 'hxp';
    const style = 'scss';

    const importPath = options.importPath;
    const projectName = deriveLibraryNameFromImportPath(importPath);
    const libName = names(projectName).fileName;

    const category = options.category;

    // Calculate directory by appending the type to the base path:
    // 1. If explicitly provided via --directory, use it as base
    // 2. If running from a subfolder, use current folder relative to workspace as base
    // Then append the type to create: {base}/{type}
    const cwdRelativeToWorkspace = relative(workspaceRoot, process.cwd());
    const baseDirectory = options.directory || cwdRelativeToWorkspace;
    const directory = baseDirectory ? `${baseDirectory}/${options.type}` : options.type;

    const unitTestRunner = options.unitTestRunner || UnitTestRunner.Jest;

    return {
        ...options,
        category,
        name: libName,
        prefix,
        projectName,
        directory,
        importPath,
        unitTestRunner,
        style,
    };
}
