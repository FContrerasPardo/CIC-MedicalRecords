/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { execSync } from 'node:child_process';
import { moveFile, createFolder } from './utils/fs';
import HxpLibPackager from '../../hxp-lib-packager';
import { join } from 'node:path';
import type { InRepoPackageConfig } from '../project-configs/interfaces';
import { readFileSync } from 'node:fs';

export class InRepoPackageCreator {
    async extractPackages(workspaceRoot: string, inRepoPackages: InRepoPackageConfig[]): Promise<void> {
        if (inRepoPackages.length === 0) {
            return;
        }

        const privatePackageFolderName = '.private-packages';
        const privatePackagesFolderPath = createFolder(privatePackageFolderName);

        for (const inRepoPackage of inRepoPackages) {
            const packager = new HxpLibPackager();
            packager.build = inRepoPackage.lib;
            packager.publish = 'false';
            await packager.run();

            const packageJsonPathInBuild = join(workspaceRoot, '.publishable-packages', inRepoPackage.lib, 'package.json');
            const builtPackageJson = JSON.parse(readFileSync(packageJsonPathInBuild, 'utf8'));
            const { name: packageName, version: packageVersion } = builtPackageJson;
            const createdTgzName = `${packageName.replace('@', '').replace('/', '-')}-${packageVersion}.tgz`;

            moveFile(createdTgzName, privatePackagesFolderPath);

            console.info('Updating package.json lib ' + inRepoPackage.lib);
            execSync(`npm i ${inRepoPackage.package}@file:./${privatePackageFolderName}/${createdTgzName}`);
        }
    }
}
