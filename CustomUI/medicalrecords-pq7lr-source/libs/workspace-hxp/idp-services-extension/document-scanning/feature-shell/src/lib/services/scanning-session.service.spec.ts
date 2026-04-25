/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { findPageById, findPageByIndex, SCANNING_SESSION_CONTEXT, ScanningSession } from './scanning-session.service';
import { ScanningHubClient } from './scanning-hub-client.service';
import { HxpUploadService, FileUploadCompleteEvent } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { signal } from '@angular/core';
import { ObservableInput, of, ReplaySubject, Subject, Subscription } from 'rxjs';
import { StartProcessCloudService } from '@alfresco/adf-process-services-cloud';
import { FileModel, FileUploadStatus } from '@hxp/shared-hxp/services';

type UnwrapObservable<T> = T extends ObservableInput<infer U> ? U : never;
type UnwrapReturnType<T extends (...args: any) => any> = UnwrapObservable<ReturnType<T>>;

function mockHxpUploadService() {
    const fileQueue = new Array<FileModel>();
    const fileUploadSubject = new Subject<UnwrapObservable<HxpUploadService['fileUpload']>>();
    return {
        fileUpload: fileUploadSubject.pipe(),
        addToQueue: jest.fn((...fileModels) => {
            fileQueue.push(...fileModels);
            return fileModels;
        }),
        uploadFilesInTheQueue: jest.fn(() => {
            for (const file of fileQueue) {
                const data = { id: crypto.randomUUID() };
                file.data = data;
                file.status = FileUploadStatus.Complete;
                fileUploadSubject.next(new FileUploadCompleteEvent(file, undefined, { id: crypto.randomUUID() }));
            }
            fileQueue.length = 0;
        }),
    } satisfies Partial<HxpUploadService>;
}

function createTestContext() {
    const scanSubject = new Subject<UnwrapReturnType<ScanningHubClient['scan$']>>();
    const scannersSubject = new ReplaySubject<UnwrapReturnType<ScanningHubClient['findScanners$']>>(1);
    const showUserInterfaceSubject = new Subject<UnwrapReturnType<ScanningHubClient['showUserInterface$']>>();
    return {
        scanSubject,
        scannersSubject,
        showUserInterfaceSubject,
        scanningClientMock: {
            state$: of({ status: 'connected' }),
            scan$: jest.fn(() => scanSubject),
            findScanners$: jest.fn(() => scannersSubject),
            showUserInterface$: jest.fn(() => showUserInterfaceSubject),
        } satisfies Partial<ScanningHubClient>,
        uploadServiceMock: mockHxpUploadService(),
        documentServiceMock: {
            createDocument: jest.fn((props) => of({ sys_id: crypto.randomUUID(), ...props })),
        } satisfies Partial<DocumentService>,
        startProcessMock: {
            startProcess: jest.fn((appName, payload) => of({ appName, ...payload })),
        } satisfies Partial<StartProcessCloudService>
    };
}

const fakeTwainScanner = { name: 'Fake Scanner', protocol: 'Twain' };

const fakeScannedFile = {
    data: new Blob(),
    details: {
        format: {
            mimeType: 'image/jpeg',
            fileExtensions: ['jpeg'],
        }
    }
};

