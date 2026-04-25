/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { catchError, combineLatest, concat, concatMap, distinct, EMPTY, filter, finalize, forkJoin, from, map, of, tap } from 'rxjs';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { DocumentEntity } from '../states/document.state';
import { DocumentFieldEntity } from '../states/document-field.state';
import {
    ApiDocPage,
    IdpBackendService,
    IdpFieldDataType,
    IdpFileMetadata,
    IdpVerificationStatus,
    UuidService,
    isValidBatchRotation,
    normalizeRotation,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { Store } from '@ngrx/store';
import { selectDocument } from '../selectors/document.selectors';
import { selectCorrelationId, selectTaskInfo, selectTaskInputData } from '../selectors/screen.selectors';
import { ApiDocument, ApiTable, ApiTableRowCell, ApiTableRowRecord } from '../../models/contracts/field-verification-models';
import { cloneDeep } from 'es-toolkit/compat';
import { selectActiveField, selectDocumentFields } from '../selectors/document-field.selectors';
import { DocumentTableEntity } from '../states/document-table.state';
import { IdpDocumentPage, IdpField, IdpTable, IdpTaskData, IdpValidationStatus } from '../../models/screen-models';
import { selectDocumentTables } from '../selectors/document-table.selectors';
import { IdpImageLoadingService } from '../../services/image/idp-image-loading.service';
import { ValidationProcessService } from '../../services/validation-process/validation-process.service';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { ValidationField, ValidationTable } from '../../models/validation-models';
import { IdpTableCellValidationService } from '../../services/table-cell-validation/table-cell-validation.service';

@Injectable()
export class DocumentEffects {
    private readonly imageLoadingService = inject(IdpImageLoadingService);
    private readonly idpBackendService = inject(IdpBackendService);
    private readonly validationProcessService = inject(ValidationProcessService);
    private readonly tableCellValidationService = inject(IdpTableCellValidationService);
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly actions$ = inject(Actions);
    private readonly store = inject(Store);
    private readonly uuidService = inject(UuidService);

    loadDocumentEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadSuccess),
            map(({ taskData }) => {
                const taskDocument = taskData.batchState.documents[taskData.documentIndex];
                const documentClass = taskData.classificationConfiguration.documentClassDefinitions.find(
                    (docClass) => docClass.id === taskDocument.classId
                );
                if (!documentClass) {
                    return systemActions.documentLoadError({ error: `Document class not found - ${taskDocument.classId}` });
                }

                const fieldDefinitions = taskData.extractionConfiguration.fieldDefinitionsByClass.find((f) => f.documentClassId === documentClass.id);
                const allFieldDefs = fieldDefinitions?.fieldDefinitions ?? [];

                const documentState: DocumentEntity = {
                    id: taskDocument.id,
                    name: taskDocument.name,
                    class: {
                        ...documentClass,
                        formModelKey: fieldDefinitions?.formModelKey,
                        validationProcessName: fieldDefinitions?.validationProcessName,
                        validationProcessId: fieldDefinitions?.validationProcessId,
                    },
                    rejectReasonId: taskDocument.rejectReasonId,
                    markAsRejected: taskDocument.markAsRejected,
                    rejectNote: taskDocument.rejectNote,
                    pages: taskDocument.pages.map((taskPage) => {
                        const pageId = `${taskPage.contentFileReferenceIndex}_${taskPage.sourcePageIndex}`;
                        return {
                            id: pageId,
                            name: `Page ${pageId}`,
                            fileReference: taskData.batchState.contentFileReferences[taskPage.contentFileReferenceIndex].sys_id,
                            contentFileReferenceIndex: taskPage.contentFileReferenceIndex,
                            sourcePageIndex: taskPage.sourcePageIndex,
                            rotation: taskPage.rotation,
                            height: taskPage.height,
                            width: taskPage.width,
                        };
                    }),
                };

                const totalFieldDefs = allFieldDefs.length;
                const tables: DocumentTableEntity[] = [];
                const fields: DocumentFieldEntity[] = [];
                for (const [fieldIndex, fieldDef] of allFieldDefs.entries()) {
                    // Map tables - Add one placeholder entry for the table field and all cells as linked entries
                    if (fieldDef.dataType === IdpFieldDataType.Table) {
                        const docTable = taskDocument.tables?.find((t) => t.id === fieldDef.id);

                        const tableVerificationStatus =
                            docTable?.reviewStatus === 'ReviewNotRequired' ? IdpVerificationStatus.AutoValid : IdpVerificationStatus.AutoInvalid;
                        const tableExtractionConfidence = docTable?.extractionConfidence || 0;
                        const tableColumnNames = docTable?.columnHeaderNames || [];

                        const tableFieldMatrix: string[][] = [];
                        const tableFields: DocumentFieldEntity[] = [];
                        for (const [rowIndex, rowRecord] of docTable?.records?.entries() || []) {
                            const columnFields: DocumentFieldEntity[] = tableColumnNames.map((columnName) => {
                                const relatedRecord = rowRecord.records?.find((r) => r.recordName === columnName);
                                const columnCellId = this.uuidService.generate();
                                const tableCellField: DocumentFieldEntity = {
                                    id: columnCellId,
                                    name: columnName,
                                    dataType: relatedRecord?.type || IdpFieldDataType.Text,
                                    format: '',
                                    order: totalFieldDefs + fieldIndex,
                                    confidence: tableExtractionConfidence,
                                    verificationStatus: tableVerificationStatus,
                                    validationStatus: IdpValidationStatus.Valid,
                                    value: relatedRecord?.value ?? '',
                                    tableId: fieldDef.id,
                                    boundingBox: relatedRecord?.boundingBox,
                                };

                                // Apply validation if column has validation rules
                                const columnValidation = fieldDef.columns?.find((column) => column.name === columnName)?.validation;
                                if (columnValidation) {
                                    const isValid = this.validateTableCellField(tableCellField, columnValidation);
                                    tableCellField.validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;
                                }

                                return tableCellField;
                            });

                            tableFieldMatrix[rowIndex] = columnFields.map((columnCell) => columnCell.id);
                            tableFields.push(...columnFields);
                        }

                        // Calculate the table validation status based on cell validation statuses
                        const validateTable = () => {
                            if (tableFields.some((cell) => cell.validationStatus === IdpValidationStatus.Invalid)) {
                                return IdpValidationStatus.Invalid;
                            }
                            const hasNoRows = (docTable?.records?.length ?? 0) === 0;
                            if (hasNoRows && this.isTableRequired(fieldDef.id, taskData)) {
                                return IdpValidationStatus.Invalid;
                            }
                            return IdpValidationStatus.Valid;
                        };
                        const tableValidationStatus = validateTable();

                        const tableField: DocumentFieldEntity = {
                            id: fieldDef.id,
                            name: fieldDef.name,
                            dataType: IdpFieldDataType.Table,
                            format: '',
                            order: fieldIndex,
                            confidence: tableExtractionConfidence,
                            verificationStatus: tableVerificationStatus,
                            validationStatus: tableValidationStatus,
                            validatorName: fieldDef.validation?.process?.name,
                        };

                        const tableEntity: DocumentTableEntity = {
                            id: fieldDef.id,
                            name: fieldDef.name,
                            columnHeaderNames: tableColumnNames,
                            rows: tableFieldMatrix,
                            validationStatus: tableValidationStatus,
                            validatorName: fieldDef.validation?.process?.name,
                            isDirty: false,
                        };

                        tables.push(tableEntity);
                        fields.push(tableField, ...tableFields);
                        continue;
                    }

                    // Map other fields - non table fields
                    const docField = taskDocument.fields?.find((f) => f.id === fieldDef.id);
                    const relatedPageId =
                        docField?.boundingBox?.pageIndex === undefined ? '' : documentState.pages[docField.boundingBox.pageIndex]?.id;
                    const field: DocumentFieldEntity = {
                        id: fieldDef.id,
                        name: fieldDef.name,
                        dataType: fieldDef.dataType,
                        format: fieldDef.format,
                        order: fieldIndex,
                        value: docField?.value,
                        confidence: docField?.extractionConfidence || 0,
                        boundingBox: docField?.boundingBox
                            ? {
                                  ...docField.boundingBox,
                                  pageId: relatedPageId,
                              }
                            : undefined,
                        verificationStatus:
                            docField?.extractionReviewStatus === 'ReviewNotRequired'
                                ? IdpVerificationStatus.AutoValid
                                : IdpVerificationStatus.AutoInvalid,
                        validationStatus: IdpValidationStatus.Valid,
                        validatorName: fieldDef.validation?.process?.name,
                    };
                    fields.push(field);
                }

                return systemActions.documentLoad({
                    documentState,
                    fields,
                    tables,
                });
            })
        )
    );

    syncRecognitionMetadataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.documentLoad),
            concatLatestFrom(() => this.store.select(selectCorrelationId)),
            concatLatestFrom(() => this.store.select(selectTaskInputData)),
            concatMap(([[{ documentState }, correlationId], taskInputData]) => {
                if (!correlationId || !taskInputData) {
                    return EMPTY;
                }

                const fileReferences = taskInputData.batchState.contentFileReferences.map((ref) => ref.sys_id);
                const pagesNeedingSync: Array<{ contentFileReferenceIndex: number; pageIndex: number; rotation: number }> = [];

                // Prepare page state to dispatch (reset viewerRotation to 0)
                const pagesState = documentState.pages.map((page) => ({
                    pageId: page.id,
                    documentId: documentState.id,
                    rotation: normalizeRotation(page.rotation ?? 0),
                    viewerRotation: 0,
                }));

                // Fetch all file metadata and compare with batch state
                const metadataRequests = fileReferences.map((fileRef) =>
                    this.idpBackendService.getFileMetadata$(correlationId, fileRef).pipe(
                        tap((metadata) => {
                            if (!metadata) {
                                return;
                            }

                            // Check all pages from this document
                            for (const page of documentState.pages) {
                                this.checkPageRotationSync(page, fileRef, metadata, pagesState, pagesNeedingSync);
                            }
                        }),
                        catchError(() => of(undefined))
                    )
                );

                return forkJoin(metadataRequests.length > 0 ? metadataRequests : [of(undefined)]).pipe(
                    concatMap(() => {
                        // Always dispatch page rotation state to store
                        if (pagesNeedingSync.length === 0) {
                            // No sync needed, just dispatch the state
                            return of(userActions.updatePagesRotation({ pages: pagesState, taskDataSynced: undefined }));
                        }

                        const syncMessage = `[IDP] Task load: Syncing ${pagesNeedingSync.length} page(s) recognition metadata to match batch state`;
                        console.warn(syncMessage);

                        return this.idpBackendService.updateRotationData$(correlationId, fileReferences, pagesNeedingSync).pipe(
                            map(() => {
                                const successMessage = `[IDP] Task load: Successfully synced recognition metadata for ${pagesNeedingSync.length} page(s)`;
                                console.warn(successMessage);
                                return userActions.updatePagesRotation({ pages: pagesState, taskDataSynced: undefined });
                            }),
                            catchError((err) => {
                                console.error('[IDP] Task load: Failed to sync recognition metadata:', err);
                                return of(userActions.updatePagesRotation({ pages: pagesState, taskDataSynced: undefined }));
                            }),
                            finalize(() => this.imageLoadingService.cleanup())
                        );
                    })
                );
            })
        )
    );

    selectInitialFieldEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.documentLoad),
            concatLatestFrom(() => this.store.select(selectDocumentFields)),
            map(([, allFields]) => {
                const fieldToSelect = allFields.find((f) => f.hasIssue) || allFields[0];
                return systemActions.movedToNextField({ id: fieldToSelect?.id });
            })
        )
    );

    preloadPagesEffect$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(systemActions.documentLoad),
                concatLatestFrom(() => this.store.select(selectDocumentFields)),
                concatMap(([action, fields]) => {
                    // preload all pages, starting with pages associated with fields
                    return concat(
                        fields.filter((field) => field.hasIssue).map((field) => field.boundingBox?.pageId),
                        fields.map((field) => field.boundingBox?.pageId),
                        action.documentState.pages.map((page) => page.id)
                    ).pipe(
                        filter((pageId): pageId is string => pageId !== undefined),
                        distinct(),
                        concatMap((pageId) =>
                            combineLatest([this.imageLoadingService.getImageDataForPage$(pageId), this.imageLoadingService.getPageOcrData$(pageId)])
                        )
                    );
                })
            ),
        { dispatch: false }
    );

    moveNextFieldEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.selectNextField),
            concatLatestFrom(() => [this.store.select(selectActiveField), this.store.select(selectDocumentFields)]),
            map(([, selectedField, documentFields]) => {
                const currentIndex = documentFields.findIndex((field) => field.id === selectedField?.id || field.id === selectedField?.tableId);
                const nextField =
                    documentFields.find((field, index) => field.hasIssue && index > currentIndex) ?? // next field with issue
                    documentFields.find((field, index) => field.hasIssue && index <= currentIndex) ?? // next field with issue, possibly wrapped
                    documentFields.at((currentIndex + 1) % documentFields.length); // next field, possibly wrapped
                return systemActions.movedToNextField({ id: nextField?.id });
            })
        )
    );

    fieldValueUpdateEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.fieldValueUpdate),
            concatLatestFrom(() => [this.store.select(selectDocumentFields), this.store.select(selectDocumentTables)]),
            concatMap(([{ fieldId, value, boundingBox, confidence, validationStatus }, allFields, allTables]) => {
                const field = allFields.find((f) => f.id === fieldId);
                const actions = [];

                actions.push(
                    systemActions.applyFieldValueUpdate({
                        fieldId,
                        value,
                        boundingBox,
                        confidence,
                        validationStatus,
                    })
                );

                if (field) {
                    // Updated field is a regular field, so check for value change to trigger validation
                    const hasValueChanged = (field.value ?? '') !== (value ?? '');
                    if (hasValueChanged) {
                        actions.push(
                            systemActions.runValidationProcessIfConfigured({
                                triggeringFieldId: fieldId,
                            })
                        );
                    }
                } else {
                    // Updated field is a table cell, so mark the parent table as dirty
                    const { isDirty, tableId } = this.checkTableCellValueChange(allTables, fieldId, value);
                    if (isDirty && tableId) {
                        actions.push(systemActions.updateTableDirtyFlag({ tableId, isDirty: true }));
                    }
                    // Note: Table validation status will be checked in a separate effect after field update is applied
                }

                return actions;
            })
        )
    );

    // Check table validation status after field updates are applied to the store
    // This ensures we're checking against fresh data, not stale data from before the update
    checkTableValidationAfterFieldUpdateEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.applyFieldValueUpdate),
            concatLatestFrom(() => [this.store.select(selectDocumentFields), this.store.select(selectDocumentTables)]),
            concatMap(([{ fieldId }, allFields, allTables]) => {
                const field = allFields.find((f) => f.id === fieldId);

                // If field is found in header fields (not a table cell), skip table validation
                if (field) {
                    return EMPTY;
                }

                // Find which table this field belongs to
                const table = allTables.find((t) => t.rows.some((row) => row.rowCells.some((cell) => cell.id === fieldId)));

                if (table) {
                    const tableValidationStatus = this.checkTableValid(allTables, table.id);
                    return of(
                        systemActions.fieldValidationUpdate({
                            fieldId: table.id,
                            validationStatus: tableValidationStatus,
                        })
                    );
                }

                return EMPTY;
            })
        )
    );

    checkTableValidationAfterBatchTableUpdateEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(
                userActions.addTableRowFields,
                userActions.clearTableRowFields,
                userActions.updateTableRowFields,
                userActions.deleteTableRowFields,
                userActions.clearTableColumnFields,
                userActions.updateTableColumnFields
            ),
            concatLatestFrom(() => [this.store.select(selectDocumentTables), this.store.select(selectTaskInputData)]),
            concatMap(([{ tableId }, allTables, taskInputData]) => {
                const table = allTables.find((candidate) => candidate.id === tableId);
                if (!table) {
                    return EMPTY;
                }

                return of(
                    systemActions.fieldValidationUpdate({
                        fieldId: tableId,
                        validationStatus: this.checkTableValid(allTables, tableId, taskInputData),
                    })
                );
            })
        )
    );

    checkTableValidationAfterDeleteTableEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.deleteTableFields),
            concatLatestFrom(() => this.store.select(selectTaskInputData)),
            concatMap(([{ tableId }, taskInputData]) => {
                if (!this.isTableRequired(tableId, taskInputData)) {
                    return EMPTY;
                }
                return of(
                    systemActions.fieldValidationUpdate({
                        fieldId: tableId,
                        validationStatus: IdpValidationStatus.Invalid,
                    })
                );
            })
        )
    );

    runValidationProcessIfTableIsDirtyEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.runValidationProcessIfTableIsDirty),
            concatLatestFrom(() => this.store.select(selectDocumentTables)),
            concatMap(([{ tableId }, allDocumentTables]) => {
                const table = allDocumentTables.find((t) => t.id === tableId);

                if (table?.isDirty) {
                    return of(systemActions.runValidationProcessIfConfigured({ triggeringFieldId: tableId }));
                }

                return EMPTY;
            })
        )
    );

    runValidationProcessIfConfiguredEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.runValidationProcessIfConfigured),
            concatLatestFrom(() => [
                this.store.select(selectDocument),
                this.store.select(selectDocumentFields),
                this.store.select(selectDocumentTables),
                this.featuresService.isOn$(WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL),
                this.featuresService.isOn$(WORKSPACE_IDP_HXP.FIELD_VALIDATION_RULES),
            ]),
            concatMap(
                ([
                    { triggeringFieldId },
                    document,
                    allDocumentFields,
                    allDocumentTables,
                    formAsMetadataPanelEnabled,
                    fieldValidationRulesEnabled,
                ]) => {
                    const areFeatureFlagsEnabled = formAsMetadataPanelEnabled && fieldValidationRulesEnabled;
                    if (!areFeatureFlagsEnabled) {
                        return EMPTY;
                    }

                    let validatorName = '';
                    let triggeringFieldName = '';
                    const triggeringField = allDocumentFields.find((f) => f.id === triggeringFieldId);
                    if (triggeringField) {
                        validatorName = triggeringField.validatorName || '';
                        triggeringFieldName = triggeringField.name;
                    } else {
                        const triggeringTable = allDocumentTables.find((t) => t.id === triggeringFieldId);
                        validatorName = triggeringTable?.validatorName || '';
                        triggeringFieldName = triggeringTable?.name || '';
                    }

                    const isValidationConfigured = !!document.class.validationProcessName && !!document.class.validationProcessId && !!validatorName;
                    if (!isValidationConfigured) {
                        return EMPTY;
                    }

                    return of(
                        systemActions.runValidationProcess({
                            triggeringFieldName,
                            validationProcessName: document.class.validationProcessName,
                            validationProcessId: document.class.validationProcessId,
                            validatorName,
                        })
                    );
                }
            )
        )
    );

    runValidationProcessEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.runValidationProcess),
            concatLatestFrom(() => [
                this.store.select(selectTaskInfo),
                this.store.select(selectDocumentFields),
                this.store.select(selectDocumentTables),
            ]),
            concatMap(
                ([
                    { triggeringFieldName, validationProcessName, validationProcessId, validatorName },
                    taskContext,
                    allDocumentFields,
                    allDocumentTables,
                ]) => {
                    const validationProcessInfo = {
                        processId: validationProcessId,
                        processName: validationProcessName,
                        appName: taskContext.appName,
                        validatorName: validatorName,
                    };

                    return this.validationProcessService
                        .runValidationProcess$(validationProcessInfo, triggeringFieldName, allDocumentFields, allDocumentTables)
                        .pipe(
                            concatMap((results) => {
                                const fieldValidationActions = this.getFieldValidationUpdateActions(allDocumentFields, results.fields);
                                const tableValidationActions = this.getTableValidationUpdateActions(allDocumentTables, results.tables);

                                const actions = [...fieldValidationActions, ...tableValidationActions];

                                const triggeringTable = allDocumentTables.find((t) => t.name === triggeringFieldName);
                                if (triggeringTable) {
                                    actions.push(
                                        systemActions.updateTableDirtyFlag({
                                            tableId: triggeringTable.id,
                                            isDirty: false,
                                        })
                                    );
                                }

                                // Execute validation process complete action after all field/table updates so that the Submit button state is correctly updated
                                return concat(from(actions), of(systemActions.validationProcessComplete()));
                            }),
                            catchError((error) => {
                                console.error('Validation process error:', typeof error === 'string' ? error : error.message);

                                const triggeringField = allDocumentFields.find((f) => f.name === triggeringFieldName);
                                const triggeringTable = allDocumentTables.find((t) => t.name === triggeringFieldName);
                                const triggeringFieldId = triggeringField?.id ?? triggeringTable?.id;

                                const invalidFieldAction = triggeringFieldId
                                    ? [
                                          systemActions.fieldValidationUpdate({
                                              fieldId: triggeringFieldId,
                                              validationStatus: 'Invalid',
                                          }),
                                      ]
                                    : [];

                                return of(
                                    ...invalidFieldAction,
                                    systemActions.notificationShow({
                                        severity: 'error',
                                        message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_PROCESS_ERROR',
                                    }),
                                    systemActions.validationProcessComplete()
                                );
                            })
                        );
                }
            )
        )
    );

    tableValueUpdateEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.tableValidationUpdate),
            concatLatestFrom(() => this.store.select(selectDocumentTables)),
            concatMap(([{ tableId, validationStatus, records }, allTables]) => {
                const table = allTables.find((t) => t.id === tableId);
                if (!table) {
                    return EMPTY;
                }

                const actions = [];

                if (validationStatus) {
                    actions.push(systemActions.fieldValidationUpdate({ fieldId: tableId, validationStatus }));
                }

                if (records?.length > 0) {
                    if (records.length !== table.rows.length) {
                        actions.push(
                            systemActions.notificationShow({
                                severity: 'error',
                                message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_ROW_MISMATCH',
                            })
                        );
                        return from(actions);
                    }

                    const updatedTableColumnCount = records[0].length;
                    const existingTableColumnCount = table.rows[0].rowCells.length;
                    if (updatedTableColumnCount !== existingTableColumnCount) {
                        actions.push(
                            systemActions.notificationShow({
                                severity: 'error',
                                message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_COLUMN_MISMATCH',
                            })
                        );
                        return from(actions);
                    }

                    const cellUpdates: Array<{ fieldId: string; value: string | undefined }> = [];
                    records.forEach((rowCells, rowIndex) => {
                        const row = table.rows[rowIndex];
                        rowCells.forEach((cell, colIndex) => {
                            const tableCell = row.rowCells[colIndex];
                            if (tableCell) {
                                cellUpdates.push({ fieldId: tableCell.id, value: cell.updatedValue ?? cell.value });
                            }
                        });
                    });
                    actions.push(systemActions.bulkFieldValidationUpdate({ updates: cellUpdates }));
                }

                return from(actions);
            })
        )
    );

    setTableDirtyEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(
                userActions.clearTableRowFields,
                userActions.updateTableRowFields,
                userActions.deleteTableRowFields,
                userActions.clearTableColumnFields,
                userActions.updateTableColumnFields
            ),
            map((action) => systemActions.updateTableDirtyFlag({ tableId: action.tableId, isDirty: true }))
        )
    );

    addTableRowEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.addTableRow),
            concatLatestFrom(() => [
                this.store.select(selectDocumentTables),
                this.store.select(selectDocumentFields),
                this.store.select(selectTaskInputData),
            ]),
            map(([{ tableId, rowIndex }, tables, fields, taskInputData]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table) {
                    return { type: '[Noop]' };
                }

                const tableColumnNames = table.columnHeaderNames || [];
                const fieldIndex = fields.findIndex((f) => f.id === tableId);

                // Get column validation rules from field definitions
                const columnValidations = this.getColumnValidations(taskInputData, tableId);

                // Generate DocumentFieldEntity objects for each cell
                const newCellFields: DocumentFieldEntity[] = tableColumnNames.map((columnName) => {
                    const cellField: DocumentFieldEntity = {
                        id: this.uuidService.generate(),
                        name: columnName,
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        order: fieldIndex,
                        confidence: fields[fieldIndex]?.confidence || 1,
                        verificationStatus: fields[fieldIndex]?.verificationStatus || IdpVerificationStatus.ManualValid,
                        validationStatus: IdpValidationStatus.Valid,
                        value: '',
                        tableId,
                        boundingBox: undefined,
                    };

                    // Apply validation if column has validation rules
                    const columnValidation = columnValidations.find((col) => col.name === columnName)?.validation;
                    if (columnValidation) {
                        const isValid = this.validateTableCellField(cellField, columnValidation);
                        cellField.validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;
                    }

                    return cellField;
                });

                return userActions.addTableRowFields({
                    tableId,
                    rowIndex,
                    fields: newCellFields,
                });
            })
        )
    );

    clearTableRowEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.clearTableRow),
            concatLatestFrom(() => [this.store.select(selectDocumentTables), this.store.select(selectTaskInputData)]),
            map(([{ tableId, rowIndex }, tables, taskInputData]) => {
                const table = tables.find((t) => t.id === tableId);
                const row = table?.rows?.[rowIndex];
                if (!row) {
                    return { type: '[Noop]' };
                }

                // Get column validation rules from field definitions
                const columnValidations = this.getColumnValidations(taskInputData, tableId);

                // Update the rowCells directly, clearing their values and validating
                const clearedRowCells = row.rowCells.map((cell) => {
                    // Always recalculate validation status
                    const columnValidation = columnValidations.find((col) => col.name === cell.name);
                    const isValid = this.validateTableCellField({ ...cell, value: '' } as any, columnValidation?.validation);
                    const validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;

                    const clearedCell: DocumentFieldEntity = {
                        id: cell.id,
                        name: cell.name,
                        dataType: cell.dataType,
                        format: cell.format,
                        order: rowIndex,
                        confidence: cell.confidence,
                        verificationStatus: cell.verificationStatus,
                        validationStatus,
                        value: '',
                        tableId: cell.tableId,
                        boundingBox: undefined,
                    };

                    return clearedCell;
                });

                return userActions.clearTableRowFields({
                    tableId,
                    rowIndex,
                    fields: clearedRowCells,
                });
            })
        )
    );

    updateTableRowEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.updateTableRow),
            concatLatestFrom(() => [this.store.select(selectDocumentTables), this.store.select(selectTaskInputData)]),
            map(([{ tableId, rowIndex, rowCells }, tables, taskInputData]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table) {
                    return { type: '[Noop]' };
                }

                // Get column validation rules from field definitions
                const columnValidations = this.getColumnValidations(taskInputData, tableId);

                // Ensure each cell has the required 'order' property and recalculate validation
                const documentFieldEntities = this.validateAndMapCells(rowCells, columnValidations, rowIndex);
                return userActions.updateTableRowFields({
                    tableId,
                    rowIndex,
                    fields: documentFieldEntities,
                });
            })
        )
    );

    clearTableColumnEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.clearTableColumn),
            concatLatestFrom(() => [this.store.select(selectDocumentTables), this.store.select(selectTaskInputData)]),
            map(([{ tableId, columnIndex }, tables, taskInputData]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table) {
                    return { type: '[Noop]' };
                }

                // Get column validation rules from field definitions
                const columnValidations = this.getColumnValidations(taskInputData, tableId);

                // Get the field IDs for the column being cleared and validate
                const clearedColumnCells: DocumentFieldEntity[] = [];
                for (const [rowIndex, row] of table.rows.entries()) {
                    const cell = row.rowCells[columnIndex];
                    if (!cell) {
                        continue;
                    }

                    const columnValidation = columnValidations.find((cv) => cv.name === cell.name);
                    const isValid = this.validateTableCellField({ ...cell, value: '' } as DocumentFieldEntity, columnValidation?.validation);
                    const validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;

                    clearedColumnCells.push({
                        ...cell,
                        order: rowIndex,
                        value: '',
                        boundingBox: undefined,
                        validationStatus,
                    });
                }
                return userActions.clearTableColumnFields({
                    tableId,
                    columnIndex,
                    fields: clearedColumnCells,
                });
            })
        )
    );

    updateTableColumnEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.updateTableColumn),
            concatLatestFrom(() => [this.store.select(selectDocumentTables), this.store.select(selectTaskInputData)]),
            map(([{ tableId, columnIndex, columnCells }, tables, taskInputData]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table) {
                    return { type: '[Noop]' };
                }

                // Get column validation rules from field definitions
                const columnValidations = this.getColumnValidations(taskInputData, tableId);

                // Map the column cells to DocumentFieldEntity format with proper row order and recalculate validation
                const documentFieldEntities = this.validateAndMapCells(columnCells, columnValidations);

                return userActions.updateTableColumnFields({
                    tableId,
                    columnIndex,
                    fields: documentFieldEntities,
                });
            })
        )
    );

    insertTableRowEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.insertTableRow),
            concatLatestFrom(() => [this.store.select(selectDocumentTables), this.store.select(selectTaskInputData)]),
            map(([{ tableId, rowIndex, rowCells }, tables, taskInputData]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table) {
                    return { type: '[Noop]' };
                }

                // Get column validation rules from field definitions
                const columnValidations = this.getColumnValidations(taskInputData, tableId);

                // Convert IdpField[] to DocumentFieldEntity[] with proper order and validation
                const documentFieldEntities = this.validateAndMapCells(rowCells, columnValidations, rowIndex);

                return userActions.insertTableRowFields({
                    tableId,
                    rowIndex,
                    fields: documentFieldEntities,
                });
            })
        )
    );

    deleteTableRowEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.deleteTableRow),
            concatLatestFrom(() => [this.store.select(selectDocumentTables)]),
            map(([{ tableId, rowIndex }, tables]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table || rowIndex < 0 || rowIndex >= table.rows?.length) {
                    return { type: '[Noop]' };
                }
                // Get the field IDs for the row being deleted
                const fieldIds = table.rows[rowIndex].rowCells.map((cell) => cell.id);

                return userActions.deleteTableRowFields({
                    tableId,
                    rowIndex,
                    fieldIds,
                });
            })
        )
    );

    deleteTableEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.deleteTable),
            concatLatestFrom(() => [this.store.select(selectDocumentTables)]),
            map(([{ tableId }, tables]) => {
                const table = tables.find((t) => t.id === tableId);
                if (!table) {
                    return { type: '[Noop]' };
                }
                // Collect all field IDs from all rows in the table
                const fieldIds = table.rows.flatMap((row) => row.rowCells.map((cell) => cell.id));
                return userActions.deleteTableFields({ tableId, fieldIds });
            })
        )
    );

    taskDataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskPrepareUpdate),
            concatLatestFrom(() => {
                return [
                    this.store.select(selectDocument),
                    this.store.select(selectDocumentFields),
                    this.store.select(selectDocumentTables),
                    this.store.select(selectTaskInputData),
                ];
            }),
            map(([{ taskAction, openNextTask }, documentState, allFields, allTables, taskInputData]) => {
                if (!taskInputData) {
                    return systemActions.taskPrepareUpdateError({ taskAction, error: 'Task data not found' });
                }

                const taskDocument = taskInputData.batchState.documents[taskInputData.documentIndex];

                let anyFieldWithIssue = false;
                let anyTableWithIssue = false;

                const isRejected = Boolean(documentState.rejectReasonId);
                const extractedFieldsById = new Map(taskDocument.fields?.map((orig) => [orig.id, orig]) ?? []);

                const updatedDocument: ApiDocument = {
                    ...taskDocument,
                    pages: taskDocument.pages.map((page) => {
                        const id = `${page.contentFileReferenceIndex}_${page.sourcePageIndex}`;
                        const pageState = documentState.pages.find((p) => p.id === id);
                        return {
                            ...page,
                            rotation: normalizeRotation((pageState?.rotation ?? 0) - (pageState?.viewerRotation ?? 0)),
                        };
                    }),
                    fields: allFields
                        .filter((f) => f.dataType !== IdpFieldDataType.Table)
                        .map((f) => {
                            anyFieldWithIssue ||= f.hasIssue || false;
                            const extractedField = extractedFieldsById.get(f.id) ?? {};
                            return {
                                ...extractedField,
                                id: f.id,
                                name: f.name,
                                value: f.value,
                                extractionConfidence: f.confidence,
                                extractionReviewStatus: f.hasIssue ? 'ReviewRequired' : 'ReviewNotRequired',
                                boundingBox: f.boundingBox
                                    ? {
                                          top: f.boundingBox.top,
                                          left: f.boundingBox.left,
                                          height: f.boundingBox.height,
                                          width: f.boundingBox.width,
                                          pageIndex:
                                              f.boundingBox.pageIndex ?? documentState.pages.findIndex((page) => page.id === f.boundingBox?.pageId),
                                      }
                                    : undefined,
                            };
                        }),
                    rejectReasonId: documentState.rejectReasonId,
                    markAsRejected: !!documentState.rejectReasonId,
                    rejectNote: documentState.rejectNote,
                    tables: allTables.map((table) => {
                        // Rebuild records based on table rows
                        let anyTableFieldManuallyVerified = false;
                        const tableRecords: ApiTableRowRecord[] = [];
                        for (const row of table.rows) {
                            const rowRecords: ApiTableRowCell[] = [];
                            for (const field of row.rowCells) {
                                if (field.verificationStatus === IdpVerificationStatus.ManualValid) {
                                    anyTableFieldManuallyVerified = true;
                                }
                                if (field.validationStatus === IdpValidationStatus.Invalid) {
                                    anyTableWithIssue = true;
                                }
                                rowRecords.push({
                                    recordName: field.name,
                                    type: field.dataType,
                                    value: field.value,
                                    boundingBox: field.boundingBox,
                                });
                            }
                            tableRecords.push({ records: rowRecords });
                        }
                        const tableField = allFields.find((f) => f.id === table.id);
                        const tableReviewStatus =
                            tableField?.verificationStatus === IdpVerificationStatus.ManualValid ||
                            (tableField?.verificationStatus === IdpVerificationStatus.AutoValid &&
                                tableField?.validationStatus !== IdpValidationStatus.Invalid)
                                ? 'ReviewNotRequired'
                                : 'ReviewRequired';

                        const tableFromTask: ApiTable = taskDocument.tables?.find((t) => t.id === table.id) || {
                            id: table.id,
                            name: table.name,
                            columnHeaderNames: table.columnHeaderNames,
                            columnHeaderBoundingBoxes: [],
                            tableBoundingBoxes: [],
                            pageIndexes: [],
                            extractionConfidence: 0,
                            reviewStatus: tableReviewStatus,
                            records: [],
                        };
                        return {
                            ...tableFromTask,
                            reviewStatus: tableReviewStatus,
                            extractionConfidence: anyTableFieldManuallyVerified ? 1 : tableFromTask.extractionConfidence,
                            records: tableRecords,
                            validationStatus: anyTableWithIssue ? 'Invalid' : 'Valid',
                        };
                    }),
                };
                updatedDocument.extractionReviewStatus = anyFieldWithIssue || anyTableWithIssue ? 'ReviewRequired' : 'ReviewNotRequired';

                const updatedTaskData = cloneDeep(taskInputData);
                updatedTaskData.batchState.documents[taskInputData.documentIndex] = updatedDocument;
                updatedTaskData.batchState.hasRejectedDocuments ||= isRejected;

                // Re-evaluate batch state extraction status
                updatedTaskData.batchState.extractionStatus = updatedTaskData.batchState.documents.some(
                    (doc) => doc.extractionReviewStatus === 'ReviewRequired'
                )
                    ? 'ReviewRequired'
                    : 'Extracted';

                return systemActions.updateDocumentRotation({ taskAction, taskData: updatedTaskData, openNextTask });
            })
        )
    );

    updateRotationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.updateDocumentRotation),
            concatLatestFrom(() => this.store.select(selectCorrelationId)),
            concatLatestFrom(() => this.store.select(selectDocument)),
            concatMap(([[{ taskAction, taskData, openNextTask }, correlationId], document]) => {
                const isSaveOrComplete = taskAction === 'Save' || taskAction === 'Complete';
                const fileReferences = [...new Set(taskData.batchState.contentFileReferences.map((ref) => ref.sys_id))];
                if (fileReferences.length === 0 || !isSaveOrComplete) {
                    return of(systemActions.taskPrepareUpdateSuccess({ taskAction, taskData, openNextTask }));
                }

                // Check if any page has user rotation (viewerRotation !== 0)
                const hasUserRotation = document.pages.some((page: IdpDocumentPage) => (page.viewerRotation ?? 0) !== 0);

                // Prepare rotation data for all pages (always sync on save/complete)
                const allPages = taskData.batchState.documents.find((doc: ApiDocument) => doc.id === document.id)?.pages ?? [];

                const pagesWithIndex = hasUserRotation
                    ? allPages.map((page: ApiDocPage) => ({
                          contentFileReferenceIndex: page.contentFileReferenceIndex,
                          pageIndex: page.sourcePageIndex,
                          rotation: normalizeRotation(page.rotation ?? 0),
                      }))
                    : [];

                const pagesState = document.pages.map((page: IdpDocumentPage) => {
                    const matchingDoc = taskData.batchState.documents.find((doc: ApiDocument) => doc.id === page.documentId);
                    const matchingPage = matchingDoc?.pages.find(
                        (p: ApiDocPage) => `${p.contentFileReferenceIndex}_${p.sourcePageIndex}` === page.id
                    );
                    return {
                        pageId: page.id,
                        documentId: page.documentId,
                        rotation: normalizeRotation(matchingPage?.rotation ?? 0),
                        viewerRotation: 0,
                    };
                });

                // Only update recognition metadata if user rotated pages (viewerRotation changed)
                if (!hasUserRotation || pagesWithIndex.length === 0) {
                    this.store.dispatch(userActions.updatePagesRotation({ pages: pagesState, taskDataSynced: undefined }));
                    return of(systemActions.taskPrepareUpdateSuccess({ taskAction, taskData, openNextTask }));
                }

                return this.idpBackendService.updateRotationData$(correlationId, fileReferences, pagesWithIndex).pipe(
                    map(() => {
                        this.store.dispatch(userActions.updatePagesRotation({ pages: pagesState, taskDataSynced: undefined }));
                        return systemActions.taskPrepareUpdateSuccess({ taskAction, taskData, openNextTask });
                    }),
                    catchError(() => of(systemActions.taskPrepareUpdateError({ taskAction, error: 'Failed to update rotation data' }))),
                    finalize(() => this.imageLoadingService.cleanup())
                );
            })
        )
    );

    restoreTableEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.restoreTable),
            map(({ tableId, tableData, tableFields }) => {
                // Convert IdpTable to DocumentTableEntity
                const documentTableEntity: DocumentTableEntity = {
                    id: tableData.id,
                    name: tableData.name,
                    columnHeaderNames: tableData.columnHeaderNames,
                    rows: tableData.rows.map((row) => row.rowCells.map((cell) => cell.id)),
                    validationStatus: tableData.validationStatus,
                    validatorName: tableData.validatorName,
                    isDirty: tableData.isDirty,
                };

                // Convert IdpField[] to DocumentFieldEntity[]
                const documentFieldEntities: DocumentFieldEntity[] = tableFields.map((field, index) => ({
                    ...field,
                    order: index, // Maintain field order
                }));

                return userActions.restoreTableFields({
                    tableId,
                    tableData: documentTableEntity,
                    fields: documentFieldEntities,
                });
            })
        )
    );

    rejectBatchEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.rejectReasonUpdate),
            filter(({ doCompleteTask }) => doCompleteTask),
            map(() => userActions.taskComplete())
        )
    );

    private checkTableCellValueChange(tables: IdpTable[], fieldId: string, newValue: string | undefined): { isDirty: boolean; tableId?: string } {
        for (const table of tables) {
            const matchingCell = this.findCellInTable(table, fieldId);

            if (matchingCell) {
                const hasValueChanged = (matchingCell.value ?? '') !== (newValue ?? '');
                return { isDirty: hasValueChanged, tableId: table.id };
            }
        }
        return { isDirty: false };
    }

    private findCellInTable(table: IdpTable, cellId: string): IdpField | undefined {
        for (const row of table.rows) {
            const cell = row.rowCells.find((rowCell) => rowCell.id === cellId);
            if (cell) {
                return cell;
            }
        }
        return undefined;
    }

    private checkTableValid(tables: IdpTable[], tableId: string, taskInputData?: IdpTaskData): IdpValidationStatus {
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
            return IdpValidationStatus.Valid;
        }
        if (table.rows.some((row) => row.rowCells.some((cell) => cell.validationStatus === IdpValidationStatus.Invalid))) {
            return IdpValidationStatus.Invalid;
        }
        if (table.rows.length === 0 && this.isTableRequired(tableId, taskInputData)) {
            return IdpValidationStatus.Invalid;
        }
        return IdpValidationStatus.Valid;
    }

    private isTableRequired(tableId: string, taskInputData: IdpTaskData | undefined): boolean {
        const matchingTableDefinitions = (taskInputData?.extractionConfiguration?.fieldDefinitionsByClass ?? []).flatMap(
            (classDef: any) =>
                classDef.fieldDefinitions?.filter((fieldDef: any) => fieldDef.id === tableId && fieldDef.dataType === IdpFieldDataType.Table) ?? []
        );
        return matchingTableDefinitions.length > 0 && matchingTableDefinitions.every((fieldDef) => fieldDef.validation?.required === true);
    }

    private validateTableCellField(field: DocumentFieldEntity, validation: any): boolean {
        return this.tableCellValidationService.validateField({ value: field.value, name: field.name }, validation);
    }

    private getFieldValidationUpdateActions(fields: IdpField[], validatedFields?: ValidationField[]) {
        if (!validatedFields) {
            return [];
        }

        const actions = [];
        for (const validatedField of validatedFields) {
            const fieldToUpdate = fields.find((field) => field.name === validatedField.name);

            if (fieldToUpdate && (validatedField.status !== undefined || validatedField.updatedValue !== undefined)) {
                actions.push(
                    systemActions.fieldValidationUpdate({
                        fieldId: fieldToUpdate.id,
                        validationStatus: validatedField.status,
                        value: validatedField.updatedValue,
                    })
                );
            }
        }
        return actions;
    }

    private getTableValidationUpdateActions(tables: IdpTable[], validatedTables?: ValidationTable[]) {
        if (!validatedTables) {
            return [];
        }

        const actions = [];
        for (const validatedTable of validatedTables) {
            const tableToUpdate = tables.find((table) => table.name === validatedTable.name);
            const hasUpdates = validatedTable.status !== undefined || (validatedTable.records && validatedTable.records.length > 0);
            if (tableToUpdate && hasUpdates) {
                actions.push(
                    systemActions.tableValidationUpdate({
                        tableId: tableToUpdate.id,
                        validationStatus: validatedTable.status,
                        records: validatedTable.records?.length > 0 ? validatedTable.records : undefined,
                    })
                );
            }
        }
        return actions;
    }

    private getColumnValidations(taskInputData: any, tableId: string): Array<{ name: string; validation?: any }> {
        if (!taskInputData?.extractionConfiguration?.fieldDefinitionsByClass) {
            return [];
        }

        for (const classDef of taskInputData.extractionConfiguration.fieldDefinitionsByClass) {
            const tableFieldDef = classDef.fieldDefinitions.find((field) => field.id === tableId && field.dataType === 'Table');
            if (tableFieldDef?.columns) {
                return tableFieldDef.columns.map((col) => ({
                    name: col.name,
                    validation: col.validation,
                }));
            }
        }

        return [];
    }

    private validateAndMapCells(cells: any[], columnValidations: Array<{ name: string; validation?: any }>, order?: number): DocumentFieldEntity[] {
        return cells.map((cell, rowIndex) => {
            const columnValidation = columnValidations.find((cv) => cv.name === cell.name);
            const isValid = this.validateTableCellField(cell as any, columnValidation?.validation);
            const validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;

            return {
                ...cell,
                order: order ?? rowIndex,
                validationStatus,
            };
        });
    }

    private checkPageRotationSync(
        page: DocumentEntity['pages'][number],
        fileRef: string,
        metadata: IdpFileMetadata,
        pagesState: Array<{ pageId: string; rotation: number }>,
        pagesNeedingSync: Array<{ contentFileReferenceIndex: number; pageIndex: number; rotation: number }>
    ): void {
        if (page.fileReference !== fileRef) {
            return;
        }
        const pageMetadata = metadata.pages.find((pm) => pm.pageIndex === page.sourcePageIndex);
        if (!pageMetadata) {
            return;
        }
        const recognitionRotation = normalizeRotation(pageMetadata.rotation ?? 0);
        const batchStateRotation = normalizeRotation(page.rotation ?? 0);
        if (!isValidBatchRotation(batchStateRotation)) {
            const message =
                `[IDP] Task load: Invalid batch state rotation for page ${page.id}: ` +
                `batchState=${batchStateRotation}° (valid: 0, 90, 180, 270, 360). ` +
                `Using recognition metadata rotation=${recognitionRotation}° instead.`;
            console.warn(message);
            const pageEntry = pagesState.find((p) => p.pageId === page.id);
            if (pageEntry) {
                pageEntry.rotation = recognitionRotation;
            }
        } else if (recognitionRotation !== batchStateRotation) {
            const message =
                `[IDP] Task load: Rotation mismatch for page ${page.id}: ` +
                `batchState=${batchStateRotation}°, recognition=${recognitionRotation}°. Queuing sync.`;
            console.warn(message);
            pagesNeedingSync.push({
                contentFileReferenceIndex: page.contentFileReferenceIndex,
                pageIndex: page.sourcePageIndex,
                rotation: batchStateRotation,
            });
        }
    }
}
