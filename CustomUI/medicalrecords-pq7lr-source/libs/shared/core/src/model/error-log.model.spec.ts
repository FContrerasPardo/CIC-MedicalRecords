/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ErrorLogGroup, extractReferenceId } from './error-log.model';

describe('extractReferenceId', () => {
    it('should return direct referenceId when present', () => {
        const error: ErrorLogGroup = {
            description: 'Flow node error',
            referenceId: 'Activity_0vxs5f7',
        };

        expect(extractReferenceId(error)).toBe('Activity_0vxs5f7');
    });

    it('should extract referenceId from params.id', () => {
        const error: ErrorLogGroup = {
            description: 'Element error',
            params: { id: 'Task_abc123', name: 'Test Task' },
        };

        expect(extractReferenceId(error)).toBe('Task_abc123');
    });

    it('should extract referenceId from params.userTask', () => {
        const error: ErrorLogGroup = {
            description: 'User task error',
            params: { userTask: 'Activity_0tbj78j', formKey: 'form-xxx' },
        };

        expect(extractReferenceId(error)).toBe('Activity_0tbj78j');
    });

    it('should extract referenceId from params.serviceTask', () => {
        const error: ErrorLogGroup = {
            description: 'Service task error',
            params: { serviceTask: 'ServiceTask_123' },
        };

        expect(extractReferenceId(error)).toBe('ServiceTask_123');
    });

    it('should return undefined when no referenceId or params', () => {
        const error: ErrorLogGroup = {
            description: 'Generic error',
            key: 'GENERIC_ERROR',
        };

        expect(extractReferenceId(error)).toBeUndefined();
    });

    it('should return undefined when params contains only unrelated fields', () => {
        const error: ErrorLogGroup = {
            description: 'Error',
            params: { formKey: 'form-123', variableName: 'var1' },
        };

        expect(extractReferenceId(error)).toBeUndefined();
    });

    it('should handle real-world validation response with mixed referenceId sources', () => {
        const errors: ErrorLogGroup[] = [
            {
                description: "Flow node [name: 'test form', id: 'Activity_0vxs5f7'] has to have an outgoing flow",
                referenceId: 'Activity_0vxs5f7',
                params: { name: 'test form', id: 'Activity_0vxs5f7' },
            },
            {
                description: "The user task 'Activity_0tbj78j' contains a reference to an unknown form key",
                params: { formKey: 'form-xxx', userTask: 'Activity_0tbj78j' },
            },
            {
                description: 'Generic validation error',
                key: 'GENERIC_ERROR',
            },
        ];

        expect(extractReferenceId(errors[0])).toBe('Activity_0vxs5f7');
        expect(extractReferenceId(errors[1])).toBe('Activity_0tbj78j');
        expect(extractReferenceId(errors[2])).toBeUndefined();
    });

    it('should handle empty string params and skip them', () => {
        const error: ErrorLogGroup = {
            description: 'Empty params',
            params: { id: '', userTask: 'Activity_VALID' },
        };

        const result = extractReferenceId(error);
        expect(result).toBeDefined();
        expect(result).not.toBe('');
    });
});
