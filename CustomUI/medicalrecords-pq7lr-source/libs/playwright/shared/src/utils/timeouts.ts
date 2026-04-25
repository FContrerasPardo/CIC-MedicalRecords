/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const retries = {
    taskPolling: 30,
};

export const timeouts = {
    typingDelay: 50,
    debounceDelay: 100,
    tiny: 500,
    short: 1000,
    normal: 2 * 1000,
    default: 3 * 1000,
    medium: 5 * 1000,
    large: 10 * 1000,
    extraLarge: 20 * 1000,
    globalTest: 45 * 1000,
    longTest: 60 * 1000,
    longerTest: 60 * 1000,
    extendedTest: 120 * 1000,
    deployApp: 160 * 1000,
    webServer: 240 * 1000,
    globalSpec: 60 * 10 * 1000,
};