describe(ScanningSession.name, () => {
    beforeAll(async () => {
        globalThis.crypto ??= {} as any;
        if (!globalThis.crypto.randomUUID) {
            const { randomUUID } = await import('node:crypto');
            globalThis.crypto.randomUUID ??= randomUUID;
        }
        globalThis.URL ??= {} as any;
        globalThis.URL.createObjectURL ??= () => 'blob:mock-url';
        globalThis.URL.revokeObjectURL ??= () => {};
    });

    let scanSession: ScanningSession;
    let testContext: ReturnType<typeof createTestContext>;

    beforeEach(() => {
        testContext = createTestContext();

        TestBed.configureTestingModule({
            providers: [
                ScanningSession,
                {
                    provide: SCANNING_SESSION_CONTEXT,
                    useValue: signal({ appName: '', targetFolder: '', processDefinitionId: '' }),
                },
                { provide: ScanningHubClient, useValue: testContext.scanningClientMock },
                { provide: HxpUploadService, useValue: testContext.uploadServiceMock },
                { provide: DocumentService, useValue: testContext.documentServiceMock },
                { provide: StartProcessCloudService, useValue: testContext.startProcessMock },
            ],
        });

        scanSession = TestBed.inject(ScanningSession);
    });

    it('should initially be idle with an empty batch and no scanner', () => {
        const batch = scanSession.batch();
        expect(batch).toEqual({ documents: [] });
        expect(scanSession.selectedScanner()).toBeUndefined();
        expect(scanSession.isBusy()).toBe(false);
        expect(scanSession.isConfiguring()).toBe(false);
        expect(scanSession.isScanning()).toBe(false);
    });

    describe('scanners$', () => {
        it('should find scanners and set default selected scanner', (done) => {
            const testScanners = [fakeTwainScanner];
            let emissionIndex = 0;
            scanSession.scanners$.subscribe({
                next: (scanners) => {
                    if (emissionIndex === 0) {
                        expect(scanners).toEqual([]);
                        expect(scanSession.selectedScanner()).toBeUndefined();
                    } else {
                        expect(scanners).toEqual(testScanners);
                        expect(scanSession.selectedScanner()).toEqual(testScanners[0]);
                        done();
                    }
                    emissionIndex++;
                },
            });
            testContext.scannersSubject.next(testScanners);
        });
    });

    describe('configureScanner', () => {
        it('should throw for an undefined scanner', () => {
            expect(() => scanSession.configureScanner(undefined)).toThrow();
        });

        it('should throw if already busy', () => {
            scanSession.configureScanner(fakeTwainScanner);
            expect(() => scanSession.configureScanner(fakeTwainScanner)).toThrow();
        });

        it('should be busy while configuring a scanner', async () => {
            const subscription = scanSession.configureScanner(fakeTwainScanner);
            expect(scanSession.isBusy()).toBe(true);
            expect(scanSession.isConfiguring()).toBe(true);
            expect(scanSession.isScanning()).toBe(false);
            expect(scanSession.canUploadBatch()).toBe(false);

            testContext.showUserInterfaceSubject.complete();
            await whenFinalized(subscription);

            expect(scanSession.isBusy()).toBe(false);
            expect(scanSession.isConfiguring()).toBe(false);
            expect(scanSession.isScanning()).toBe(false);
        });
    });

    describe('startScan', () => {
        it('should throw for an undefined scanner', () => {
            expect(() => scanSession.startScan(undefined)).toThrow();
        });

        it('should throw if already busy', () => {
            scanSession.startScan(fakeTwainScanner);
            expect(() => scanSession.startScan(fakeTwainScanner)).toThrow();
        });

        it('should be busy while scanning', async () => {
            const subscription = scanSession.startScan(fakeTwainScanner);
            expect(scanSession.isBusy()).toBe(true);
            expect(scanSession.isConfiguring()).toBe(false);
            expect(scanSession.isScanning()).toBe(true);
            expect(scanSession.canUploadBatch()).toBe(false);

            testContext.scanSubject.complete();
            await whenFinalized(subscription);

            expect(scanSession.isBusy()).toBe(false);
            expect(scanSession.isConfiguring()).toBe(false);
            expect(scanSession.isScanning()).toBe(false);
        });

        it('should create a batch folder and document', async () => {
            const batchBeforeScan = scanSession.batch();
            expect(batchBeforeScan).toEqual({ documents: [] });

            const subscription = scanSession.startScan({ name: 'Fake Scanner', protocol: 'Twain' });
            testContext.scanSubject.next({ file: fakeScannedFile });
            testContext.scanSubject.complete();
            await whenFinalized(subscription);

            expect(testContext.documentServiceMock.createDocument).toHaveBeenCalledTimes(2);
            expect(testContext.uploadServiceMock.addToQueue).toHaveBeenCalledTimes(1);
            expect(testContext.uploadServiceMock.uploadFilesInTheQueue).toHaveBeenCalledTimes(1);
            const batchAfterScan = scanSession.batch();
            expect(batchAfterScan).toEqual({
                documents: [{
                    id: jasmine.any(String),
                    pages: [{
                        id: jasmine.any(String),
                        file: jasmine.anything(),
                        url: jasmine.any(String),
                        fileDocument: jasmine.anything(),
                    }],
                }],
            });
            const scannedPageId = batchAfterScan.documents[0].pages[0].id;
            expect([...scanSession.selectedPageIds()]).toEqual([scannedPageId]);
            expect(scanSession.activePageId()).toBe(scannedPageId);
        });

        it('should keep existing selected page when new pages are scanned', async () => {
            const firstSelection = new Set(['manually-selected-page']);
            scanSession.selectedPageIds.set(firstSelection);

            const subscription = scanSession.startScan(fakeTwainScanner);
            testContext.scanSubject.next({ file: fakeScannedFile });
            testContext.scanSubject.complete();
            await whenFinalized(subscription);

            expect(scanSession.selectedPageIds()).toBe(firstSelection);
            expect(scanSession.activePageId()).toBe('manually-selected-page');
        });
    });

    describe('uploadBatch', () => {
        it('should throw if nothing to upload', () => {
            expect(() => scanSession.uploadBatch()).toThrow();
        });

        it('should start process', async () => {
            expect(scanSession.canUploadBatch()).toBe(false);

            const scanSubscription = scanSession.startScan(fakeTwainScanner);
            testContext.scanSubject.next({ file: fakeScannedFile });
            testContext.scanSubject.complete();
            await whenFinalized(scanSubscription);

            expect(scanSession.canUploadBatch()).toBe(true);
            const uploadSubscription = scanSession.uploadBatch();
            expect(scanSession.isBusy()).toBe(true);

            await whenFinalized(uploadSubscription);
            expect(testContext.startProcessMock.startProcess).toHaveBeenCalledTimes(1);
            expect(scanSession.isBusy()).toBe(false);
        });
    });

    describe(`${findPageById.name} ${findPageByIndex.name}`, () => {
        const batch = {
            documents: [
                {
                    id: 'doc-1',
                    pages: [
                        { id: 'page-1a' },
                        { id: 'page-1b' },
                    ],
                },
                {
                    id: 'doc-2',
                    pages: [
                        { id: 'page-2a' },
                    ],
                },
            ],
        } as any;

        it('should find page by id across all documents', () => {
            expect(findPageById(batch, 'page-2a')?.id).toBe('page-2a');
            expect(findPageById(batch, 'missing-page')).toBeUndefined();
        });

        it('should find page by flattened page index across documents', () => {
            expect(findPageByIndex(batch, 0)?.id).toBe('page-1a');
            expect(findPageByIndex(batch, 1)?.id).toBe('page-1b');
            expect(findPageByIndex(batch, 2)?.id).toBe('page-2a');
            expect(findPageByIndex(batch, 3)).toBeUndefined();
        });
    });
});

function whenFinalized(subscription: Subscription) {
    return new Promise<void>((resolve) => subscription.add(resolve));
}
