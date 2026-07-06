import { Component, ElementRef, EventEmitter, OnInit, Output } from '@angular/core';

import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { DashboardLayoutService } from '../../services/dashboard-layout.service';

import { DashboardThemeService } from '../../services/dashboard-theme.service';

import { DashboardLayoutState, DashboardWidgetConfig, DashboardWidgetId } from '../../definitions/dashboard-widget.model';

import { ProcessAttentionItem } from '../../definitions/process-attention.model';

import { DashboardWidgetGridComponent } from '../dashboard-widget-grid/dashboard-widget-grid.component';

import { resolveActivePageId } from '../../utils/dashboard-layout-structure.util';



@Component({

    selector: 'medical-records-dashboard-overview',

    standalone: true,

    imports: [CommonModule, TranslateModule, DashboardWidgetGridComponent],

    templateUrl: './dashboard-overview.component.html',

    styleUrls: ['./dashboard-overview.component.scss'],

})

export class DashboardOverviewComponent implements OnInit {

    @Output() processSelected = new EventEmitter<ProcessAttentionItem>();



    pages: DashboardLayoutState['pages'] = [];

    widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};

    activePageId = '';

    theme = this.layoutService.getLayout().theme;

    layoutLoading = true;

    layoutLoadSource: 'repo' | 'default' = 'default';



    constructor(

        private readonly layoutService: DashboardLayoutService,

        private readonly themeService: DashboardThemeService,

        private readonly hostRef: ElementRef<HTMLElement>

    ) {}



    ngOnInit(): void {

        this.layoutService.reloadLayout().subscribe({

            next: (layout) => {

                this.applyLayout(layout);

                this.layoutLoadSource = this.layoutService.getLayoutLoadSource();

                this.layoutLoading = false;

            },

            error: () => {

                this.applyLayout(this.layoutService.getLayout());

                this.layoutLoadSource = 'default';

                this.layoutLoading = false;

            },

        });

    }



    onProcessSelected(item: ProcessAttentionItem): void {

        this.processSelected.emit(item);

    }



    onActivePageChange(pageId: string): void {

        this.activePageId = pageId;

    }



    private applyLayout(layout: ReturnType<DashboardLayoutService['getLayout']>): void {

        this.pages = layout.pages;

        this.widgets = layout.widgets;

        this.activePageId = resolveActivePageId(layout.pages, layout.activePageId);

        this.theme = layout.theme;

        this.themeService.setThemeFromLayout(layout);

        this.themeService.applyToHost(this.hostRef.nativeElement);

    }

}


