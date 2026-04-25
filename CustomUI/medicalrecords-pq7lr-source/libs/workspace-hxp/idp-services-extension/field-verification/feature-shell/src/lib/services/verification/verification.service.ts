/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { from, map, Observable, of, switchMap } from 'rxjs';
import { IdpBoundingBox, IdpDocument, IdpField, IdpTable, IdpTableSummary } from '../../models/screen-models';
import { selectDocument, selectFormModelKey } from '../../store/selectors/document.selectors';
import { IdpPagesMetadata, systemActions, userActions } from '../../store/actions/field-verification.actions';
import { selectActiveField, selectDocumentFields, selectFieldById, selectRedactedFields } from '../../store/selectors/document-field.selectors';
import { selectActiveTable, selectActiveTableSummary, selectTableById, selectTableSummaryById } from '../../store/selectors/document-table.selectors';
import {
    selectFieldIgnoreForAutoMap,
    selectFieldIgnoreForReviewMap,
    selectTableFieldDefinitions,
} from '../../store/selectors/field-definitions.selectors';
import { selectIsValidationProcessRunning, selectTaskInfo } from '../../store/selectors/screen.selectors';
import { IdpFormCloudService } from '../idp-form-cloud.service';

@Injectable()
export class IdpVerificationService {
    private readonly store = inject(Store);
    private readonly formCloudService = inject(IdpFormCloudService);

    readonly document$: Observable<IdpDocument> = this.store.select(selectDocument);
    readonly documentFields$: Observable<IdpField[]> = this.store.select(selectDocumentFields);
    readonly redactedFields$: Observable<IdpField[]> = this.store.select(selectRedactedFields);
    readonly isValidationProcessRunning$ = this.store.select(selectIsValidationProcessRunning);
    readonly activeField$: Observable<IdpField | undefined> = this.store.select(selectActiveField);
    readonly activeTable$: Observable<IdpTable | undefined> = this.store.select(selectActiveTable);
    readonly activeTableSummary$: Observable<IdpTableSummary | undefined> = this.store.select(selectActiveTableSummary);
    readonly fieldIgnoreForAutoMap$: Observable<Record<string, boolean>> = this.store.select(selectFieldIgnoreForAutoMap).pipe(
        map((mapVal) => {
            const obj: Record<string, boolean> = {};
            for (const [k, v] of mapVal) {
                obj[k] = v;
            }
            return obj;
        })
    );

    readonly fieldIgnoreForReviewMap$: Observable<Record<string, boolean>> = this.store.select(selectFieldIgnoreForReviewMap).pipe(
        map((mapVal) => {
            const obj: Record<string, boolean> = {};
            for (const [k, v] of mapVal) {
                obj[k] = v;
            }
            return obj;
        })
    );

    getFieldById$(fieldId: string) {
        return this.store.select(selectFieldById(fieldId));
    }

    getTableById$(tableId: string) {
        return this.store.select(selectTableById(tableId));
    }

    getTableSummaryById$(tableId: string) {
        return this.store.select(selectTableSummaryById(tableId));
    }

    getFormContext$() {
        return this.store.select(selectFormModelKey).pipe(
            switchMap((formModelKey) => {
                if (!formModelKey) {
                    return of(undefined);
                }
                return this.store
                    .select(selectTaskInfo)
                    .pipe(
                        switchMap((taskContext) =>
                            from(this.formCloudService.getFormByModelKey(taskContext.appName, formModelKey)).pipe(
                                map((formContent) => formContent && { ...formContent.formRepresentation, appName: taskContext.appName })
                            )
                        )
                    );
            })
        );
    }

    getTableFieldDefinitions$(tableId: string) {
        return this.store.select(selectTableFieldDefinitions(tableId));
    }

    updateRejectReason(rejectReasonId: string, rejectNote?: string, doCompleteTask: boolean = true): void {
        this.store.dispatch(userActions.rejectReasonUpdate({ rejectReasonId, rejectNote, doCompleteTask }));
    }

    removeDocumentFlag(): void {
        this.store.dispatch(userActions.rejectReasonUpdate({ doCompleteTask: false }));
    }

    updateField(field: IdpField, boundingBox?: IdpBoundingBox): void {
        this.store.dispatch(
            userActions.fieldValueUpdate({
                fieldId: field.id,
                value: field.value ?? '',
                boundingBox,
                confidence: field.confidence,
                validationStatus: field.validationStatus,
            })
        );
    }

    updateFieldValidity(field: IdpField, options: { isFormFieldValid: boolean; formFieldIndex?: number }): void {
        this.store.dispatch(
            systemActions.fieldValidityUpdate({
                fieldId: field.id,
                ...options,
            })
        );
    }

    batchUpdateFieldValidity(updates: Array<{ fieldId: string; isFormFieldValid: boolean; formFieldIndex?: number }>): void {
        if (updates.length > 0) {
            this.store.dispatch(systemActions.fieldValidityBatchUpdate({ updates }));
        }
    }

    verifyField(fieldId: string): void {
        this.store.dispatch(userActions.verifyField({ fieldId }));
    }

    selectField(field: IdpField | string, needsKeyboardFocus = false) {
        this.store.dispatch(userActions.fieldSelect({ fieldId: typeof field === 'string' ? field : field.id, needsKeyboardFocus }));
    }

    selectNextField(): void {
        this.store.dispatch(userActions.selectNextField());
    }

    updatePagesRotation(pages: IdpPagesMetadata[], taskDataSynced: boolean) {
        this.store.dispatch(userActions.updatePagesRotation({ pages, taskDataSynced }));
    }

