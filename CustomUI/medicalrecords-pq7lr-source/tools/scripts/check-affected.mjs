#! /usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { exit, argv } from 'node:process';
import { basename } from 'node:path';
import { checkForForbiddenPattern, checkForMissingFeatureFlags, checkTsconfigValidity } from './filetype-based-checks.mjs';

const mode = argv.includes('--staged') ? 'staged' : 'affected';

function getStagedFiles(fileExtension) {
    const output = execSync('git diff --cached --name-only --diff-filter=d', {
        encoding: 'utf8',
    });
    return output.split('\n').filter((file) => file.endsWith(fileExtension) && existsSync(file));
}

function getAffectedFiles(fileExtension) {
    const developRef = execSync('git rev-parse --verify develop 2>/dev/null || git rev-parse --verify origin/develop', { encoding: 'utf8' }).trim();
    const mergeBase = execSync(`git merge-base HEAD ${developRef}`, { encoding: 'utf8' }).trim();
    const output = execSync(`git diff --name-only --diff-filter=d ${mergeBase}...HEAD`, {
        encoding: 'utf8',
    });
    return output.split('\n').filter((file) => file.endsWith(fileExtension) && existsSync(file));
}

function getFiles(fileExtension) {
    return mode === 'affected' ? getAffectedFiles(fileExtension) : getStagedFiles(fileExtension);
}

function main() {
    const tsconfigFiles = getFiles('.json').filter((file) => basename(file).startsWith('tsconfig'));

    checkForMissingFeatureFlags(getFiles('.e2e.ts'));
    checkTsconfigValidity(tsconfigFiles);
    checkForForbiddenPattern(getFiles('.html'));

    exit(0);
}

main();
