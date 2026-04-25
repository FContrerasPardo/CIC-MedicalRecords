/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import * as semver from 'semver';

/* @cspell:disable */

export const ReleaseType = {
    prereleasepatch: 'prereleasepatch',
    prerelease: 'prerelease',
    prepatch: 'prepatch',
    patch: 'patch',
    preminor: 'preminor',
    minor: 'minor',
    premajor: 'premajor',
    major: 'major',
} as const;

export type ReleaseType = typeof ReleaseType[keyof typeof ReleaseType];

export function incrementDBPVersion(versionInDbpFormat: string, incrementType: semver.ReleaseType | 'prereleasepatch' = 'patch'): string {
    let increasedVersionInDbpFormat: string;
    if (incrementType === 'prereleasepatch') {
        increasedVersionInDbpFormat = versionInDbpFormat.replace(
            /-M([0-9.]*)$/,
            (_match, prereleaseVersion) => `-M${parseFloat(prereleaseVersion) + 0.1}`
        );
    } else {
        const semanticVersion = versionInDbpFormat.replace(/-M([0-9.]*)$/, (_match, prereleaseVersion) => `-M.${parseInt(prereleaseVersion, 10)}`);
        const increased = semver.inc(semanticVersion, incrementType, /prerelease/.test(incrementType) ? 'M' : '');
        increasedVersionInDbpFormat = increased?.replace(/-M\.([0-9]*)$/, '-M$1') || versionInDbpFormat;
    }

    return increasedVersionInDbpFormat;
}
