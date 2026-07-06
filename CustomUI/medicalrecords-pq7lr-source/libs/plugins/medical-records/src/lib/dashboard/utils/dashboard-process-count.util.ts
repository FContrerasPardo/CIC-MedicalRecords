import { DashboardDateRange, DashboardProcessQueryConfig } from '../definitions/dashboard-widget.model';
import { resolveProcessDefinitionKeys } from '../definitions/dashboard-process-catalog';
import { flattenTableRow } from '../mappers/dashboard-table.mapper';
import { countRowsInDateRange } from './dashboard-date-range.util';
import { filterRowsByProcessDefinitions, filterRowsByProcessStatus } from './dashboard-data-source.util';

export function countProcessInstancesInRange(
    rows: Array<Record<string, unknown>>,
    range: DashboardDateRange,
    processQuery?: DashboardProcessQueryConfig
): number {
    const definitionKeys = resolveProcessDefinitionKeys(processQuery ?? {});
    const definitionFiltered = filterRowsByProcessDefinitions(rows, definitionKeys);
    const statusFiltered = filterRowsByProcessStatus(definitionFiltered, processQuery?.status);
    const flatRows = statusFiltered.map((row) => flattenTableRow(row));
    return countRowsInDateRange(flatRows, 'startDate', range);
}
