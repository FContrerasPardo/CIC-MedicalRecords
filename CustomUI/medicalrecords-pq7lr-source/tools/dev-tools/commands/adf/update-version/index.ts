/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createProjectGraphAsync, readProjectsConfigurationFromProjectGraph } from '@nx/devkit';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { input, confirm } from '@inquirer/prompts';
import { execSync, execFileSync } from 'node:child_process';

const libs = [
    '@alfresco/adf-cli',
    '@alfresco/adf-core',
    '@alfresco/adf-content-services',
    '@alfresco/adf-extensions',
    '@alfresco/adf-process-services-cloud',
];

/**
 * Resolves a dist-tag or version string to a concrete version number
 * @param packageName - The npm package name
 * @param versionOrTag - Either a dist-tag (alpha/latest/next) or a concrete version
 * @returns The resolved concrete version number
 */
function resolvePackageVersion(packageName: string, versionOrTag: string): string {
    try {
        console.log(`  Resolving ${packageName}@${versionOrTag}...`);

        // Use execFileSync instead of execSync to avoid shell injection vulnerabilities
        const result = execFileSync('npm', ['view', `${packageName}@${versionOrTag}`, 'version'], {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        const resolvedVersion = result.trim();
        console.log(`    → Resolved to ${resolvedVersion}`);
        return resolvedVersion;
    } catch (error) {
        console.error(`  ✗ Failed to resolve ${packageName}@${versionOrTag}:`, error.message);
        throw new Error(`Failed to resolve version for ${packageName}@${versionOrTag}`);
    }
}

interface CliOptions {
    adfVersion: string;
    jsApiVersion: string;
    skipJsApi: boolean;
    interactive: boolean;
}

function parseCliArgs(): CliOptions {
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            v: {
                type: 'string',
            },
            j: {
                type: 'string',
            },
            u: {
                type: 'boolean',
                default: false,
            },
            interactive: {
                type: 'boolean',
                default: false,
            },
            i: {
                type: 'boolean',
                default: false,
            },
        },
        allowPositionals: true,
    });

    return {
        adfVersion: values.v as string,
        jsApiVersion: values.j as string,
        skipJsApi: values.u as boolean,
        interactive: (values.interactive || values.i) as boolean,
    };
}

async function promptForOptions(cliOptions: CliOptions): Promise<CliOptions> {
    if (!cliOptions.interactive) {
        // Use defaults if not provided
        return {
            ...cliOptions,
            adfVersion: cliOptions.adfVersion || 'alpha',
            jsApiVersion: cliOptions.jsApiVersion || 'alpha',
        };
    }

    const adfVersion = await input({
        message: 'Which ADF tag/version you want to use (e.g., latest, next, alpha, beta, or 8.5.0):',
        default: cliOptions.adfVersion || 'alpha',
        validate: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
                return 'Version is required';
            }
            // Accept any non-empty string - npm will validate if it's a real tag/version
            return true;
        },
    });

    const jsApiVersion = await input({
        message: 'Which JS API tag/version you want to use (e.g., latest, next, alpha, beta, or 7.10.0):',
        default: cliOptions.jsApiVersion || 'alpha',
        validate: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
                return 'Version is required';
            }
            // Accept any non-empty string - npm will validate if it's a real tag/version
            return true;
        },
    });

    const skipJsApi = await confirm({
        message: 'Do you want to skip updating js-api?',
        default: cliOptions.skipJsApi,
    });

    return {
        adfVersion,
        jsApiVersion,
        skipJsApi,
        interactive: true,
    };
}

async function getProjectsWithAdfDependencies(libsToCheck: string[]): Promise<string[]> {
    const projectGraph = await createProjectGraphAsync();
    const projectsConfig = readProjectsConfigurationFromProjectGraph(projectGraph);

    const paths: string[] = [];
    const cwd = process.cwd();

    // Check root package.json
    const rootPackageJsonPath = join(cwd, 'package.json');
    if (hasAdfDependencies(rootPackageJsonPath, libsToCheck)) {
        paths.push(cwd);
    }

    // Check each Nx project for ADF dependencies
    for (const [, projectConfig] of Object.entries(projectsConfig.projects)) {
        const projectRoot = join(cwd, projectConfig.root);
        const packageJsonPath = join(projectRoot, 'package.json');

        if (existsSync(packageJsonPath) && hasAdfDependencies(packageJsonPath, libsToCheck)) {
            paths.push(projectRoot);
        }
    }

    return paths;
}

function hasAdfDependencies(packageJsonPath: string, libsToCheck: string[]): boolean {
    try {
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);

        const dependencies = packageJson.dependencies || {};
        const peerDependencies = packageJson.peerDependencies || {};
        const devDependencies = packageJson.devDependencies || {};

        const allDeps = { ...dependencies, ...peerDependencies, ...devDependencies };

        return libsToCheck.some((lib) => allDeps[lib]);
    } catch {
        return false;
    }
}

