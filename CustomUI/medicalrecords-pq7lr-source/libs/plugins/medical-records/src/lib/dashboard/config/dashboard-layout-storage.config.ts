import { AppConfigService } from '@alfresco/adf-core';

/** Default MedRec/Appdata folder (demo tenant). */
export const DEFAULT_APPDATA_FOLDER_ID = '097cf547-5677-4773-83a1-7b2c4f23bcb9';

/** Default MedRec/Appdata/Dashboards folder (demo tenant). */
export const DEFAULT_DASHBOARDS_FOLDER_ID = 'fd5fb78f-faba-490f-b342-c2b7963053fa';

export const DEFAULT_APPDATA_FOLDER_PATH = '/MedRec/Appdata';
export const DEFAULT_DASHBOARDS_FOLDER_PATH = '/MedRec/Appdata/Dashboards';

export const APP_CONFIG_APPDATA_FOLDER_ID = 'medical-records.appdata.folderId';
export const APP_CONFIG_DASHBOARDS_FOLDER_ID = 'medical-records.appdata.dashboardsFolderId';
export const APP_CONFIG_LAYOUT_DOCUMENT_ID = 'medical-records.appdata.dashboardLayoutDocumentId';

export function resolveAppdataFolderId(appConfigService: AppConfigService): string | undefined {
    return appConfigService.get<string>(APP_CONFIG_APPDATA_FOLDER_ID) ?? DEFAULT_APPDATA_FOLDER_ID;
}

export function resolveDashboardsFolderId(appConfigService: AppConfigService): string | undefined {
    return appConfigService.get<string>(APP_CONFIG_DASHBOARDS_FOLDER_ID) ?? DEFAULT_DASHBOARDS_FOLDER_ID;
}

export function resolveLayoutDocumentId(appConfigService: AppConfigService): string | undefined {
    return appConfigService.get<string>(APP_CONFIG_LAYOUT_DOCUMENT_ID);
}
