/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, effect, ElementRef, inject, input, OnInit, output, ViewChild } from '@angular/core';
import { merge, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FocusMonitor } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { HxpWorkspaceDocumentTreeComponent } from '@hxp/workspace-hxp/shared/workspace-document-tree';
import { AsyncPipe } from '@angular/common';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MimeTypeIconComponent } from '@alfresco/adf-hx-content-services/icons';

@Component({
    selector: 'hxp-document-location-picker',
    imports: [
        AsyncPipe,
        MatIconModule,
        TranslatePipe,
        MatInputModule,
        CdkOverlayOrigin,
        CdkConnectedOverlay,
        HxpWorkspaceDocumentTreeComponent,
        MimeTypeIconComponent,
    ],
    templateUrl: './document-location-picker.component.html',
    styleUrls: ['./document-location-picker.component.scss'],
})
export class DocumentLocationPickerComponent implements OnInit {
    private static readonly EMPTY_CONTENT = '...';
    private static readonly OFFSET_X = -43;
    private static readonly OFFSET_Y = 16;

    private readonly focusMonitor = inject(FocusMonitor);
    private readonly destroyRef = inject(DestroyRef);

    document = input<Document>();
    required = input<boolean>(false);

    selectedLocation = output<Document>();

    @ViewChild(MatFormField, { read: ElementRef, static: true })
    private matFormFieldEl!: ElementRef;

    @ViewChild(MatInput, { read: ElementRef, static: true })
    private matInputEl!: ElementRef;

    @ViewChild(CdkConnectedOverlay, { static: true })
    private connectedOverlay!: CdkConnectedOverlay;

    protected selectedDocument: [Document] | [] = [];
    protected currentLocation = DocumentLocationPickerComponent.EMPTY_CONTENT;
    protected width = '0';
    protected readonly positions: ConnectedPosition[] = [
        {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
            offsetX: DocumentLocationPickerComponent.OFFSET_X,
            offsetY: DocumentLocationPickerComponent.OFFSET_Y,
        },
    ];
    protected showDropdown$!: Observable<boolean>;

    constructor() {
        effect(() => {
            this.selectedDocument = this.document() ? [this.document()] : [];
            this.currentLocation = this.document()?.sys_path || DocumentLocationPickerComponent.EMPTY_CONTENT;
            if (this.selectedDocument.length === 0) {
                console.warn('Document to build location picker tree not found');
            }
        });
    }

    ngOnInit(): void {
        const isDropdownClicked$ = this.connectedOverlay.backdropClick.pipe(map(() => false));
        const selectedLocationObservable$ = outputToObservable(this.selectedLocation);

        this.showDropdown$ = merge(
            isDropdownClicked$,
            this.focusMonitor.monitor(this.matInputEl).pipe(
                filter((focused) => !!focused),
                map(() => {
                    this.onResize();
                    return true;
                })
            ),
            selectedLocationObservable$.pipe(map(() => false))
        ).pipe(takeUntilDestroyed(this.destroyRef));
    }

    onLocationSelected(document: Document): void {
        this.selectedDocument = [document];
        this.currentLocation = document?.sys_path || '';
        this.selectedLocation.emit(document);
    }

    onResize(): void {
        this.width = this.matFormFieldEl.nativeElement.getBoundingClientRect().width + 'px';
        this.connectedOverlay.minWidth = this.width;
    }
}
