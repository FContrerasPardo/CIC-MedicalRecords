import { Injectable } from '@angular/core';
import { DashboardLayoutState, DashboardWidgetConfig, DashboardWidgetId } from '../definitions/dashboard-widget.model';

const STORAGE_KEY = 'medical-records.dashboard.layout.v1';

const DEFAULT_WIDGETS: Record<DashboardWidgetId, DashboardWidgetConfig> = {
    'recovery-rate': {
        id: 'recovery-rate',
        type: 'metric',
        titleKey: 'MEDICAL_RECORDS.CARDS.TOTAL_RECOVERY_RATE',
        helperKey: 'MEDICAL_RECORDS.CARDS.TOTAL_RECOVERY_RATE_HELPER',
        icon: 'trending_up',
        demoValue: '87.4%',
        span: 'normal',
    },
    'productivity-chart': {
        id: 'productivity-chart',
        type: 'chart',
        titleKey: 'MEDICAL_RECORDS.CARDS.PRODUCTIVITY_BY_HOUR',
        helperKey: 'MEDICAL_RECORDS.CARDS.DAILY_PROCESSING_VOLUME',
        span: 'wide',
    },
    'completion-rate': {
        id: 'completion-rate',
        type: 'metric',
        titleKey: 'MEDICAL_RECORDS.CARDS.PROCESS_COMPLETION',
        helperKey: 'MEDICAL_RECORDS.CARDS.PROCESS_COMPLETION_HELPER',
        icon: 'check_circle',
        demoValue: '95%',
        span: 'normal',
    },
    'document-volume': {
        id: 'document-volume',
        type: 'metric',
        titleKey: 'MEDICAL_RECORDS.DASHBOARD.DOCUMENT_VOLUME',
        helperKey: 'MEDICAL_RECORDS.DASHBOARD.DOCUMENT_VOLUME_HELPER',
        icon: 'folder_copy',
        contentQuery: 'SELECT * FROM hxp:document',
        span: 'normal',
    },
    'performance-metrics': {
        id: 'performance-metrics',
        type: 'metric',
        titleKey: 'MEDICAL_RECORDS.SECTIONS.PERFORMANCE_METRICS',
        span: 'full',
    },
    'process-list': {
        id: 'process-list',
        type: 'process-list',
        titleKey: 'MEDICAL_RECORDS.SECTIONS.ATTENTION_REQUIRED',
        span: 'full',
    },
};

const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] = [
    'recovery-rate',
    'productivity-chart',
    'completion-rate',
    'document-volume',
    'performance-metrics',
    'process-list',
];

@Injectable({ providedIn: 'root' })
export class DashboardLayoutService {
    getLayout(): DashboardLayoutState {
        const stored = this.readStoredLayout();
        return stored ?? { widgetOrder: [...DEFAULT_WIDGET_ORDER], widgets: { ...DEFAULT_WIDGETS } };
    }

    saveLayout(layout: DashboardLayoutState): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }

    resetLayout(): DashboardLayoutState {
        const layout = { widgetOrder: [...DEFAULT_WIDGET_ORDER], widgets: { ...DEFAULT_WIDGETS } };
        this.saveLayout(layout);
        return layout;
    }

    private readStoredLayout(): DashboardLayoutState | null {
        if (typeof localStorage === 'undefined') {
            return null;
        }

        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as DashboardLayoutState;
            if (!Array.isArray(parsed.widgetOrder) || !parsed.widgets) {
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }
}
