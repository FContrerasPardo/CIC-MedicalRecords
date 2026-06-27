import { Observable } from 'rxjs';
import { DashboardContentQueryResult, DashboardWidgetConfig } from './dashboard-widget.model';

export interface DashboardDataProvider {
    fetch(config: DashboardWidgetConfig): Observable<DashboardContentQueryResult>;
}
