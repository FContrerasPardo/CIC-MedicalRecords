/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentActionService } from '../../context-menu-actions/actions/document-action.service';
import {
    HXP_DOCUMENT_COPY_ACTION_SERVICE,
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
    HXP_DOCUMENT_MOVE_ACTION_SERVICE,
    HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
    HXP_DOCUMENT_SHARE_ACTION_SERVICE,
    HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
    HXP_DOCUMENT_INFO_ACTION_SERVICE,
    HXP_DOCUMENT_REPLACE_FILE_ACTION_SERVICE,
    HXP_DOCUMENT_CREATE_DOCUMENT_VERSION_ACTION_SERVICE,
} from '../../context-menu-actions/actions/action.tokens';
import { ActionContext } from '../../context-menu-actions/actions/action-context.interface';
import { ManageVersionsButtonActionService } from '../../manage-versions/manage-versions-button/manage-versions-button-action.service';

export interface ContextActionConfiguration {
    data: Document;
    model: {
        key: string;
        icon: string;
        title: string;
        visible: boolean;
    };
    subject: Subject<any>;
}

@Injectable({
    providedIn: 'root',
})
export class ContextMenuActionsService {
    private readonly documentDeleteHandler = inject(HXP_DOCUMENT_DELETE_ACTION_SERVICE);
    private readonly documentPermissionsHandler = inject(HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE);
    private readonly documentShareHandler = inject(HXP_DOCUMENT_SHARE_ACTION_SERVICE);
    private readonly documentSingleItemDownloadHandler = inject(HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE);
    private readonly documentInfoHandler = inject(HXP_DOCUMENT_INFO_ACTION_SERVICE);
    // copy and move actions are still declared under workspace-hxp.
    // Customer devs have to implement their own implementations since those actions are outside the lib.
    // We can't be sure that an implementation is provided so we marked them as @Optional.
    private readonly documentCopyHandler? = inject(HXP_DOCUMENT_COPY_ACTION_SERVICE, { optional: true });
    private readonly documentMoveHandler? = inject(HXP_DOCUMENT_MOVE_ACTION_SERVICE, { optional: true });
    private readonly replaceFileHander? = inject(HXP_DOCUMENT_REPLACE_FILE_ACTION_SERVICE, { optional: true });
    private readonly createVersionHander? = inject<DocumentActionService>(HXP_DOCUMENT_CREATE_DOCUMENT_VERSION_ACTION_SERVICE, { optional: true });
    private readonly manageVersionsHandler? = inject(ManageVersionsButtonActionService, { optional: true });

    getContextActions(data: Document, parentDocument?: Document): ContextActionConfiguration[] {
        const context: ActionContext = {
            documents: [data],
            parentDocument,
        };

        const actions = [
            {
                data,
                model: {
                    key: 'download',
                    icon: 'download',
                    title: 'SINGLE_FILE_DOWNLOAD.TOOLBAR.BUTTONS.DOWNLOAD.TITLE',
                    visible: this.documentSingleItemDownloadHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentSingleItemDownloadHandler, context),
            },
            {
                data,
                model: {
                    key: 'share',
                    icon: 'share',
                    title: 'DOCUMENT_SHARE.TOOLBAR.BUTTONS.SHARE.TITLE',
                    visible: this.documentShareHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentShareHandler, context),
            },
            {
                data,
                model: {
                    key: 'delete',
                    icon: 'trash',
                    title: 'DOCUMENT_DELETE.APP.TOOLBAR.BUTTONS.DELETE.TITLE',
                    visible: this.documentDeleteHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentDeleteHandler, context),
            },
        ];
        if (this.documentCopyHandler) {
            actions.push({
                data,
                model: {
                    key: 'copy',
                    icon: 'copy',
                    title: 'APP.TOOLBAR.BUTTONS.COPY.TITLE',
                    visible: this.documentCopyHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentCopyHandler, context),
            });
        }
        if (this.documentMoveHandler) {
            actions.push({
                data,
                model: {
                    key: 'move',
                    icon: 'move',
                    title: 'APP.TOOLBAR.BUTTONS.MOVE.TITLE',
                    visible: this.documentMoveHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentMoveHandler, context),
            });
        }
        actions.push(
            {
                data,
                model: {
                    key: 'permissions-management',
                    icon: 'users',
                    title: 'APP.TOOLBAR.BUTTONS.PERMISSIONS_MANAGEMENT.TITLE',
                    visible: this.documentPermissionsHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentPermissionsHandler, context),
            },
            {
                data,
                model: {
                    key: 'doc-info',
                    icon: 'info',
                    title: 'APP.TOOLBAR.BUTTONS.INFO.TITLE',
                    visible: this.documentInfoHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.documentInfoHandler, context),
            }
        );
        if (this.replaceFileHander) {
            actions.push({
                data,
                model: {
                    key: 'replace',
                    icon: 'attach_file',
                    title: 'APP.TOOLBAR.BUTTONS.REPLACE_FILE.TITLE',
                    visible: this.replaceFileHander.isAvailable(context),
                },
                subject: this.toContextAction(this.replaceFileHander, context),
            });
        }
        if (this.createVersionHander) {
            actions.push({
                data,
                model: {
                    key: 'version',
                    icon: 'save',
                    title: 'APP.TOOLBAR.BUTTONS.DOCUMENT_VERSION.TITLE',
                    visible: this.createVersionHander.isAvailable(context),
                },
                subject: this.toContextAction(this.createVersionHander, context),
            });
        }
        if (this.manageVersionsHandler) {
            actions.push({
                data,
                model: {
                    key: 'manage-versions',
                    icon: 'clock',
                    title: 'MANAGE_VERSIONS.TOOLBAR.BUTTONS.VERSIONS.TITLE',
                    visible: this.manageVersionsHandler.isAvailable(context),
                },
                subject: this.toContextAction(this.manageVersionsHandler, { ...context }),
            });
        }

        return actions;
    }

    private toContextAction(documentActionService: DocumentActionService, context: ActionContext): Subject<void> {
        const subject = new Subject<void>();
        subject.subscribe({
            next: () => {
                documentActionService.execute(context);
            },
        });
        return subject;
    }
}
