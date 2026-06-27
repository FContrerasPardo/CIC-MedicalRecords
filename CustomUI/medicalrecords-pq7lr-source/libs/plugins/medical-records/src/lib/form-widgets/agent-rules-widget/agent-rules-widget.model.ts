export type AgentRuleTone = 'context' | 'intake' | 'compliance' | 'financial' | 'coding' | 'shared' | 'ui';
export type AgentRulesAudience = 'context' | 'intake' | 'agent' | 'ui';
export type AgentRulesMainTab = 'general' | 'tariffs' | 'aiRules' | 'documents';
export type AgentRulesAiSubTab = 'Intake' | 'Compliance' | 'Coding';

export interface AgentRuleScriptItem {
    id: string;
    label: string;
    agent: string;
    group: string;
    value: unknown;
    valueType?: string;
    isEmpty?: boolean;
    preview?: string;
}

export interface AgentRulesMetaField {
    key: string;
    label: string;
    value: string;
    editable: boolean;
}

export interface AgentRulesListField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'boolean';
    value: string | number | boolean;
    options?: string[];
}

export interface AgentRulesChipField {
    key: string;
    label: string;
    items: string[];
    editable: boolean;
}

export interface AgentRulesListItem {
    id: string;
    title: string;
    subtitle?: string;
    riskLevel?: string;
    fields: AgentRulesListField[];
    chips?: AgentRulesChipField;
}

export interface AgentRulesSectionViewModel {
    itemId: string;
    label: string;
    agent: string;
    group: string;
    tone: AgentRuleTone;
    audience: AgentRulesAudience;
    purpose?: string;
    isEmpty: boolean;
    readOnly: boolean;
    metaFields: AgentRulesMetaField[];
    summaryMetrics: Array<{ label: string; value: string }>;
    listTitle?: string;
    listItems: AgentRulesListItem[];
}

export interface AgentRulesWidgetViewModel {
    sections: AgentRulesSectionViewModel[];
    summary: {
        total: number;
        populated: number;
        empty: number;
    };
}

export type AgentRulesSectionDraft = Omit<AgentRulesSectionViewModel, 'audience' | 'purpose'>;

export interface AgreementGeneralViewModel {
    providerName: string;
    providerDisplayName: string;
    agreementBadge: string;
    contractId: string;
    payer: string;
    planName: string;
    legalRepresentative: string;
    contractType: string;
    effectiveFrom: string;
    effectiveTo: string;
    jurisdiction: string;
    capitationBase: number;
    capitationCurrency: string;
    capitationPeriod: string;
    budgetTotal: number;
    billedYtd: number;
    pendingApproval: number;
    budgetCurrency: string;
}

export interface AgreementDocumentFileViewModel {
    id: string;
    title: string;
    category: string;
    sizeLabel: string;
    updatedAt: string;
}

export interface AgreementHistoricalVersionViewModel {
    id: string;
    title: string;
    archivedAt: string;
}

export interface AgreementDocumentsViewModel {
    primaryDocument: {
        title: string;
        status: string;
        contractId: string;
        expiresAt: string;
        repositoryId: string;
        repositoryNodeId: string;
        mimeType: string;
    };
    relatedFiles: AgreementDocumentFileViewModel[];
    historicalVersions: AgreementHistoricalVersionViewModel[];
}

export interface AgreementGeneralFieldDefinition {
    key: keyof AgreementGeneralViewModel;
    labelKey: string;
    type: 'text' | 'number';
    editable: boolean;
}

export type PayerStatus = 'ACTIVE' | 'DRAFT';

export interface PayerSidebarProfile {
    id: string;
    category: string;
    name: string;
    status: PayerStatus;
    bindsRealPayload: boolean;
    footerLabel: string;
    footerIcon: 'calendar_today' | 'edit_document';
    agreementGeneral: AgreementGeneralViewModel;
    agreementDocuments: AgreementDocumentsViewModel;
    demoTariffPayload: Record<string, unknown>;
}
