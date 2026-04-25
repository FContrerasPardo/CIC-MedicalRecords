/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Meta } from '@storybook/angular';
import { TreeSkeletonLoaderComponent } from './tree-skeleton-loader.component';

export default {
    title: 'Ui/Skeletons/Tree Skeleton Loader',
    component: TreeSkeletonLoaderComponent,
} as Meta<TreeSkeletonLoaderComponent>;

export const Default = {};

export const CustomNumberOfRows = {
    render: (args: TreeSkeletonLoaderComponent) => ({
        props: args,
    }),
    args: {
        skeletonRows: 7,
    },
};
