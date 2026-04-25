/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ExtensionService } from '@alfresco/adf-extensions';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

@Injectable({ providedIn: 'root' })
export class ExtensionActionsHandler {
    private readonly extensionService = inject(ExtensionService);
    private readonly store = inject(Store);

    runActionById(id: string): void {
        const action = this.extensionService.getActionById(id);

        if (action) {
            const { type, payload } = action;
            const context = { selection: undefined };
            const expression = this.extensionService.runExpression(payload, context);

            this.store.dispatch({
                type,
                payload: expression,
            });
        } else {
            this.store.dispatch({
                type: id,
            });
        }
    }
}
