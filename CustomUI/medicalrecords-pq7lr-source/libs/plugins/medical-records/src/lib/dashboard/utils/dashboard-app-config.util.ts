import { AppConfigService } from '@alfresco/adf-core';

/** Same app resolution as MedicalRecordsTaskQueryService / native Automate views. */
export function resolveDeployedAppName(appConfigService: AppConfigService): string {
    return (
        appConfigService.get<Array<{ name: string }>>('alfresco-deployed-apps')?.[0]?.name ??
        appConfigService.get<{ name?: string }>('alfresco-process-services-cloud')?.name ??
        appConfigService.get<string>('application.name') ??
        ''
    );
}

export function normalizeProcessDateValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : '';
    }

    if (typeof value === 'string') {
        return value;
    }

    return String(value);
}
