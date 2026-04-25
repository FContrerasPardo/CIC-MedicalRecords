/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, effect, inject, input } from '@angular/core';
import { Chart, ChartConfiguration, Tooltip, Legend, ArcElement, DoughnutController, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslatePipe } from '@ngx-translate/core';
import { RecordHealthStatusItem } from '../../../definitions/dashboard.interface';
import { DEFAULT_STATUS_COLOR } from '../../../definitions/dashboard.constants';
import { STATUS_LABEL_MAP } from '../../../../../shared/ui/search/filters/status/status-options.data';
import { Router } from '@angular/router';
Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

@Component({
    selector: 'hxp-cic-gov-donut-chart',
    imports: [BaseChartDirective, TranslatePipe],
    templateUrl: './donut-chart.component.html',
    styleUrl: './donut-chart.component.scss',
})
export class HxpCicGovDonutChartComponent {
    data = input<RecordHealthStatusItem[]>([]);
    edsId = input<string>('');
    queryParams = input<Record<string, string>>({});

    private readonly BORDER_COLOR = '#FFFFFF';
    private readonly BORDER_WIDTH = 2;
    private readonly router = inject(Router);

    chartData: ChartConfiguration<'doughnut'>['data'] = {
        labels: [],
        datasets: [],
    };

    chartOptions: ChartConfiguration<'doughnut'>['options'] = {
        responsive: false,
        maintainAspectRatio: false,
        cutout: '50%',
        rotation: 110 * (Math.PI / 180),
        plugins: {
            tooltip: {
                callbacks: this.getTooltipLabel(),
            },
            legend: {
                display: false,
            },
        },
        onClick: async (_, activeElements, chart) => {
            if (activeElements.length > 0) {
                const clickedIndex = activeElements[0].index;
                const label = chart.data.labels ? chart.data.labels[clickedIndex] : null;

                if (label) {
                    await this.onSegmentClick(label as string);
                }
            }
        },
        onHover: (event, activeElements) => {
            const target = event.native?.target as HTMLElement;
            target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        },
    };

    constructor() {
        effect(() => {
            if (this.data()?.length) {
                this.processData();
            }
        });
    }

    private processData(): void {
        const inputData = this.data();
        const normalized = inputData.map((item) => ({
            label: item.label,
            value: Number(item.value ?? 0),
            color: item.color ?? DEFAULT_STATUS_COLOR,
        }));
        this.chartData = {
            labels: normalized.map((index) => index.label),
            datasets: [
                {
                    data: normalized.map((index) => index.value),
                    backgroundColor: normalized.map((index) => index.color),
                    borderColor: this.BORDER_COLOR,
                    borderWidth: this.BORDER_WIDTH,
                    hoverOffset: 0,
                },
            ],
        };
    }

    private getTooltipLabel(): { label: (context: TooltipItem<'doughnut'>) => string } {
        return {
            label: (context: TooltipItem<'doughnut'>) => {
                const label = context.label;
                const value = context.parsed || 0;
                const dataArray = context.chart.data.datasets[0].data as number[];
                const total = dataArray.reduce((sum, item) => sum + item, 0);
                const percent = total ? Math.round((value / total) * 100) : 0;
                return `${label}: ${percent}% (${value})`;
            },
        };
    }

    private async onSegmentClick(label: string): Promise<void> {
        const labelToStatusMap: Record<string, string> = {};
        for (const [key, val] of Object.entries(STATUS_LABEL_MAP)) {
            labelToStatusMap[val] = key;
        }

        const statusKey = labelToStatusMap[label];

        await this.router.navigate(['/governance/records'], {
            queryParams: {
                ...this.queryParams(),
                eds: this.edsId(),
                ...(statusKey ? { status: statusKey } : {}),
            },
        });
    }
}
