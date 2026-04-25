#!/usr/bin/env node
/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const MINIMUM_VERSION = '3.8.0';

function hasStagedHtmlFiles() {
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=d', { encoding: 'utf-8' });
    return stagedFiles.split('\n').some((file) => file.endsWith('.component.html'));
}

function parseVersion(version) {
    return version.split('.').map(Number);
}

function isVersionSufficient(installed, minimum) {
    const [installedMajor, installedMinor, installedPatch] = parseVersion(installed);
    const [minMajor, minMinor, minPatch] = parseVersion(minimum);

    if (installedMajor !== minMajor) return installedMajor > minMajor;
    if (installedMinor !== minMinor) return installedMinor > minMinor;
    return installedPatch >= minPatch;
}

function getInstalledPrettierVersion() {
    const require = createRequire(import.meta.url);
    const prettierPkgPath = require.resolve('prettier/package.json');
    const prettierPkg = JSON.parse(readFileSync(prettierPkgPath, 'utf-8'));
    return prettierPkg.version;
}

function printVersionMismatchError(installedVersion) {
    console.error(`
╔════════════════════════════════════════════════════════════════════════╗
║  ⚠️  Prettier version mismatch                                          ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  Installed: ${installedVersion.padEnd(10)} Required: >=${MINIMUM_VERSION}                               ║
║                                                                        ║
║  The pre-commit hook requires Prettier ${MINIMUM_VERSION}+ to properly format       ║
║  Angular component template files.                                     ║
║                                                                        ║
║  Please run:                                                           ║
║                                                                        ║
║    npm install                                                         ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
`);
}

function run() {
    if (!hasStagedHtmlFiles()) {
        process.exit(0);
    }

    try {
        const installedVersion = getInstalledPrettierVersion();

        if (!isVersionSufficient(installedVersion, MINIMUM_VERSION)) {
            printVersionMismatchError(installedVersion);
            process.exit(1);
        }
    } catch (error) {
        console.error('Failed to check Prettier version:', error.message);
        process.exit(1);
    }
}

run();
