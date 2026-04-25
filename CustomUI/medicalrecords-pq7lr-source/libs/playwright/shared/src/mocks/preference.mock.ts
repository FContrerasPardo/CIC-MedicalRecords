/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseMock } from '.';

type PreferenceMockType = 'processes-cloud-columns-visibility' | 'tasks-list-cloud-columns-visibility';

interface ColumnsPayloadType {
    key: string;
    value: { [key: string]: boolean };
}
interface PreferenceResponseEntry {
    entry: ColumnsPayloadType;
}
/* eslint-disable */
export class PreferenceMock extends BaseMock {
    public preferenceEndpoint = '**/preference/v1/preferences';
    public columnsWidthsEndpoint = /preference\/v1\/preferences\/.+-columns-widths/;
    public columnsOrderEndpoint = /preference\/v1\/preferences\/.+-columns-order/;

    constructor(page: Page) {
        super(page);
    }

    async mockProcessColumnPreferences(howManyTimes: number = 1): Promise<void> {
        await this.page.route(
            this.preferenceEndpoint,
            async (route) => {
                const body = this.getProcessListPreferencesResponse();
                await route.fulfill({ json: body });
            },
            { times: howManyTimes }
        );
    }

    async mockTaskColumnPreferences(): Promise<void> {
        await this.page.route(
            this.preferenceEndpoint,
            async (route) => {
                const body = this.getTasksListPreferencesResponse();
                await route.fulfill({ json: body });
            },
        );
    }

    async mockCloudColumnsVisibility(columnNames: string[], key: PreferenceMockType): Promise<void> {
        this.page.on('request', (request) => {});
        await this.page.route('**/preference/v1/preferences', async (route) => {
            const response = await route.fetch();
            const json = await response.json();
            const columnsPayload: ColumnsPayloadType = { key, value: {} };
            const { entries, pagination } = json.list;

            for (let column of columnNames) {
                if (/\./.test(column)) {
                    column = column.replace('.', '');
                }

                columnsPayload.value[`${column}`] = true;
            }

            if (entries.some(({ entry }: PreferenceResponseEntry) => entry.key === key)) {
                entries.find(({ entry }: PreferenceResponseEntry) => entry.key === key).entry.value = JSON.stringify(columnsPayload.value);
            } else {
                entries.push({ entry: { key: columnsPayload.key, value: JSON.stringify(columnsPayload.value) } });
                pagination.totalItems++;
                pagination.count++;
            }

            await route.fulfill({
                body: JSON.stringify({
                    list: {
                        entries: entries,
                        pagination: pagination,
                    },
                }),
            });
        });
    }

