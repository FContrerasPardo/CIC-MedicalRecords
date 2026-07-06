import {
    HXP_DOCUMENTS_ALL_QUERY,
    HXP_DOCUMENTS_CLASSIFIED_QUERY,
} from '../utils/dashboard-content-fields.util';

export interface ContentQueryPreset {
    id: string;
    labelKey: string;
    descriptionKey: string;
    query: string;
    suggestedColumns?: string;
}

export interface ProcessQueryPreset {
    id: string;
    labelKey: string;
    descriptionKey: string;
    processDefinitionKey: string;
    /** @deprecated use processDefinitionKey */
    processDefinitionName?: string;
    status: string[];
    suggestedColumns?: string;
}

export const CONTENT_QUERY_PRESETS: ContentQueryPreset[] = [
    {
        id: 'all-hxp-documents',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.ALL_HXP_DOCUMENTS',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.ALL_HXP_DOCUMENTS_DESC',
        query: HXP_DOCUMENTS_CLASSIFIED_QUERY,
        suggestedColumns: 'id, name, sys_id, sys_title, sys_primaryType, sys_created',
    },
    {
        id: 'all-hxp-documents-unclassified',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.ALL_HXP_DOCUMENTS_UNFILTERED',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.ALL_HXP_DOCUMENTS_UNFILTERED_DESC',
        query: HXP_DOCUMENTS_ALL_QUERY,
        suggestedColumns: 'id, name, sys_id, sys_title, sys_primaryType, sys_created',
    },
    {
        id: 'all-cmis-documents',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.ALL_CMIS_DOCUMENTS',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.ALL_CMIS_DOCUMENTS_DESC',
        query: 'SELECT * FROM cmis:document',
        suggestedColumns: 'id, name, cmis:objectTypeId, cmis:creationDate',
    },
    {
        id: 'pdf-documents',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.PDF_DOCUMENTS',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.CONTENT_PRESETS.PDF_DOCUMENTS_DESC',
        query: "SELECT * FROM cmis:document WHERE cmis:name LIKE '%.pdf'",
        suggestedColumns: 'id, name, sys_title',
    },
];

export const PROCESS_QUERY_PRESETS: ProcessQueryPreset[] = [
    {
        id: 'medical-records-all',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.PROCESS_PRESETS.MEDICAL_RECORDS_ALL',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.PROCESS_PRESETS.MEDICAL_RECORDS_ALL_DESC',
        processDefinitionKey: 'medical-records',
        processDefinitionName: 'medical-records',
        status: ['RUNNING', 'COMPLETED', 'SUSPENDED', 'CANCELLED'],
        suggestedColumns: 'id, name, status, processDefinitionKey, startDate',
    },
    {
        id: 'medical-records-running',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.PROCESS_PRESETS.MEDICAL_RECORDS_RUNNING',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.PROCESS_PRESETS.MEDICAL_RECORDS_RUNNING_DESC',
        processDefinitionKey: 'medical-records',
        processDefinitionName: 'medical-records',
        status: ['RUNNING'],
        suggestedColumns: 'id, name, status, startDate, businessKey',
    },
    {
        id: 'medical-records-completed',
        labelKey: 'MEDICAL_RECORDS.QUERY_HELP.PROCESS_PRESETS.MEDICAL_RECORDS_COMPLETED',
        descriptionKey: 'MEDICAL_RECORDS.QUERY_HELP.PROCESS_PRESETS.MEDICAL_RECORDS_COMPLETED_DESC',
        processDefinitionKey: 'medical-records',
        processDefinitionName: 'medical-records',
        status: ['COMPLETED'],
        suggestedColumns: 'id, name, status, startDate',
    },
];

export const CONTENT_QUERY_COLUMNS_HINT = 'id, name, sys_id, sys_title, sys_primaryType, sys_created, sys_parentId';

export const PROCESS_QUERY_COLUMNS_HINT =
    'id, name, status, processDefinitionKey, processDefinitionName, startDate, businessKey';
