/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AxeResults, ElementContext, RunOnly, RuleObject } from 'axe-core';

export const defaultConfiguration = {
    runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
    } as RunOnly,
    rules: {
        'color-contrast': { enabled: false },
        'link-in-text-block': { enabled: false },
    } as RuleObject,
};

export interface A11yAnalysisResult {
    results: AxeResults;
    incomplete: { [violationId: string]: number }[];
    violations: { [violationId: string]: number }[];
}

const sortById = (a: { [key: string]: number }, b: { [key: string]: number }): number =>
    Object.keys(a)[0].localeCompare(Object.keys(b)[0]);

export const a11yReport = async (element: ElementContext, testConfiguration = defaultConfiguration): Promise<A11yAnalysisResult | undefined> => {
    const axeCore = await import('axe-core');
    const results = await axeCore.run(element, testConfiguration);
    return {
        results,
        incomplete: results.incomplete
            .map((result) => ({ [result.id]: result.nodes.length }))
            .sort(sortById),
        violations: results.violations
            .map((result) => ({ [result.id]: result.nodes.length }))
            .sort(sortById),
    };
};