    private getProcessListPreferencesResponse() {
        return {
            list: {
                entries: [
                    {
                        entry: {
                            key: 'processes-cloud-list-columns-order',
                            value: '["app.process.name","app.process.processDefinitionName","app.process.relatedProcess","app.process.status","app.process.startDate","app.process.completedDate","app.process.initiator","app.process.appVersion"]',
                        },
                    },
                    {
                        entry: {
                            key: 'processes-cloud-columns-widths',
                            value: '{"app.process.name":254,"app.process.processDefinitionName":122,"app.process.relatedProcess":100,"app.process.status":100,"app.process.startDate":100,"app.process.completedDate":100,"app.process.initiator":100,"app.process.appVersion":332}'
                        },
                    },
                    {
                        entry: {
                            key: 'recent-process-definition-ids',
                            value: '["Process_EwGkR8Rp","Process_XBs53jwy","Process_iJDbDH6z"]',
                        },
                    },
                    {
                        entry: {
                            key: 'processes-cloud-columns-visibility',
                            value: '{}',
                        },
                    },
                ],
                pagination: {
                    skipCount: 0,
                    maxItems: 100,
                    count: 4,
                    hasMoreItems: false,
                    totalItems: 4,
                },
            },
        };
    }
    private getTasksListPreferencesResponse() {
        return {
            list: {
                entries: [
                    {
                        entry: {
                            key: 'recent-process-definition-ids',
                            value: '["Process__DPVOltD","Process_1762374714828","Process_1762373215486"]',
                        },
                    },
                    {
                        entry: {
                            key: 'processes-cloud-list-columns-order',
                            value: '["app.process.name","app.process.processDefinitionName","app.process.relatedProcess","app.process.startDate","app.process.status","app.process.completedDate","app.process.initiator","app.process.appVersion","string_var/417f39e2-0712-43b0-8e84-73e6fdd58d36","integer_var/568d5933-8ed0-46de-92f6-53fa27b33246","bigdecimal_var/b1e4dfee-60d8-450c-9699-07d3511a2d27","date_var/3c586027-43f8-4a50-a2c6-339e0539f2c5","datetime_var/42510e94-867f-4e81-9b6f-bdc2f04ed85e","boolean_var/f00a5848-4b0d-42c8-9efb-e714962d5e9f","Column A/20a325cb-c79b-40d5-92bf-06e3287322ce","Column B !@#$%^&*()_/c1de5c02-d76c-4a84-a460-faad915ed94c","Column C/62c1a7a7-0499-49cc-968c-a6ed4dfd1618","Column D/0803b16d-a920-4ede-95a2-78c1063e9c9a","Column E/114abfbf-1f42-4328-a52f-35b50aa6e9cb","text/ff43d56e-ec43-4bf0-894b-6637be7203fa","multiline_text/f4535d19-87da-45ab-bd96-9add6cf11ee6","integer/7e694ef5-ef9e-43a7-9389-9678018b13f6","date/798f114b-c444-414d-a4cd-c6e7ff7d7278","datetime/dcc8c3c9-5e8b-4342-946f-121f9b1d80e0","boolean/ccb13e09-8026-4cbe-9d4e-f5a1c54568a8","unique_var/1f6765e5-7d18-45c5-b9d0-0a5de3be1538","Column A/7e54b4b0-d1f0-48f5-8060-adfc459be9ee","Column B !@#$%^&*()_/7727897b-c471-4f38-a1b3-da07e6308e44","Column C/7845f9eb-7e58-417a-a933-1f48f2c97b75","Column D/f3ae6af4-b580-42ab-a74f-afc461031006","Column E/8bebf1a7-189f-46a2-b2b5-bb1c05d6d349"]',
                        },
                    },
                    {
                        entry: {
                            key: 'processes-cloud-columns-widths',
                            value: '{"app.process.name":468,"app.process.processDefinitionName":137,"app.process.relatedProcess":100,"app.process.startDate":126,"app.process.status":126,"app.process.completedDate":184,"app.process.initiator":219,"app.process.appVersion":86,"string_var/417f39e2-0712-43b0-8e84-73e6fdd58d36":67,"integer_var/568d5933-8ed0-46de-92f6-53fa27b33246":67,"bigdecimal_var/b1e4dfee-60d8-450c-9699-07d3511a2d27":67,"date_var/3c586027-43f8-4a50-a2c6-339e0539f2c5":67,"datetime_var/42510e94-867f-4e81-9b6f-bdc2f04ed85e":67,"boolean_var/f00a5848-4b0d-42c8-9efb-e714962d5e9f":65}',
                        },
                    },
                    {
                        entry: {
                            key: 'tasks-list-cloud-columns-visibility',
                            value: '{"Column A/20a325cb-c79b-40d5-92bf-06e3287322ce":false,"Column A/7e54b4b0-d1f0-48f5-8060-adfc459be9ee":false,"description":false,"Column B !@#$%^&*()_/c1de5c02-d76c-4a84-a460-faad915ed94c":false,"Column C/62c1a7a7-0499-49cc-968c-a6ed4dfd1618":false,"Column D/0803b16d-a920-4ede-95a2-78c1063e9c9a":false,"Column E/114abfbf-1f42-4328-a52f-35b50aa6e9cb":false,"text/ff43d56e-ec43-4bf0-894b-6637be7203fa":false,"multiline_text/f4535d19-87da-45ab-bd96-9add6cf11ee6":false,"integer/7e694ef5-ef9e-43a7-9389-9678018b13f6":false,"date/798f114b-c444-414d-a4cd-c6e7ff7d7278":false,"datetime/dcc8c3c9-5e8b-4342-946f-121f9b1d80e0":false,"boolean/ccb13e09-8026-4cbe-9d4e-f5a1c54568a8":false,"string_var/417f39e2-0712-43b0-8e84-73e6fdd58d36":false,"integer_var/568d5933-8ed0-46de-92f6-53fa27b33246":false,"bigdecimal_var/b1e4dfee-60d8-450c-9699-07d3511a2d27":false,"date_var/3c586027-43f8-4a50-a2c6-339e0539f2c5":false,"datetime_var/42510e94-867f-4e81-9b6f-bdc2f04ed85e":false,"boolean_var/f00a5848-4b0d-42c8-9efb-e714962d5e9f":false,"unique_var/1f6765e5-7d18-45c5-b9d0-0a5de3be1538":false,"Column B !@#$%^&*()_/7727897b-c471-4f38-a1b3-da07e6308e44":false,"Column C/7845f9eb-7e58-417a-a933-1f48f2c97b75":false,"Column D/f3ae6af4-b580-42ab-a74f-afc461031006":false,"Column E/8bebf1a7-189f-46a2-b2b5-bb1c05d6d349":false}',
                        },
                    },
                    {
                        entry: {
                            key: 'processes-cloud-columns-visibility',
                            value: '{"Column E/114abfbf-1f42-4328-a52f-35b50aa6e9cb":false,"string_var/417f39e2-0712-43b0-8e84-73e6fdd58d36":false,"integer_var/568d5933-8ed0-46de-92f6-53fa27b33246":false,"bigdecimal_var/b1e4dfee-60d8-450c-9699-07d3511a2d27":false,"date_var/3c586027-43f8-4a50-a2c6-339e0539f2c5":false,"datetime_var/42510e94-867f-4e81-9b6f-bdc2f04ed85e":false,"boolean_var/f00a5848-4b0d-42c8-9efb-e714962d5e9f":false,"Column A/20a325cb-c79b-40d5-92bf-06e3287322ce":false,"Column B !@#$%^&*()_/c1de5c02-d76c-4a84-a460-faad915ed94c":false,"Column C/62c1a7a7-0499-49cc-968c-a6ed4dfd1618":false,"Column D/0803b16d-a920-4ede-95a2-78c1063e9c9a":false,"text/ff43d56e-ec43-4bf0-894b-6637be7203fa":false,"multiline_text/f4535d19-87da-45ab-bd96-9add6cf11ee6":false,"integer/7e694ef5-ef9e-43a7-9389-9678018b13f6":false,"date/798f114b-c444-414d-a4cd-c6e7ff7d7278":false,"datetime/dcc8c3c9-5e8b-4342-946f-121f9b1d80e0":false,"boolean/ccb13e09-8026-4cbe-9d4e-f5a1c54568a8":false,"unique_var/1f6765e5-7d18-45c5-b9d0-0a5de3be1538":false,"Column A/7e54b4b0-d1f0-48f5-8060-adfc459be9ee":false,"Column B !@#$%^&*()_/7727897b-c471-4f38-a1b3-da07e6308e44":false,"Column C/7845f9eb-7e58-417a-a933-1f48f2c97b75":false,"Column D/f3ae6af4-b580-42ab-a74f-afc461031006":false,"Column E/8bebf1a7-189f-46a2-b2b5-bb1c05d6d349":false}',
                        },
                    },
                ],
                pagination: {
                    skipCount: 0,
                    maxItems: 100,
                    count: 5,
                    hasMoreItems: false,
                    totalItems: 5,
                },
            },
        };
    }
}