function updatePackageJson(packageJsonPath: string, versionMap: Map<string, string>): boolean {
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    let updated = false;

    // Update dependencies with exact versions
    if (packageJson.dependencies) {
        updated = updateDependencyObject(packageJson.dependencies, versionMap, false) || updated;
    }

    // Update peerDependencies while preserving range operators
    if (packageJson.peerDependencies) {
        updated = updateDependencyObject(packageJson.peerDependencies, versionMap, true) || updated;
    }

    // Update devDependencies with exact versions
    if (packageJson.devDependencies) {
        updated = updateDependencyObject(packageJson.devDependencies, versionMap, false) || updated;
    }

    if (updated) {
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
        console.log(`  ✓ Updated ${packageJsonPath}`);
    } else {
        console.log(`  - No changes needed for ${packageJsonPath}`);
    }

    return updated;
}

function updateDependencyObject(deps: Record<string, string>, versionMap: Map<string, string>, preserveRangeOperator: boolean): boolean {
    let updated = false;

    for (const [lib, newVersion] of versionMap.entries()) {
        if (deps[lib]) {
            const oldVersion = deps[lib];
            let updatedVersion: string;

            if (preserveRangeOperator) {
                // Extract range operator from existing version (>=, ^, ~, etc.)
                const rangeOperatorMatch = oldVersion.match(/^([><=^~]+)/);
                const rangeOperator = rangeOperatorMatch ? rangeOperatorMatch[1] : '>=';
                updatedVersion = `${rangeOperator}${newVersion}`;
            } else {
                // Use exact version for dependencies and devDependencies
                updatedVersion = newVersion;
            }

            if (oldVersion !== updatedVersion) {
                deps[lib] = updatedVersion;
                console.log(`    ${lib}: ${oldVersion} → ${updatedVersion}`);
                updated = true;
            }
        }
    }

    return updated;
}

async function main() {
    const cliOptions = parseCliArgs();
    const options = await promptForOptions(cliOptions);

    console.log('Updating @alfresco dependencies');
    console.log(`ADF Version: ${options.adfVersion}`);
    console.log(`JS-API Version: ${options.jsApiVersion}`);
    console.log(`Skip JS-API: ${options.skipJsApi}\n`);

    // Resolve dist-tags to concrete versions
    console.log('Resolving dist-tags to concrete versions...\n');
    const resolvedAdfVersion = resolvePackageVersion('@alfresco/adf-core', options.adfVersion);
    const resolvedJsApiVersion = options.skipJsApi ? null : resolvePackageVersion('@alfresco/js-api', options.jsApiVersion);

    console.log('\nBuilding version map with resolved versions...');

    // Build version map with resolved concrete versions
    const versionMap = new Map<string, string>();
    for (const lib of libs) {
        versionMap.set(lib, resolvedAdfVersion);
    }
    if (!options.skipJsApi && resolvedJsApiVersion) {
        versionMap.set('@alfresco/js-api', resolvedJsApiVersion);
    }

    // Get list of libraries to check
    const libsToCheck = [...libs];
    if (!options.skipJsApi) {
        libsToCheck.push('@alfresco/js-api');
    }

    // Find and update projects
    const projectsWithAdfDeps = await getProjectsWithAdfDependencies(libsToCheck);

    console.log(`\nFound ${projectsWithAdfDeps.length} projects with ADF dependencies\n`);

    const cwd = process.cwd();
    let rootPackageJsonUpdated = false;
    const failures: string[] = [];

    for (const projectPath of projectsWithAdfDeps) {
        console.log(`\nUpdating ${projectPath}...`);
        const packageJsonPath = join(projectPath, 'package.json');

        if (existsSync(packageJsonPath)) {
            try {
                const wasUpdated = updatePackageJson(packageJsonPath, versionMap);
                if (projectPath === cwd && wasUpdated) {
                    rootPackageJsonUpdated = true;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`  ✗ Failed to update ${packageJsonPath}: ${errorMessage}`);
                failures.push(packageJsonPath);
            }
        }
    }

    // Check for failures before proceeding
    if (failures.length > 0) {
        console.error(`\n✗ Failed to update ${failures.length} package.json file(s):`);
        failures.forEach(path => console.error(`  - ${path}`));
        throw new Error(`Failed to update ${failures.length} package.json file(s)`);
    }

    // Regenerate package-lock.json if root package.json was updated
    if (rootPackageJsonUpdated) {
        console.log('\nRegenerating package-lock.json...');
        try {
            execSync('npm install --package-lock-only', { stdio: 'inherit', cwd });
            console.log('  ✓ package-lock.json updated');
        } catch (error) {
            console.error('  ✗ Failed to regenerate package-lock.json:', error);
            throw error;
        }
    }

    console.log('\n✓ Done!');
}

// Use IIFE because ts-node doesn't support top-level await without additional config
// eslint-disable-next-line unicorn/prefer-top-level-await, @typescript-eslint/no-floating-promises
(async () => {
    try {
        await main();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
