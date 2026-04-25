/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CardViewItem, CardViewUpdateService, InfoDrawerContentDirective, InfoDrawerLayoutComponent, UpdateNotification } from '@alfresco/adf-core';
import {
    afterNextRender,
    runInInjectionContext,
    EnvironmentInjector,
    Component,
    DestroyRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewEncapsulation,
    signal,
} from '@angular/core';
import {
    DOCUMENT_PROPERTIES_SERVICE,
    DocumentService,
    isVersion,
    HxpNotificationService,
    SchemaTree,
} from '@alfresco/adf-hx-content-services/services';
import { Observable, combineLatest, fromEvent } from 'rxjs';
import { take, finalize, filter, map, takeUntil, shareReplay } from 'rxjs/operators';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { editPropertiesNotificationMessages } from './configs/edit-properties-notification-messages.config';
import { EditPropertiesStatus } from './configs/edit-properties-status.enum';
import { MetadataSidebarContentComponent } from '../metadata-sidebar-content/metadata-sidebar-content.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MetadataSidebarService } from './hxp-metadata-sidebar.service';
import { FieldType } from '@alfresco/adf-hx-content-services/api';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HxpCancelMetadataSidebarEditDialogComponent } from '../metadata-sidebar-cancel-edit-dialog/hxp-cancel-metadata-sidebar-edit-dialog.component';
import { DialogConfig } from '../../util/dialog/config';
import { HxpMetadataSidebarAdditionalInfoComponent } from '../metadata-sidebar-additional-info/hxp-metadata-sidebar-additional-info.component';
import { HxpMetadataCacheService, KeyValuePairs } from './hxp-metadata-cache.service';
import { HxpOutsideClickDirective } from '../../directives/hxp-outside-click.directive';

/**
 * Sidebar component to display and edit a Document properties.
 *
 * To use the `HxpMetadataSidebarComponent`, you need first to import the component in your module
 *
 * ```ts
 * import { HxpMetadataSidebarComponent } from '@alfresco/adf-hx-content-services/ui';
 *
 * @NgModule({
 *     imports: [
 *         HxpMetadataSidebarComponent
 *         ...
 *     ],
 *    [...]
 * })
 *
 * export class AppModule {}
 *
 * ```
 *
 * Then use it in your Angular template as shown in the example below:
 *
 * @example
 * <hxp-metadata-sidebar [editable]="false" [document]="document" (closePropertySidebar)="onClose()">
 */
@Component({
    selector: 'hxp-metadata-sidebar',
    templateUrl: './hxp-metadata-sidebar.component.html',
    styleUrls: ['./hxp-metadata-sidebar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        InfoDrawerLayoutComponent,
        InfoDrawerContentDirective,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MetadataSidebarContentComponent,
        AsyncPipe,
        TranslatePipe,
        HxpMetadataSidebarAdditionalInfoComponent,
        HxpOutsideClickDirective,
    ],
    providers: [HxpMetadataCacheService],
})
export class HxpMetadataSidebarComponent implements OnChanges {
    private readonly destroyRef = inject(DestroyRef);
    private readonly envInjector = inject(EnvironmentInjector);
    private readonly metadataSidebarService = inject(MetadataSidebarService);

    /**
     * The document to display the properties for
     * @type {Document}
     */
    @Input() document?: Document;

    /**
     * Input property to enable or disable edit mode availability
     * @type {boolean}
     * @default true
     */
    @Input() editable = true;

    /**
     * Emits an event when the sidebar is closed
     */
    @Output() closePropertySidebar = new EventEmitter<void>();

    protected propertyLoading = false;
    protected selectedDocument!: Document;
    protected editableSystemProperties$!: Observable<CardViewItem[]>;
    protected nonEditableSystemProperties$!: Observable<CardViewItem[]>;
    protected customProperties$!: Observable<CardViewItem[]>;
    protected allEditableProperties$!: Observable<CardViewItem[]>;
    protected workingCopy = true;
    protected isEditableRecord = false;
    protected editMode = false;
    protected hasPendingChanges = false;
    protected isUpdateInProgress = false;
    protected propertiesGroups: SchemaTree = [];