    addTableRow(tableId: string, rowIndex: number = 0): void {
        this.store.dispatch(userActions.addTableRow({ tableId, rowIndex }));
    }

    insertTableRow(tableId: string, rowIndex: number, rowCells: IdpField[]): void {
        this.store.dispatch(userActions.insertTableRow({ tableId, rowIndex, rowCells }));
    }

    clearTableRow(tableId: string, rowIndex: number): void {
        this.store.dispatch(userActions.clearTableRow({ tableId, rowIndex }));
    }

    clearTableColumn(tableId: string, columnIndex: number): void {
        this.store.dispatch(userActions.clearTableColumn({ tableId, columnIndex }));
    }

    deleteTableRow(tableId: string, rowIndex: number): void {
        this.store.dispatch(userActions.deleteTableRow({ tableId, rowIndex }));
    }

    deleteTable(tableId: string): void {
        this.store.dispatch(userActions.deleteTable({ tableId }));
    }

    updateTableRow(tableId: string, rowIndex: number, rowCells: IdpField[]): void {
        this.store.dispatch(userActions.updateTableRow({ tableId, rowIndex, rowCells }));
    }

    updateTableColumn(tableId: string, columnIndex: number, columnCells: IdpField[]): void {
        this.store.dispatch(userActions.updateTableColumn({ tableId, columnIndex, columnCells }));
    }

    restoreTable(tableId: string, tableData: IdpTable, tableFields: IdpField[]): void {
        this.store.dispatch(userActions.restoreTable({ tableId, tableData, tableFields }));
    }

    runValidationProcessIfTableIsDirty(tableId: string) {
        this.store.dispatch(systemActions.runValidationProcessIfTableIsDirty({ tableId }));
    }
}

function equalsIgnoreCase(left: string, right: string) {
    return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
}

function startsWithIgnoreCase(value: string, search: string) {
    if (value.length < search.length) {
        return false;
    }
    const start = value.slice(0, search.length);
    return equalsIgnoreCase(start, search);
}

export interface BasicOcrWord {
    text: string;
    pageId?: string;
}

function getComparer(caseSensitive: boolean, isLastWord = false) {
    if (isLastWord) {
        return caseSensitive ? (left: string, right: string) => left.startsWith(right) : startsWithIgnoreCase;
    }
    return caseSensitive ? (left: string, right: string) => left === right : equalsIgnoreCase;
}

function* findExactMatches<T extends BasicOcrWord>(ocrWords: T[], search: string, caseSensitive: boolean) {
    const comparer = getComparer(caseSensitive);

    for (let start = 0; start < ocrWords.length; start++) {
        const pageId = ocrWords[start].pageId;
        let text = '';
        const words: T[] = [];

        for (let i = start; i < ocrWords.length && text.length <= search.length; i++) {
            const word = ocrWords[i];
            if (pageId && pageId !== word.pageId) {
                break;
            }

            text += (i > start ? ' ' : '') + word.text;
            words.push(word);

            if (comparer(text, search)) {
                yield words;
                break;
            }
        }
    }
}

function* findPartialMatches<T extends BasicOcrWord>(ocrWords: T[], searchWords: string[], caseSensitive: boolean) {
    for (let start = 0; start < ocrWords.length; start++) {
        const pageId = ocrWords[start].pageId;
        const matchedWords: T[] = [];
        let isMatch = true;

        for (let i = 0; i < searchWords.length && start + i < ocrWords.length && isMatch; i++) {
            const word = ocrWords[start + i];
            if (pageId && pageId !== word.pageId) {
                isMatch = false;
                continue;
            }

            const comparer = getComparer(caseSensitive, i === searchWords.length - 1);
            if (!comparer(word.text, searchWords[i])) {
                isMatch = false;
                continue;
            }
            matchedWords.push(word);
        }

        if (isMatch && matchedWords.length > 0) {
            yield matchedWords;
        }
    }
}

export function* findOcrMatches<T extends BasicOcrWord>(
    ocrWords: T[],
    search: string,
    caseSensitive = false,
    matchFullPhrase = false
): Generator<T[]> {
    if (!search || !ocrWords?.length) {
        return;
    }

    if (matchFullPhrase) {
        yield* findExactMatches(ocrWords, search, caseSensitive);
        return;
    }

    const searchWords = search.split(/\s+/);
    yield* findPartialMatches(ocrWords, searchWords, caseSensitive);
}

export function findSingleTypeaheadMatch<T extends BasicOcrWord>(suggestions: T[], search: string) {
    const exactMatch = single(findOcrMatches(suggestions, search, true));
    if (exactMatch) {
        return exactMatch; // single exact match is perfect
    }

    const caseInsensitiveMatches = [...findOcrMatches(suggestions, search, false)];
    if (caseInsensitiveMatches.length > 0) {
        const firstMatch = caseInsensitiveMatches[0];
        if (
            caseInsensitiveMatches.every(
                (match) => match.length === firstMatch.length && match.every((word, index) => equalsIgnoreCase(word.text, firstMatch[index].text))
            )
        ) {
            return firstMatch; // take first case-insensitive match as long as there is no ambiguity
        }
    }

    return undefined;
}

function single<T>(source: Iterable<T>) {
    let result;
    let foundAlready = false;
    for (const value of source) {
        if (foundAlready) {
            // compiler wants explicit undefined but linter does not; compiler wins

            return undefined;
        }
        result = value;
        foundAlready = true;
    }
    return result;
}
