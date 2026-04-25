/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export function environmentType(): boolean {
    const { APP_CONFIG_BPM_HOST } = process.env;

    if (!APP_CONFIG_BPM_HOST) {
        return false;
    }

    return /-beta/.test(APP_CONFIG_BPM_HOST) || /rc/.test(APP_CONFIG_BPM_HOST);
}

export function skipOrExecuteTestBasedOnEnvName(testObject: any, reason?: string): void {
    if (!environmentType()) {
        const defaultReason = reason || 'Test skipped: Only runs in beta or rc environments';
        testObject.skip(true, defaultReason);
    }
}
