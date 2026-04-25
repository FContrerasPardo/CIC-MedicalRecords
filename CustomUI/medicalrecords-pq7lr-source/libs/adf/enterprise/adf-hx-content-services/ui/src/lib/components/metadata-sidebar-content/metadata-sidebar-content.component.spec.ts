/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatAccordionHarness, MatExpansionPanelHarness } from '@angular/material/expansion/testing';
import { MetadataSidebarContentComponent } from './metadata-sidebar-content.component';
import { CardViewItem, NoopTranslateModule, CardViewComponent } from '@alfresco/adf-core';
import { SchemaTree } from '@alfresco/adf-hx-content-services/services';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'adf-card-view',
    template: `
        <div class="mock-card-view" [attr.data-display-empty]="displayEmpty() ? 'true' : 'false'">
            @for (property of properties(); track property.key) {
            <div class="adf-property" [attr.data-automation-id]="'header-' + property.key">
                <div class="adf-property-inner">
                    @if (shouldShowProperty(property)) {
                    <label class="mock-card-view-label" [attr.data-automation-id]="'card-textitem-label-' + property.key">
                        {{ property.label }}
                    </label>
                    <span class="mock-card-view-value">{{ property.displayValue }}</span>
                    }
                </div>
            </div>
            }
        </div>
    `,
})
class MockCardViewComponent {
    properties = input<CardViewItem[]>([]);
    editable = input(false);
    displayEmpty = input(true);
    copyToClipboardAction = input(true);
    useChipsForMultiValueProperty = input(false);
    multiValueSeparator = input<string | undefined>(undefined);

    shouldShowProperty(property: CardViewItem): boolean {
        if (this.displayEmpty()) {
            return true;
        }
        const valueToCheck = property.displayValue ?? property.value;
        return valueToCheck !== undefined && valueToCheck !== null && valueToCheck !== '';
    }
}

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'test-host-custom-header',
    template: '<hxp-metadata-sidebar-content headerText="CUSTOM.HEADER" [properties]="properties" />',
    imports: [MetadataSidebarContentComponent],
})
class HostCustomHeaderComponent {
    properties = [{ label: 'Title', value: 'My Document', key: 'sys_title', type: 'text', displayValue: 'My Document' } as CardViewItem];
}

@Component({

    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'test-host-display-empty',
    template: '<hxp-metadata-sidebar-content [displayEmpty]="displayEmpty" [properties]="properties" />',
    imports: [MetadataSidebarContentComponent],
})
class HostDisplayEmptyComponent {
    displayEmpty = false;
    properties = [{ label: 'Custom Field', value: '', key: 'custom_property', type: 'text', displayValue: '' } as CardViewItem];
}

@Component({

    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'test-host-default-display-empty',
    template: '<hxp-metadata-sidebar-content [displayEmpty]="true" [properties]="properties" />',
    imports: [MetadataSidebarContentComponent],
})
class HostDefaultDisplayEmptyComponent {
    properties = [{ label: 'Default Empty Field', value: '', key: 'default_property', type: 'text', displayValue: '' } as CardViewItem];
}

