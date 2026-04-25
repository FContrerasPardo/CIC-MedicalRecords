/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CardViewComponent, CardViewItem } from '@alfresco/adf-core';
import { Component, ChangeDetectionStrategy, computed, input, output, signal, viewChildren, effect } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SchemaTree } from '@alfresco/adf-hx-content-services/services';

interface GroupedProperty {
    schema: string;
    properties: CardViewItem[];
    expanded: boolean;
}

/**
 * Component presents document properties viewer container.
 *
 * To use the `MetadataSidebarContentComponent`, you need first to import the component in your module
 *
 * ```ts
 * import { MetadataSidebarContentComponent } from '@alfresco/adf-hx-content-services/ui';
 *
 * @NgModule({
 *     imports: [
 *         MetadataSidebarContentComponent
 *         ...
 *     ],
 *    [...]
 * })
 *
 * export class AppModule {}
 * ```
 *
 * Then use it in your Angular template as shown in the example below:
 *
 * @example
 * <hxp-metadata-sidebar-content
 *    [document]="document"
 *    [editable]="editable"
 *    [copyToClipboardAction]="copyToClipboardAction"
 *    [displayEmpty]="displayEmpty"
 *    [useChipsForMultiValueProperty]="useChipsForMultiValueProperty">
 * </hxp-metadata-sidebar-content>
 */
@Component({
    selector: 'hxp-metadata-sidebar-content',
    templateUrl: './metadata-sidebar-content.component.html',
    styleUrls: ['./metadata-sidebar-content.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatExpansionModule, CardViewComponent, MatButtonModule, TranslatePipe],
})
export class MetadataSidebarContentComponent {
    /**
     * The document to display the properties for.
     * @type {Document}
     * @required
     */
    document = input<Document>();

    /**
     * The properties to display in the card view.
     * @type {CardViewItem[]}
     * @default []
     *
     * ```ts
     * export interface CardViewItem {
     *      label: string;
     *      value: any;
     *      key: string;
     *      default?: any;
     *      type: string;
     *      displayValue: any;
     *      editable?: boolean;
     *      icon?: string;
     * }
     * ```
     *
     */
    properties = input<CardViewItem[]>([]);

    propertiesGroups = input<SchemaTree>([]);

    /**
     * Toggles whether or not to enable copy to clipboard action.
     * @type {boolean}
     * @default true
     */
    copyToClipboardAction = input(true);

    /**
     * Toggles whether to display empty values in the card view.
     * @type {boolean}
     * @default false
     */
    displayEmpty = input(true);

    /**
     * Toggles whether the edit button should be shown
     * @type {boolean}
     * @default false
     */
    editable = input(false);

    /**
     * Toggles whether or not to enable chips for multivalued properties.
     * @type {boolean}
     * @default true
     */
    useChipsForMultiValueProperty = input(true);

    /**
     * Toggles whether to display properties in a collapsible accordion.
     * When true, properties are shown in an expandable accordion with the first property's label as the header.
     * When false, properties are displayed directly without accordion wrapping.
     * @type {boolean}
     * @default false
     */
    collapsible = input(false);

    propertyUpdateRequest = output<boolean>();

    /**
     * Array of invalid field IDs that should trigger accordion expansion.
     * When set, accordions containing these fields will automatically expand.
     * @type {string[]}
     * @default []
     */
    invalidFieldIds = input<string[]>([]);

    private expansionPanels = viewChildren(MatExpansionPanel);

    private expandedStates = signal<boolean[]>([]);

    constructor() {
        // Effect to expand accordions containing invalid fields
        effect(() => {
            const invalidIds = this.invalidFieldIds();
            if (invalidIds.length > 0) {
                this.expandAccordionsWithInvalidFields(invalidIds);
            }
        });
    }

    protected groupedProperties = computed((): GroupedProperty[] => {
        const props = this.properties();
        const groups = this.propertiesGroups();

        return groups.map((group, index) => ({
            ...group,
            properties: this.getPropertiesForGroup(props, group.fields),
            expanded: index === 0,
        }));
    });

    protected allExpanded = computed(() => {
        const states = this.expandedStates();
        return states.length > 0 && states.every(Boolean);
    });

    private getPropertiesForGroup(properties: CardViewItem[], fields: Record<string, any>): CardViewItem[] {
        const keys = Object.keys(fields);
        return properties.filter((property) => keys.includes(property.key.split('.')[0]));
    }

    protected readonly multiValueSeparator = ', ';

    protected onPanelExpandedChange(): void {
        const panels = this.expansionPanels();
        this.expandedStates.set(panels.map((panel) => panel.expanded));
    }

    protected toggleAllAccordions(): void {
        const expandable = !this.allExpanded();
        const panels = this.expansionPanels();

        for (const panel of panels) {
            if (expandable) {
                panel.open();
            } else {
                panel.close();
            }
        }

        this.expandedStates.set(panels.map(() => expandable));
    }

    private expandAccordionsWithInvalidFields(invalidIds: string[]): void {
        const props = this.properties();
        const groups = this.propertiesGroups();
        const panels = this.expansionPanels();

        for (const [index, group] of groups.entries()) {
            if (!panels[index]) {
                continue;
            }

            const groupProperties = this.getPropertiesForGroup(props, group.fields);
            const hasInvalidField = groupProperties.some((prop) => invalidIds.includes(prop.key as string));

            if (hasInvalidField) {
                panels[index].open();
            }
        }

        this.expandedStates.set(panels.map((panel) => panel.expanded));
    }
}
