/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CardViewItem, CardViewTextItemModel, CardViewUpdateService, NoopTranslateModule } from '@alfresco/adf-core';
import { DOCUMENT_PROPERTIES_SERVICE, DocumentService, HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerHarness } from '@angular/material/progress-spinner/testing';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import { By } from '@angular/platform-browser';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { HxpMetadataSidebarAdditionalInfoComponent } from '../metadata-sidebar-additional-info/hxp-metadata-sidebar-additional-info.component';
import { MetadataSidebarContentComponent } from '../metadata-sidebar-content/metadata-sidebar-content.component';
import { HxpMetadataSidebarComponent } from './hxp-metadata-sidebar.component';
import { MetadataSidebarService } from './hxp-metadata-sidebar.service';
import { HxpMetadataCacheService } from './hxp-metadata-cache.service';
import { DialogHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('HxpMetadataSidebarComponent', () => {
    let component: HxpMetadataSidebarComponent;
    let fixture: ComponentFixture<HxpMetadataSidebarComponent>;

    const createMockItem = (props: any) => {
        const item = new CardViewTextItemModel({
            ...props,
            displayValue: props.displayValue ?? props.value,
        });
        return item as unknown as CardViewItem;
    };

    // return a new instance each time to avoid reference issues in tests
    const editableItems = () => [
        createMockItem({
            key: 'sys_title',
            label: 'Title',
            value: 'File 1',
            editable: true,
        }),
    ];

    // same instance can be used because the test should not modify it,
    // if it does, the test should fail
    const nonEditableItems: CardViewItem[] = [
        createMockItem({
            key: 'sys_created',
            label: 'Created',
            value: '2023-01-01',
            editable: false,
        }),
    ];

    const editableProperties$ = new BehaviorSubject<CardViewItem[]>([]);
    const customProperties$ = new BehaviorSubject<CardViewItem[]>([]);
    const nonEditableSystemProperties$ = new BehaviorSubject<CardViewItem[]>([]);

    const mockMetadataSidebarService = {
        getEditableSystemPropertiesFromDocument: jest.fn().mockReturnValue(editableProperties$.asObservable()),
        getNonEditableSystemPropertiesFromDocument: jest.fn().mockReturnValue(nonEditableSystemProperties$.asObservable()),
        getCustomProperties: jest.fn().mockReturnValue(customProperties$.asObservable()),
    };

    const documentUpdatedSubject = new Subject<{ document: any }>();

    let mockDocumentService: any;

    const openSnackBarFn = jest.fn();

    const mockNotificationService = {
        openSnackBar: openSnackBarFn,
        showInfo: openSnackBarFn,
        showSuccess: openSnackBarFn,
        showError: openSnackBarFn,
    };

    let cardViewUpdateService: CardViewUpdateService;

    const mockDocumentPropertiesService = {
        isRequired: jest.fn().mockImplementation((property) => property === 'sys_title'),
        getRequiredProperties: jest.fn().mockReturnValue(['sys_title']),
        propertyType: jest.fn().mockReturnValue(undefined),
        extractSchemas: jest.fn().mockImplementation((contentType) => {
            if (contentType === 'customType') {
                customProperties$.next([
                    createMockItem({
                        key: 'custom_property',
                        label: 'Custom Field',
                        value: 'custom-value',
                    }),
                    createMockItem({
                        key: 'common_property',
                        label: 'Original Common Field',
                        value: 'common-value',
                    }),
                ]);
                return of([{ schema: ' customType', fields: { custom_property: '', common_property: '' } }]);
            } else if (contentType === 'anotherCustomType') {
                customProperties$.next([
                    createMockItem({
                        key: 'another_custom_property',
                        label: 'Another Custom Field',
                        value: 'another-custom-value',
                    }),
                    createMockItem({
                        key: 'common_property',
                        label: 'Another Common Field',
                        value: 'another-common-value',
                    }),
                ]);
                return of([{ schema: ' anotherCustomType', fields: { another_custom_property: '', common_property: '' } }]);
            }
            // SysFile
            customProperties$.next([]);
            return of([]);
        }),
    };

    beforeEach(async () => {
        mockDocumentService = {
            documentUpdated$: documentUpdatedSubject.asObservable(),
            getDocumentById: jest.fn().mockReturnValue(of({ ...jestMocks.fileDocument })),
            updateDocument: jest.fn().mockReturnValue(of({ ...jestMocks.fileDocument, sys_title: 'New Title' })),
        };
        await TestBed.configureTestingModule({
            imports: [HxpMetadataSidebarComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                { provide: DOCUMENT_PROPERTIES_SERVICE, useValue: mockDocumentPropertiesService },
                { provide: DocumentService, useValue: mockDocumentService },
                { provide: HxpNotificationService, useValue: mockNotificationService },
                { provide: MetadataSidebarService, useValue: mockMetadataSidebarService },
            ],
        }).compileComponents();
        cardViewUpdateService = TestBed.inject(CardViewUpdateService);
        fixture = TestBed.createComponent(HxpMetadataSidebarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    const simulateDocumentChange = (previousDocument?: Document) => {
        component.ngOnChanges({
            document: new SimpleChange(previousDocument, component.document, !previousDocument),
        });
    };

    it('should load properties when document input is set', () => {
        component.document = jestMocks.fileDocument;
        simulateDocumentChange();

        expect(mockDocumentService.getDocumentById).toHaveBeenCalledWith(jestMocks.fileDocument.sys_id);
        expect(mockMetadataSidebarService.getEditableSystemPropertiesFromDocument).toHaveBeenCalled();
        expect(mockMetadataSidebarService.getNonEditableSystemPropertiesFromDocument).toHaveBeenCalled();
        expect(mockMetadataSidebarService.getCustomProperties).toHaveBeenCalled();
        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith(jestMocks.fileDocument.sys_primaryType, {
            includeCustomProperties: true,
        });

        fixture.detectChanges();

        const contentElement = fixture.debugElement.query(By.css('hxp-metadata-sidebar-content'));

        expect(contentElement).toBeTruthy();
    });

    it('should reload properties after edit on documentUpdated$ for same document id', () => {
        component.document = jestMocks.fileDocument;
        simulateDocumentChange();

        documentUpdatedSubject.next({ document: jestMocks.fileDocument });

        expect(mockMetadataSidebarService.getEditableSystemPropertiesFromDocument).toHaveBeenCalled();
        expect(mockMetadataSidebarService.getNonEditableSystemPropertiesFromDocument).toHaveBeenCalled();
        expect(mockMetadataSidebarService.getCustomProperties).toHaveBeenCalled();
        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith(jestMocks.fileDocument.sys_primaryType, {
            includeCustomProperties: true,
        });
    });

    it('should activate edit mode on edit button click', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        let editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));

        expect(editButton).toBeTruthy();

        editButton.nativeElement.click();
        fixture.detectChanges();

        const saveButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-save-button"]'));
        editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));

        expect(saveButton).toBeTruthy();
        expect(editButton).toBeFalsy();
    });

    it('should exit edit mode on cancel button click', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        let editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));

        expect(editButton).toBeTruthy();

        editButton.nativeElement.click();
        fixture.detectChanges();

        let cancelButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-cancel-button"]'));

        expect(cancelButton).toBeTruthy();

        cancelButton.nativeElement.click();
        fixture.detectChanges();

        editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        cancelButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-cancel-button"]'));

        expect(editButton).toBeTruthy();
        expect(cancelButton).toBeFalsy();
    });

    it('should save properties on save button click', async () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));

        expect(await saveButton.isDisabled()).toBe(false);

        await saveButton.click();

        expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(jestMocks.fileDocument.sys_id, { sys_title: 'New Title' });
    });

    it('should emit closePropertySidebar event when close button clicked', () => {
        jest.spyOn(component.closePropertySidebar, 'emit');
        const btn = fixture.debugElement.query(By.css('.hxp-metadata-sidebar-close-button'));

        expect(btn).toBeTruthy();

        btn.nativeElement.click();

        expect(component.closePropertySidebar.emit).toHaveBeenCalled();
    });

    it('shows Edit button when editable', () => {
        component.editable = false;
        fixture.detectChanges();

        let editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));

        expect(editButton).toBeFalsy();

        component.editable = true;
        fixture.detectChanges();

        editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));

        expect(editButton).toBeTruthy();
    });

    it('shows Save disabled until modified', async () => {
        editableProperties$.next(editableItems());
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));

        expect(await saveButton.isDisabled()).toBe(true);

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });

        expect(await saveButton.isDisabled()).toBe(false);
    });

    it('should show spinner when propertyLoading is true', async () => {
        // Use a Subject to mock async call to BE to load document
        const getDocumentByIdSubject = new Subject<any>();
        mockDocumentService.getDocumentById.mockReturnValue(getDocumentByIdSubject.asObservable());

        component.document = jestMocks.fileDocument;
        simulateDocumentChange();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        let spinner = await loader.getHarnessOrNull(MatProgressSpinnerHarness);

        expect(spinner).toBeTruthy();

        getDocumentByIdSubject.next(jestMocks.fileDocument);
        getDocumentByIdSubject.complete();
        spinner = await loader.getHarnessOrNull(MatProgressSpinnerHarness);

        expect(spinner).toBeNull();
    });

    it('renders Properties tab when custom properties exist', async () => {
        component.document = jestMocks.fileDocument;
        customProperties$.next([]);
        simulateDocumentChange();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const tabGroups = await loader.getAllHarnesses(MatTabGroupHarness);
        let tabs = await tabGroups[0].getTabs();

        expect(tabs.length).toBe(0);

        customProperties$.next([
            createMockItem({
                key: 'c1',
                label: 'Custom One',
                value: 'val',
            }),
        ]);
        tabs = await tabGroups[0].getTabs();

        expect(tabs.length).toBe(1);

        await tabs[0].select();
        const tabLabels = await Promise.all(tabs.map((tab) => tab.getLabel()));

        expect(tabLabels).toContain('DOCUMENT.METADATA.TABS.PROPERTIES');
    });

    it('should make sidebar non-editable when update is in progress', async () => {
        editableProperties$.next(editableItems());
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });
        fixture.detectChanges();

        let sidebarContent = fixture.debugElement.query(By.directive(MetadataSidebarContentComponent));

        expect(sidebarContent.componentInstance.editable()).toBe(true);

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));
        await saveButton.click();

        sidebarContent = fixture.debugElement.query(By.directive(MetadataSidebarContentComponent));

        expect(sidebarContent.componentInstance.editable()).toBe(false);
    });

    it('should disable update and cancel buttons when update is in progress', async () => {
        editableProperties$.next(editableItems());
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });

        const updatePropertySubject = new Subject<any>();
        mockDocumentService.updateDocument.mockReturnValue(updatePropertySubject.asObservable());

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));
        const cancelButton = await loader.getHarness(
            MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-cancel-button"]' })
        );
        await saveButton.click();

        expect(await saveButton.isDisabled()).toBe(true);
        expect(await cancelButton.isDisabled()).toBe(true);
    });

    it('should disable save button when change is reverted to original value', async () => {
        editableProperties$.next(editableItems());
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });
        fixture.detectChanges();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));

        expect(await saveButton.isDisabled()).toBe(false);

        // Revert value back to 'File 1'
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'File 1' } as any,
            changed: { sys_title: 'File 1' },
        });
        fixture.detectChanges();

        expect(await saveButton.isDisabled()).toBe(true);
    });

    it('should keep save button enabled when only one of multiple changes is reverted', async () => {
        editableProperties$.next(editableItems());
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });

        // Change Content Type (simulating a second change)
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'customType' } as any,
            changed: { sys_primaryType: 'customType' },
        });
        fixture.detectChanges();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));

        expect(await saveButton.isDisabled()).toBe(false);

        // Revert Title only
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'File 1' } as any,
            changed: { sys_title: 'File 1' },
        });
        fixture.detectChanges();

        expect(await saveButton.isDisabled()).toBe(false);
    });

    it('should render additional-info component when non-editable properties exist', async () => {
        component.document = jestMocks.fileDocument;
        simulateDocumentChange();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const tabGroups = await loader.getAllHarnesses(MatTabGroupHarness);

        let tabs = await tabGroups[0].getTabs();

        expect(tabs.length).toBe(0);

        const createdItem = createMockItem({
            key: 'sys_created',
            label: 'Created',
            value: '2025-10-15',
            editable: false,
        });

        const modifiedItem = createMockItem({
            key: 'sys_modified',
            label: 'Last Modified',
            value: '2025-10-16',
            editable: false,
        });

        nonEditableSystemProperties$.next([createdItem, modifiedItem]);
        tabs = await tabGroups[0].getTabs();

        expect(tabs.length).toBe(1);

        const tabLabels = await Promise.all(tabs.map((tab) => tab.getLabel()));

        expect(tabLabels).toContain('DOCUMENT.METADATA.TABS.ADDITIONAL_INFORMATION');

        await tabs[0].select();
        fixture.detectChanges();

        const sidebarContentElements = fixture.debugElement.queryAll(By.directive(HxpMetadataSidebarAdditionalInfoComponent));

        expect(sidebarContentElements.length).toBeGreaterThan(0);

        const additionalInfoComponent = sidebarContentElements[0].componentInstance as HxpMetadataSidebarAdditionalInfoComponent;

        expect(additionalInfoComponent).toBeTruthy();
    });

    it('should prevent multiple reloads after property update for same document id', () => {
        component.document = jestMocks.fileDocument;
        simulateDocumentChange();
        fixture.detectChanges();

        jest.clearAllMocks();
        documentUpdatedSubject.next({ document: jestMocks.fileDocument });
        fixture.detectChanges();

        expect(mockMetadataSidebarService.getEditableSystemPropertiesFromDocument).toHaveBeenCalledTimes(1);
        expect(mockMetadataSidebarService.getNonEditableSystemPropertiesFromDocument).toHaveBeenCalledTimes(1);
        expect(mockMetadataSidebarService.getCustomProperties).toHaveBeenCalledTimes(1);
        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledTimes(1);
    });

    it('should show cancel dialog when cancel button is clicked with pending changes', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        fixture.detectChanges();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });
        fixture.detectChanges();

        const dialog = TestBed.inject(MatDialog);
        const openDialogSpy = jest.spyOn(dialog, 'open');

        const cancelButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-cancel-button"]'));
        cancelButton.nativeElement.click();

        expect(openDialogSpy).toHaveBeenCalled();
    });

    it('should show cancel dialog when close is clicked while update is in progress', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });

        const dialog = TestBed.inject(MatDialog);
        const openDialogSpy = jest.spyOn(dialog, 'open');

        const closeButton = fixture.debugElement.query(By.css('.hxp-metadata-sidebar-close-button'));
        closeButton.nativeElement.click();

        expect(openDialogSpy).toHaveBeenCalled();
    });

    it('should NOT show cancel dialog when close is clicked after update is complete', async () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'New Title' } as any,
            changed: { sys_title: 'New Title' },
        });

        const dialog = TestBed.inject(MatDialog);
        const openDialogSpy = jest.spyOn(dialog, 'open');

        const updatePropertySubject = new Subject<any>();
        mockDocumentService.updateDocument.mockReturnValue(updatePropertySubject.asObservable());

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));
        await saveButton.click();

        updatePropertySubject.next({ ...jestMocks.fileDocument, sys_title: 'New Title' });
        updatePropertySubject.complete();

        const closeButton = fixture.debugElement.query(By.css('.hxp-metadata-sidebar-close-button'));
        closeButton.nativeElement.click();

        expect(openDialogSpy).not.toHaveBeenCalled();
    });

    it('should update Other Properties panel when switching content type', async () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'customType' } as any,
            changed: { sys_primaryType: 'customType' },
        });
        nonEditableSystemProperties$.next(nonEditableItems);

        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith('customType', { includeCustomProperties: true });

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const tabGroups = await loader.getAllHarnesses(MatTabGroupHarness);
        const tabs = await tabGroups[0].getTabs();

        expect(tabs.length).toBe(2);

        await tabs[0].select();

        expect(await tabs[0].getTextContent()).toContain('Custom Field');

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'anotherCustomType' } as any,
            changed: { sys_primaryType: 'anotherCustomType' },
        });

        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith('anotherCustomType', { includeCustomProperties: true });
        expect(await tabs[0].getTextContent()).toContain('Another Custom Field');
    });

    it('should restore original content type if changes are discarded', async () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith('SysFile', { includeCustomProperties: true });

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();
        nonEditableSystemProperties$.next(nonEditableItems);

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'customType' } as any,
            changed: { sys_primaryType: 'customType' },
        });

        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith('customType', { includeCustomProperties: true });

        mockDocumentPropertiesService.extractSchemas.mockClear();

        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledTimes(0);

        const cancelButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-cancel-button"]'));
        cancelButton.nativeElement.click();
        fixture.detectChanges();

        const dialogRef = await DialogHarnessUtils.getDialog({ fixture, fromRoot: true });
        const discardButton = await dialogRef.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="discard-button"]' }));
        await discardButton.click();

        expect(mockDocumentPropertiesService.extractSchemas).toHaveBeenCalledWith('SysFile', { includeCustomProperties: true });
    });

    it('should save only cached values which has been edited', async () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();
        let editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'customType' } as any,
            changed: { sys_primaryType: 'customType' },
        });
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'custom_property', value: 'Updated Custom Field' } as any,
            changed: { custom_property: 'Updated Custom Field' },
        });
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'common_property', value: 'Updated Common Field' } as any,
            changed: { common_property: 'Updated Common Field' },
        });
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'anotherCustomType' } as any,
            changed: { sys_primaryType: 'anotherCustomType' },
        });
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'anotherCustomType' } as any,
            changed: { sys_primaryType: 'anotherCustomType' },
        });
        const loader = TestbedHarnessEnvironment.loader(fixture);
        let saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));
        await saveButton.click();

        expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(jestMocks.fileDocument.sys_id, {
            common_property: 'Updated Common Field',
            sys_primaryType: 'anotherCustomType',
        });

        mockDocumentService.updateDocument.mockClear();
        editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_primaryType', value: 'customType' } as any,
            changed: { sys_primaryType: 'customType' },
        });
        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'custom_property', value: 'Updated Custom Field' } as any,
            changed: { custom_property: 'Updated Custom Field' },
        });
        saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));
        await saveButton.click();

        expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(jestMocks.fileDocument.sys_id, {
            custom_property: 'Updated Custom Field',
            sys_primaryType: 'customType',
        });
    });

    describe('Escape key handling', () => {
        it('should show cancel dialog when escape key is pressed with pending changes', () => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            fixture.detectChanges();

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
            fixture.detectChanges();

            cardViewUpdateService.itemUpdated$.next({
                target: { key: 'sys_title', value: 'New Title' } as any,
                changed: { sys_title: 'New Title' },
            });
            fixture.detectChanges();

            const dialog = TestBed.inject(MatDialog);
            const openDialogSpy = jest.spyOn(dialog, 'open');

            const event = new KeyboardEvent('keyup', { key: 'Escape' });
            jest.spyOn(event, 'stopImmediatePropagation');
            jest.spyOn(event, 'preventDefault');

            fixture.nativeElement.dispatchEvent(event);
            fixture.detectChanges();

            expect(event.stopImmediatePropagation).toHaveBeenCalled();
            expect(event.preventDefault).toHaveBeenCalled();
            expect(openDialogSpy).toHaveBeenCalled();
        });

        it('should emit a closePropertySidebar event when escape key is pressed without pending changes and not in edit mode', () => {
            component.document = jestMocks.fileDocument;
            fixture.detectChanges();

            jest.spyOn(component.closePropertySidebar, 'emit');

            const event = new KeyboardEvent('keyup', { key: 'Escape' });
            fixture.nativeElement.dispatchEvent(event);
            fixture.detectChanges();

            expect(component.closePropertySidebar.emit).toHaveBeenCalled();
        });

        it('should not show dialog twice when escape is pressed multiple times with pending changes', () => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            fixture.detectChanges();

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
            fixture.detectChanges();

            cardViewUpdateService.itemUpdated$.next({
                target: { key: 'sys_title', value: 'New Title' } as any,
                changed: { sys_title: 'New Title' },
            });
            fixture.detectChanges();

            const dialog = TestBed.inject(MatDialog);
            const openDialogSpy = jest.spyOn(dialog, 'open');
            const event1 = new KeyboardEvent('keyup', { key: 'Escape' });
            fixture.nativeElement.dispatchEvent(event1);
            fixture.detectChanges();

            const event2 = new KeyboardEvent('keyup', { key: 'Escape' });
            fixture.nativeElement.dispatchEvent(event2);
            fixture.detectChanges();

            expect(openDialogSpy).toHaveBeenCalledTimes(1);
        });

        it('should exit edit mode when escape key is pressed in edit mode without pending changes', () => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            fixture.detectChanges();

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
            fixture.detectChanges();

            let saveButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-save-button"]'));

            expect(saveButton).toBeTruthy();

            const event = new KeyboardEvent('keyup', { key: 'Escape' });
            fixture.nativeElement.dispatchEvent(event);
            fixture.detectChanges();

            saveButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-save-button"]'));

            expect(saveButton).toBeFalsy();
        });
    });

    it('should pass accessibility checks', async () => {
        document.body.append(fixture.nativeElement);

        component.document = jestMocks.fileDocument;

        customProperties$.next([
            createMockItem({
                key: 'custom_prop',
                label: 'Custom Property',
                value: 'Custom Value',
            }),
        ]);

        nonEditableSystemProperties$.next([
            createMockItem({
                key: 'sys_created',
                label: 'Created',
                value: '2023-01-01',
                editable: false,
            }),
        ]);

        simulateDocumentChange();
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport(fixture.nativeElement);

        fixture.nativeElement.remove();

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });

    describe('Validation Logic', () => {
        beforeEach(() => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            simulateDocumentChange();

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
        });

        it('should show error message when one required field is missing or invalid', async () => {
            (component as any).cardValueValidationMap = { prop1: { isValid: false } };
            (component as any).documentPropertiesToUpdate = { prop1: '' };
            (component as any).editableNonNullableProperties = ['prop1'];

            const cacheService = fixture.debugElement.injector.get(HxpMetadataCacheService);
            jest.spyOn(cacheService, 'getAllCachedValues').mockReturnValue({ prop1: '' });

            // Set up allEditableProperties$ with the property that will be looked up
            editableProperties$.next([
                createMockItem({
                    key: 'prop1',
                    label: 'Property 1',
                    value: '',
                    editable: true,
                }),
            ]);

            component['onSaveProperties']();

            await fixture.whenStable();

            expect(mockNotificationService.openSnackBar).toHaveBeenCalledWith('DOCUMENT.METADATA.VALIDATION.REQUIRED');
        });

        it('should show error message when multiple required fields are missing or invalid', () => {
            (component as any).cardValueValidationMap = { prop1: { isValid: false }, prop2: { isValid: false } };
            (component as any).documentPropertiesToUpdate = { prop1: '', prop2: '' };
            (component as any).editableNonNullableProperties = ['prop1', 'prop2'];

            const cacheService = fixture.debugElement.injector.get(HxpMetadataCacheService);
            jest.spyOn(cacheService, 'getAllCachedValues').mockReturnValue({ prop1: '', prop2: '' });

            component['onSaveProperties']();

            expect(mockNotificationService.openSnackBar).toHaveBeenCalledWith('DOCUMENT.METADATA.VALIDATION.REQUIRED_MULTIPLE');
        });

        it('should show specific error message when property has invalid value', () => {
            (component as any).cardValueValidationMap = { prop1: { isValid: false, errorType: 'INVALID_VALUE' } };
            (component as any).documentPropertiesToUpdate = { prop1: 'invalid' };

            component['onSaveProperties']();

            expect(mockNotificationService.openSnackBar).toHaveBeenCalledWith('DOCUMENT.METADATA.VALIDATION.INVALID_VALUE');
        });

        it('should respond to card update setting invalid value correctly', () => {
            const updateNotification = {
                target: { key: 'prop1', value: 'val', isValidValue: false },
                changed: { prop1: 'val' },
            };

            component['respondToCardUpdate'](updateNotification as any);

            expect((component as any).cardValueValidationMap['prop1']).toEqual({
                isValid: false,
                errorType: 'INVALID_VALUE',
            });
        });

        it('should display INVALID_VALUE message when propertyLabel is not found for single violation', async () => {
            component.document = jestMocks.fileDocument;
            component['editableNonNullableProperties'] = ['prop1'];
            // Set allEditableProperties$ to an empty array so prop1 is not found
            component['allEditableProperties$'] = new BehaviorSubject([]);
            component['cacheService'].updateCache({ prop1: '' });
            component['cardValueValidationMap'] = {
                prop1: { isValid: false, errorType: 'REQUIRED' },
            };
            component['documentPropertiesToUpdate'] = {};

            component['onSaveProperties']();
            await fixture.whenStable();

            expect(mockNotificationService.openSnackBar).toHaveBeenCalledWith('DOCUMENT.METADATA.VALIDATION.INVALID_VALUE');
        });

        it('should set invalidFieldIds with violation keys when validation fails', async () => {
            component['editableNonNullableProperties'] = ['prop1', 'prop2'];

            const cacheService = fixture.debugElement.injector.get(HxpMetadataCacheService);
            jest.spyOn(cacheService, 'getAllCachedValues').mockReturnValue({ prop1: '', prop2: '' });

            // Simulate changes with isValidValue: false to trigger validation failures
            cardViewUpdateService.itemUpdated$.next({
                target: { key: 'prop1', value: '', isValidValue: false } as any,
                changed: { prop1: '' },
            });
            cardViewUpdateService.itemUpdated$.next({
                target: { key: 'prop2', value: '', isValidValue: false } as any,
                changed: { prop2: '' },
            });
            fixture.detectChanges();

            const loader = TestbedHarnessEnvironment.loader(fixture);
            const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="hxp-metadata-sidebar-save-button"]' }));
            await saveButton.click();

            expect(component['invalidFieldIds']()).toEqual(['prop1', 'prop2']);
        });

        it('should reset invalidFieldIds when entering edit mode', () => {
            component['invalidFieldIds'].set(['prop1', 'prop2']);

            expect(component['invalidFieldIds']()).toEqual(['prop1', 'prop2']);

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
            fixture.detectChanges();

            expect(component['invalidFieldIds']()).toEqual([]);
        });

        it('should reset invalidFieldIds when exiting edit mode', () => {
            component['invalidFieldIds'].set(['prop1', 'prop2']);

            expect(component['invalidFieldIds']()).toEqual(['prop1', 'prop2']);

            fixture.detectChanges();

            const cancelButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-cancel-button"]'));
            cancelButton.nativeElement.click();
            fixture.detectChanges();

            expect(component['invalidFieldIds']()).toEqual([]);
        });

        it('should set invalidFieldIds for required properties that are empty', async () => {
            component['cardValueValidationMap'] = {};
            component['documentPropertiesToUpdate'] = {};
            component['editableNonNullableProperties'] = ['requiredProp1', 'requiredProp2'];

            jest.spyOn(component['cacheService'], 'getAllCachedValues').mockReturnValue({ requiredProp1: '', requiredProp2: null });

            component['onSaveProperties']();

            expect(component['invalidFieldIds']()).toEqual(['requiredProp1', 'requiredProp2']);
        });

        it('should include both invalid value fields and empty required fields in invalidFieldIds', async () => {
            component['editableNonNullableProperties'] = ['requiredProp'];
            component['cardValueValidationMap'] = {
                invalidProp: { isValid: false, errorType: 'INVALID_VALUE' },
            };
            component['documentPropertiesToUpdate'] = { invalidProp: 'bad-value' };

            jest.spyOn(component['cacheService'], 'getAllCachedValues').mockReturnValue({ invalidProp: 'bad-value', requiredProp: '' });

            component['onSaveProperties']();

            expect(component['invalidFieldIds']()).toEqual(['invalidProp', 'requiredProp']);
        });
    });

    describe('onOutsideClick', () => {
        const triggerOutsideClick = () => {
            document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        };

        const enterEditModeWithPendingChanges = () => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            fixture.detectChanges();

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
            fixture.detectChanges();

            cardViewUpdateService.itemUpdated$.next({
                target: { key: 'sys_title', value: 'New Title' } as any,
                changed: { sys_title: 'New Title' },
            });
            fixture.detectChanges();
        };

        it('should not open dialog when clicking outside while not in edit mode', async () => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            fixture.detectChanges();

            const dialog = TestBed.inject(MatDialog);
            const openDialogSpy = jest.spyOn(dialog, 'open');
            jest.spyOn(component.closePropertySidebar, 'emit');

            triggerOutsideClick();
            await fixture.whenStable();

            expect(openDialogSpy).not.toHaveBeenCalled();
            expect(component.closePropertySidebar.emit).not.toHaveBeenCalled();
        });

        it('should not open dialog when clicking outside with no pending changes in edit mode', async () => {
            component.document = jestMocks.fileDocument;
            component.editable = true;
            fixture.detectChanges();

            const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
            editButton.nativeElement.click();
            fixture.detectChanges();

            const dialog = TestBed.inject(MatDialog);
            const openDialogSpy = jest.spyOn(dialog, 'open');
            jest.spyOn(component.closePropertySidebar, 'emit');

            triggerOutsideClick();
            await fixture.whenStable();

            expect(openDialogSpy).not.toHaveBeenCalled();
            expect(component.closePropertySidebar.emit).not.toHaveBeenCalled();
        });

        it('should open cancel dialog when clicking outside in edit mode with pending changes', async () => {
            enterEditModeWithPendingChanges();

            const dialog = TestBed.inject(MatDialog);
            const openDialogSpy = jest.spyOn(dialog, 'open');

            triggerOutsideClick();
            await fixture.whenStable();

            expect(openDialogSpy).toHaveBeenCalled();
        });

        it('should not open another dialog when clicking outside while a dialog is already open', async () => {
            enterEditModeWithPendingChanges();

            const dialog = TestBed.inject(MatDialog);
            const openDialogSpy = jest.spyOn(dialog, 'open');

            triggerOutsideClick();
            await fixture.whenStable();
            expect(openDialogSpy).toHaveBeenCalledTimes(1);

            // Second outside click should not open another dialog
            triggerOutsideClick();
            await fixture.whenStable();
            expect(openDialogSpy).toHaveBeenCalledTimes(1);
        });
    });

    it('should invalidate cache when switching to a different version to clear stale edited values', () => {
        component.document = jestMocks.fileDocument;
        simulateDocumentChange();

        const cacheService = fixture.debugElement.injector.get(HxpMetadataCacheService);
        const invalidateCacheSpy = jest.spyOn(cacheService, 'invalidateCache');

        component.document = { ...jestMocks.fileDocument, sys_id: 'version-1', sys_title: 'Version Title' } as Document;
        simulateDocumentChange(jestMocks.fileDocument);

        expect(invalidateCacheSpy).toHaveBeenCalled();
    });

    it('should reset pending changes state when switching to a different version', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'Edited Title' } as any,
            changed: { sys_title: 'Edited Title' },
        });

        expect(component['hasPendingChanges']).toBe(true);

        component.document = { ...jestMocks.fileDocument, sys_id: 'version-1' } as Document;
        simulateDocumentChange(jestMocks.fileDocument);

        expect(component['hasPendingChanges']).toBe(false);
        expect(component['documentPropertiesToUpdate']).toEqual({});
    });

    it('should not invalidate cache or reset state when only editable input changes', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        const editButton = fixture.debugElement.query(By.css('[data-automation-id="hxp-metadata-sidebar-edit-button"]'));
        editButton.nativeElement.click();
        fixture.detectChanges();

        cardViewUpdateService.itemUpdated$.next({
            target: { key: 'sys_title', value: 'Edited Title' } as any,
            changed: { sys_title: 'Edited Title' },
        });

        expect(component['hasPendingChanges']).toBe(true);

        const cacheService = fixture.debugElement.injector.get(HxpMetadataCacheService);
        const invalidateCacheSpy = jest.spyOn(cacheService, 'invalidateCache');

        component.editable = false;
        component.ngOnChanges({
            editable: new SimpleChange(true, false, false),
        });

        expect(invalidateCacheSpy).not.toHaveBeenCalled();
        expect(component['hasPendingChanges']).toBe(true);
    });

    it('should reload properties when editable input changes', () => {
        component.document = jestMocks.fileDocument;
        component.editable = true;
        simulateDocumentChange();

        jest.clearAllMocks();

        component.editable = false;
        component.ngOnChanges({
            editable: new SimpleChange(true, false, false),
        });

        expect(mockDocumentService.getDocumentById).toHaveBeenCalledWith(jestMocks.fileDocument.sys_id);
    });
});
