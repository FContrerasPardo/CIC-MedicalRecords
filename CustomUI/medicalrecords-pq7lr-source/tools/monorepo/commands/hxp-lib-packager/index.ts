/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Command, InputParam, Runnable } from '../../../shared/command';
import { join, basename } from 'node:path';
import { cpSync, readFileSync, renameSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { createProjectGraphAsync, readProjectsConfigurationFromProjectGraph } from '@nx/devkit';

/* eslint-disable no-console */

const LOCAL_PACKAGES = {
    'adf-enterprise-adf-hx-content-services': [
        {
            input: 'libs/adf/enterprise/adf-hx-content-services/icons/assets/images',
            output: 'icons/assets/images',
        },
        {
            input: 'libs/adf/enterprise/adf-hx-content-services/icons/assets/search-icons',
            output: 'icons/assets/search-icons',
        },
        {
            input: 'libs/adf/enterprise/adf-hx-content-services/icons/assets/i18n',
            output: 'icons/assets/i18n',
        },
        {
            input: 'libs/adf/enterprise/adf-hx-content-services/ui/assets/adf-enterprise-adf-hx-content-services-ui/i18n',
            output: 'ui/assets/adf-enterprise-adf-hx-content-services-ui/i18n',
        },
        {
            input: 'libs/adf/enterprise/adf-hx-content-services/ui/assets/adf-enterprise-adf-hx-content-services-ui/images',
            output: 'ui/assets/adf-enterprise-adf-hx-content-services-ui/images',
        },
        {
            input: 'libs/adf/enterprise/adf-hx-content-services/services/assets/adf-enterprise-adf-hx-content-services-services/i18n',
            output: 'services/assets/adf-enterprise-adf-hx-content-services-services/i18n',
        },
    ],
};

@Command({
    name: 'hxp-lib-packager',
    description: 'Extract the archived source code for HxP publishable libs',
})
export default class HxpLibPackager implements Runnable {
    @InputParam({
        required: false,
        alias: 'b',
        title: 'Lib to build (default: adf-enterprise-adf-hx-content-services)',
    })
    build = 'adf-enterprise-adf-hx-content-services';

    @InputParam({
        required: false,
        alias: 'p',
        title: 'If false, build and validate the package, but skip publishing (default: false)',
    })
    publish: 'true' | 'false' | 'error-tag' = 'false';

    @InputParam({
        required: false,
        alias: 'v',
        title: 'Version of the package to be published (default: empty)',
    })
    tag = '';

    async run() {
        const packagesRoot = '.publishable-packages';
        const workspaceRoot = process.cwd();
        const projectName = this.build;
        const projectRoot = join(packagesRoot, projectName);

        console.log('Loading project configuration...');
        const projectGraph = await createProjectGraphAsync();
        const { projects } = readProjectsConfigurationFromProjectGraph(projectGraph);
        const project = projects[projectName];

        if (!project) {
            const allProjectNames = Object.keys(projects);
            const maxProjectsToShow = 15;
            const projectsToShow = allProjectNames.slice(0, maxProjectsToShow);
            const remainingCount = allProjectNames.length - maxProjectsToShow;

            const projectList = projectsToShow.map((proj) => `  - ${proj}`).join('\n');
            const suffix = remainingCount > 0 ? `\n  ... and ${remainingCount} more projects\n\nRun 'nx show projects' to see the full list.` : '';

            throw new Error(
                `Project "${projectName}" not found in workspace.\n\n` +
                    `Available projects (showing ${projectsToShow.length} of ${allProjectNames.length}):\n${projectList}${suffix}`
            );
        }

        const projectPath = project.root;

        console.log('Cleaning up previous build...');
        rmSync(projectRoot, { recursive: true, force: true });
        mkdirSync(projectRoot, { recursive: true });

        console.log(`Building ${projectName}...`);
        await extractPackages(workspaceRoot, projectRoot, projectPath, packagesRoot);

        const assets = LOCAL_PACKAGES[projectName];
        if (assets && assets.length > 0) {
            console.log('Copying assets...');
            copyAssets(projectRoot, assets);
        }

        if (this.tag.length > 0) {
            console.info(`Updating domain shell package version to ${this.tag}...`);
            const updated = updateVersion(workspaceRoot, projectRoot, this.tag);
            if (!updated && this.publish === 'true') {
                this.publish = 'error-tag';
            }
        }

        console.info('Validating package...');
        await validatePackage(workspaceRoot, projectRoot, projectPath);

        const packageJsonPath = join(workspaceRoot, projectRoot, 'package.json');
        const { name } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const libName = `${name}@${this.tag}`;

        if (this.publish === 'true') {
            console.info('Publishing package...');
            publishLibrary(projectRoot, this.tag);
            console.info(`The lib ${libName} has been published.`);
        } else if (this.publish === 'error-tag') {
            console.error(`The lib ${libName} has been already published.`);
            console.warn('Please use a different lib version and try again.');
        } else {
            console.warn(`The lib ${libName} has not been published because publish flag is false`);
        }
    }
}

function publishLibrary(projectRoot: string, version: string): void {
    if (process.env.BOT_GITHUB_TOKEN) {
        process.env.GH_PACKAGES_READ_ONLY_TOKEN = process.env.BOT_GITHUB_TOKEN;
    }
    const isPrerelease = version.includes('-');
    const tag = isPrerelease ? 'beta' : 'latest';
    execFileSync('npm', ['publish', projectRoot, '--tag', tag]);
}

function copyAssets(projectRoot: string, assets: any[] = []): void {
    for (const asset of assets) {
        copyFile(asset.input, [projectRoot, asset.output]);
    }
}

async function validatePackage(workspaceRoot: string, projectRoot: string, projectPath: string): Promise<void> {
    const createdPackageNameBuffer = execSync(`npm pack ${projectRoot} --quiet`);
    const createdPackageName = createdPackageNameBuffer.toString().replace(/[\r\n]/gm, '');

    const { name } = JSON.parse(readFileSync(join(workspaceRoot, projectPath, 'package.json'), 'utf8'));
    execSync(`npm i ${name}@file:./${createdPackageName} --no-save`);
}

function copyFile(from: string | string[], to: string | string[]): void {
    const fromPaths = Array.isArray(from) ? from : [from];
    const toPaths = Array.isArray(to) ? to : [to];

    const fromFolder = join(process.cwd(), ...fromPaths);
    const toFolder = join(process.cwd(), ...toPaths);

    cpSync(fromFolder, toFolder, { recursive: true });
}

function updateVersion(workspaceRoot: string, projectRoot: string, version: string): boolean {
    const packageJsonPath = join(workspaceRoot, projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const { name: packageName, version: localVersion } = packageJson;

    const hasBeenAlreadyPublished = getRemoteVersions(packageName).includes(version);
    if (hasBeenAlreadyPublished) {
        return false;
    }

    const isSameLocalVersion = localVersion === version;
    if (!isSameLocalVersion) {
        const prefixPath = join(workspaceRoot, projectRoot);
        execFileSync('npm', ['version', version, '--no-git-tag-version', '--prefix', prefixPath]);
    }
    return true;
}

/**
 * Retrieves the remote versions of a given package from the npm registry.
 *
 * The output of the npm view command is a string representing a JS object, eg:
 * [
 *   '7.19.0-beta.7',
 *   '7.19.0-beta.8',
 *   '7.19.0-beta.9',
 * ]
 * It is not a JSON file (see single quotes).
 * We can't use eval() command for security reasons, so the string is split at new lines.
 * If there is no version available, the output is undefined.
 *
 * @param packageName - The name of the package to retrieve versions for.
 * @returns An array of strings representing the remote versions of the package.
 */
function getRemoteVersions(packageName: string): string[] {
    const result = execFileSync('npm', ['view', packageName, 'versions']);
    return typeof result === 'string' ? (result as string).split('\n') : [];
}

async function extractPackages(workspaceRoot: string, projectRoot: string, projectPath: string, packagesRoot: string): Promise<void> {
    const ngPackageJson = JSON.parse(readFileSync(join(workspaceRoot, projectPath, 'ng-package.json'), 'utf8'));

    const projectName = basename(projectRoot);
    execSync(`npm run nx:run-target -- ${projectName}:build:production --skip-nx-cache`);

    const buildDestination = join(projectPath, ngPackageJson.dest);
    const libraryName = basename(ngPackageJson.dest);

    const packagesFolderPath = createFolder(packagesRoot);
    const sourceFullPath = join(workspaceRoot, buildDestination);
    moveEntry(sourceFullPath, packagesFolderPath);
    renameSync(join(packagesFolderPath, libraryName), projectRoot);
}

function createFolder(folderName: string | string[]): string {
    const targetPath = join(process.cwd(), ...(Array.isArray(folderName) ? folderName : [folderName]));
    mkdirSync(targetPath, { recursive: true });

    return targetPath;
}

export function moveEntry(sourcePath: string, targetFolder: string): void {
    const targetPath = join(targetFolder, basename(sourcePath));

    if (!existsSync(targetFolder)) {
        mkdirSync(targetFolder, { recursive: true });
    }

    renameSync(sourcePath, targetPath);
}
