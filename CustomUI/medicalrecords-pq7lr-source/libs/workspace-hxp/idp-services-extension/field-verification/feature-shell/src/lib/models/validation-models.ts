/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpValidationStatus } from './screen-models';

export interface ValidationProcessInfo {
    processId: string;
    processName: string;
    appName: string;
    validatorName: string;
}
export interface ValidationField {
    name: string;
    value?: string;
    type: string;
    status?: IdpValidationStatus;
    updatedValue?: string;
}

export interface ValidationProcessParameters {
    fields: ValidationField[];
    tables: ValidationTable[];
}

export interface ValidationProcessResults {
    fields?: ValidationField[];
    tables?: ValidationTable[];
}

export interface ValidationTable {
    name: string;
    columnNames: string[];
    records: ValidationTableRecord[];
    status?: IdpValidationStatus;
}

export type ValidationTableRecord = ValidationTableCell[];

export interface ValidationTableCell {
    value: string;
    pageIndex: number;
    type: string;
    updatedValue?: string;
}
