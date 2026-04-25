/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { FormBuilder, FormControlName, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import { ContentShareService, HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';

export interface DialogData {
    sharedDocument: Document;
}
const originFormControlNameNgOnChanges = FormControlName.prototype.ngOnChanges;
FormControlName.prototype.ngOnChanges = function (...arg) {
    const result = originFormControlNameNgOnChanges.apply(this, arg);
    (this.control as any).nativeElement = (this.valueAccessor as any)?._elementRef?.nativeElement;
    return result;
};

@Component({
    selector: 'hxp-alfresco-dbp-content-share-dialog',
    templateUrl: './content-share-dialog.component.html',
    styleUrls: ['./content-share-dialog.component.scss'],
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatTooltipModule,
        MatIconModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatInputModule,
        TranslatePipe,
        MatSnackBarModule,
    ],
})
export class ContentShareDialogComponent {
    readonly shareDocumentForm;

    private readonly _fb = inject(FormBuilder);
    private readonly data = inject<DialogData>(MAT_DIALOG_DATA);
    private readonly contentShareService = inject(ContentShareService);
    private readonly clipboard = inject(Clipboard);
    private readonly hxpNotificationService = inject(HxpNotificationService);

    constructor() {
        this.shareDocumentForm = this._fb.group({
            shared_link: ['', Validators.required],
        });

        if (this.data?.sharedDocument) {
            const sharedLink = this.contentShareService.getSingleContentShareLink(this.data.sharedDocument);
            this.shareDocumentForm.patchValue({ shared_link: sharedLink });
        }
    }
    onCopy() {
        this.clipboard.copy(this.shareDocumentForm.value.shared_link ?? '');
        (<any>this.shareDocumentForm.get('shared_link')).nativeElement.select();
        this.hxpNotificationService.openSnackBar('DOCUMENT_SHARE.SNACKBAR.SHARE.SUCCESS', 'done');
    }
}
