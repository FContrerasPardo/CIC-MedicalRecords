export const TABLE_EXPORT_MAX_ROWS = 5000;

export function escapeCsvCell(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export function buildTableCsv(columns: string[], rows: Array<Record<string, string>>): string {
    const header = columns.map((column) => escapeCsvCell(column)).join(',');
    const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column] ?? '')).join(',')).join('\n');
    return body ? `${header}\n${body}` : header;
}

export function downloadCsvFile(csv: string, filename: string): void {
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function buildTableExportFilename(title: string): string {
    const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 64);
    const date = new Date().toISOString().slice(0, 10);
    return `${slug || 'report'}-${date}.csv`;
}
