/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, input, viewChild, ElementRef, afterNextRender, computed, inject } from '@angular/core';
import { CardViewItem } from '@alfresco/adf-core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Clipboard } from '@angular/cdk/clipboard';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'hxp-metadata-sidebar-additional-info',
    templateUrl: './hxp-metadata-sidebar-additional-info.component.html',
    styleUrls: ['./hxp-metadata-sidebar-additional-info.component.scss'],
    imports: [MatButtonModule, MatTooltipModule, MatIconModule, TranslatePipe],
})
export class HxpMetadataSidebarAdditionalInfoComponent {
    nonEditableSystemProperties = input<CardViewItem[]>([]);
    pathContent = viewChild<ElementRef>('pathContent');

    protected pathProperty = computed(() => this.nonEditableSystemProperties().find((p) => p.label?.toLowerCase() === 'path'));
    protected isClamped = true;
    protected isOverflowing = false;
    protected hasOverflowed = false;
    protected checkOverflow$ = new Subject<void>();

    private readonly clipboard = inject(Clipboard);
    private readonly hxpNotificationService = inject(HxpNotificationService);

    constructor() {
        this.checkOverflow$.pipe(takeUntilDestroyed()).subscribe(() => {
            this.checkOverflow();
        });

        afterNextRender(() => {
            const pathContentElement = this.pathContent();
            if (pathContentElement) {
                const resizeObserver = new ResizeObserver(() => {
                    this.checkOverflow$.next();
                });

                resizeObserver.observe(pathContentElement.nativeElement);
            }
        });
    }

    protected toggleClamp(): void {
        this.isClamped = !this.isClamped;
    }

    protected onCopyPath(): void {
        const pathProperty = this.pathProperty();
        if (pathProperty?.displayValue) {
            const copied = this.clipboard.copy(pathProperty.displayValue as string);
            if (copied) {
                this.hxpNotificationService.showSuccess('DOCUMENT.METADATA.COPY_PATH.SUCCESS');
            }
        }
    }

    private checkOverflow() {
        // To avoid multiple calculations once overflow is detected
        if (this.hasOverflowed) {
            return;
        }

        const pathContentElement = this.pathContent();
        if (pathContentElement) {
            const element = pathContentElement.nativeElement;
            this.isOverflowing = element.scrollHeight > element.clientHeight;

            if (this.isOverflowing) {
                this.hasOverflowed = true;
            }
        }
    }
}