    private cardValueValidationMap: Record<string, { isValid: boolean; errorType?: string }> = {};
    private documentPropertiesToUpdate: KeyValuePairs = {};
    private readonly requiredProperties: string[];
    private dialogRef: MatDialogRef<HxpCancelMetadataSidebarEditDialogComponent> | null = null;
    private editableNonNullableProperties: string[] = [];
    private contentTypeSchemas: string[] = [];
    private requiredCustomFieldLabel: string[] = [];
    private isContentTypeChanged = false;

    // Signal to communicate invalid fields to child component for accordion expansion
    protected invalidFieldIds = signal<string[]>([]);

    private readonly documentService = inject(DocumentService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly cardViewUpdateService = inject(CardViewUpdateService);
    private readonly dialog = inject(MatDialog);
    private readonly translateService = inject(TranslateService);
    private readonly cacheService = inject(HxpMetadataCacheService);
    private readonly documentPropertiesService = inject(DOCUMENT_PROPERTIES_SERVICE);

    constructor() {
        this.subscribeToDocumentUpdates();
        this.requiredProperties = this.documentPropertiesService.getRequiredProperties();

        const itemUpdated$ = this.cardViewUpdateService.itemUpdated$.pipe(shareReplay());
        itemUpdated$.pipe(takeUntilDestroyed()).subscribe(this.respondToCardUpdate.bind(this));
        itemUpdated$
            .pipe(
                map((updateNotification) => {
                    const changedKey = Object.keys(updateNotification.changed)[0];
                    const changedValue = updateNotification.changed[changedKey];
                    return { changedKey, changedValue };
                }),
                filter(({ changedKey }) => changedKey === 'sys_primaryType'),
                takeUntilDestroyed()
            )
            // eslint-disable-next-line rxjs/no-nested-subscribe
            .subscribe(({ changedValue }) => this.updateContentType(changedValue));

        this.destroyRef.onDestroy(() => {
            this.cacheService.invalidateCache();
        });

        const keyUp$ = fromEvent<KeyboardEvent>(document, 'keyup');
        keyUp$
            .pipe(
                filter((e) => e.key === 'Escape'),
                takeUntilDestroyed()
            )
            .subscribe((event: KeyboardEvent) => {
                event.stopImmediatePropagation();
                event.preventDefault();
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.onSidebarKeyUp();
            });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!this.document) {
            return;
        }

        if (changes['document'] && this.hasDocumentChanged(changes['document'].previousValue, changes['document'].currentValue)) {
            this.cacheService.invalidateCache();
            this.hasPendingChanges = false;
            this.documentPropertiesToUpdate = {};
        }

        this.loadDocumentProperties(this.document.sys_id ?? '');
        this.workingCopy = !isVersion(this.document);
    }

    private hasDocumentChanged(previous: Document | undefined, current: Document | undefined): boolean {
        return previous?.sys_id !== current?.sys_id;
    }

    private initializeRequiredFieldsState(): void {
        if (!this.allEditableProperties$) {
            return;
        }

        this.allEditableProperties$.pipe(take(1)).subscribe((properties) => {
            this.buildRequiredPropertiesLists(properties);
            this.markRequiredFieldsInDom(properties);
            this.handleContentTypeChangeValidation();
        });
    }

    private buildRequiredPropertiesLists(properties: CardViewItem[]): void {
        this.editableNonNullableProperties = [];
        this.requiredCustomFieldLabel = [];

        for (const property of properties) {
            if (this.requiredProperties.includes(property.key)) {
                continue;
            }

            const isRequired = this.documentPropertiesService.isRequired(property.key);
            if (property.editable && isRequired) {
                this.editableNonNullableProperties.push(property.key);
                if (!this.requiredCustomFieldLabel.includes(property.label)) {
                    this.requiredCustomFieldLabel.push(property.label);
                }
            }
        }
    }

    private markRequiredFieldsInDom(properties: CardViewItem[]): void {
        for (const property of properties) {
            const isSystemRequired = this.requiredProperties.includes(property.key);
            const isCustomRequired = this.editableNonNullableProperties.includes(property.key);

            if (isSystemRequired || isCustomRequired) {
                this.markHtmlElementAsRequiredField(property);
            }
        }
    }

    private handleContentTypeChangeValidation(): void {
        if (!this.isContentTypeChanged) {
            return;
        }

        this.updateInvalidFields();

        if (this.requiredCustomFieldLabel.length > 0 && !this.allRequiredPropertiesAreSet()) {
            this.displayToastForRequiredFields();
        }

        this.isContentTypeChanged = false;
    }

