/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable, Injector } from '@angular/core';
import { IdpDocumentService } from './idp-document.service';
import { Observable, Subject, combineLatest, merge, of } from 'rxjs';
import { IdpDocument, IdpDocumentPage, UNCLASSIFIED_CLASS_ID, IdpDocumentAction } from '../../models/screen-models';
import { distinctUntilChanged, map, shareReplay, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { openChangeClassListDialog } from '../../dialogs/change-class-dialog/change-class.dialog.extension';
import { ConfirmationDialogComponent, ConfirmButtonModifier, IdpConfirmationDialogData } from '../../dialogs/confirmation-dialog/confirmation.dialog';
import { ReasoningDialogComponent } from '../../dialogs/reasoning-dialog/reasoning.dialog';
import { ReasoningDialogCandidate, ReasoningDialogData } from '../../models/contracts/class-verification-models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    RejectDocumentDialogData,
    IdentifierData,
    IdpShortcutAction,
    IdpShortcutService,
    RejectDocumentDialogComponent,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { MAX_PAGES } from '../../constants';

export interface MessageTemplate {
    key: string;
    args?: Record<string, string>;
}

export interface IdpDocumentActionToolBarItems {
    label: string;
    icon: string;
    action: IdpDocumentAction;
    disabled: boolean;
    showWhenDisabled?: boolean;
    showWhenDisabledTooltip?: MessageTemplate;
    onClick$: Subject<void>;
    renderType: 'static' | 'dynamic';
    displayOn: 'header' | 'footer' | 'viewer';
    displayOrder: number;
    showDividerBefore: boolean;
    shortcutAction?: IdpShortcutAction;
}

interface IdpDocumentToolBarItemClickAction {
    action: IdpDocumentAction;
    pages: IdpDocumentPage[];
    documents: IdpDocument[];
}

const DOCUMENT_TOOLBAR_ACTION_ITEMS: IdpDocumentActionToolBarItems[] = [
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.UNDO',
        icon: 'undo',
        disabled: true,
        action: IdpDocumentAction.Undo,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'header',
        displayOrder: 1,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.Undo,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.REDO',
        icon: 'redo',
        disabled: true,
        action: IdpDocumentAction.Redo,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'header',
        displayOrder: 2,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.Redo,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.REJECT',
        icon: 'flag',
        disabled: true,
        action: IdpDocumentAction.Reject,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 4,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.DocumentReject,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.VIEW_REASONING',
        icon: 'info',
        disabled: true,
        action: IdpDocumentAction.ViewReasoning,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 3,
        showDividerBefore: false,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CHANGE_CLASS',
        icon: 'compare',
        disabled: false,
        action: IdpDocumentAction.ChangeClass,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 5,
        showDividerBefore: true,
        shortcutAction: IdpShortcutAction.ChangeClass,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.SPLIT',
        icon: 'split',
        disabled: true,
        action: IdpDocumentAction.Split,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 6,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.PageSplit,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.MERGE',
        icon: 'merge',
        disabled: true,
        action: IdpDocumentAction.Merge,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 7,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.PageMerge,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CREATE_COPY',
        icon: 'duplicate',
        disabled: true,
        action: IdpDocumentAction.CreateCopy,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 8,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.PageCreateCopy,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.DELETE',
        icon: 'trash',
        disabled: true,
        action: IdpDocumentAction.Delete,
        onClick$: new Subject<void>(),
        renderType: 'dynamic',
        displayOn: 'footer',
        displayOrder: 9,
        showDividerBefore: false,
        shortcutAction: IdpShortcutAction.PageDelete,
    },
    {
        label: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.MARK_RESOLVED',
        icon: '',
        disabled: true,
        action: IdpDocumentAction.Resolve,
        onClick$: new Subject<void>(),
        renderType: 'static',
        displayOn: 'viewer',
        displayOrder: 10,
        showDividerBefore: false,
    },
];

@Injectable()
export class IdpDocumentToolbarService {
    readonly documentToolBarItems$: Observable<IdpDocumentActionToolBarItems[]>;
    readonly toolBarItemClicked$: Observable<IdpDocumentToolBarItemClickAction>;
    readonly toolbarMessageTemplate$: Observable<MessageTemplate>;

