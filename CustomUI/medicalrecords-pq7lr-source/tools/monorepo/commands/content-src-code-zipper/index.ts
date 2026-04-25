/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Command, InputParam, Runnable } from '../../../shared/command';
import { PrivatePackageCreator } from './steps/private-packages-creator';
import { InRepoPackageCreator } from './steps/in-repo-packages-creator';
import { PackageRegistryUpdater } from './steps/package-registry-updater';
import { SourceCodeZipper } from './steps/source-code-zipper';
import { join } from 'node:path';
import { InRepoPackageConfig, ProjectFilePathToBeExtracted } from './project-configs/interfaces';
import { HXP_PRIVATE_PACKAGES } from './project-configs/workspace-hxp/private-packages';
import { HXP_IN_REPO_PACKAGES } from './project-configs/workspace-hxp/in-repo-packages';
import { HXP_FILES_TO_BE_IGNORED, HXP_PACKAGE_PATTERNS_TO_BE_EXCLUDED } from './project-configs/workspace-hxp/ignored-files';
import { HXP_FILES_TO_BE_INCLUDED, HXP_TRANSFORMED_FILES_TO_BE_INCLUDED } from './project-configs/workspace-hxp/project-files';

@Command({
    name: 'content-src-code-zipper',
    description: 'Extract the archived source code for workspace apps',
})
export default class SourceCodeZipperCommand implements Runnable {

    @InputParam({
        required: false,
        alias: 'o',
        title: 'Enter the output path. (default: ./content-app.zip)',
    })
    output = join(process.cwd(), 'content-app.zip');

    async run() {
        const workspaceRoot = process.cwd();

        console.log('Inline private packages');
        await this.inlinePrivateNpmDependencies(workspaceRoot, HXP_PRIVATE_PACKAGES);

        const inRepoPackages = HXP_IN_REPO_PACKAGES;
        if (inRepoPackages && inRepoPackages.length > 0) {
            console.log('Inline in-repo packages');
            await this.inlineInRepoNpmDependencies(workspaceRoot, inRepoPackages);
        }

        console.log('Update npm dependencies from wrong registry');
        await this.updateNpmDependenciesFromWrongRegistry(workspaceRoot, HXP_PACKAGE_PATTERNS_TO_BE_EXCLUDED);

        console.log('Zipping the Content app(s) related files');
        const projectConfig = HXP_FILES_TO_BE_INCLUDED;
        /**
         * Transformer files are appended into the archive.
         * Since we are also adding files using archive.glob (e.g. 'apps/workspace-hxp/**'),
         * it can result in duplicate files on Windows machines.
         * We need to exclude transformer files to avoid having them twice in the archive.
         */
        const HXP_TRANSFORMER_FILES_TO_BE_IGNORED = HXP_TRANSFORMED_FILES_TO_BE_INCLUDED.map((file) => file.name);
        const ignoredFiles = [...HXP_FILES_TO_BE_IGNORED, ...HXP_TRANSFORMER_FILES_TO_BE_IGNORED];
        await this.zipSourceCode(projectConfig, ignoredFiles);
    }

    async inlinePrivateNpmDependencies(workspaceRoot: string, packages: string[]): Promise<void> {
        const privatePackageCreator = new PrivatePackageCreator();
        privatePackageCreator.extractPackages(workspaceRoot, packages);
    }

    async inlineInRepoNpmDependencies(workspaceRoot: string, inRepoPackages: InRepoPackageConfig[]): Promise<void> {
        const privatePackageCreator = new InRepoPackageCreator();
        return privatePackageCreator.extractPackages(workspaceRoot, inRepoPackages);
    }

    async updateNpmDependenciesFromWrongRegistry(workspaceRoot: string, ignore: string[]): Promise<void> {
        const packageRegistryUpdater = new PackageRegistryUpdater();
        packageRegistryUpdater.updatePackageRegistry(workspaceRoot, ignore);
    }

    async zipSourceCode(include: ProjectFilePathToBeExtracted[], ignore: string[]) {
        const sourceCodeZipper = new SourceCodeZipper();
        return sourceCodeZipper.zipCode(this.output, include, ignore);
    }
}
