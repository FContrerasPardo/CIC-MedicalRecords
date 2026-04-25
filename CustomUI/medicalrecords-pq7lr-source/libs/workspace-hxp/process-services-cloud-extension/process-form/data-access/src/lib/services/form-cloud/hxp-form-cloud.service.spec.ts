/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { AppConfigService, FormValues } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { HxpFormCloudService } from './hxp-form-cloud.service';
import { PendingDocument, PendingDocumentCleanupService, PENDING_DOCUMENT_SERVICE, HxpPendingDocumentService } from '@hxp/shared-hxp/services';

const MOCK_DOCUMENT: Document = {
    sys_id: 'doc-123',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

const MOCK_RESTORED_DOCUMENT: Document = {
    sys_id: 'doc-123',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
    sys_acl: [],
};

const MOCK_PENDING_DOCUMENT: PendingDocument = {
    document: MOCK_DOCUMENT,
    originalPermissions: [{ permission: 'Read', granted: true, user: { id: 'some-user', username: 'some-user' } }],
    pendingBy: 'user-123', persisted: false,
};

const MOCK_TASK_DETAILS = { id: 'task-123' };
const MOCK_TEXT_FORM_VALUES: FormValues = { field: { id: 'field-id', name: 'field', type: 'text' } };

describe('HxpFormCloudService', () => {
    let service: HxpFormCloudService;
    let mockDocumentOps: jest.Mocked<HxpPendingDocumentService>;
    let completeTaskFormSpy: jest.SpyInstance;
    let saveTaskFormSpy: jest.SpyInstance;

    const setupWithFF = (featureFlagEnabled: boolean) => {
        mockDocumentOps = {
            restorePermissions: jest.fn().mockResolvedValue(MOCK_RESTORED_DOCUMENT),
            deleteDocument: jest.fn().mockResolvedValue(undefined),
        };

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                PendingDocumentCleanupService,
                { provide: PENDING_DOCUMENT_SERVICE, useValue: mockDocumentOps },
                { provide: AdfHttpClient, useValue: { request: jest.fn().mockReturnValue(of(MOCK_TASK_DETAILS)) } },
                { provide: FeaturesServiceToken, useValue: { isOn$: jest.fn().mockReturnValue(of(featureFlagEnabled)) } },
                {
                    provide: AppConfigService,
                    useValue: { get: () => '' },
                },
            ],
        });

        const childInjector = Injector.create({
            providers: [HxpFormCloudService],
            parent: TestBed.inject(Injector),
        });
        service = childInjector.get(HxpFormCloudService);
        completeTaskFormSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'completeTaskForm')
            .mockReturnValue(of(MOCK_TASK_DETAILS));
        saveTaskFormSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'saveTaskForm')
            .mockReturnValue(of(MOCK_TASK_DETAILS));
    };

    beforeEach(() => setupWithFF(true));

    afterEach(() => {
        jest.clearAllMocks();
        TestBed.resetTestingModule();
    });

    it('should restore permissions on pending documents before completing task form', async () => {
        const formValues = {
            attachFile: MOCK_PENDING_DOCUMENT,
            textField: 'some text',
        };

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

        expect(mockDocumentOps.restorePermissions).toHaveBeenCalledWith(
            'doc-123',
            MOCK_PENDING_DOCUMENT.originalPermissions
        );
    });

    it('should pass restored document to super.completeTaskForm instead of PendingDocument', async () => {
        const formValues = {
            attachFile: MOCK_PENDING_DOCUMENT,
        };

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

        expect(completeTaskFormSpy).toHaveBeenCalledWith(
            'app', 'task-1', 'proc-1', 'form-1',
            expect.objectContaining({ attachFile: MOCK_RESTORED_DOCUMENT }),
            'submit', 1
        );
    });

    it('should not call restorePermissions when no pending documents exist', async () => {
        const formValues = {
            textField: 'some text',
            numberField: 42,
        };

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

        expect(mockDocumentOps.restorePermissions).not.toHaveBeenCalled();
    });

    it('should handle arrays containing pending documents', async () => {
        const formValues = {
            attachFiles: [MOCK_PENDING_DOCUMENT, MOCK_PENDING_DOCUMENT],
        };

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

        expect(mockDocumentOps.restorePermissions).toHaveBeenCalledTimes(2);
    });

    it('should handle nested objects containing pending documents', async () => {
        const formValues = {
            nested: { deepAttach: MOCK_PENDING_DOCUMENT },
        };

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

        expect(mockDocumentOps.restorePermissions).toHaveBeenCalledTimes(1);
    });

    it('should pass through null/undefined form values without processing', async () => {
        const nullFormValues = null as unknown as FormValues;
        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', nullFormValues, 'submit', 1));

        expect(mockDocumentOps.restorePermissions).not.toHaveBeenCalled();
        expect(completeTaskFormSpy).toHaveBeenCalledWith('app', 'task-1', 'proc-1', 'form-1', nullFormValues, 'submit', 1);
    });

    it('should throw when pending document has no sys_id', async () => {
        const badPendingDoc: PendingDocument = {
            document: { sys_primaryType: 'SysFile' },
            originalPermissions: [],
            pendingBy: 'user-123', persisted: false,
        };

        await expect(
            firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', { file: badPendingDoc }, 'submit', 1))
        ).rejects.toThrow('Cannot restore permissions: document has no sys_id');
    });

    it('should call markPersistedInFormValues when completing task form', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const markPersistedSpy = jest.spyOn(cleanupService, 'markPersistedInFormValues');
        const formValues = { attachFile: MOCK_PENDING_DOCUMENT };

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

        expect(markPersistedSpy).toHaveBeenCalledWith(formValues);
    });

    it('should clear tracking after completing task form', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');

        await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', { textField: 'value' }, 'submit', 1));

        expect(clearTrackingSpy).toHaveBeenCalled();
    });

    it('should call markPersistedInFormValues when saving task form', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const markPersistedSpy = jest.spyOn(cleanupService, 'markPersistedInFormValues');
        const formValues = { attachFile: MOCK_PENDING_DOCUMENT };

        await firstValueFrom(service.saveTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues));

        expect(markPersistedSpy).toHaveBeenCalledWith(formValues);
    });

    it('should clear tracking even when completeTaskForm fails', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');
        completeTaskFormSpy.mockReturnValue(throwError(() => new Error('server error')));

        await expect(
            firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', { textField: 'value' }, 'submit', 1))
        ).rejects.toThrow('server error');

        expect(clearTrackingSpy).toHaveBeenCalled();
    });

    it('should not clear tracking on saveTaskForm', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');

        await firstValueFrom(service.saveTaskForm('app', 'task-1', 'proc-1', 'form-1', MOCK_TEXT_FORM_VALUES));

        expect(clearTrackingSpy).not.toHaveBeenCalled();
    });

    describe('when FORMS_DEFERRED_DOC_CREATION feature flag is off', () => {
        beforeEach(() => {
            TestBed.resetTestingModule();
            setupWithFF(false);
        });

        it('should call super.completeTaskForm directly without processing pending documents', async () => {
            const formValues = { attachFile: MOCK_PENDING_DOCUMENT };

            await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

            expect(mockDocumentOps.restorePermissions).not.toHaveBeenCalled();
            expect(completeTaskFormSpy).toHaveBeenCalledWith('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1);
        });

        it('should call super.saveTaskForm without marking persisted', async () => {
            const formValues = { attachFile: MOCK_PENDING_DOCUMENT };

            await firstValueFrom(service.saveTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues));

            expect(saveTaskFormSpy).toHaveBeenCalledWith('app', 'task-1', 'proc-1', 'form-1', formValues);
        });

        it('should not clear tracking when completing task form', async () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');

            await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', {}, 'submit', 1));

            expect(clearTrackingSpy).not.toHaveBeenCalled();
        });

        it('should not call markPersistedInFormValues when completing task form', async () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const markPersistedSpy = jest.spyOn(cleanupService, 'markPersistedInFormValues');
            const formValues = { attachFile: MOCK_PENDING_DOCUMENT };

            await firstValueFrom(service.completeTaskForm('app', 'task-1', 'proc-1', 'form-1', formValues, 'submit', 1));

            expect(markPersistedSpy).not.toHaveBeenCalled();
        });

        it('should not call markPersistedInFormValues when saving task form', async () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const markPersistedSpy = jest.spyOn(cleanupService, 'markPersistedInFormValues');

            await firstValueFrom(service.saveTaskForm('app', 'task-1', 'proc-1', 'form-1', MOCK_TEXT_FORM_VALUES));

            expect(markPersistedSpy).not.toHaveBeenCalled();
        });
    });
});
