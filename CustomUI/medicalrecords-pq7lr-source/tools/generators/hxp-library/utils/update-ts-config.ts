/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Tree, updateJson } from '@nx/devkit';
import { NormalizedSchema } from '../models/normalized-schema';

export function updateTsConfigFile(fileName: string, tree: Tree, options: NormalizedSchema) {
    updateJson(tree, fileName, (json) => {
        const c = json.compilerOptions;
        c.paths = c.paths || {};
        delete c.paths[options.name];

        if (c.paths[options.importPath]) {
            throw new Error(`You already have a library using the import path "${options.importPath}". Make sure to specify a unique one.`);
        }

        c.paths[options.importPath] = [`${options.projectRoot}/src/index.ts`];

        return json;
    });
}
