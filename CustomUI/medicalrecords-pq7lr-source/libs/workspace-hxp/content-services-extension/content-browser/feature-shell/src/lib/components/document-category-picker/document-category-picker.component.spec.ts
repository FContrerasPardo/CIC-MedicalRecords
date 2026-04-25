/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockService } from 'ng-mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { generateMockResponse, jestMocks, a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { DocumentCategoryPickerComponent } from './document-category-picker.component';
import { ModelApi } from '@hylandsoftware/hxcs-js-client';
import { MODEL_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { DocumentModelService } from '@alfresco/adf-hx-content-services/services';
import { SelectHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('DocumentCategoryPickerComponent', () => {
    let component: DocumentCategoryPickerComponent;
    let fixture: ComponentFixture<DocumentCategoryPickerComponent>;

    const mockModelApi: ModelApi = MockService(ModelApi);

    let documentModelServiceSpy: jest.Mock;

    const getDocumentCategory = async () => {
        return SelectHarnessUtils.getDropdownValue({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, DocumentCategoryPickerComponent],
            providers: [DocumentModelService, { provide: MODEL_API_TOKEN, useValue: mockModelApi }],
        });

        documentModelServiceSpy = jest.spyOn(mockModelApi, 'getModel').mockReturnValue(generateMockResponse({ data: jestMocks.modelApi }));

        fixture = TestBed.createComponent(DocumentCategoryPickerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render the component', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();

        await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
    });

    it('should disable the component if no document exists', async () => {
        const selectHarness = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });

        expect(await selectHarness.isDisabled()).toBeTruthy();
    });

    it('should disable the component if document has no subtypes', async () => {
        documentModelServiceSpy.mockReturnValue(
            generateMockResponse({
                data: { ...jestMocks.modelApi, primaryTypes: [] },
            })
        );
        component.document = jestMocks.folderDocument;

        const selectHarness = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        expect(await selectHarness.isDisabled()).toBeTruthy();
    });

    it('should not render required symbol when required is false', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();
        fixture.detectChanges();
        const selectHarness = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        expect(await selectHarness.isRequired()).toBeFalsy();
    });

    it('should render required state when required is true', async () => {
        component.document = jestMocks.folderDocument;
        component.required = true;
        const selectHarness = await SelectHarnessUtils.getDropdown({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        expect(await selectHarness.isRequired()).toBeTruthy();
    });

    it('should call document model service', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();
        fixture.detectChanges();
        expect(documentModelServiceSpy).toHaveBeenCalled();
    });

    it('should list document types as options', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        const subTypes: string[] = await SelectHarnessUtils.getDropdownOptions({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        expect(component.options).toEqual(subTypes);
    });

    it('should display document categories on click', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();

        const categoryOptions = await SelectHarnessUtils.getDropdownOptions({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
        });
        expect(categoryOptions.length).toBe(16);
    });

    it('should select a document category and emit the selected value', async () => {
        const selectSpy = jest.spyOn(component.selectedCategory, 'emit');
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();

        let documentCategory = await getDocumentCategory();
        expect(documentCategory).toBe('DOCUMENT_CATEGORY_PICKER.PLACEHOLDER');

        await SelectHarnessUtils.clickDropdownOptions({
            fixture,
            dropdownFilters: {
                selector: '#hxp-document-category-picker-select',
            },
            optionsFilters: {
                text: 'SysFile',
            },
        });
        expect(selectSpy).toHaveBeenCalled();

        documentCategory = await getDocumentCategory();
        expect(documentCategory).toBe('SysFile');
    });

    it('should display document category from input value', async () => {
        const selectSpy = jest.spyOn(component.selectedCategory, 'emit');
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();
        fixture.detectChanges();

        expect(selectSpy).not.toHaveBeenCalled();

        let documentCategory = await getDocumentCategory();
        expect(documentCategory).toBe('DOCUMENT_CATEGORY_PICKER.PLACEHOLDER');

        component.value = 'SysFile';
        fixture.detectChanges();

        documentCategory = await getDocumentCategory();
        expect(documentCategory).toBe('SysFile');
        expect(selectSpy).toHaveBeenCalled();
    });

    it('should display placeholder if input value is not an option', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();
        fixture.detectChanges();

        let documentCategory = await getDocumentCategory();
        expect(documentCategory).toBe('DOCUMENT_CATEGORY_PICKER.PLACEHOLDER');

        component.value = 'InvalidCategory';
        fixture.detectChanges();

        documentCategory = await getDocumentCategory();
        expect(documentCategory).toBe('DOCUMENT_CATEGORY_PICKER.PLACEHOLDER');
    });

    it('should use filter function to filter document categories', async () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(component.options).toContain('SysFile');

        component.filterFn = jest.fn((subType: string) => subType !== 'SysFile');
        component.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(component.options).not.toContain('SysFile');
        expect(component.filterFn).toHaveBeenCalled();
    });

    it('should pass accessibility checks', async () => {
        component.document = jestMocks.folderDocument;
        const res = await a11yReport('.hxp-document-category-picker');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
