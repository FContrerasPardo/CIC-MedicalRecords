/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

// TS2550: Property replaceAll does not exist on type 'string'
/* eslint-disable unicorn/prefer-string-replace-all */

import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
    ElementRef,
    AfterViewInit,
    DestroyRef,
    EventEmitter,
    NgZone,
    Output,
    Input,
    inject,
    ViewChild,
    TemplateRef,
    Pipe,
    PipeTransform,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SatTagModule } from '@hylandsoftware/satori-ui/tag';
import {
    BehaviorSubject,
    catchError,
    combineLatest,
    distinctUntilChanged,
    filter,
    map,
    MonoTypeOperatorFunction,
    Observable,
    of,
    shareReplay,
    skipWhile,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from 'rxjs';
import { ExtractionResultComponent } from '../extraction-result/extraction-result.component';
import { ActionHistoryService } from '../../services/action-history.service';
import { IdpField, IdpValidationStatus } from '../../models/screen-models';
import { BasicOcrWord, findSingleTypeaheadMatch, findOcrMatches, IdpVerificationService } from '../../services/verification/verification.service';
import { IdpFieldDataType, IdpShortcutAction, IdpShortcutService, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { MetadataTableFieldComponent } from '../metadata-table-field/metadata-table-field.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IdpViewerOcrCandidate } from '@hyland/idp-document-viewer';
import { FormCloudComponent, TaskVariableCloud } from '@alfresco/adf-process-services-cloud';
import { StoreModule } from '@ngrx/store';
import { ErrorMessageModel, FieldStatusTemplateDirective, FormFieldModel, FormModel, FormService } from '@alfresco/adf-core';
import { isEqual } from 'es-toolkit';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { WaitForDirective } from './wait-for.directive';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Pipe({
    name: 'tableContext',
    pure: true,
})
export class TableContextPipe implements PipeTransform {
    private readonly verificationService = inject(IdpVerificationService);

    transform(fieldId: string) {
        return this.verificationService.documentFields$.pipe(
            take(1),
            map((fields) => fields.find((df) => isSameField(df, { id: fieldId }))?.id),
            filter(Boolean),
            switchMap((transformedFieldId) => {
                const actualTableId = transformedFieldId.startsWith('idp_') ? transformedFieldId.slice(4) : transformedFieldId;
                return this.verificationService.getTableSummaryById$(actualTableId).pipe(
                    map((tableSummary) => tableSummary?.rowCount ?? 0),
                    distinctUntilChanged(), // Only emit when the count actually changes
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((rowCount) => ({ transformedFieldId, rowCount }))
                );
            })
        );
    }
}

@Component({
    selector: 'hyland-idp-extraction-metadata-panel',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        ExtractionResultComponent,
        MetadataTableFieldComponent,
        TranslatePipe,
        FormCloudComponent,
        StoreModule,
        WaitForDirective,
        SatTagModule,
        FieldStatusTemplateDirective,
        TableContextPipe,
    ],
    templateUrl: './metadata-panel.component.html',
    styleUrls: ['./metadata-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class MetadataPanelComponent implements AfterViewInit {
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly shortcutService = inject(IdpShortcutService);
    private readonly verificationService = inject(IdpVerificationService);
    private readonly history = inject(ActionHistoryService);

    readonly documentFields$: Observable<IdpField[]>;
    readonly activeField$: Observable<IdpField | undefined>;
    readonly fieldIgnoreForAutoMap$: Observable<Record<string, boolean>>;
    readonly fieldIgnoreForReviewMap$: Observable<Record<string, boolean>>;
    readonly isValidationProcessRunning$: Observable<boolean>;
    readonly undoTooltip = this.shortcutService.getFullTooltipForAction(IdpShortcutAction.Undo);
    readonly redoTooltip = this.shortcutService.getFullTooltipForAction(IdpShortcutAction.Redo);

    readonly formData$: Observable<Array<TaskVariableCloud>>;
    readonly formLoaded = new EventEmitter<FormCloudComponent | undefined>();
    readonly isFormContextLoading$ = new BehaviorSubject<boolean>(true);
    readonly formContext$ = this.featuresService.isOn$(WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL).pipe(
        switchMap((isEnabled) => {
            if (!isEnabled) {
                return of(undefined);
            }
            return this.verificationService.document$.pipe(
                filter((doc) => !!doc.id),
                take(1),
                switchMap(() => this.verificationService.getFormContext$().pipe(catchError(() => of(undefined)))),
                catchError(() => of(undefined))
            );
        }),
        tap(() => this.isFormContextLoading$.next(false))
    );

    private readonly viewInitialized$ = new BehaviorSubject<boolean>(false);
    private lastKeyDownEvent?: KeyboardEvent;
    private readonly destroyRef = inject(DestroyRef);

    @Input()
    ocrWords = new Array<BasicOcrWord>();

    @Output()
    readonly fieldValuePending = new EventEmitter<{ field: IdpField; pendingValue: string }>();

    @ViewChild('tableContentTemplate', { static: true })
    tableContentTemplate!: TemplateRef<any>;

    private readonly elementRef = inject(ElementRef);
    private readonly formService = inject(FormService);
    private readonly ngZone = inject(NgZone);

    constructor() {
        this.documentFields$ = this.verificationService.documentFields$.pipe(takeUntilDestroyed(this.destroyRef));
        this.activeField$ = this.verificationService.activeField$.pipe(takeUntilDestroyed(this.destroyRef));
        this.fieldIgnoreForAutoMap$ = this.verificationService.fieldIgnoreForAutoMap$.pipe(takeUntilDestroyed(this.destroyRef));
        this.fieldIgnoreForReviewMap$ = this.verificationService.fieldIgnoreForReviewMap$.pipe(takeUntilDestroyed(this.destroyRef));
        this.isValidationProcessRunning$ = this.verificationService.isValidationProcessRunning$.pipe(takeUntilDestroyed(this.destroyRef));

        const cloudFormLoaded$ = this.formLoaded.pipe(filter(Boolean));
        const newFormLoaded$ = cloudFormLoaded$.pipe(distinctUntilEqualityChanged());
        const fieldPanelLoadedAndPopulated$ = this.formLoaded.pipe(
            skipWhile((cloudForm) => cloudForm !== undefined && (!cloudForm.data || cloudForm.data.length === 0)),
            distinctUntilEqualityChanged()
        );

        // populate form data based on our document fields
        const hasValue: TaskVariableCloud['hasValue'] = (obj) => !!obj.value;
        this.formData$ = combineLatest([this.documentFields$, newFormLoaded$]).pipe(
            map(([documentFields, cloudForm]) => {
                const taskVariables = new Array<TaskVariableCloud>();
                for (const formField of cloudForm.form.getFormFields()) {
                    const documentField = documentFields.find((df) => isSameField(df, formField));
                    taskVariables.push({
                        name: formField.id,
                        value: documentField ? (documentField.value ?? '') : formField.value,
                        hasValue, // reuse function to ensure equality
                    });
                }
                return taskVariables;
            }),
            distinctUntilEqualityChanged(),
            takeUntilDestroyed(this.destroyRef)
        );

        const synchronizeFormFieldValidity = (
            form: FormModel,
            documentField: IdpField,
            formField = getFormFieldById(form, documentField.id),
            formFieldIndex?: number
        ) => {
            if (formField) {
                form.validateField(formField);
                this.verificationService.updateFieldValidity(documentField, { isFormFieldValid: formField.isValid, formFieldIndex });
            }
        };

        combineLatest([cloudFormLoaded$, this.activeField$.pipe(distinctUntilEqualityChanged())])
            .pipe(withLatestFrom(this.documentFields$), takeUntilDestroyed(this.destroyRef))
            .subscribe(([[cloudForm], documentFields]) => {
                const updates: Array<{ fieldId: string; isFormFieldValid: boolean; formFieldIndex?: number }> = [];
                for (const [formFieldIndex, formField] of cloudForm.form.getFormFields().entries()) {
                    const documentField = documentFields.find((df) => isSameField(df, formField));
                    if (documentField) {
                        cloudForm.form.validateField(formField);
                        updates.push({ fieldId: documentField.id, isFormFieldValid: formField.isValid, formFieldIndex });
                    }
                }
                this.verificationService.batchUpdateFieldValidity(updates);
            });

        fieldPanelLoadedAndPopulated$
            .pipe(
                take(1),
                // Wait for the zone to stabilize after the panel loads
                switchMap((cloudForm) =>
                    this.ngZone.onStable.pipe(
                        take(1),
                        map(() => cloudForm)
                    )
                ),
                withLatestFrom(this.documentFields$),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(([cloudForm, documentFields]) => {
                // Assign table templates to table fields
                if (cloudForm) {
                    for (const docField of documentFields) {
                        if (docField.dataType === IdpFieldDataType.Table) {
                            const formField = getFormFieldById(cloudForm.form, docField.id);
                            if (formField) {
                                formField.json['customTemplate'] = this.tableContentTemplate;
                                // Force form to re-render this field
                                cloudForm.form.validateField(formField);
                            }
                        }
                    }
                }

                // Select the first field with an issue once the zone has initially stabilized,
                // so this runs after any competing selection triggered by the form load.
                const firstSelectedField = documentFields.find((field) => field.hasIssue) ?? documentFields[0];
                if (firstSelectedField) {
                    this.verificationService.selectField(firstSelectedField, true);
                }
            });

        newFormLoaded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((cloudForm) => {
            // this "subscribe and save latest" pattern is not ideal, but we have no choice since key handling and form validation are synchronous
            let latestDocumentFields = new Array<IdpField>();
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.documentFields$.pipe(distinctUntilEqualityChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((documentFields) => {
                latestDocumentFields = documentFields;

                if (cloudForm) {
                    cloudForm.form.validateForm();
                    const updates: Array<{ fieldId: string; isFormFieldValid: boolean; formFieldIndex?: number }> = [];
                    for (const [formFieldIndex, formField] of cloudForm.form.getFormFields().entries()) {
                        const documentField = documentFields.find((df) => isSameField(df, formField));
                        if (documentField) {
                            updates.push({ fieldId: documentField.id, isFormFieldValid: formField.isValid, formFieldIndex });
                        }
                    }
                    this.verificationService.batchUpdateFieldValidity(updates);
                }
            });

            // inject Enter key handling
            const originalOnKeyDown = cloudForm.onKeyDown.bind(cloudForm);
            cloudForm.onKeyDown = (event) => {
                originalOnKeyDown(event);
                const target = event.target;
                if (target instanceof HTMLInputElement) {
                    const field = latestDocumentFields.find((df) => isSameField(df, target));
                    if (field) {
                        this.onFieldKeyDown(event, field, target.value);
                    }
                }
            };

            // inject a custom form field validator
            cloudForm.loadInjectedFieldValidators([
                {
                    isSupported(formField) {
                        return latestDocumentFields.some((docField) => isSameField(docField, formField));
                    },
                    validate(formField) {
                        const documentField = latestDocumentFields.find((docField) => isSameField(docField, formField));
                        const validation = documentField && validateDocumentField(documentField);
                        if (validation?.hasError) {
                            formField.validationSummary = new ErrorMessageModel();
                            formField.validationSummary.message = validation.message;
                            return false;
                        } else {
                            formField.validationSummary.message = 'EXTRACTION.VERIFICATION.EXTRACTION_RESULT.EXTRACTED_SUCCESSFULLY';
                        }
                        return true;
                    },
                },
            ]);
        });

        // update active document field when focus changes
        this.formService.formEvents
            .pipe(
                filter((formEvent) => formEvent.type === 'focusin' || formEvent.type === 'focusout'),
                withLatestFrom(this.documentFields$, cloudFormLoaded$),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(([formEvent, documentFields, cloudForm]) => {
                const formFieldElement = formEvent.target;
                if (formFieldElement instanceof HTMLElement) {
                    const documentField = documentFields.find((df) => isSameField(df, formFieldElement));
                    if (documentField) {
                        if (formEvent.type === 'focusin') {
                            this.onFieldFocus(documentField);
                        } else if (formEvent.type === 'focusout') {
                            if (formFieldElement instanceof HTMLInputElement) {
                                this.onFieldFocusOut(documentField, formFieldElement.value);
                            }
                            // force form revalidation even when focus is leaving the entire form
                            synchronizeFormFieldValidity(cloudForm.form, documentField);
                        }
                    }
                }
            });

        const reversions = new Array<() => void>();
        const overrideClass = (id: string, className: string) => {
            const element = this.getAdfFormFieldElement(id);
            if (element) {
                element.classList.add(className);
                reversions.push(() => element.classList.remove(className));
            }
        };
        const revertOverrides = () => {
            for (const revert of reversions) {
                revert();
            }
            reversions.length = 0;
        };

        let previousField: IdpField | undefined;
        combineLatest([this.activeField$, fieldPanelLoadedAndPopulated$])
            .pipe(
                map(([field]) => field),
                distinctUntilChanged((a, b) => a?.id === b?.id && a?.tableId === b?.tableId && a?.needsKeyboardFocus === b?.needsKeyboardFocus),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((field) => {
                // Clear undo stack when switching from a table field to a different field
                // Previous field was a table if it's a table type OR has a tableId (cell in a table)
                const wasInTable = previousField && (previousField.dataType === IdpFieldDataType.Table || previousField.tableId);
                // Current field is same table if it's the same table ID or a cell in the same table
                const sameTable =
                    field &&
                    previousField &&
                    ((field.dataType === IdpFieldDataType.Table && field.id === previousField.id) ||
                        field.tableId === previousField.id ||
                        (field.dataType === IdpFieldDataType.Table && !!previousField.tableId && field.id === previousField.tableId) ||
                        (!!field.tableId && !!previousField.tableId && field.tableId === previousField.tableId));

                if (wasInTable && !sameTable) {
                    this.history.clear();
                }
                previousField = field;

                requestAnimationFrame(() => {
                    revertOverrides();

                    if (field) {
                        overrideClass(field.tableId || field.id, 'idp-is-selected');

                        if (field.needsKeyboardFocus) {
                            const formFieldElement = this.getFormFieldElement(field.id);
                            if (formFieldElement instanceof HTMLInputElement) {
                                formFieldElement.focus();
                            } else if (formFieldElement instanceof HTMLElement) {
                                formFieldElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                            }
                        }
                    }
                });
            });

        this.destroyRef.onDestroy(() => this.viewInitialized$.next(false));
    }

    ngAfterViewInit() {
        this.viewInitialized$.next(true);
    }

    canUndo() {
        return this.history.canUndo();
    }
    onUndo() {
        this.history.undo();
    }

    canRedo() {
        return this.history.canRedo();
    }
    onRedo() {
        this.history.redo();
    }

    onFieldKeyDown(event: KeyboardEvent, field: IdpField, value: string) {
        this.lastKeyDownEvent = event;
        // keyboard shortcuts should not propagate to parent components
        event.stopPropagation();

        if (event.key === 'Enter') {
            event.preventDefault();
            this.confirmFieldUpdate(field, value);
            this.verificationService.selectNextField();
        }
    }

    onFieldFocus(field: IdpField) {
        // needed to make sure that the activeField in the store stays in sync
        this.verificationService.selectField(field);
        this.fieldValuePending.emit({ field, pendingValue: field.value ?? '' });
    }

    onFieldInput(field: IdpField, input: HTMLInputElement) {
        // if the user is deleting text, we don't want to auto-complete
        const isDismissal = this.lastKeyDownEvent?.key === 'Backspace' || this.lastKeyDownEvent?.key === 'Delete';
        if (!isDismissal) {
            const userValue = input.value;
            const suggestion = findSingleTypeaheadMatch(this.ocrWords, userValue);
            if (suggestion) {
                input.value = suggestion.map((word) => word.text).join(' ');
                input.setSelectionRange(userValue.length, input.value.length);
            }
        }

        this.fieldValuePending.emit({ field, pendingValue: input.value });
    }

    onFieldFocusOut(field: IdpField, value: string): void {
        this.confirmFieldUpdate(field, value);
    }

    private confirmFieldUpdate(field: IdpField, value: string) {
        // Early exit if value hasn't changed (no undo required)
        if ((field.value ?? '') === value) {
            this.verificationService.updateField(field);
            return;
        }

        let updatedFieldData: Partial<IdpField> = {};

        const matches = [...findOcrMatches(this.ocrWords, value.trim(), false, true)];

        if (matches.length > 0 && matches[0].length > 0) {
            const primaryMatch = matches[0] as IdpViewerOcrCandidate[];
            const firstWord = primaryMatch[0];

            const bounds = primaryMatch.reduce(
                (acc, word) => ({
                    minLeft: Math.min(acc.minLeft, word.left),
                    minTop: Math.min(acc.minTop, word.top),
                    maxRight: Math.max(acc.maxRight, word.left + word.width),
                    maxBottom: Math.max(acc.maxBottom, word.top + word.height),
                }),
                {
                    minLeft: firstWord.left,
                    minTop: firstWord.top,
                    maxRight: firstWord.left + firstWord.width,
                    maxBottom: firstWord.top + firstWord.height,
                }
            );

            updatedFieldData = {
                boundingBox: {
                    pageId: firstWord.pageId,
                    left: bounds.minLeft,
                    top: bounds.minTop,
                    width: bounds.maxRight - bounds.minLeft,
                    height: bounds.maxBottom - bounds.minTop,
                },
            };
        } else {
            updatedFieldData = {
                boundingBox: undefined,
            };
        }

        const fieldForUpdate = {
            ...field,
            value,
            confidence: 1,
            ...updatedFieldData,
        };

        this.history.do({
            do: () => this.verificationService.updateField(fieldForUpdate),
            undo: () => this.verificationService.updateField(field),
        });
    }

    onShowTable(tableId: string) {
        this.verificationService.selectField(tableId);
    }

    // This custom trackBy function prevents Angular from re-rendering the entire list of fields on each change, which can cause focus loss.
    // The implementation might need to be updated if the number or ordering of fields could change.
    // https://github.com/ngrx/store/issues/176
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    trackField(index: number, field: IdpField) {
        return index;
    }

    isFieldSelected(field: IdpField, activeField?: IdpField) {
        return field.id === activeField?.id || field.id === activeField?.tableId;
    }

    private getFormFieldElement(id: string) {
        const nativeElement = this.elementRef.nativeElement;
        if (nativeElement instanceof Element) {
            return nativeElement.querySelector(`#${escapeCSS(id)}, #${escapeCSS(formatFormFieldId(id))}`);
        }
        return null;
    }

    private getAdfFormFieldElement(id: string) {
        const element = this.getFormFieldElement(id);
        if (element instanceof HTMLElement) {
            return element.closest('adf-form-field');
        }
        return null;
    }

    addTable(tableId: string) {
        this.verificationService.selectField(tableId);
        this.history.do({
            do: () => {
                this.verificationService.addTableRow(tableId, 0);
            },
            undo: () => {
                this.verificationService.deleteTableRow(tableId, 0);
                setTimeout(() => {
                    this.verificationService.selectNextField();
                }, 0);
            },
        });
    }
}

function distinctUntilEqualityChanged<T>(): MonoTypeOperatorFunction<T> {
    return (source$) => source$.pipe(distinctUntilChanged((a, b) => isEqual(a, b)));
}

function getFormFieldById(form: FormModel, fieldId: string): FormFieldModel | undefined {
    return form.getFieldById(fieldId) ?? form.getFieldById(formatFormFieldId(fieldId));
}

function isSameField(docField: IdpField, formField: Pick<FormFieldModel, 'id'>) {
    return docField.id === formField.id || formatFormFieldId(docField.id) === formField.id;
}

function formatFormFieldId(fieldId: string): string {
    return `idp_${fieldId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function escapeCSS(ident: string) {
    // CSS.escape is provided by browser
    if (CSS.escape) {
        return CSS.escape(ident);
    }
    // fallback implementation for test environments lacking CSS.escape
    return String(ident)
        .replace(/\0/g, '\uFFFD')
        .replace(/(^-?\d)|(^--)|[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch.codePointAt(0)?.toString(16) + ' ');
}

function validateDocumentField(documentField: IdpField) {
    if (documentField.validationStatus === IdpValidationStatus.Invalid) {
        return {
            hasError: true,
            message: 'EXTRACTION.VERIFICATION.EXTRACTION_RESULT.INVALID_VALUE',
        };
    }

    switch (documentField.verificationStatus) {
        case IdpVerificationStatus.AutoValid: {
            return { hasError: false, message: 'EXTRACTION.VERIFICATION.EXTRACTION_RESULT.EXTRACTED_SUCCESSFULLY' };
        }
        case IdpVerificationStatus.ManualValid: {
            return { hasError: false, message: 'EXTRACTION.VERIFICATION.EXTRACTION_RESULT.VERIFIED' };
        }
        case IdpVerificationStatus.AutoInvalid:
        case IdpVerificationStatus.ManualInvalid: {
            return { hasError: true, message: 'EXTRACTION.VERIFICATION.EXTRACTION_RESULT.EXTRACTION_ISSUE' };
        }
        default: {
            return { hasError: true, message: 'EXTRACTION.VERIFICATION.EXTRACTION_RESULT.NOT_VERIFIED' };
        }
    }
}
