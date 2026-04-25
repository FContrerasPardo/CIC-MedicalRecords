/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService, NoopTranslateModule, NotificationService } from '@alfresco/adf-core';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtractionViewComponent } from './extraction-view.component';
import { By } from '@angular/platform-browser';
import { ActionHistoryService, ActionLinearHistoryService } from '../../services/action-history.service';
import { BehaviorSubject, firstValueFrom, isObservable, Observable, of, Subject } from 'rxjs';
import { IdpVerificationService } from '../../services/verification/verification.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { GroupSelectionType, IdpDocument, IdpField } from '../../models/screen-models';
import {
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpContextTaskBaseService,
    IdpFieldDataType,
    IdpFilePageOcrData,
    IdpShortcutService,
    IdpVerificationStatus,
    RejectDocumentDialogComponent,
    RejectReason,
    ResponseFormat,
    ShortcutBrowserDialogComponent,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { selectDocument } from '../../store/selectors/document.selectors';
import { documentState, fieldVerificationRootState } from '../../store/shared-mock-states';
import { IdpImageLoadingService } from '../../services/image/idp-image-loading.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MemoizedSelector } from '@ngrx/store';
import { FieldVerificationContextTaskService } from '../../services/context-task/field-verification-context-task.service';
import { selectActiveField, selectRedactedFields } from '../../store/selectors/document-field.selectors';
import {
    documentTableFeatureSelector,
    fieldVerificationRootFeatureSelector,
    screenFeatureSelector,
} from '../../store/selectors/field-verification-root.selectors';
import { IdpViewerEventTypes, IdpViewerTextData, IdpViewerTextHighlightState } from '@hyland/idp-document-viewer';
import { DOWNLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { IdpFormCloudService } from '../../services/idp-form-cloud.service';
import { MockIdpImageLoadingService } from '../../services/image/idp-image-loading.service.spec';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { MatDialog } from '@angular/material/dialog';
import Split from 'split.js';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { TablePanelMode, TablePanelStateService } from '../../services/table-panel-state/table-panel-state.service';
import { IdpViewerEventBusService } from '../../services/viewer/idp-viewer-event-bus.service';
import { RedactionHighlight, IdpRedactionService } from '../../services/redaction/idp-redaction.service';

class MockIdpContextTaskBaseService {
    taskInfo$ = of({
        taskId: 'task1',
        taskName: 'Task 1',
        taskType: 'Verification',
        issuesToResolve: 1,
        taskLabel: 'EXTRACTION.VERIFICATION.TASK_HEADER.TITLE',
        props: [
            { label: 'EXTRACTION.VERIFICATION.TASK_HEADER.TASK_NAME', value: 'Task 1' },
            { label: 'EXTRACTION.VERIFICATION.TASK_HEADER.CONTENT_TYPE', value: 'Document' },
            { label: 'EXTRACTION.VERIFICATION.TASK_HEADER.TOTAL_PAGES', value: '10' },
        ],
    });
    taskCanSave$ = of(false);
}
const triggerResizeChange$ = new Subject<ResizeObserverEntry[]>();
class ResizeObserver {
    constructor(fn: (changes: ResizeObserverEntry[]) => void) {
        triggerResizeChange$.subscribe((changes) => fn(changes));
    }

    observe() {}
    unobserve() {}
    disconnect() {}
}

jest.mock('split.js', () => {
    return {
        default: jest.fn(() => ({
            destroy: jest.fn(),
            setSizes: jest.fn(),
            getSizes: jest.fn(() => [25, 75]),
        })),
    };
});

describe('ExtractionViewComponent', () => {
    let component: ExtractionViewComponent;
    let fixture: ComponentFixture<ExtractionViewComponent>;
    let idpVerificationService: IdpVerificationService;
    let imageLoadingService: IdpImageLoadingService;
    let ocrWords: IdpFilePageOcrData['words'];
    let store: MockStore;
    let viewerHighlightsSetter: jest.SpyInstance;
    const mockLayout = 'mock layout data 1';

    let mockDocumentSelector: MemoizedSelector<any, IdpDocument>;
    let mockRedactionService: {
        activeFieldRedactionHighlight$: BehaviorSubject<RedactionHighlight | undefined>;
        redactionHighlights$: BehaviorSubject<IdpViewerTextData[]>;
    };

    const mockField1 = {
        id: '1',
        name: 'Field 1',
        value: 'Value 1',
        dataType: IdpFieldDataType.Text,
        verificationStatus: IdpVerificationStatus.ManualValid,
        hasIssue: false,
        confidence: 0.95,
        format: 'string',
        isSelected: false,
        boundingBox: {
            top: 0,
            left: 0,
            width: 100,
            height: 100,
            pageId: documentState.pages[0].id,
        },
    } satisfies IdpField;

    const mockField2 = {
        id: '2',
        name: 'Field 2',
        value: 'Value 2',
        dataType: IdpFieldDataType.Text,
        verificationStatus: IdpVerificationStatus.ManualValid,
        hasIssue: false,
        confidence: 0.9,
        format: 'string',
        isSelected: false,
        boundingBox: {
            top: 200,
            left: 200,
            width: 80,
            height: 80,
            pageId: documentState.pages[0].id,
        },
    } satisfies IdpField;

    const mockTable = {
        id: 'table1',
        name: 'Mock Table',
        columnHeaderNames: ['Column 1', 'Column 2'],
        rows: [
            {
                rowCells: [
                    {
                        value: 'Row 1 Col 1',
                        boundingBox: { top: 20, left: 20, width: 50, height: 20, pageId: documentState.pages[0].id },
                        hasIssue: false,
                        id: 'cell-1-1',
                        dataType: IdpFieldDataType.Text,
                        verificationStatus: IdpVerificationStatus.ManualValid,
                        confidence: 1,
                        format: 'string',
                        isSelected: false,
                        name: 'Row 1 Col 1',
                    },
                    {
                        value: 'Row 1 Col 2',
                        boundingBox: { top: 20, left: 80, width: 50, height: 20, pageId: documentState.pages[0].id },
                        hasIssue: false,
                        id: 'cell-1-2',
                        dataType: IdpFieldDataType.Text,
                        verificationStatus: IdpVerificationStatus.ManualValid,
                        confidence: 1,
                        format: 'string',
                        isSelected: false,
                        name: 'Row 1 Col 2',
                    },
                ],
            },
            {
                rowCells: [
                    {
                        value: 'Row 2 Col 1',
                        boundingBox: { top: 50, left: 20, width: 50, height: 20, pageId: documentState.pages[0].id },
                        hasIssue: false,
                        id: 'cell-2-1',
                        dataType: IdpFieldDataType.Text,
                        verificationStatus: IdpVerificationStatus.ManualValid,
                        confidence: 1,
                        format: 'string',
                        isSelected: false,
                        name: 'Row 2 Col 1',
                    },
                    {
                        value: 'Row 2 Col 2',
                        boundingBox: { top: 50, left: 80, width: 50, height: 20, pageId: documentState.pages[0].id },
                        hasIssue: false,
                        id: 'cell-2-2',
                        dataType: IdpFieldDataType.Text,
                        verificationStatus: IdpVerificationStatus.ManualValid,
                        confidence: 1,
                        format: 'string',
                        isSelected: false,
                        name: 'Row 2 Col 2',
                    },
                ],
            },
        ],
    };

    const mockIdpDocument: IdpDocument = {
        ...documentState,
        hasIssue: true,
        pages: documentState.pages.map((page) => ({
            ...page,
            documentId: documentState.id,
            hasIssue: false,
            isSelected: false,
        })),
    };

    const mockNotificationService = {
        showInfo: () => {},
    };

    const mockViewerEventBus = { emit: jest.fn() };

    const matDialogMock = {
        open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }),
        openDialogs: [] as unknown[],
    };

    beforeAll(() => {
        Object.defineProperty(window, 'ResizeObserver', {
            value: ResizeObserver,
        });
        Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
            value: jest.fn(),
            writable: true,
        });
        Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
            value: jest.fn(),
            writable: true,
        });
    });

    beforeEach(() => {
        mockRedactionService = {
            activeFieldRedactionHighlight$: new BehaviorSubject<RedactionHighlight | undefined>(undefined),
            redactionHighlights$: new BehaviorSubject<IdpViewerTextData[]>([]),
        };

        TestBed.configureTestingModule({
            imports: [ExtractionViewComponent, NoopTranslateModule, NoopAnimationsModule, SatIconModule],
            providers: [
                provideHttpClient(),
                provideMockStore({
                    initialState: {
                        // Make sure you're using the correct feature name
                        fieldVerification: {
                            ...fieldVerificationRootState,
                            // Add the missing state properties
                            tables: {
                                loadState: 'Loaded',
                                ids: [],
                                entities: {},
                            },
                            screen: {
                                status: 'Loaded',
                                taskContext: {
                                    appName: '',
                                    taskId: '',
                                    taskName: '',
                                    rootProcessInstanceId: '',
                                    canClaimTask: false,
                                    canUnclaimTask: false,
                                },
                                taskInputData: undefined,
                                taskDataSynced: false,
                            },
                        },
                    },
                    selectors: [{ selector: fieldVerificationRootFeatureSelector, value: fieldVerificationRootState }],
                }),
                { provide: ActionHistoryService, useClass: ActionLinearHistoryService },
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: IdpContextTaskBaseService, useClass: MockIdpContextTaskBaseService },
                IdpVerificationService,
                { provide: IdpViewerEventBusService, useValue: mockViewerEventBus },
                { provide: IdpRedactionService, useValue: mockRedactionService },
                { provide: IdpImageLoadingService, useFactory: MockIdpImageLoadingService },
                FieldVerificationContextTaskService,
                IdpShortcutService,
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [] },
                {
                    provide: AppConfigService,
                    useValue: {
                        screen: { width: 1920, height: 1080 },
                        get: jasmine.createSpy('get').and.returnValue(''),
                        config: {
                            ecmHost: '',
                            baseShareUrl: '',
                        },
                    },
                },
                {
                    provide: DOWNLOAD_API_TOKEN,
                    useValue: {
                        screen: { width: 1920, height: 1080 },
                        downloadUrl: '',
                    },
                },
                { provide: IdpFormCloudService, useValue: {} },
                {
                    provide: FeaturesServiceToken,
                    useValue: {
                        isOn$: (flag: string) => {
                            if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL) {
                                return of(false);
                            }
                            return of(true);
                        },
                    },
                },
                TablePanelStateService,
            ],
        });

        TestBed.overrideProvider(MatDialog, { useValue: matDialogMock });

        store = TestBed.inject(MockStore);
        store.overrideSelector(selectActiveField, mockField1);
        mockDocumentSelector = store.overrideSelector(selectDocument, mockIdpDocument);
        store.overrideSelector(selectRedactedFields, []);

        // Add imports for these selectors at the top of the file
        store.overrideSelector(documentTableFeatureSelector, {
            loadState: 'Loaded',
            ids: [],
            entities: {},
        });

        store.overrideSelector(screenFeatureSelector, {
            status: 'Loaded',
            taskContext: {
                appName: '',
                taskId: '',
                taskName: '',
                rootProcessInstanceId: '',
                canClaimTask: false,
                canUnclaimTask: false,
            },
            taskInputData: undefined,
            taskDataSynced: false,
        });

        imageLoadingService = TestBed.inject(IdpImageLoadingService);
        idpVerificationService = TestBed.inject(IdpVerificationService);
        ocrWords = [{ text: 'foobar', confidence: 100, boundingBox: { top: 0, left: 0, width: 0, height: 0 } }];
        jest.spyOn(imageLoadingService, 'getPageOcrData$').mockReturnValue(
            of({ fileReference: 'file1', words: ocrWords, layout: mockLayout, status: 'Succeeded' })
        );

        // Need to have the spy in place before the component constructor runs
        // and sets up the observable subscriptions that will call the setter.
        viewerHighlightsSetter = jest.spyOn(ExtractionViewComponent.prototype, 'viewerHighlights', 'set');
        fixture = TestBed.createComponent(ExtractionViewComponent);
        component = fixture.componentInstance;
        (Split as jest.Mock).mockImplementation(() => ({
            destroy: jest.fn(),
            setSizes: jest.fn(),
            getSizes: jest.fn(() => [25, 75]),
        }));
    });

    afterEach(() => {
        // Clean up the spy
        viewerHighlightsSetter?.mockRestore();

        jest.resetAllMocks();
    });

    function getMetadataInput() {
        return fixture.debugElement.query(By.css('.idp-fields-container input'));
    }

    function inputFieldValue(value: string, metadataInput = getMetadataInput()) {
        metadataInput.nativeElement.value = value;
        metadataInput.nativeElement.dispatchEvent(new Event('input'));
    }

    function triggerPageSelected(currentPageIndex: number, totalPages = mockIdpDocument.pages.length) {
        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.PageSelected,
            timestamp: '',
            data: {
                dataSourceRef: [],
                newValue: {
                    pageNavInfo: {
                        currentPageIndex,
                        totalPages,
                    },
                },
            },
        });
    }

    function triggerViewChanged(currentLayer: string) {
        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.ViewChanged,
            timestamp: '',
            data: {
                dataSourceRef: [],
                newValue: {
                    currentLayer,
                },
            },
        });
    }

    it('loadPageOcrFn should return layout if responseFormat is TextLayout', async () => {
        const mockThumbnailData = { blobUrl: 'thumbnail-url', width: 100, height: 100, correctionAngle: 360, skew: 0 };
        jest.spyOn(imageLoadingService, 'getImageDataForPage$').mockReturnValue(of(mockThumbnailData));
        fixture.detectChanges();

        const datasource = await firstValueFrom(component.viewerDatasource$);

        const ocrResult = datasource.loadPageOcrFn('page0', ResponseFormat.TextLayout);
        const observableResult = isObservable(ocrResult) ? ocrResult : of(ocrResult);
        const result = await firstValueFrom(observableResult);
        expect(result).toBe(mockLayout);
    });

    it('should map hasMachineTextLayer to disableRotation on viewer pages', async () => {
        const documentWithMachineTextLayer: IdpDocument = {
            ...mockIdpDocument,
            pages: [
                { ...mockIdpDocument.pages[0], hasMachineTextLayer: true },
                { ...mockIdpDocument.pages[1], hasMachineTextLayer: false },
                ...mockIdpDocument.pages.slice(2),
            ],
        };

        mockDocumentSelector.setResult(documentWithMachineTextLayer);
        store.refreshState();
        fixture.detectChanges();

        const datasource = await firstValueFrom(component.viewerDatasource$);
        const pages = datasource.documents[0]?.pages ?? [];
        expect(pages[0].disableRotation).toBe(true);
        expect(pages[1].disableRotation).toBe(false);
    });

    it('should show the viewer and its container and text layer', () => {
        const viewer = fixture.debugElement.query(By.css('hyland-idp-viewer'));
        expect(viewer).toBeDefined();

        mockDocumentSelector.setResult(mockIdpDocument);
        store.refreshState();
        fixture.detectChanges();

        const viewerContainer = viewer.query(By.css('.idp-viewer-container'));
        expect(viewerContainer).toBeDefined();

        const textLayer = viewer.query(By.css('hyland-idp-viewer-text-layer'));
        expect(textLayer).toBeDefined();
    });

    it('should update viewerHighlights when activeField changes', () => {
        fixture.detectChanges();

        const metadataInput = getMetadataInput();
        metadataInput.nativeElement.focus();

        expect(component.viewerHighlights).toEqual([
            { text: mockField1.value, ...mockField1.boundingBox, highlightState: IdpViewerTextHighlightState.VALID },
        ]);
    });

    it('should update viewerHighlights when typed value autocompletes to OCR word', async () => {
        fixture.detectChanges();

        const document = await firstValueFrom(component.document$);
        const firstPage = document.pages[0];

        inputFieldValue('foo');

        expect(component.viewerHighlights).toEqual([
            { text: mockField1.value, ...mockField1.boundingBox, highlightState: IdpViewerTextHighlightState.VALID },
            { text: ocrWords[0].text, ...ocrWords[0].boundingBox, highlightState: IdpViewerTextHighlightState.PRIMARY, pageId: firstPage.id },
        ]);
    });

    it('should show typeahead highlights for current page only', async () => {
        fixture.detectChanges();

        const document = await firstValueFrom(component.document$);
        inputFieldValue('foo');

        // Expect only one typeahead highlight for the current page
        const typeaheadHighlights = component.viewerHighlights.filter((h) => h.highlightState === IdpViewerTextHighlightState.PRIMARY);
        expect(typeaheadHighlights.length).toBe(1);
        expect(typeaheadHighlights[0].pageId).toBe(document.pages[0].id);
    });

    it('should show active field highlight and switch viewer to field page when field is on different page', async () => {
        // Set up field on page 2 (use actual page ID from mock data)
        const fieldOnPage2 = {
            ...mockField1,
            boundingBox: {
                ...mockField1.boundingBox,
                pageId: mockIdpDocument.pages[1].id,
                pageIndex: 1,
            },
        };
        store.overrideSelector(selectActiveField, fieldOnPage2);
        store.refreshState();

        fixture.detectChanges();
        await fixture.whenStable();

        // Should show active field highlight for the selected field
        expect(component.viewerHighlights).toContainEqual(
            jasmine.objectContaining({ text: fieldOnPage2.value, pageId: fieldOnPage2.boundingBox.pageId })
        );

        // Should not show highlights for other pages
        triggerPageSelected(0);
        fixture.detectChanges();
        await fixture.whenStable();

        // After switching to page 0, active field highlight should still be present (since condition was removed)
        expect(component.viewerHighlights).toContainEqual(
            jasmine.objectContaining({ text: fieldOnPage2.value, pageId: fieldOnPage2.boundingBox.pageId })
        );
    });

    it('should exclude active field highlight when selected field is on different page', async () => {
        // Set up field on page 2 (use actual page ID from mock data)
        const fieldOnPage2 = {
            ...mockField1,
            boundingBox: {
                ...mockField1.boundingBox,
                pageId: mockIdpDocument.pages[1].id,
                pageIndex: 1,
            },
        };
        store.overrideSelector(selectActiveField, fieldOnPage2);
        store.refreshState();

        fixture.detectChanges();
        await fixture.whenStable();

        // Switch to page 0 (field is on page 1)
        triggerPageSelected(0);
        fixture.detectChanges();
        await fixture.whenStable();

        // Should not show active field highlight for page 0
        expect(component.viewerHighlights.some((h) => h.pageId === mockIdpDocument.pages[0].id && h.text === fieldOnPage2.value)).toBe(false);

        // Switch to page 1 (where field is located)
        triggerPageSelected(1);
        fixture.detectChanges();
        await fixture.whenStable();

        // Should show active field highlight for page 1
        expect(component.viewerHighlights).toContainEqual(
            jasmine.objectContaining({ text: fieldOnPage2.value, pageId: fieldOnPage2.boundingBox.pageId })
        );
    });

    it('should not include typeaheadHighlights in viewerHighlights when activeHighlights field value already matches', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        // The setter was called during initialization
        expect(viewerHighlightsSetter).toHaveBeenCalled();

        // Clear initialization calls
        viewerHighlightsSetter.mockClear();

        inputFieldValue(mockField1.value);
        fixture.detectChanges();
        await fixture.whenStable();

        // viewerHighlightsSetter has not been called again, but the component.viewerHighlights still contains the active field.
        expect(viewerHighlightsSetter).toHaveBeenCalledTimes(0);
        expect(component.viewerHighlights).toEqual([
            { text: mockField1.value, ...mockField1.boundingBox, highlightState: IdpViewerTextHighlightState.VALID },
        ]);

        viewerHighlightsSetter.mockClear();
        triggerPageSelected(1);
        expect(viewerHighlightsSetter).toHaveBeenCalledTimes(1);
        expect(viewerHighlightsSetter).toHaveBeenCalledWith([]);

        viewerHighlightsSetter.mockClear();
        triggerPageSelected(0);
        expect(viewerHighlightsSetter).toHaveBeenCalledTimes(1);
        expect(viewerHighlightsSetter).toHaveBeenCalledWith([
            { text: mockField1.value, ...mockField1.boundingBox, highlightState: IdpViewerTextHighlightState.VALID },
        ]);
    });

    it('should update active field value when text is selected in the viewer', async () => {
        jest.spyOn(imageLoadingService, 'getImageDataForPage$').mockReturnValue(of());
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        jest.spyOn(idpVerificationService, 'selectField').mockImplementation();
        fixture.detectChanges();

        const document = await firstValueFrom(component.document$);
        const firstPage = document.pages[0];

        const metadataInput = getMetadataInput();
        metadataInput.nativeElement.focus();

        const selectedText = 'Selected text';
        const textBox = { top: 0, left: 0, width: 100, height: 100, pageId: firstPage.id };

        component.viewerTextSelected.next({
            text: selectedText,
            pageId: firstPage.id,
            rect: {
                actual: textBox,
                scaled: textBox,
                scale: 1,
            },
        });

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(jasmine.objectContaining({ value: selectedText }), textBox);
        expect(idpVerificationService.selectField).toHaveBeenCalledWith(jasmine.objectContaining({ value: selectedText }), true);
    });

    it('should intelligently round fractional bounding boxes', async () => {
        jest.spyOn(imageLoadingService, 'getImageDataForPage$').mockReturnValue(of());
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        jest.spyOn(idpVerificationService, 'selectField').mockImplementation();
        fixture.detectChanges();

        const document = await firstValueFrom(component.document$);
        const firstPage = document.pages[0];

        const metadataInput = getMetadataInput();
        metadataInput.nativeElement.focus();

        const selectedText = 'Selected text';
        const textBox = { top: 9.8, left: 10.1, width: 100.5, height: 99.1, pageId: firstPage.id };

        component.viewerTextSelected.next({
            text: selectedText,
            pageId: firstPage.id,
            rect: {
                actual: textBox,
                scaled: textBox,
                scale: 1,
            },
        });

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(jasmine.objectContaining({ value: selectedText }), {
            ...textBox,
            top: 9,
            left: 10,
            width: 101,
            height: 100,
        });
        expect(idpVerificationService.selectField).toHaveBeenCalledWith(jasmine.objectContaining({ value: selectedText }), true);
    });

    it('should configure loadThumbnailFn to load thumbnail data', async () => {
        const mockThumbnailData = { blobUrl: 'thumbnail-url', width: 100, height: 100, correctionAngle: 360, skew: 0 };
        jest.spyOn(imageLoadingService, 'getImageDataForPage$').mockReturnValue(of(mockThumbnailData));
        fixture.detectChanges();

        const datasource = await firstValueFrom(component.viewerDatasource$);
        const thumbnailData = await firstValueFrom(datasource.loadThumbnailFn('page1') as Observable<string>);

        expect(imageLoadingService.getImageDataForPage$).toHaveBeenCalledWith('page1', true);
        expect(thumbnailData).toBe('thumbnail-url');
    });

    it('should set confidence to 1 when text is selected from OCR', async () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        fixture.detectChanges();

        const document = await firstValueFrom(component.document$);
        const firstPage = document.pages[0];

        const metadataInput = getMetadataInput();
        metadataInput.nativeElement.focus();

        const selectedText = 'Selected text';
        const textBox = { top: 0, left: 0, width: 100, height: 100, pageId: firstPage.id };

        component.viewerTextSelected.next({
            text: selectedText,
            pageId: firstPage.id,
            rect: {
                actual: textBox,
                scaled: textBox,
                scale: 1,
            },
        });

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            jasmine.objectContaining({
                value: selectedText,
                confidence: 1,
            }),
            textBox
        );
    });

    it('should update field with confidence 1 and selected text when field previously had no value', async () => {
        const noValueField = { ...mockField1, value: '', boundingBox: undefined };
        store.overrideSelector(selectActiveField, noValueField);
        store.refreshState();

        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        fixture.detectChanges();

        const document = await firstValueFrom(component.document$);
        const firstPage = document.pages[0];
        const selectedText = 'New OCR Text';
        const textBox = { top: 10, left: 10, width: 50, height: 20, pageId: firstPage.id };

        component.viewerTextSelected.next({
            text: selectedText,
            pageId: firstPage.id,
            rect: {
                actual: textBox,
                scaled: textBox,
                scale: 1,
            },
        });

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            jasmine.objectContaining({
                value: selectedText,
                confidence: 1,
                boundingBox: textBox,
            }),
            textBox
        );
    });

    describe('text layer visibility', () => {
        function getTextLayer() {
            return fixture.debugElement.query(By.css('hyland-idp-viewer-text-layer'));
        }

        it('should show text layer by default', () => {
            fixture.detectChanges();
            expect(component.showTextLayer).toBe(true);
            expect(getTextLayer()).toBeDefined();
        });

        it('should hide text layer when view changes to TextOnly', async () => {
            fixture.detectChanges();
            triggerViewChanged('TextOnly');
            fixture.detectChanges();

            expect(component.showTextLayer).toBe(false);
            await fixture.whenStable();
            fixture.detectChanges();
            expect(getTextLayer()).toBeNull();
        });

        it('should show text layer when view changes from TextOnly to another view', async () => {
            fixture.detectChanges();
            triggerViewChanged('TextOnly');
            fixture.detectChanges();

            expect(component.showTextLayer).toBe(false);
            await fixture.whenStable();
            fixture.detectChanges();
            expect(getTextLayer()).toBeNull();

            triggerViewChanged('Image');
            fixture.detectChanges();

            expect(component.showTextLayer).toBe(true);
            await fixture.whenStable();
            fixture.detectChanges();
            expect(getTextLayer()).toBeDefined();
        });

        it('should not emit multiple times when same layer is selected', async () => {
            fixture.detectChanges();
            const changes: string[] = [];

            // Subscribe only to ViewChanged events after initial setup
            const subscription = component.viewerEvent$.subscribe((event) => {
                changes.push(event.type);
            });

            triggerViewChanged('TextOnly');
            triggerViewChanged('TextOnly');
            triggerViewChanged('TextOnly');

            expect(changes.length).toBe(3);
            expect(changes.every((type) => type === IdpViewerEventTypes.ViewChanged)).toBe(true);
            expect(component.showTextLayer).toBe(false);

            // Wait for all async operations and DOM updates
            await fixture.whenStable();
            fixture.detectChanges();
            expect(getTextLayer()).toBeNull();

            subscription.unsubscribe();
        });
    });

    it('should update page rotation metadata when rotation changes', () => {
        jest.spyOn(idpVerificationService, 'updatePagesRotation').mockImplementation();
        fixture.detectChanges();

        const document = mockIdpDocument;
        const firstPage = document.pages[0];
        const secondPage = document.pages[1];

        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.RotationChanged,
            timestamp: '',
            data: {
                dataSourceRef: [
                    { pageId: firstPage.id, documentId: document.id, viewerRotation: 90 },
                    { pageId: secondPage.id, documentId: document.id, viewerRotation: 90 },
                ],
                newValue: {
                    rotationStep: 90,
                },
            },
        });

        expect(idpVerificationService.updatePagesRotation).toHaveBeenCalledWith(
            [
                { pageId: firstPage.id, documentId: document.id, viewerRotation: 90 },
                { pageId: secondPage.id, documentId: document.id, viewerRotation: 90 },
            ],
            false
        );
    });

    it('should not update page rotation metadata if no pages are provided in rotation event', () => {
        jest.spyOn(idpVerificationService, 'updatePagesRotation').mockImplementation();
        fixture.detectChanges();

        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.RotationChanged,
            timestamp: '',
            data: {
                dataSourceRef: [],
                newValue: {
                    rotationStep: 90,
                },
            },
        });

        expect(idpVerificationService.updatePagesRotation).not.toHaveBeenCalled();
    });

    it('should handle rotation changes for a single page', () => {
        jest.spyOn(idpVerificationService, 'updatePagesRotation').mockImplementation();
        fixture.detectChanges();

        const document = mockIdpDocument;
        const firstPage = document.pages[0];

        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.RotationChanged,
            timestamp: '',
            data: {
                dataSourceRef: [{ pageId: firstPage.id, documentId: document.id, viewerRotation: 180 }],
                newValue: {
                    rotationStep: 180,
                },
            },
        });

        expect(idpVerificationService.updatePagesRotation).toHaveBeenCalledWith(
            [{ pageId: firstPage.id, documentId: document.id, viewerRotation: 180 }],
            false
        );
    });

    it('should show the extraction table in the overlay panel when table is opened', async () => {
        // Ensure component is initialized first
        fixture.detectChanges();
        await fixture.whenStable();

        const tablePanelStateService = TestBed.inject(TablePanelStateService);
        tablePanelStateService.setDefault();
        component.renderTableContent = true;
        fixture.detectChanges();
        await fixture.whenStable();

        // The table panel should be visible
        const tablePanel = fixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-panel"]'));
        expect(tablePanel).toBeTruthy();

        // The extraction table should be inside the panel
        const extractionTable = tablePanel.query(By.css('hyland-idp-extraction-table'));
        expect(extractionTable).toBeTruthy();
    });

    it('should show the extraction table loading shell when the panel opens before table data resolves', async () => {
        // Ensure component is initialized first
        fixture.detectChanges();
        await fixture.whenStable();

        const tablePanelStateService = TestBed.inject(TablePanelStateService);
        tablePanelStateService.minimize();
        component.renderTableContent = false;
        fixture.detectChanges();
        await fixture.whenStable();

        const loadingShell = fixture.debugElement.query(By.css('[data-automation-id="idp-extraction-view-table-loading-shell"]'));
        expect(loadingShell).toBeTruthy();
        const loadingShellEl = loadingShell.nativeElement as HTMLElement;
        expect(loadingShellEl.getAttribute('aria-live')).toBe('polite');
        expect(loadingShellEl.getAttribute('aria-busy')).toBe('true');
        expect(fixture.debugElement.query(By.css('hyland-idp-extraction-table'))).toBeNull();
    });

    it('should not show the extraction table when table panel is hidden', async () => {
        // Ensure component is initialized first
        fixture.detectChanges();
        await fixture.whenStable();

        const tablePanelStateService = TestBed.inject(TablePanelStateService);
        tablePanelStateService.hide();
        fixture.detectChanges();
        await fixture.whenStable();

        // No extraction table or panel should be present
        const extractionTable = fixture.debugElement.query(By.css('hyland-idp-extraction-table'));
        expect(extractionTable).toBeNull();

        const tablePanel = fixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-panel"]'));
        expect(tablePanel).toBeNull();
    });

    it('should always show the vertical splitter between the metadata panel and document viewer', () => {
        fixture.detectChanges();

        // There should be two splitter panes
        const splitterPanes = fixture.debugElement.queryAll(
            By.css('[data-automation-id="idp-view-metadata-splitter-pane"], [data-automation-id="idp-view-viewer-splitter-pane"]')
        );
        expect(splitterPanes.length).toBe(2);

        // The first pane should contain the metadata component
        const metadataPane = splitterPanes[0];
        const metadataComponent = metadataPane.query(By.css('hyland-idp-extraction-metadata-panel'));
        expect(metadataComponent).toBeTruthy();

        // The second pane should contain the extraction table
        const viewerPane = splitterPanes[1];
        const extractionViewer = viewerPane.query(By.css('hyland-idp-viewer'));
        expect(extractionViewer).toBeTruthy();
    });

    it('should subscribe to activeField$ and update viewerHighlights', async () => {
        const field = { ...mockField1 };
        store.overrideSelector(selectActiveField, field);
        store.refreshState();
        fixture.detectChanges();

        expect(component.viewerHighlights).toEqual([{ text: field.value, ...field.boundingBox, highlightState: IdpViewerTextHighlightState.VALID }]);
    });

    it('should call updatePagesRotation when RotationChanged event is emitted with pages', () => {
        jest.spyOn(idpVerificationService, 'updatePagesRotation').mockImplementation();
        fixture.detectChanges();

        const document = mockIdpDocument;
        const firstPage = document.pages[0];
        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.RotationChanged,
            timestamp: '',
            data: {
                dataSourceRef: [{ pageId: firstPage.id, documentId: document.id, viewerRotation: 90 }],
                newValue: { rotationStep: 90 },
            },
        });

        expect(idpVerificationService.updatePagesRotation).toHaveBeenCalledWith(
            [{ pageId: firstPage.id, documentId: document.id, viewerRotation: 90 }],
            false
        );
    });

    it('should not call updatePagesRotation when RotationChanged event is emitted with no pages', () => {
        jest.spyOn(idpVerificationService, 'updatePagesRotation').mockImplementation();
        fixture.detectChanges();

        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.RotationChanged,
            timestamp: '',
            data: {
                dataSourceRef: [],
                newValue: { rotationStep: 90 },
            },
        });

        expect(idpVerificationService.updatePagesRotation).not.toHaveBeenCalled();
    });

    it('should set showTextLayer to false when ViewChanged event is emitted with TextOnly', () => {
        fixture.detectChanges();
        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.ViewChanged,
            timestamp: '',
            data: {
                newValue: { currentLayer: 'TextOnly' },
                dataSourceRef: [],
            },
        });
        expect(component.showTextLayer).toBe(false);
    });

    it('should set showTextLayer to true when ViewChanged event is emitted with non-TextOnly', () => {
        fixture.detectChanges();
        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.ViewChanged,
            timestamp: '',
            data: {
                newValue: { currentLayer: 'Image' },
                dataSourceRef: [],
            },
        });
        expect(component.showTextLayer).toBe(true);
    });

    it('should clear table group selection when individual field is selected', () => {
        const spy = jest.spyOn(component.tableGroupSelection, 'next').mockImplementation();
        fixture.detectChanges();

        // Simulate field selection
        store.overrideSelector(selectActiveField, mockField1);
        store.refreshState();
        fixture.detectChanges();

        // Manually trigger the logic that clears table group selection
        component.onTableGroupSelectionChanged({ type: GroupSelectionType.None });

        expect(spy).toHaveBeenCalledWith({ type: GroupSelectionType.None });

        // There should be only one highlight, which is the active field
        expect(component.viewerHighlights.length).toBe(1);
        expect(component.viewerHighlights[0]).toEqual(
            jasmine.objectContaining({
                text: mockField1.value,
                left: mockField1.boundingBox.left,
                top: mockField1.boundingBox.top,
                width: mockField1.boundingBox.width,
                height: mockField1.boundingBox.height,
                pageId: mockField1.boundingBox.pageId,
            })
        );
    });

    it('should update field and select field when viewerTextSelected emits', () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        jest.spyOn(idpVerificationService, 'selectField').mockImplementation();
        fixture.detectChanges();

        const document = mockIdpDocument;
        const firstPage = document.pages[0];
        const selectedText = 'Selected text';
        const textBox = { top: 0, left: 0, width: 100, height: 100, pageId: firstPage.id };

        component.viewerTextSelected.next({
            text: selectedText,
            pageId: firstPage.id,
            rect: {
                actual: textBox,
                scaled: textBox,
                scale: 1,
            },
        });

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(jasmine.objectContaining({ value: selectedText, confidence: 1 }), textBox);
        expect(idpVerificationService.selectField).toHaveBeenCalledWith(jasmine.objectContaining({ value: selectedText }), true);
    });

    it('should set viewerHighlights to table column highlights when table column is selected', async () => {
        spyOn(idpVerificationService, 'getTableById$').and.returnValue(of(mockTable));

        fixture.detectChanges();
        await fixture.whenStable();

        // Trigger page selection to ensure we're on page 0
        triggerPageSelected(0);
        fixture.detectChanges();
        await fixture.whenStable();

        // Trigger the table group selection for column 0
        component.onTableGroupSelectionChanged({
            type: GroupSelectionType.Column,
            tableId: mockTable.id,
            index: 0,
        });

        fixture.detectChanges();
        await fixture.whenStable();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // There should be two highlights for the first column (one per row)
        expect(component.viewerHighlights.length).toBe(mockTable.rows.length);

        // The highlighted fields should match the first column cells
        expect(component.viewerHighlights).toEqual([
            jasmine.objectContaining({
                text: mockTable.rows[0].rowCells[0].value,
                left: mockTable.rows[0].rowCells[0].boundingBox.left,
                top: mockTable.rows[0].rowCells[0].boundingBox.top,
                width: mockTable.rows[0].rowCells[0].boundingBox.width,
                height: mockTable.rows[0].rowCells[0].boundingBox.height,
                pageId: mockTable.rows[0].rowCells[0].boundingBox.pageId,
            }),
            jasmine.objectContaining({
                text: mockTable.rows[1].rowCells[0].value,
                left: mockTable.rows[1].rowCells[0].boundingBox.left,
                top: mockTable.rows[1].rowCells[0].boundingBox.top,
                width: mockTable.rows[1].rowCells[0].boundingBox.width,
                height: mockTable.rows[1].rowCells[0].boundingBox.height,
                pageId: mockTable.rows[1].rowCells[0].boundingBox.pageId,
            }),
        ]);

        // Should not include the active field highlight
        expect(component.viewerHighlights.some((h) => h.text === mockField1.value)).toBe(false);

        // Should not include any highlights from the second column
        expect(component.viewerHighlights.some((h) => h.text === mockTable.rows[0].rowCells[1].value)).toBe(false);
        expect(component.viewerHighlights.some((h) => h.text === mockTable.rows[1].rowCells[1].value)).toBe(false);
    });

    it('should set viewerHighlights to table row highlights when table row is selected', async () => {
        spyOn(idpVerificationService, 'getTableById$').and.returnValue(of(mockTable));

        fixture.detectChanges();
        await fixture.whenStable();

        // Trigger page selection to ensure we're on page 0
        triggerPageSelected(0);
        fixture.detectChanges();
        await fixture.whenStable();

        // Trigger the table group selection for row 1
        component.onTableGroupSelectionChanged({
            type: GroupSelectionType.Row,
            tableId: mockTable.id,
            index: 1,
        });

        fixture.detectChanges();
        await fixture.whenStable();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // There should be two highlights for the second row (one per column)
        expect(component.viewerHighlights.length).toBe(mockTable.rows[1].rowCells.length);

        // The highlighted fields should match the second row cells
        expect(component.viewerHighlights).toEqual([
            jasmine.objectContaining({
                text: mockTable.rows[1].rowCells[0].value,
                left: mockTable.rows[1].rowCells[0].boundingBox.left,
                top: mockTable.rows[1].rowCells[0].boundingBox.top,
                width: mockTable.rows[1].rowCells[0].boundingBox.width,
                height: mockTable.rows[1].rowCells[0].boundingBox.height,
                pageId: mockTable.rows[1].rowCells[0].boundingBox.pageId,
            }),
            jasmine.objectContaining({
                text: mockTable.rows[1].rowCells[1].value,
                left: mockTable.rows[1].rowCells[1].boundingBox.left,
                top: mockTable.rows[1].rowCells[1].boundingBox.top,
                width: mockTable.rows[1].rowCells[1].boundingBox.width,
                height: mockTable.rows[1].rowCells[1].boundingBox.height,
                pageId: mockTable.rows[1].rowCells[1].boundingBox.pageId,
            }),
        ]);

        // Should not include the active field highlight
        expect(component.viewerHighlights.some((h) => h.text === mockField1.value)).toBe(false);

        // Should not include any highlights from the first row
        expect(component.viewerHighlights.some((h) => h.text === mockTable.rows[0].rowCells[0].value)).toBe(false);
        expect(component.viewerHighlights.some((h) => h.text === mockTable.rows[0].rowCells[1].value)).toBe(false);
    });

    it('should set viewerHighlights to all table cell highlights when entire table is selected', async () => {
        spyOn(idpVerificationService, 'getTableById$').and.returnValue(of(mockTable));

        fixture.detectChanges();
        await fixture.whenStable();

        // Trigger page selection to ensure we're on page 0
        triggerPageSelected(0);
        fixture.detectChanges();
        await fixture.whenStable();

        // Trigger the table group selection for the whole table
        component.onTableGroupSelectionChanged({
            type: GroupSelectionType.Table,
            tableId: mockTable.id,
        });

        fixture.detectChanges();
        await fixture.whenStable();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // There should be highlights for all cells in the table
        const expectedHighlights = [...mockTable.rows[0].rowCells, ...mockTable.rows[1].rowCells].map((cell) =>
            jasmine.objectContaining({
                text: cell.value,
                left: cell.boundingBox.left,
                top: cell.boundingBox.top,
                width: cell.boundingBox.width,
                height: cell.boundingBox.height,
                pageId: cell.boundingBox.pageId,
            })
        );

        expect(component.viewerHighlights.length).toBe(expectedHighlights.length);

        // The highlighted fields should match all table cells
        for (const expected of expectedHighlights) {
            expect(component.viewerHighlights).toContainEqual(expected);
        }

        // Should not include the active field highlight
        expect(component.viewerHighlights.some((h) => h.text === mockField1.value)).toBe(false);
    });

    it('should not include activeFieldHighlight when table group highlights are present', async () => {
        spyOn(idpVerificationService, 'getTableById$').and.returnValue(of(mockTable));
        fixture.detectChanges();

        component.onTableGroupSelectionChanged({
            type: GroupSelectionType.Table,
            tableId: 'table1',
        });

        await fixture.whenStable();

        // Should only contain table group highlights, not active field highlight
        expect(component.viewerHighlights.length).toBeGreaterThan(0);
        expect(component.viewerHighlights.some((h) => h.text === mockField1.value)).toBe(false);
    });

    it('should keep rotation button visible after clicking it twice', async () => {
        mockDocumentSelector.setResult(mockIdpDocument);
        store.refreshState();
        fixture.detectChanges();
        await fixture.whenStable();

        const viewer = fixture.debugElement.query(By.css('hyland-idp-viewer'));
        expect(viewer).toBeTruthy();

        const rotateButton = viewer.query(By.css('[data-automation-id="RotateButton"]'));
        expect(rotateButton).toBeTruthy();
        expect(rotateButton.attributes['disabled']).toBeUndefined();
        const mockRect = { x: 10, y: 10, width: 24, height: 24, top: 10, left: 10, right: 34, bottom: 34 };
        const mockContainerRect = { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 };
        (rotateButton.nativeElement as HTMLElement).getBoundingClientRect = () => mockRect as DOMRect;
        (viewer.nativeElement as HTMLElement).getBoundingClientRect = () => mockContainerRect as DOMRect;

        rotateButton.nativeElement.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(rotateButton).toBeTruthy();

        rotateButton.nativeElement.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(rotateButton).toBeTruthy();

        const btnRect = rotateButton.nativeElement.getBoundingClientRect();
        const containerRect = viewer.nativeElement.getBoundingClientRect();
        expect(btnRect.width > 0 && btnRect.height > 0).toBe(true);
        expect(btnRect.left >= containerRect.left).toBe(true);
        expect(btnRect.top >= containerRect.top).toBe(true);
        expect(btnRect.right <= containerRect.right).toBe(true);
        expect(btnRect.bottom <= containerRect.bottom).toBe(true);
    });

    for (const flagNote of [undefined, 'test rejection note']) {
        it(`should open Flag Document dialog and update flag reason with ${flagNote ? 'defined' : 'undefined'} note`, () => {
            jest.spyOn(idpVerificationService, 'updateRejectReason').mockImplementation();

            const flagReason: RejectReason = { id: '1', value: 'blurry image' };
            const flagResult = { rejectReason: flagReason, rejectNote: flagNote };

            matDialogMock.open.mockReturnValue({ afterClosed: () => of(flagResult) });

            component.onFlagDocument();

            expect(matDialogMock.open).toHaveBeenCalledWith(RejectDocumentDialogComponent, expect.objectContaining({ data: undefined }));
            expect(idpVerificationService.updateRejectReason).toHaveBeenCalledWith(flagReason.id, flagNote, true);
        });
    }

    it('should open Flag Document dialog with existing flag data when document is already flagged', () => {
        jest.spyOn(idpVerificationService, 'updateRejectReason').mockImplementation();

        const existingFlagData = { rejectReasonId: '2', rejectNote: 'existing note' };
        const flagReason: RejectReason = { id: '3', value: 'poor quality' };
        const flagResult = { rejectReason: flagReason, rejectNote: 'updated note' };

        matDialogMock.open.mockReturnValue({ afterClosed: () => of(flagResult) });

        component.onFlagDocument(existingFlagData);

        expect(matDialogMock.open).toHaveBeenCalledWith(RejectDocumentDialogComponent, expect.objectContaining({ data: existingFlagData }));
        expect(idpVerificationService.updateRejectReason).toHaveBeenCalledWith(flagReason.id, flagResult.rejectNote, false);
    });

    it('should not update flag reason when Flag Document dialog is cancelled', () => {
        jest.spyOn(idpVerificationService, 'updateRejectReason').mockImplementation();

        matDialogMock.open.mockReturnValue({ afterClosed: () => of(undefined) });

        component.onFlagDocument();

        expect(matDialogMock.open).toHaveBeenCalled();
        expect(idpVerificationService.updateRejectReason).not.toHaveBeenCalled();
    });

    it('should show flag button with "SET" text when document is not flagged', () => {
        const unflaggedDocument = { ...mockIdpDocument, rejectReasonId: undefined, rejectNote: undefined };
        mockDocumentSelector.setResult(unflaggedDocument);
        store.refreshState();
        fixture.detectChanges();

        const flagButton = fixture.debugElement.query(By.css('[data-automation-id="idp-field-reject-button"]'));
        const unflagButton = fixture.debugElement.query(By.css('[data-automation-id="idp-field-remove-document-flag-button"]'));

        expect(flagButton).toBeTruthy();
        expect(unflagButton).toBeFalsy();
    });

    it('should call onFlagDocument with undefined when clicking flag button on unflagged document', () => {
        const unflaggedDocument = { ...mockIdpDocument, rejectReasonId: undefined, rejectNote: undefined };
        mockDocumentSelector.setResult(unflaggedDocument);
        store.refreshState();
        fixture.detectChanges();

        jest.spyOn(component, 'onFlagDocument').mockImplementation();

        const flagButton = fixture.debugElement.query(By.css('[data-automation-id="idp-field-reject-button"]'));
        flagButton.nativeElement.click();

        expect(component.onFlagDocument).toHaveBeenCalledWith(undefined);
    });

    it('should call onFlagDocument with existing flag data when clicking flag button on flagged document', () => {
        const flaggedDocument = { ...mockIdpDocument, rejectReasonId: '1', rejectNote: 'test note' };
        mockDocumentSelector.setResult(flaggedDocument);
        store.refreshState();
        fixture.detectChanges();

        jest.spyOn(component, 'onFlagDocument').mockImplementation();

        const flagButton = fixture.debugElement.query(By.css('[data-automation-id="idp-field-reject-button"]'));
        flagButton.nativeElement.click();

        expect(component.onFlagDocument).toHaveBeenCalledWith({
            rejectReasonId: '1',
            rejectNote: 'test note',
        });
    });

    it('should call removeDocumentFlag when Flag Document dialog returns shouldRemoveFlag', () => {
        jest.spyOn(idpVerificationService, 'removeDocumentFlag').mockImplementation();

        const flagResult = { shouldRemoveFlag: true };
        matDialogMock.open.mockReturnValue({ afterClosed: () => of(flagResult) });

        component.onFlagDocument();

        expect(matDialogMock.open).toHaveBeenCalledWith(RejectDocumentDialogComponent, expect.objectContaining({ data: undefined }));
        expect(idpVerificationService.removeDocumentFlag).toHaveBeenCalled();
    });

    it('should call removeDocumentFlag when removing flag from previously flagged document', () => {
        jest.spyOn(idpVerificationService, 'removeDocumentFlag').mockImplementation();

        const existingFlagData = { rejectReasonId: '2', rejectNote: 'existing note' };
        const flagResult = { shouldRemoveFlag: true };

        matDialogMock.open.mockReturnValue({ afterClosed: () => of(flagResult) });

        component.onFlagDocument(existingFlagData);

        expect(matDialogMock.open).toHaveBeenCalledWith(RejectDocumentDialogComponent, expect.objectContaining({ data: existingFlagData }));
        expect(idpVerificationService.removeDocumentFlag).toHaveBeenCalled();
    });

    it('should not call updateRejectReason when Flag Document dialog returns shouldRemoveFlag', () => {
        jest.spyOn(idpVerificationService, 'updateRejectReason').mockImplementation();
        jest.spyOn(idpVerificationService, 'removeDocumentFlag').mockImplementation();

        const flagResult = { shouldRemoveFlag: true };
        matDialogMock.open.mockReturnValue({ afterClosed: () => of(flagResult) });

        component.onFlagDocument();

        expect(idpVerificationService.removeDocumentFlag).toHaveBeenCalled();
        expect(idpVerificationService.updateRejectReason).not.toHaveBeenCalled();
    });

    it('should not call removeDocumentFlag when Flag Document dialog is cancelled', () => {
        jest.spyOn(idpVerificationService, 'removeDocumentFlag').mockImplementation();

        matDialogMock.open.mockReturnValue({ afterClosed: () => of(undefined) });

        component.onFlagDocument();

        expect(matDialogMock.open).toHaveBeenCalled();
        expect(idpVerificationService.removeDocumentFlag).not.toHaveBeenCalled();
    });

    it('should not call removeDocumentFlag when dialog result has only rejectReason', () => {
        jest.spyOn(idpVerificationService, 'removeDocumentFlag').mockImplementation();
        jest.spyOn(idpVerificationService, 'updateRejectReason').mockImplementation();

        const flagReason: RejectReason = { id: '1', value: 'blurry image' };
        const flagResult = { rejectReason: flagReason, rejectNote: 'test note' };

        matDialogMock.open.mockReturnValue({ afterClosed: () => of(flagResult) });

        component.onFlagDocument();

        expect(idpVerificationService.updateRejectReason).toHaveBeenCalledWith(flagReason.id, 'test note', true);
        expect(idpVerificationService.removeDocumentFlag).not.toHaveBeenCalled();
    });

    it('should initialize horizontal split after first image is loaded', () => {
        const splitMock = Split as jest.MockedFunction<typeof Split>;
        splitMock.mockClear();

        fixture.detectChanges();

        // Trigger ImageLoaded event to initialize horizontal split
        component.viewerEvent$.emit({
            type: IdpViewerEventTypes.ImageLoaded,
            timestamp: new Date().toISOString(),
            data: {
                dataSourceRef: [{ documentId: 'doc1', pageId: 'page1' }],
            },
        });

        expect(splitMock).toHaveBeenCalledWith(
            ['#split-left', '#split-right'],
            expect.objectContaining({
                sizes: [25, 75],
                direction: 'horizontal',
                gutterSize: 10,
                minSize: 446,
            })
        );
        expect(component.instanceHorizontal).toBeDefined();
    });

    it('should include only the inactive redaction zone highlight, not the active zone highlight, when the active field is redacted and active redaction is on', () => {
        fixture.detectChanges();
        const redactionHighlight: RedactionHighlight = {
            ...mockField1.boundingBox,
            text: mockField1.value,
            highlightState: IdpViewerTextHighlightState.REDACTION_INACTIVE,
            fieldId: mockField1.id,
            isActiveRedaction: true,
        };
        mockRedactionService.activeFieldRedactionHighlight$.next(redactionHighlight);
        mockRedactionService.redactionHighlights$.next([redactionHighlight]);

        expect(component.viewerHighlights.some((h) => h.highlightState === IdpViewerTextHighlightState.VALID)).toBe(false);
        expect(component.viewerHighlights.some((h) => h.highlightState === IdpViewerTextHighlightState.INVALID)).toBe(false);
        expect(component.viewerHighlights.some((h) => h.highlightState === IdpViewerTextHighlightState.REDACTION_INACTIVE)).toBe(true);
    });

    it('should include the inactive redaction zone highlight and the active border highlight, when the active field is redacted and inactive redaction is on', () => {
        fixture.detectChanges();

        const redactionHighlightBoundingBox = {
            left: mockField1.boundingBox.left - 2,
            top: mockField1.boundingBox.top - 2,
            width: mockField1.boundingBox.width + 4,
            height: mockField1.boundingBox.height + 4,
            pageId: mockField1.boundingBox.pageId,
        };
        const redactionHighlight: RedactionHighlight = {
            ...redactionHighlightBoundingBox,
            text: mockField1.value,
            highlightState: IdpViewerTextHighlightState.REDACTION_INACTIVE,
            fieldId: mockField1.id,
            isActiveRedaction: false,
        };
        mockRedactionService.activeFieldRedactionHighlight$.next(redactionHighlight);
        mockRedactionService.redactionHighlights$.next([redactionHighlight]);

        expect(
            component.viewerHighlights.some(
                (h) =>
                    h.highlightState === IdpViewerTextHighlightState.VALID &&
                    h.isBorder &&
                    h.left === redactionHighlightBoundingBox.left &&
                    h.top === redactionHighlightBoundingBox.top &&
                    h.width === redactionHighlightBoundingBox.width &&
                    h.height === redactionHighlightBoundingBox.height
            )
        ).toBe(true);
        expect(component.viewerHighlights.some((h) => h.highlightState === IdpViewerTextHighlightState.INVALID)).toBe(false);
        expect(component.viewerHighlights.some((h) => h.highlightState === IdpViewerTextHighlightState.REDACTION_INACTIVE)).toBe(true);
    });

    it('should include the active border highlight when the view is in text layer and the active field has an active redaction', () => {
        fixture.detectChanges();
        triggerViewChanged('TextOnly');

        const redactionHighlightBoundingBox = {
            left: mockField1.boundingBox.left - 2,
            top: mockField1.boundingBox.top - 2,
            width: mockField1.boundingBox.width + 4,
            height: mockField1.boundingBox.height + 4,
            pageId: mockField1.boundingBox.pageId,
        };
        const redactionHighlight: RedactionHighlight = {
            ...redactionHighlightBoundingBox,
            text: mockField1.value,
            highlightState: IdpViewerTextHighlightState.REDACTION_INACTIVE,
            fieldId: mockField1.id,
            isActiveRedaction: true,
        };
        mockRedactionService.activeFieldRedactionHighlight$.next(redactionHighlight);
        mockRedactionService.redactionHighlights$.next([redactionHighlight]);

        expect(
            component.viewerHighlights.some(
                (h) =>
                    h.highlightState === IdpViewerTextHighlightState.VALID &&
                    h.isBorder &&
                    h.left === redactionHighlightBoundingBox.left &&
                    h.top === redactionHighlightBoundingBox.top &&
                    h.width === redactionHighlightBoundingBox.width &&
                    h.height === redactionHighlightBoundingBox.height
            )
        ).toBe(true);
        expect(component.viewerHighlights.some((h) => h.highlightState === IdpViewerTextHighlightState.REDACTION_INACTIVE)).toBe(true);
    });

    it('should include redaction highlights in viewer highlights', () => {
        fixture.detectChanges();
        mockRedactionService.redactionHighlights$.next([
            { ...mockField2.boundingBox, text: mockField2.value, highlightState: IdpViewerTextHighlightState.REDACTION },
        ]);

        expect(component.viewerHighlights).toContainEqual(
            expect.objectContaining({
                text: mockField2.value,
                highlightState: IdpViewerTextHighlightState.REDACTION,
            })
        );
    });

    describe('table panel state integration', () => {
        let tablePanelStateService: TablePanelStateService;

        beforeEach(() => {
            tablePanelStateService = TestBed.inject(TablePanelStateService);
            fixture.detectChanges();
        });

        it('should use TablePanelStateService for table panel mode', () => {
            expect(component.tablePanelMode()).toBe(tablePanelStateService.mode());
        });

        it('should use TablePanelStateService for table panel height', () => {
            expect(component.tablePanelHeight()).toBe(tablePanelStateService.height());
        });

        it('should use TablePanelStateService for table panel transitioning', () => {
            expect(component.tablePanelTransitioning()).toBe(tablePanelStateService.transitioning());
        });

        it('should call service maximize when maximizeTable is called', () => {
            const maximizeSpy = jest.spyOn(tablePanelStateService, 'maximize');

            component.maximizeTable();

            expect(maximizeSpy).toHaveBeenCalled();
        });

        it('should call service minimize when minimizeTable is called', () => {
            const minimizeSpy = jest.spyOn(tablePanelStateService, 'minimize');

            component.minimizeTable();

            expect(minimizeSpy).toHaveBeenCalled();
        });

        it('should call service hide when closeTable is called', () => {
            const hideSpy = jest.spyOn(tablePanelStateService, 'hide');

            component.closeTable();

            expect(hideSpy).toHaveBeenCalled();
        });

        it('should call service setHeight when resizing', () => {
            const setHeightSpy = jest.spyOn(tablePanelStateService, 'setHeight');
            tablePanelStateService.minimize();

            // Simulate resize by calling the component method that updates height
            const mockEvent = new MouseEvent('mousedown', { clientY: 100 });
            component.onResizeHandleMouseDown(mockEvent);

            const mockMoveEvent = new MouseEvent('mousemove', { clientY: 50 });
            component.onResizeHandleMouseMove(mockMoveEvent);

            expect(setHeightSpy).toHaveBeenCalled();
        });

        it('should disable transition during drag', () => {
            const endTransitionSpy = jest.spyOn(tablePanelStateService, 'endTransition');
            tablePanelStateService.minimize();
            tablePanelStateService.startTransition();

            const mockEvent = new MouseEvent('mousedown', { clientY: 100 });
            component.onResizeHandleMouseDown(mockEvent);

            expect(endTransitionSpy).toHaveBeenCalled();
        });

        it('should call setDefault when setDefaultView is invoked', () => {
            const setDefaultSpy = jest.spyOn(tablePanelStateService, 'setDefault');

            component.setDefaultView();

            expect(setDefaultSpy).toHaveBeenCalled();
        });

        it('should not call setHeight when resizing if #split-top is missing', () => {
            const setHeightSpy = jest.spyOn(tablePanelStateService, 'setHeight');
            const querySpy = jest.spyOn(document, 'querySelector').mockReturnValue(null);
            tablePanelStateService.setDefault();

            component.onResizeHandleMouseDown(new MouseEvent('mousedown', { clientY: 100 }));
            component.onResizeHandleMouseMove(new MouseEvent('mousemove', { clientY: 50 }));

            expect(setHeightSpy).not.toHaveBeenCalled();

            querySpy.mockRestore();
        });

        it('should ignore mousemove when not dragging the resize handle', () => {
            const setHeightSpy = jest.spyOn(tablePanelStateService, 'setHeight');
            tablePanelStateService.setDefault();

            component.onResizeHandleMouseMove(new MouseEvent('mousemove', { clientY: 50 }));

            expect(setHeightSpy).not.toHaveBeenCalled();
        });

        it('should end resize drag on mouseup', () => {
            tablePanelStateService.setDefault();
            component.onResizeHandleMouseDown(new MouseEvent('mousedown', { clientY: 100 }));
            expect((component as unknown as { resizeHandleMouseDown: boolean }).resizeHandleMouseDown).toBe(true);

            component.onResizeHandleMouseUp();

            expect((component as unknown as { resizeHandleMouseDown: boolean }).resizeHandleMouseDown).toBe(false);
        });
    });

    describe('shortcut browser dialog', () => {
        beforeEach(() => {
            matDialogMock.openDialogs = [];
        });

        it('should open ShortcutBrowserDialog when no dialog is already open', () => {
            const openDialogSpy = jest.spyOn(ShortcutBrowserDialogComponent, 'openDialog').mockImplementation();

            component.onShortcutBrowserClick();

            expect(openDialogSpy.mock.calls[0][0]).toBe(matDialogMock);
            expect(openDialogSpy.mock.calls[0][1]).toEqual(expect.objectContaining({ injector: expect.anything() }));
            openDialogSpy.mockRestore();
        });

        it('should not open ShortcutBrowserDialog when another dialog is open', () => {
            matDialogMock.openDialogs = [{}];
            const openDialogSpy = jest.spyOn(ShortcutBrowserDialogComponent, 'openDialog').mockImplementation();

            component.onShortcutBrowserClick();

            expect(openDialogSpy).not.toHaveBeenCalled();
            openDialogSpy.mockRestore();
        });
    });

    describe('ngAfterViewInit table panel visibility', () => {
        let tablePanelStateService: TablePanelStateService;
        let requestAnimationFrameSpy: jest.SpyInstance<number, [FrameRequestCallback]>;

        beforeEach(() => {
            tablePanelStateService = TestBed.inject(TablePanelStateService);
            // Jest/jsdom does not reliably flush nested rAF before assertions; run frames synchronously like the browser paint step.
            requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
                cb(0);
                return 0;
            });
            fixture.detectChanges();
        });

        afterEach(() => {
            requestAnimationFrameSpy.mockRestore();
        });

        it('should open the table pane when a Table field is selected while the panel is hidden', () => {
            const setDefaultSpy = jest.spyOn(tablePanelStateService, 'setDefault');
            tablePanelStateService.hide();
            expect(tablePanelStateService.mode()).toBe(TablePanelMode.Hidden);

            const tableField = {
                ...mockField1,
                id: 'table-entity-1',
                dataType: IdpFieldDataType.Table,
            } as IdpField;
            store.overrideSelector(selectActiveField, tableField);
            store.refreshState();
            fixture.detectChanges();

            expect(setDefaultSpy).toHaveBeenCalled();
            expect(component.renderTableContent).toBe(true);
        });

        it('should open the table pane when a field with tableId is selected while the panel is hidden', () => {
            jest.spyOn(tablePanelStateService, 'setDefault');
            tablePanelStateService.hide();

            const fieldWithTable = {
                ...mockField1,
                dataType: IdpFieldDataType.Text,
                tableId: mockTable.id,
            } as IdpField;
            store.overrideSelector(selectActiveField, fieldWithTable);
            store.refreshState();
            fixture.detectChanges();

            expect(component.renderTableContent).toBe(true);
        });

        it('should close the table pane when a non-table field is selected and the panel is visible', () => {
            const hideSpy = jest.spyOn(tablePanelStateService, 'hide');

            const fieldWithTable = {
                ...mockField1,
                dataType: IdpFieldDataType.Text,
                tableId: mockTable.id,
            } as IdpField;
            store.overrideSelector(selectActiveField, fieldWithTable);
            store.refreshState();
            fixture.detectChanges();

            expect(component.renderTableContent).toBe(true);
            hideSpy.mockClear();

            const plainField = { ...mockField1, tableId: undefined, dataType: IdpFieldDataType.Text } as IdpField;
            store.overrideSelector(selectActiveField, plainField);
            store.refreshState();
            fixture.detectChanges();

            expect(hideSpy).toHaveBeenCalled();
            expect(component.renderTableContent).toBe(false);
        });
    });

    it('should clear table group selection when active field emits a truthy field', () => {
        const nextSpy = jest.spyOn(component.tableGroupSelection, 'next');
        fixture.detectChanges();
        nextSpy.mockClear();

        store.overrideSelector(selectActiveField, { ...mockField1, id: 'another-active-field' } as IdpField);
        store.refreshState();
        fixture.detectChanges();

        expect(nextSpy).toHaveBeenCalledWith({ type: GroupSelectionType.None });
    });

    describe('viewer horizontal scroll proxy', () => {
        let tablePanelStateService: TablePanelStateService;

        function getSplitTop(): HTMLElement {
            const el = fixture.debugElement.query(By.css('#split-top'))?.nativeElement as HTMLElement | undefined;
            if (!el) {
                throw new Error('#split-top not found');
            }
            return el;
        }

        /** Prepends a mock so querySelector('.idp-viewer-container') resolves to it first (matches real viewer structure). */
        function mountViewerScrollMock(splitTop: HTMLElement): HTMLElement {
            const existing = splitTop.querySelector('.idp-viewer-container[data-test-scroll-mock="true"]') as HTMLElement | null;
            if (existing) {
                return existing;
            }
            const el = document.createElement('div');
            el.className = 'idp-viewer-container';
            el.dataset.testScrollMock = 'true';
            splitTop.insertBefore(el, splitTop.firstChild);
            return el;
        }

        function setScrollDimensions(el: HTMLElement, scrollWidth: number, clientWidth: number): void {
            Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
            Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
            let scrollLeft = 0;
            Object.defineProperty(el, 'scrollLeft', {
                configurable: true,
                get: () => scrollLeft,
                set: (v: number) => {
                    scrollLeft = v;
                },
            });
        }

        function callUpdateViewerScrollProxy(): void {
            (component as unknown as { updateViewerScrollProxy(): void }).updateViewerScrollProxy();
        }

        beforeEach(() => {
            tablePanelStateService = TestBed.inject(TablePanelStateService);
            fixture.detectChanges();
        });

        afterEach(() => {
            const splitTop = fixture.debugElement.query(By.css('#split-top'))?.nativeElement as HTMLElement | undefined;
            splitTop?.querySelectorAll('.idp-viewer-container[data-test-scroll-mock="true"]').forEach((n) => n.remove());
        });

        it('should not show proxy when table panel is hidden', () => {
            tablePanelStateService.hide();
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 2000, 100);

            callUpdateViewerScrollProxy();

            expect(component.viewerHScrollProxyVisible()).toBe(false);
            expect(component.viewerHScrollSpacerWidth()).toBe(0);
        });

        it('should not show proxy when table panel is maximized', () => {
            tablePanelStateService.maximize();
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 2000, 100);

            callUpdateViewerScrollProxy();

            expect(component.viewerHScrollProxyVisible()).toBe(false);
        });

        it('should show proxy when horizontal overflow exists and table is in default mode', () => {
            tablePanelStateService.setDefault();
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 2000, 100);

            callUpdateViewerScrollProxy();

            expect(component.viewerHScrollProxyVisible()).toBe(true);
            expect(component.viewerHScrollSpacerWidth()).toBe(2000);
        });

        it('should not show proxy when content fits horizontally', () => {
            tablePanelStateService.setDefault();
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 100, 100);

            callUpdateViewerScrollProxy();

            expect(component.viewerHScrollProxyVisible()).toBe(false);
        });

        it('should render proxy strip in the template when visible', () => {
            tablePanelStateService.setDefault();
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 2000, 100);

            callUpdateViewerScrollProxy();
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('[data-automation-id="idp-extraction-view-viewer-hscroll-proxy"]'))).toBeTruthy();
        });

        it('should apply bottom offset to table panel when proxy is visible', () => {
            tablePanelStateService.setDefault();
            component.renderTableContent = true;
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 2000, 100);

            callUpdateViewerScrollProxy();
            fixture.detectChanges();

            const tablePanel = fixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-panel"]'));
            expect(tablePanel).toBeTruthy();
            expect(tablePanel.nativeElement.style.bottom).toBe(`${component.viewerHScrollStripPx}px`);
        });

        it('onViewerHScrollProxyScroll should sync proxy scrollLeft to viewer scroll element', () => {
            tablePanelStateService.setDefault();
            const splitTop = getSplitTop();
            const scrollEl = mountViewerScrollMock(splitTop);
            setScrollDimensions(scrollEl, 2000, 100);

            callUpdateViewerScrollProxy();

            const comp = component as unknown as {
                viewerScrollEl: HTMLElement | null;
                viewerHScrollProxyRef?: { nativeElement: HTMLElement };
            };
            comp.viewerScrollEl = scrollEl;
            const proxyEl = document.createElement('div');
            Object.defineProperty(proxyEl, 'scrollLeft', { value: 88, writable: true, configurable: true });
            comp.viewerHScrollProxyRef = { nativeElement: proxyEl };

            component.onViewerHScrollProxyScroll();

            expect(scrollEl.scrollLeft).toBe(88);
        });
    });
});