    private readonly dialogService = inject(MatDialog);
    private readonly documentService = inject(IdpDocumentService);
    private readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);
    private readonly shortcutService = inject(IdpShortcutService);
    private readonly injector = inject(Injector);

    constructor() {
        this.documentToolBarItems$ = combineLatest([
            this.documentService.selectedPages$.pipe(distinctUntilChanged()),
            this.documentService.allDocuments$.pipe(distinctUntilChanged()),
            this.documentService.undoRedoState$,
            this.documentService.activePageCount$.pipe(distinctUntilChanged()),
            this.featuresService.isOn$(WORKSPACE_IDP_HXP.CLASS_VERIFICATION_REASONING),
        ]).pipe(
            takeUntilDestroyed(),
            map(([pages, allDocuments, { canUndo, canRedo }, activePageCount, isReasoningOn]) => {
                const uniqueDocuments = [...new Set(pages.map((p) => p.documentId))];

                const allSelectedContextDocuments = allDocuments.filter((doc) => uniqueDocuments.includes(doc.id));

                return DOCUMENT_TOOLBAR_ACTION_ITEMS.filter((item) => item.action !== IdpDocumentAction.ViewReasoning || isReasoningOn)
                    .map((item) => {
                        let enabled = true;
                        let showWhenDisabled: boolean | undefined;
                        let showWhenDisabledTooltip: MessageTemplate | undefined;
                        switch (item.action) {
                            case IdpDocumentAction.Undo: {
                                enabled = canUndo;
                                break;
                            }
                            case IdpDocumentAction.Redo: {
                                enabled = canRedo;
                                break;
                            }
                            case IdpDocumentAction.ChangeClass: {
                                enabled = uniqueDocuments.length > 0;
                                break;
                            }
                            case IdpDocumentAction.Split: {
                                const totalPagesInDoc = allDocuments.find((doc) => doc.id === uniqueDocuments[0])?.pages?.length ?? 0;
                                enabled = pages.length > 0 && uniqueDocuments.length === 1 && pages.length < totalPagesInDoc;
                                break;
                            }
                            case IdpDocumentAction.Merge: {
                                enabled = pages.length > 1 && uniqueDocuments.length > 1;
                                break;
                            }
                            case IdpDocumentAction.Delete: {
                                enabled = pages.length > 0;
                                break;
                            }
                            case IdpDocumentAction.Reject: {
                                const isAtLeastOneDocumentSelectedAndNoneRejected =
                                    allSelectedContextDocuments.length > 0 &&
                                    allSelectedContextDocuments.filter((d) => d.rejectedReasonId).length === 0;
                                const isOnlyOneRejectedDocumentSelected =
                                    allSelectedContextDocuments.length === 1 &&
                                    allSelectedContextDocuments.filter((d) => d.rejectedReasonId).length === 1;
                                enabled = isAtLeastOneDocumentSelectedAndNoneRejected || isOnlyOneRejectedDocumentSelected;
                                break;
                            }
                            case IdpDocumentAction.Resolve: {
                                // Don't want to allow resolve if the Document is Unclassified
                                enabled =
                                    pages.length > 0 &&
                                    allSelectedContextDocuments.every((d) => d.hasIssue && !!d.class && d.class.id !== UNCLASSIFIED_CLASS_ID);
                                break;
                            }
                            case IdpDocumentAction.CreateCopy: {
                                [enabled, showWhenDisabled, showWhenDisabledTooltip] = this.getCreateCopyActionState(
                                    pages,
                                    allSelectedContextDocuments,
                                    activePageCount
                                );
                                break;
                            }
                            case IdpDocumentAction.ViewReasoning: {
                                enabled = allSelectedContextDocuments.length === 1 && !!allSelectedContextDocuments[0].classificationSelectionReason;
                                break;
                            }
                        }
                        return { ...item, disabled: !enabled, showWhenDisabled, showWhenDisabledTooltip };
                    })
                    .sort((a, b) => a.displayOrder - b.displayOrder);
            }),
            shareReplay({ bufferSize: 1, refCount: true })
        );

        this.toolBarItemClicked$ = this.documentToolBarItems$.pipe(
            switchMap((toolBarItems) => {
                const actions$ = toolBarItems.map((item) =>
                    item.onClick$.pipe(
                        withLatestFrom(this.documentService.selectedPages$),
                        withLatestFrom(this.documentService.selectedDocuments$),
                        map(([[, pages], allDocuments]) => ({ action: item.action, pages, documents: allDocuments }))
                    )
                );
                return merge(...actions$);
            })
        );

        this.toolBarItemClicked$.pipe(takeUntilDestroyed()).subscribe((clickedItem) => {
            if (clickedItem.action === IdpDocumentAction.Undo) {
                this.documentService.undoAction();
                return;
            } else if (clickedItem.action === IdpDocumentAction.Redo) {
                this.documentService.redoAction();
                return;
            }

            if (!clickedItem || clickedItem.pages.length === 0) {
                return;
            }

            const uniqueDocuments = [...new Set(clickedItem.pages.map((p) => p.documentId))];
            const totalPagesInDoc = clickedItem.documents.find((doc) => doc.id === uniqueDocuments[0])?.pages?.length ?? 0;

            const actionHandlers: Record<string, () => void> = {
                [IdpDocumentAction.ChangeClass]: () => {
                    const uniqueClassIds = [...new Set(clickedItem.documents.map((d) => d.class?.id).filter((id): id is string => id !== undefined))];
                    this.openChangeClassDialog(clickedItem.pages, clickedItem.action, uniqueClassIds);
                },
                // eslint-disable-next-line rxjs/no-nested-subscribe
                [IdpDocumentAction.Delete]: () => this.deletePages(clickedItem.pages, clickedItem.action),
                [IdpDocumentAction.Split]: () => {
                    if (clickedItem.pages.length > 0 && uniqueDocuments.length === 1 && clickedItem.pages.length < totalPagesInDoc) {
                        this.handlePageSplit(clickedItem.pages, clickedItem.action);
                    }
                },
                [IdpDocumentAction.Merge]: () => {
                    if (clickedItem.pages.length > 1 && uniqueDocuments.length > 1) {
                        this.handlePageMerge(clickedItem.pages, clickedItem.action);
                    }
                },
                [IdpDocumentAction.Reject]: () => {
                    if (uniqueDocuments.length > 0) {
                        let data: RejectDocumentDialogData | undefined;
                        const first = clickedItem.documents[0];
                        if (uniqueDocuments.length === 1 && first.rejectedReasonId) {
                            data = { rejectReasonId: first.rejectedReasonId, rejectNote: first.rejectNote };
                        }
                        // eslint-disable-next-line rxjs/no-nested-subscribe
                        this.handleRejectPage(clickedItem.pages, clickedItem.action, data);
                    }
                },
                [IdpDocumentAction.Resolve]: () => this.handleResolvePage(clickedItem.pages, clickedItem.action),
                [IdpDocumentAction.CreateCopy]: () => this.handleCreateCopy(clickedItem.pages, clickedItem.action),
                [IdpDocumentAction.ViewReasoning]: () => this.openReasoningDialog(clickedItem.documents),
            };

            const actionHandler = actionHandlers[clickedItem.action];
            if (actionHandler) {
                actionHandler();
            }
        });

        this.toolbarMessageTemplate$ = this.documentService.cutPages$.pipe(
            takeUntilDestroyed(),
            switchMap((cutPages) => {
                if (cutPages.length === 1) {
                    return of({ key: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CUT_PAGES_MESSAGE_SINGULAR' });
                } else if (cutPages.length > 1) {
                    return of({
                        key: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CUT_PAGES_MESSAGE_PLURAL',
                        args: { count: cutPages.length.toString() },
                    });
                }

                return this.documentService.selectedPages$.pipe(
                    map((selectedPages) => {
                        return {
                            key: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.SELECTED_PAGES_MESSAGE',
                            args: { count: selectedPages.length.toString() },
                        };
                    })
                );
            })
        );
    }

    openChangeClassDialog(pages: IdpDocumentPage[], action: IdpDocumentAction, uniqueClassIds: string[]) {
        if (this.dialogService.openDialogs.length > 0) {
            return;
        }

        const dialogData = {
            currentClassId: uniqueClassIds.length === 1 ? uniqueClassIds[0] : undefined,
        };

        openChangeClassListDialog(
            this.dialogService,
            dialogData,
            (selectedItem: IdentifierData) => {
                this.documentService.setDocumentClass(action, true, pages, selectedItem.id);
            },
            { injector: this.injector }
        );
    }

    deletePages(pages: IdpDocumentPage[], action: IdpDocumentAction) {
        if (this.dialogService.openDialogs.length > 0) {
            return;
        }

        const dialogData: IdpConfirmationDialogData = {
            dialogHeader: 'IDP_CLASS_VERIFICATION.DELETE_CONFIRMATION_DIALOG.TITLE',
            confirmLabel: 'IDP_CLASS_VERIFICATION.DELETE_CONFIRMATION_DIALOG.DELETE_BUTTON',
            confirmButtonModifier: ConfirmButtonModifier.Warn,
            cancelLabel: 'IDP_CLASS_VERIFICATION.DELETE_CONFIRMATION_DIALOG.CANCEL_BUTTON',
            content: 'IDP_CLASS_VERIFICATION.DELETE_CONFIRMATION_DIALOG.DESCRIPTION',
        };

        const dialogRef = this.dialogService.open(ConfirmationDialogComponent, { data: dialogData, width: 'auto', autoFocus: 'first-tabbable' });
        dialogRef
            .afterClosed()
            .pipe(take(1))
            .subscribe((isConfirm) => {
                if (isConfirm) {
                    this.documentService.deletePages(action, true, pages);
                }
            });
    }

    handlePageSplit(pages: IdpDocumentPage[], action: IdpDocumentAction) {
        this.documentService.splitDocument(action, true, pages);
    }

    handlePageMerge(pages: IdpDocumentPage[], action: IdpDocumentAction) {
        this.documentService.mergeDocuments(action, true, pages, pages[0].documentId);
    }

    handleMovePageAndCreateNewDoc(pages: IdpDocumentPage[], createAfterDocId: string) {
        this.documentService.movePagesAndCreate(IdpDocumentAction.MovePageAndCreate, true, pages, createAfterDocId);
    }

    handleMovePages(pages: IdpDocumentPage[], targetDocumentId: string, targetIndex: number) {
        this.documentService.movePages(IdpDocumentAction.MovePage, true, pages, targetDocumentId, targetIndex);
    }

    handleResolvePage(pages: IdpDocumentPage[], action: IdpDocumentAction) {
        this.documentService.markResolved(action, true, pages);
    }

    handleRejectPage(pages: IdpDocumentPage[], action: IdpDocumentAction, data?: RejectDocumentDialogData) {
        if (this.dialogService.openDialogs.length > 0) {
            return;
        }

        const dialogConfig: MatDialogConfig = {
            data,
            injector: this.injector,
            width: '40%',
            height: '80%',
            restoreFocus: true,
        };
        const dialogRef = this.dialogService.open(RejectDocumentDialogComponent, dialogConfig);
        dialogRef
            .afterClosed()
            .pipe(take(1))
            .subscribe((result) => {
                if (result?.rejectReason) {
                    this.documentService.markRejected(action, true, pages, result.rejectReason.id, result.rejectNote);
                } else if (result?.shouldRemoveFlag) {
                    this.documentService.removeDocumentFlag(action, true, pages);
                }
            });
    }

    handleCreateCopy(pages: IdpDocumentPage[], action: IdpDocumentAction) {
        this.documentService.createPageCopies(action, true, pages);
    }

    private openReasoningDialog(documents: IdpDocument[]) {
        if (this.dialogService.openDialogs.length > 0 || documents.length !== 1) {
            return;
        }

        const doc = documents[0];
        if (!doc.classificationSelectionReason) {
            return;
        }

        const candidates: ReasoningDialogCandidate[] = (doc.classificationClassCandidates ?? []).map((candidate, index) => ({
            name: candidate.className ?? null,
            confidence: `${Math.round(candidate.confidence * 100)}%`,
            reason: candidate.reason ?? null,
            isSelected: index === 0 && doc.class != null,
        }));

        this.dialogService.open(ReasoningDialogComponent, {
            data: {
                documentName: doc.name,
                candidates,
                selectionReason: doc.classificationSelectionReason,
            } as ReasoningDialogData,
            disableClose: false,
            width: '36em',
            maxWidth: '40em',
            autoFocus: 'dialog',
        });
    }

    handleShortcutAction(event: KeyboardEvent): boolean {
        if (!event) {
            return false;
        }

        const shortcut = this.shortcutService.getShortcutForEvent(event);
        if (!shortcut) {
            return false;
        }

        if (this.dialogService.openDialogs.length > 0) {
            return false;
        }

        const toolbarItem = DOCUMENT_TOOLBAR_ACTION_ITEMS.find((item) => item.shortcutAction === shortcut.action);
        let handled = toolbarItem !== undefined;
        toolbarItem?.onClick$.next();

        // Other non-toolbar shortcuts
        if (
            !handled && // View filter change shortcut
            shortcut.action === IdpShortcutAction.IssueOnlyFilter
        ) {
            this.documentService.fullScreenMode$.pipe(take(1)).subscribe((isFullScreen) => {
                if (!isFullScreen) {
                    this.documentService.toggleViewFilter();
                }
            });

            handled = true;
        }

        return handled;
    }

    private getCreateCopyActionState(
        selectedPages: IdpDocumentPage[],
        contextDocuments: IdpDocument[],
        activePageCount: number
    ): [boolean, boolean | undefined, MessageTemplate | undefined] {
        const isOnlyOneDocumentSelected = contextDocuments.length === 1;
        if (isOnlyOneDocumentSelected) {
            const actionResultPageCount = activePageCount + selectedPages.length;
            return actionResultPageCount > MAX_PAGES
                ? [
                      false,
                      true,
                      {
                          key: 'IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CREATE_COPY_DISABLED_MAX_PAGES',
                          args: { maxPageCount: MAX_PAGES.toString() },
                      },
                  ]
                : [true, undefined, undefined];
        } else {
            return [false, undefined, undefined];
        }
    }
}
