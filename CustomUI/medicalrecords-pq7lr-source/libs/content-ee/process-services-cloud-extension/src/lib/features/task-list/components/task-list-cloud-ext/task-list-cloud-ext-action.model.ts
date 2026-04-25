/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const TaskListActionType = {
    TASK_DETAILS: 'task-details',
    PROCESS_HISTORY: 'process-history',
};
export type TaskListActionType = typeof TaskListActionType[keyof typeof TaskListActionType];

interface TaskListActionMenuModel {
    key?: TaskListActionType;
    icon?: string;
    title?: string;
    visible?: boolean;
}

const TASK_DETAILS_TITLE = 'PROCESS_CLOUD_EXTENSION.TASK_LIST.ACTIONS.TASK_DETAILS';
const TASK_DETAILS_ICON = 'launch';
const PROCESS_HISTORY_TITLE = 'PROCESS_CLOUD_EXTENSION.TASK_LIST.ACTIONS.PROCESS_HISTORY';
const PROCESS_HISTORY_ICON = 'clock';

export const taskDetailsActionMenuModel: TaskListActionMenuModel = {
    key: TaskListActionType.TASK_DETAILS,
    icon: TASK_DETAILS_ICON,
    title: TASK_DETAILS_TITLE,
    visible: true,
};

export const processHistoryActionMenuModel: TaskListActionMenuModel = {
    key: TaskListActionType.PROCESS_HISTORY,
    icon: PROCESS_HISTORY_ICON,
    title: PROCESS_HISTORY_TITLE,
    visible: true,
};