    private markHtmlElementAsRequiredField(property: any): void {
        runInInjectionContext(this.envInjector, () => {
            afterNextRender(() => {
                const element = document.querySelector(`[data-automation-id="header-${property.key}"] .adf-property-label`);
                element?.classList.add('hxp-required-field');
            });
        });
    }

    @HostListener('keyup.esc', ['$event'])
    onEscKeyUp(event: Event) {
        event.stopImmediatePropagation();
        event.preventDefault();
        this.onSidebarKeyUp();
    }

    protected onCancel() {
        if (!this.hasPendingChanges) {
            return this.exitEditMode();
        }
        this.openCancelDialog();
    }

    protected handlePropertyUpdate(propertyUpdated: boolean): void {
        if (propertyUpdated) {
            this.fetchAllEditableProperties();
        }
    }

    protected onClose(): void {
        if (!this.hasPendingChanges) {
            this.closePropertySidebar.emit();
            return this.exitEditMode();
        } else if (!this.dialogRef) {
            this.openCancelDialog();
        }
    }

    protected onOutsideClick(): void {
        if (!this.editMode || !this.hasPendingChanges) {
            return;
        }
        this.onClose();
    }

    protected onTabChange(event: any): void {
        if (event.index === 0) {
            this.initializeRequiredFieldsState();
        }
    }

    private openCancelDialog() {
        this.dialogRef = this.dialog.open(HxpCancelMetadataSidebarEditDialogComponent, {
            width: DialogConfig.small.width,
            disableClose: true,
            hasBackdrop: true,
        });
        this.dialogRef.componentInstance.discardChanges.subscribe(() => {
            this.exitEditMode();
        });

        this.dialogRef.componentInstance.saveChanges.subscribe(() => {
            this.onSaveProperties();
        });

        this.dialogRef.afterClosed().subscribe(() => {
            this.dialogRef = null;
        });

        this.dialogRef
            .backdropClick()
            .pipe(takeUntil(this.dialogRef.afterClosed()))
            .subscribe(() => {
                if (this.dialogRef) {
                    this.dialogRef.close();
                }
            });
    }

    private exitEditMode(): void {
        this.cacheService.invalidateCache();
        if (this.contentTypeHasChanged()) {
            this.loadDocumentProperties(this.document?.sys_id ?? '');
        } else {
            this.fetchNonEditableProperties();
            this.fetchAllEditableProperties();
        }
        this.documentPropertiesToUpdate = {};
        this.cardValueValidationMap = {};
        this.editMode = false;
        this.hasPendingChanges = false;
        this.invalidFieldIds.set([]); // Reset invalid fields when exiting edit mode
    }

    private contentTypeHasChanged(): boolean {
        return !!this.documentPropertiesToUpdate['sys_primaryType'];
    }

