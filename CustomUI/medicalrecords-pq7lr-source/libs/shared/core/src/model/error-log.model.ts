/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface ErrorLogGroup {
    modelName?: string;
    translatedModelType?: string;
    modelType?: string;
    modelId?: string;
    description: string;
    key?: string;
    params?: Record<string, string>;
    referenceId?: string;
}

const BPMN_ELEMENT_ID_PARAMS = [
    'taskId',
    'userTask',
    'id',
    'flowNodeId',
    'callActivityId',
    'refTaskId',
    'serviceTask',
    'scriptTask',
    'subProcess',
    'callActivity',
    'flowElementId',
    'elementId',
] as const;

export function extractReferenceId(error: ErrorLogGroup): string | undefined {
    if (error.referenceId) {
        return error.referenceId;
    }

    if (!error.params) {
        return undefined;
    }

    for (const paramName of BPMN_ELEMENT_ID_PARAMS) {
        const value = error.params[paramName];
        if (value) {
            return value;
        }
    }

    return undefined;
}
