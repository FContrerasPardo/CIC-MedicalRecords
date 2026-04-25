/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { WidgetComponent, CardViewItem, FormFieldModel, ErrorWidgetComponent } from '@alfresco/adf-core';
import { Component, DestroyRef, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FormWidgetService } from '../../services/form-widget/form-widget.service';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DOCUMENT_PROPERTIES_SERVICE, SharedDocumentPropertiesService } from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertiesViewerContentComponent } from '@alfresco/adf-hx-content-services/ui';
import { NgIf, AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface PropertiesViewerContentData {
    defaultProperties: CardViewItem[];
    otherProperties: CardViewItem[];
    document: Document;
}

@Component({
    selector: 'hxp-properties-viewer-widget',
    templateUrl: './properties-viewer.widget.html',
    styleUrls: ['./properties-viewer.widget.scss'],
    host: {
        '(click)': 'event($event)',
        '(blur)': 'event($event)',
        '(change)': 'event($event)',
        '(focus)': 'event($event)',
        '(focusin)': 'event($event)',
        '(focusout)': 'event($event)',
        '(input)': 'event($event)',
        '(invalid)': 'event($event)',
        '(select)': 'event($event)',
    },
    encapsulation: ViewEncapsulation.None,
    imports: [NgIf, PropertiesViewerContentComponent, ErrorWidgetComponent, AsyncPipe, TranslatePipe],
})
export class PropertiesViewerWidgetComponent extends WidgetComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private formWidgetService = inject(FormWidgetService);
    private documentPropertiesService = inject<SharedDocumentPropertiesService>(DOCUMENT_PROPERTIES_SERVICE);

    data$: Observable<PropertiesViewerContentData | null> = combineLatest([
        this.getDocumentFromField(),
        this.getDefaultProperties(),
        this.getOtherProperties(),
    ]).pipe(
        map(([document, defaultProperties, otherProperties]) => {
            return document ? { document, defaultProperties, otherProperties } : null;
        })
    );

    ngOnInit() {
        this.formService?.formDataRefreshed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((formEvent) => {
            const linkedWidgetField = formEvent.form.fieldsCache?.find(
                (cachedField: { id: string }) => cachedField.id === this.field.params['hxpUploadWidget']
            );
            if (linkedWidgetField) {
                this.field.value = linkedWidgetField.value;
                this.refresh();
            }
        });
    }

    get options() {
        return this.field?.params['propertiesViewerOptions'];
    }

    refresh() {
        this.fieldChanged.emit(this.field);
    }

    private getDocumentFromField(): Observable<Document | null> {
        return this.fieldChanged.pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((field: FormFieldModel) => this.formWidgetService.getDocumentFromField(field))
        );
    }

    private getDefaultProperties(): Observable<CardViewItem[]> {
        return this.getDocumentFromField().pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((document: Document | null) => this.documentPropertiesService.getDefaultPropertiesFromDocument(document))
        );
    }

    private getOtherProperties(): Observable<CardViewItem[]> {
        return this.getDocumentFromField().pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((document: Document | null) => {
                const documentPropertiesFilteringOptions = {
                    exclude: {
                        schemas: ['sysfile_blob', 'sys_'],
                    },
                };
                return this.documentPropertiesService.getPropertiesFromDocument(document, documentPropertiesFilteringOptions);
            })
        );
    }
}
