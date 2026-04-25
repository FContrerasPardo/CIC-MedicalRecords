#! /usr/bin/env node

/**
 * Infragistics Package Update Script
 *
 * This script updates the Infragistics package by:
 * 1. Reading the installed version from node_modules/@infragistics/igniteui-angular/package.json
 * 2. Verifying the target package is available in the npm registry
 * 3. Installing the correct package to node_modules only
 *
 * IMPORTANT: This script does NOT update package.json or package-lock.json.
 * It only installs the package to the node_modules directory using npm install --no-save.
 *
 * Prerequisites:
 * - The @infragistics/igniteui-angular package must already be installed in node_modules
 *
 * Usage:
 *   node infragistics-package-update.mjs
 */

import { spawn } from 'node:child_process';

// Constants
const PACKAGE_NAME = '@infragistics/igniteui-angular';
const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * Executes a command and returns a promise with stdout, stderr, and exit code
 * @param {string} command - The command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`\n[INFO] Executing: ${command} ${args.join(' ')}`);

        const proc = spawn(command, args, { shell: false, ...options });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            process.stdout.write(text);
        });

        proc.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            process.stderr.write(text);
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start process: ${err.message}`));
        });

        proc.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });
    });
}

/**
 * Gets the installed version from node_modules/@infragistics/igniteui-angular/package.json
 * @returns {Promise<string>} The installed version
 */
async function getInstalledVersion() {
    console.log(`[INFO] Reading installed version of ${PACKAGE_NAME} from node_modules...`);

    try {
        const { readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');

        const installedPackageJsonPath = join(process.cwd(), 'node_modules', PACKAGE_NAME, 'package.json');
        const packageJsonContent = await readFile(installedPackageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);

        const version = packageJson.version;

        if (!version) {
            throw new Error(`Version information not found in installed ${PACKAGE_NAME} package.json`);
        }

        console.log(`[SUCCESS] Found installed ${PACKAGE_NAME} version: ${version}`);
        return version;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`[ERROR] Installed package not found in node_modules/${PACKAGE_NAME}`);
            console.error('[ERROR] Make sure the package is installed before running this script.');
        } else if (err.message.includes('JSON')) {
            console.error('[ERROR] Failed to parse package.json from installed package.');
        }
        throw err;
    }
}

/**
 * Verifies that a package with the specified version is available in the npm registry
 * @param {string} packageName - Package name to verify
 * @param {string} version - Version to verify
 * @returns {Promise<void>}
 */
async function verifyPackageAvailability(packageName, version) {
    const packageWithVersion = `${packageName}@${version}`;
    console.log(`\n[INFO] Verifying package availability: ${packageWithVersion}...`);

    const { stderr, code } = await execCommand(NPM_EXECUTABLE, ['view', packageWithVersion, '--json', 'dist']);

    if (code !== 0) {
        throw new Error(
            `Package ${packageWithVersion} not found in npm registry.\n` +
                `Error: ${stderr}\n` +
                `Please check that the package name and version are correct.`
        );
    }

    console.log(`[SUCCESS] Package ${packageWithVersion} is available in npm registry`);
}

/**
 * Installs the specified package with the given version to node_modules only.
 *
 * IMPORTANT: This function does NOT modify package.json or package-lock.json.
 * It uses the --no-save flag to install the package only to the node_modules directory.
 *
 * @param {string} packageName - Package name to install
 * @param {string} version - Version to install
 * @returns {Promise<void>}
 */
async function installPackageToNodeModules(packageName, version) {
    const packageWithVersion = `${packageName}@${version}`;
    console.log(`\n[INFO] Installing ${packageWithVersion} to node_modules only...`);
    console.log(`[INFO] Note: package.json and package-lock.json will NOT be modified`);

    const { stderr, code } = await execCommand(NPM_EXECUTABLE, ['install', packageWithVersion, '--no-save']);

    if (code !== 0) {
        throw new Error(`npm install failed with exit code ${code}\n${stderr}`);
    }

    console.log(`\n[SUCCESS] Successfully installed ${packageWithVersion} to node_modules`);
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('='.repeat(60));
        console.log('Infragistics Package Update Script');
        console.log('='.repeat(60));
        console.log(`[INFO] Platform: ${process.platform}`);
        console.log(`[INFO] Using npm executable: ${NPM_EXECUTABLE}`);

        // Get the installed version from node_modules
        const version = await getInstalledVersion();

        // Verify the package is available in npm registry
        await verifyPackageAvailability(PACKAGE_NAME, version);

        // Install the package to node_modules only (does NOT modify package.json or package-lock.json)
        await installPackageToNodeModules(PACKAGE_NAME, version);

        console.log('\n' + '='.repeat(60));
        console.log('[SUCCESS] Package update completed successfully!');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (err) {
        console.error('\n' + '='.repeat(60));
        console.error('[ERROR] Package update failed!');
        console.error('='.repeat(60));
        console.error(`[ERROR] ${err.message}`);

        if (err.stack) {
            console.error('\nStack trace:');
            console.error(err.stack);
        }

        process.exit(1);
    }
}

// Run the main function
main();