    private subscribeToDocumentUpdates(): void {
        this.documentService.documentUpdated$
            .pipe(
                filter(({ document }) => !!document && document.sys_id === this.document?.sys_id),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: ({ document }) => {
                    if (document) {
                        this.selectedDocument = document;
                        // eslint-disable-next-line rxjs/no-nested-subscribe
                        this.fetchDocumentProperties();
                    }
                },
                error: (error) => console.error(error),
            });
    }

    private loadDocumentProperties(documentId: string): void {
        if (!documentId) {
            return;
        }

        this.propertyLoading = true;
        this.documentService
            .getDocumentById(documentId)
            .pipe(
                take(1),
                finalize(() => (this.propertyLoading = false))
            )
            .subscribe({
                next: (doc) => {
                    this.selectedDocument = doc;
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.fetchDocumentProperties();
                },
                error: ({ error }) => {
                    console.error(error);
                },
            });
    }

    private fetchDocumentProperties(): void {
        if (!this.selectedDocument) {
            return;
        }

        this.fetchCustomSchemaFields(this.selectedDocument.sys_primaryType);
        this.fetchNonEditableProperties();
        this.fetchAllEditableProperties();
    }

    private fetchCustomSchemaFields(contentType: string) {
        this.documentPropertiesService
            .extractSchemas(contentType, { includeCustomProperties: true })
            .pipe(take(1))
            .subscribe({
                next: (schemaFields: SchemaTree) => {
                    const customSchemaTree = Array.isArray(schemaFields) ? schemaFields : [];
                    this.propertiesGroups = customSchemaTree;
                    this.initializeDocumentWithSchema(this.flatSchemaTree(customSchemaTree));
                },
                error: (error) => console.error(error),
            });
    }

    private flatSchemaTree(schemaTree: SchemaTree): Record<string, any> {
        let schemaFieldsFlat: Record<string, any> = {};
        for (const schemaFields of schemaTree) {
            schemaFieldsFlat = { ...schemaFieldsFlat, ...schemaFields.fields };
        }
        return schemaFieldsFlat;
    }

    private initializeDocumentWithSchema(schemaFields: Record<string, any>, currentDoc: Record<string, any> = this.selectedDocument): void {
        const newSchemaKeys = Object.keys(schemaFields) || [];
        for (const fieldName of this.contentTypeSchemas) {
            if (!newSchemaKeys.includes(fieldName)) {
                delete currentDoc[fieldName];
                delete this.documentPropertiesToUpdate[fieldName];
            }
        }
        this.contentTypeSchemas = newSchemaKeys;

        if (this.contentTypeHasChanged()) {
            this.documentPropertiesToUpdate = {
                ...this.documentPropertiesToUpdate,
                ...this.cacheService.getUpdatedValuesForSchemas(newSchemaKeys),
            };
        }
        this.addSchemaFieldsToDocument(schemaFields, currentDoc);
    }

    private addSchemaFieldsToDocument(schemaFields: Record<string, any>, currentDoc: Record<string, any>): void {
        const newSchemaKeys = Object.keys(schemaFields) || [];
        for (const fieldName of newSchemaKeys) {
            if (!currentDoc[fieldName]) {
                currentDoc[fieldName] = typeof schemaFields[fieldName] === 'object' ? {} : '';
            }
            if (typeof schemaFields[fieldName] === 'object') {
                this.addSchemaFieldsToDocument(schemaFields[fieldName], currentDoc[fieldName]);
            }
        }
    }

    private fetchNonEditableProperties(): void {
        this.nonEditableSystemProperties$ = this.metadataSidebarService.getNonEditableSystemPropertiesFromDocument(this.selectedDocument).pipe(
            map((properties) => {
                // To ensure sys_path is always the last property displayed
                const pathProperties = properties.filter((p) => p.label?.toLowerCase() === 'path');
                const otherProperties = properties.filter((p) => p.label?.toLowerCase() !== 'path');
                return [...otherProperties, ...pathProperties];
            })
        );
    }

    private fetchAllEditableProperties(): void {
        this.fetchEditableProperties();
        this.fetchCustomProperties();
        this.updateAllEditableProperties();
        this.initializeRequiredFieldsState();
    }

    private fetchEditableProperties(): void {
        this.editableSystemProperties$ = this.metadataSidebarService
            .getEditableSystemPropertiesFromDocument(this.selectedDocument)
            .pipe(map((properties) => this.mapCachedProperties(properties)));
    }

    private fetchCustomProperties(): void {
        this.customProperties$ = this.metadataSidebarService
            .getCustomProperties(this.selectedDocument)
            .pipe(map((properties) => this.mapCachedProperties(properties)));
    }

    private mapCachedProperties(properties: CardViewItem[]): CardViewItem[] {
        return properties.map((property) => {
            const value = this.cacheService.getCachedValue(property.key, property.value);
            property.value = value;
            return property;
        });
    }

    private updateAllEditableProperties(): void {
        if (this.editableSystemProperties$ && this.customProperties$) {
            this.allEditableProperties$ = combineLatest([this.editableSystemProperties$, this.customProperties$]).pipe(
                map(([editableProperties, customProperties]) => [...editableProperties, ...customProperties])
            );
        }
    }

    private respondToCardUpdate(updateNotification: UpdateNotification): void {
        const changedKey = Object.keys(updateNotification.changed)[0];
        const changedValue = updateNotification.changed[changedKey];
        // We cast updateNotification because 'target' is not a standard property of the interface.
        // It references the specific UI component instance that triggered the update.
        // 'isValidValue' captures whether that component's internal validation failed.
        const isValidValue = (updateNotification as UpdateNotification & { target?: { isValidValue?: boolean } }).target?.isValidValue;
        const fieldType: FieldType | undefined = this.documentPropertiesService.propertyType(changedKey);

        const updatedValue: KeyValuePairs = this.isComplexProperty(changedValue, fieldType)
            ? this.getUpdatedComplexProperty(changedKey, changedValue)
            : updateNotification.changed;

        this.cacheService.updateCache(updatedValue);

        const actualChanges = this.cacheService.getUpdatedValues();
        this.hasPendingChanges = Object.keys(actualChanges).length > 0;
        this.documentPropertiesToUpdate = {
            ...this.documentPropertiesToUpdate,
            ...updatedValue,
        };

        this.cardValueValidationMap[changedKey] =
            isValidValue === false
                ? { isValid: false, errorType: 'INVALID_VALUE' }
                : { isValid: this.validateCardValue(changedKey, changedValue, fieldType) };
    }

    private updateInvalidFields(): void {
        const invalidIds: string[] = [];
        // First pass: Check for invalid values in documentPropertiesToUpdate
        if (Object.keys(this.cardValueValidationMap).length > 0) {
            for (const key of Object.keys(this.documentPropertiesToUpdate)) {
                const validation = this.cardValueValidationMap[key];
                if (validation && !validation.isValid) {
                    invalidIds.push(key);
                }
            }
        }

        // Second pass: Check for missing/empty required properties
        const values = this.cacheService.getAllCachedValues();
        for (const property of this.editableNonNullableProperties) {
            const value = values[property];
            const isMissingOrEmpty = value === null || value === undefined || String(value).trim().length === 0;

            if (
                isMissingOrEmpty && // Only override if not already marked as INVALID_VALUE
                !invalidIds.includes(property)
            ) {
                invalidIds.push(property);
            }
        }
        this.invalidFieldIds.set(invalidIds);
    }

    private validateCardValue(changedKey: string, changedValue: any, fieldType?: FieldType) {
        let invalidCardValue = false;
        if (fieldType === FieldType.Blob || fieldType === FieldType.Complex) {
            const nestedPropertyName: string = Object.keys(changedValue)[0];
            if (this.isEmptyProperty(changedValue[`${nestedPropertyName}`], changedKey, fieldType)) {
                invalidCardValue = this.isPropertyRequired(`${changedKey}.${nestedPropertyName || ''}`);
            }
        } else if (this.isEmptyProperty(changedValue, changedKey, fieldType)) {
            invalidCardValue = this.isPropertyRequired(changedKey);
        }

        return !invalidCardValue;
    }

    private isComplexProperty(changedValue: any, fieldType: FieldType | undefined) {
        return fieldType === FieldType.Complex || (fieldType !== FieldType.Date && typeof changedValue === 'object' && !Array.isArray(changedValue));
    }

    private isEmptyProperty(changedValue: any, changedKey: string, fieldType?: FieldType): boolean {
        if (changedValue == null) {
            return true;
        }
        if (typeof changedValue === 'string' && changedValue.trim().length === 0) {
            return true;
        }
        if (fieldType === FieldType.Integer || fieldType === FieldType.Float) {
            const element = document.querySelector(`[data-automation-id="card-textitem-value-${changedKey}"]`);
            if (element) {
                const inputValue = (element as HTMLInputElement).value;
                if (inputValue === '' || inputValue === null || inputValue === undefined) {
                    return true;
                }
            }
        }
        return !changedValue;
    }

    private isPropertyRequired(propertyName: string): boolean {
        if (this.requiredProperties.includes(propertyName) || this.editableNonNullableProperties.includes(propertyName)) {
            return true;
        }
        return false;
    }

    private getUpdatedComplexProperty(changedKey: string, changedValue: any): KeyValuePairs {
        const existingDataInDocument = this.selectedDocument?.[changedKey] || {};
        const existingUpdateData = this.documentPropertiesToUpdate[changedKey] || {};

        return {
            [changedKey]: {
                ...existingDataInDocument,
                ...existingUpdateData,
                ...changedValue,
            },
        };
    }

    protected enableEditMode() {
        this.editMode = true;
        this.isUpdateInProgress = false;
        this.documentPropertiesToUpdate = {};
        this.invalidFieldIds.set([]);
        this.cardValueValidationMap = {};
        this.initializeRequiredFieldsState();
    }

    protected hasBeenModified(): boolean {
        const schemaValues = Object.keys(this.cacheService.getUpdatedValues());
        return schemaValues.length > 0;
    }

    protected allCardValuesAreValid(): boolean {
        return this.invalidFieldIds().length === 0;
    }

    private allRequiredPropertiesAreSet(): boolean {
        if (Object.values(this.cardValueValidationMap).some((state) => !state.isValid)) {
            return false;
        }
        const values = this.cacheService.getAllCachedValues();
        return this.editableNonNullableProperties.every(
            (property) => values[property] !== null && values[property] !== undefined && values[property].toString().trim().length > 0
        );
    }

    protected onSaveProperties() {
        this.updateInvalidFields();

        if (!this.document?.sys_id) {
            return;
        }

        if (!this.allCardValuesAreValid()) {
            const invalidIds = this.invalidFieldIds();
            const hasInvalidValueErrors = invalidIds.some((key) => this.cardValueValidationMap[key]?.errorType === 'INVALID_VALUE');

            if (hasInvalidValueErrors) {
                this.hxpNotificationService.showError(this.translateService.instant('DOCUMENT.METADATA.VALIDATION.INVALID_VALUE'));
                return;
            }

            const violationsCount = invalidIds.length;

            if (violationsCount > 1) {
                this.hxpNotificationService.showError(this.translateService.instant('DOCUMENT.METADATA.VALIDATION.REQUIRED_MULTIPLE'));
            } else if (violationsCount === 1) {
                // Look up the label of the first empty required field from allEditableProperties$
                const firstViolationKey = invalidIds[0];
                this.allEditableProperties$.pipe(take(1)).subscribe((properties) => {
                    const violatedProperty = properties.find((prop) => prop.key === firstViolationKey);
                    const propertyLabel = violatedProperty?.label;

                    if (propertyLabel) {
                        this.hxpNotificationService.showError(
                            this.translateService.instant('DOCUMENT.METADATA.VALIDATION.REQUIRED', {
                                propertyLabel,
                            })
                        );
                    } else {
                        this.hxpNotificationService.showError(this.translateService.instant('DOCUMENT.METADATA.VALIDATION.INVALID_VALUE'));
                    }
                });
            }
            return;
        }

        this.isUpdateInProgress = true;

        this.documentService
            .updateDocument(this.document.sys_id, this.documentPropertiesToUpdate)
            .pipe(
                take(1),
                finalize(() => {
                    this.isUpdateInProgress = false;
                })
            )
            .subscribe({
                next: (document) => {
                    this.document = document;
                    this.documentPropertiesToUpdate = {};
                    this.hasPendingChanges = false;
                    this.editMode = false;
                    this.cardValueValidationMap = {};
                    this.invalidFieldIds.set([]); // Reset invalid fields after successful save
                    this.cacheService.invalidateCache();
                    this.hxpNotificationService.showSuccess(editPropertiesNotificationMessages[EditPropertiesStatus.SUCCESS]);
                },
                error: () => {
                    this.hxpNotificationService.showError(editPropertiesNotificationMessages[EditPropertiesStatus.ERROR]);
                },
            });
    }

    private updateContentType(changedValue: string) {
        this.fetchCustomSchemaFields(changedValue);
        this.fetchCustomProperties();
        this.updateAllEditableProperties();
        this.isContentTypeChanged = true;
        this.updateInvalidFields();
    }

    private displayToastForRequiredFields() {
        const msg =
            this.requiredCustomFieldLabel.length > 1
                ? this.translateService.instant('DOCUMENT.METADATA.VALIDATION.REQUIRED_MULTIPLE')
                : this.translateService.instant('DOCUMENT.METADATA.VALIDATION.REQUIRED', { propertyLabel: this.requiredCustomFieldLabel[0] });
        this.hxpNotificationService.showError(msg);
    }

    private onSidebarKeyUp() {
        if (this.hasPendingChanges) {
            if (this.dialogRef) {
                this.dialogRef.close();
            } else {
                this.openCancelDialog();
            }
        } else if (this.editMode) {
            this.exitEditMode();
        } else if (!this.dialogRef) {
            this.closePropertySidebar.emit();
        }
    }
}