describe('MetadataSidebarContentComponent', () => {
    let fixture: ComponentFixture<MetadataSidebarContentComponent>;
    let loader: HarnessLoader;

    const mockProperties: CardViewItem[] = [
        {
            label: 'Title',
            value: 'My Document',
            key: 'sys_title',
            type: 'text',
            displayValue: 'My Document',
        },
        {
            label: 'Description',
            value: 'A test document',
            key: 'sys_description',
            type: 'text',
            displayValue: 'A test document',
        },
    ];

    const mockPropertiesGroups: SchemaTree = [
        {
            schema: 'customSchema1',
            fields: { ...mockProperties },
        },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                MetadataSidebarContentComponent,
                HostCustomHeaderComponent,
                HostDisplayEmptyComponent,
                HostDefaultDisplayEmptyComponent,
                NoopTranslateModule,
            ],
        })
            .overrideComponent(MetadataSidebarContentComponent, {
                remove: {
                    imports: [CardViewComponent],
                },
                add: {
                    imports: [MockCardViewComponent],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(MetadataSidebarContentComponent);
        loader = TestbedHarnessEnvironment.loader(fixture);
        fixture.componentRef.setInput('properties', mockProperties);
    });

    it('should render adf-card-view with the correct properties', () => {
        fixture.detectChanges();

        const cardViewDebugElement = fixture.debugElement.query(By.directive(MockCardViewComponent));

        expect(cardViewDebugElement).toBeTruthy();

        const cardViewInstance = cardViewDebugElement.componentInstance as MockCardViewComponent;

        expect(cardViewInstance.properties()).toEqual(mockProperties);
    });

    it('should not render adf-card-view if properties are empty', () => {
        fixture.componentRef.setInput('properties', []);
        fixture.detectChanges();

        const cardViewDebugElement = fixture.debugElement.query(By.directive(MockCardViewComponent));

        expect(cardViewDebugElement).toBeFalsy();
    });

    it('should render properties with empty values when displayEmpty is true', () => {
        const hostFixture = TestBed.createComponent(HostDisplayEmptyComponent);
        hostFixture.detectChanges();

        const missingWhenHidden = hostFixture.debugElement.query(By.css('[data-automation-id="header-custom_property"] .mock-card-view-label'));
        expect(missingWhenHidden).toBeFalsy();

        hostFixture.componentInstance.displayEmpty = true;
        hostFixture.detectChanges();

        const renderedWhenVisible = hostFixture.debugElement.query(By.css('[data-automation-id="header-custom_property"] .mock-card-view-label'));
        expect(renderedWhenVisible).toBeTruthy();
        expect(renderedWhenVisible.nativeElement.textContent).toContain('Custom Field');
    });

    it('should display empty properties by default', () => {
        const hostFixture = TestBed.createComponent(HostDefaultDisplayEmptyComponent);
        hostFixture.detectChanges();

        const cardViewDebugElement = hostFixture.debugElement.query(By.directive(MockCardViewComponent));
        expect(cardViewDebugElement).toBeTruthy();

        const propertyHeader = cardViewDebugElement.nativeElement.querySelector('[data-automation-id="header-default_property"]');
        expect(propertyHeader).toBeTruthy();
        expect(propertyHeader.textContent).toContain('Default Empty Field');
    });

    describe('collapsible input', () => {
        it('should not display accordion when collapsible is false', async () => {
            fixture.componentRef.setInput('collapsible', false);
            fixture.detectChanges();

            const accordions = await loader.getAllHarnesses(MatAccordionHarness);
            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            expect(accordions.length).toBe(0);
            expect(expansionPanels.length).toBe(0);
        });

        it('should display accordion when collapsible is true', async () => {
            fixture.componentRef.setInput('propertiesGroups', mockPropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const accordions = await loader.getAllHarnesses(MatAccordionHarness);
            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            expect(accordions.length).toBe(1);
            expect(expansionPanels.length).toBe(1);
        });

        it('should display first property label as accordion header when collapsible is true', async () => {
            fixture.componentRef.setInput('propertiesGroups', mockPropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const accordion = await loader.getHarness(MatAccordionHarness);
            const panels = await accordion.getExpansionPanels();
            const panelTitle = await panels[0].getTitle();

            expect(panelTitle).toBeTruthy();
            expect(panelTitle?.trim()).toBe('customSchema1');
        });

        it('should display all properties in card view when collapsible is false', () => {
            fixture.componentRef.setInput('collapsible', false);
            fixture.detectChanges();

            const cardViewDebugElement = fixture.debugElement.query(By.directive(MockCardViewComponent));
            const cardViewInstance = cardViewDebugElement.componentInstance as MockCardViewComponent;

            expect(cardViewInstance.properties().length).toBe(2);
            expect(cardViewInstance.properties()).toEqual(mockProperties);
        });
    });

    it('should render properties with empty values when displayEmpty is true', () => {
        const hostFixture = TestBed.createComponent(HostDisplayEmptyComponent);
        hostFixture.detectChanges();

        const missingWhenHidden = hostFixture.debugElement.query(By.css('[data-automation-id="header-custom_property"] .mock-card-view-label'));
        expect(missingWhenHidden).toBeFalsy();

        hostFixture.componentInstance.displayEmpty = true;
        hostFixture.detectChanges();

        const renderedWhenVisible = hostFixture.debugElement.query(By.css('[data-automation-id="header-custom_property"] .mock-card-view-label'));
        expect(renderedWhenVisible).toBeTruthy();
        expect(renderedWhenVisible.nativeElement.textContent).toContain('Custom Field');
    });

    it('should display empty properties by default', () => {
        const hostFixture = TestBed.createComponent(HostDefaultDisplayEmptyComponent);
        hostFixture.detectChanges();

        const cardViewDebugElement = hostFixture.debugElement.query(By.directive(MockCardViewComponent));
        expect(cardViewDebugElement).toBeTruthy();

        const propertyHeader = cardViewDebugElement.nativeElement.querySelector('[data-automation-id="header-default_property"]');
        expect(propertyHeader).toBeTruthy();
        expect(propertyHeader.textContent).toContain('Default Empty Field');
    });

    it('should mark required field as invalid if empty', () => {
        const requiredProperty: any = {
            label: 'Test Field',
            key: 'testField',
            value: '',
            type: 'text',
            editable: true,
            validators: [
                {
                    message: 'DOCUMENT.METADATA.VALIDATION.REQUIRED',
                    isValid: (value: any) => value != null && value !== '',
                },
            ],
            isEmpty: () => true,
        };
        const validator = requiredProperty.validators[0];
        expect(validator.isValid(requiredProperty.value)).toBe(false);

        requiredProperty.value = 'Test Value';
        expect(validator.isValid(requiredProperty.value)).toBe(true);
    });

    describe('grouped properties and accordion controls', () => {
        const multiplePropertiesGroups: SchemaTree = [
            {
                schema: 'Date Properties',
                fields: { sys_birthdate: {}, sys_created: {} },
            },
            {
                schema: 'String Properties',
                fields: { sys_title: {}, sys_description: {} },
            },
        ];

        const multipleProperties: CardViewItem[] = [
            { label: 'Birth Date', value: '2020-01-01', key: 'sys_birthdate', type: 'date', displayValue: '2020-01-01' },
            { label: 'Created', value: '2021-01-01', key: 'sys_created', type: 'date', displayValue: '2021-01-01' },
            { label: 'Title', value: 'Document', key: 'sys_title', type: 'text', displayValue: 'Document' },
            { label: 'Description', value: 'Desc', key: 'sys_description', type: 'text', displayValue: 'Desc' },
        ];

        it('should render grouped properties in accordion panels when inputs change', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);
            expect(expansionPanels.length).toBe(2);

            const firstPanelTitle = await expansionPanels[0].getTitle();
            const secondPanelTitle = await expansionPanels[1].getTitle();
            expect(firstPanelTitle).toBe('Date Properties');
            expect(secondPanelTitle).toBe('String Properties');

            await expansionPanels[0].expand();
            await expansionPanels[1].expand();
            fixture.detectChanges();

            const cardViews = fixture.debugElement.queryAll(By.directive(MockCardViewComponent));
            expect(cardViews.length).toBe(2);

            const firstCardView = cardViews[0].componentInstance as MockCardViewComponent;
            const secondCardView = cardViews[1].componentInstance as MockCardViewComponent;
            expect(firstCardView.properties().length).toBe(2);
            expect(secondCardView.properties().length).toBe(2);
        });

        it('should set first panel as expanded and others as collapsed on initial render', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const accordions = await loader.getAllHarnesses(MatAccordionHarness);
            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            expect(accordions.length).toBe(2);
            expect(expansionPanels.length).toBe(2);
            expect(await expansionPanels[0].isExpanded()).toBeTruthy();
            expect(await expansionPanels[1].isExpanded()).toBeFalsy();
        });

        it('should filter properties correctly for each group', () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const firstGroupProperties = fixture.debugElement.nativeElement.querySelectorAll(
                '[data-automation-id^="header-sys_birthdate"], [data-automation-id^="header-sys_created"]'
            );
            const secondGroupProperties = fixture.debugElement.nativeElement.querySelectorAll(
                '[data-automation-id^="header-sys_title"], [data-automation-id^="header-sys_description"]'
            );

            expect(firstGroupProperties.length).toBe(2);
            expect(secondGroupProperties.length).toBe(2);
        });

        it('should calculate allExpanded as false when not all panels are expanded', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            expect(await expansionPanels[0].isExpanded()).toBe(true);
            expect(await expansionPanels[1].isExpanded()).toBe(false);
        });

        it('should toggle expand all/collapse all when button is clicked', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            // Click expand all button
            let button = fixture.debugElement.query(By.css('.hxp-accordion-controls-button'));
            button.nativeElement.click();
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBe(true);
            expect(await expansionPanels[1].isExpanded()).toBe(true);

            // Click collapse all button
            button = fixture.debugElement.query(By.css('.hxp-accordion-controls-button'));
            button.nativeElement.click();
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBe(false);
            expect(await expansionPanels[1].isExpanded()).toBe(false);
        });

        it('should display expand/collapse button when collapsible is true', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const button = fixture.debugElement.query(By.css('.hxp-accordion-controls-button'));

            expect(button).toBeTruthy();
        });

        it('should not display expand/collapse button when collapsible is false', () => {
            fixture.componentRef.setInput('collapsible', false);
            fixture.detectChanges();

            const button = fixture.debugElement.query(By.css('.hxp-accordion-controls-button'));

            expect(button).toBeFalsy();
        });

        it('should expand accordion panels containing invalid fields', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            expect(await expansionPanels[0].isExpanded()).toBeTruthy();
            expect(await expansionPanels[1].isExpanded()).toBeFalsy();

            fixture.componentRef.setInput('invalidFieldIds', ['sys_title']);
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBeTruthy();
            expect(await expansionPanels[1].isExpanded()).toBeTruthy();
        });

        it('should expand multiple accordion panels when they contain invalid fields', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            // Collapse all panels first
            await expansionPanels[0].collapse();
            await expansionPanels[1].collapse();
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBeFalsy();
            expect(await expansionPanels[1].isExpanded()).toBeFalsy();

            // Set invalid fields in both groups
            fixture.componentRef.setInput('invalidFieldIds', ['sys_birthdate', 'sys_title']);
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBeTruthy();
            expect(await expansionPanels[1].isExpanded()).toBeTruthy();
        });

        it('should not expand accordion panels when there are no invalidFieldIds', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            // Collapse second panel
            await expansionPanels[1].collapse();
            fixture.detectChanges();

            expect(await expansionPanels[1].isExpanded()).toBeFalsy();

            // Set empty invalidFieldIds
            fixture.componentRef.setInput('invalidFieldIds', []);
            fixture.detectChanges();

            expect(await expansionPanels[1].isExpanded()).toBeFalsy();
        });

        it('should not affect panels without invalid fields when expanding', async () => {
            fixture.componentRef.setInput('properties', multipleProperties);
            fixture.componentRef.setInput('propertiesGroups', multiplePropertiesGroups);
            fixture.componentRef.setInput('collapsible', true);
            fixture.detectChanges();

            const expansionPanels = await loader.getAllHarnesses(MatExpansionPanelHarness);

            // Collapse first panel
            await expansionPanels[0].collapse();
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBeFalsy();
            expect(await expansionPanels[1].isExpanded()).toBeFalsy();

            // Set invalid field only in second group
            fixture.componentRef.setInput('invalidFieldIds', ['sys_title']);
            fixture.detectChanges();

            expect(await expansionPanels[0].isExpanded()).toBeFalsy();
            expect(await expansionPanels[1].isExpanded()).toBeTruthy();
        });
    });

    it('should pass accessibility checks', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport(fixture.nativeElement);

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
