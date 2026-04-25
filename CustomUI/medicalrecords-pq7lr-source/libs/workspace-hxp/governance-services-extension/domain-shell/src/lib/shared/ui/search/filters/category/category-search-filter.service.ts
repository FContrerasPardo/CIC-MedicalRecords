/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { filter, from, map, mergeMap, Observable, toArray } from 'rxjs';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { GovernanceConfigurationService } from '../../../../config/governance-config.service';
import { Category, FilePlan, GovernanceConfigModel } from '../../../../config/governance-config.type';

@Injectable({
    providedIn: 'root',
})
export class CategorySearchFilterService {
    public readonly QUERY_PARAM = 'categoryId';

    private configService = inject(GovernanceConfigurationService);

    getCategories(): Observable<{ label: string; value: string; tooltip: string }[]> {
        return this.configService.getConfig().pipe(
            mergeMap((config: GovernanceConfigModel) => {
                const categoryMap = new Map<string, Category>();
                for (const cat of config.categories) {
                    categoryMap.set(cat.id, cat);
                }

                const filePlanMap = new Map<string, FilePlan>();
                for (const fp of config.filePlans) {
                    filePlanMap.set(fp.id, fp);
                }

                return from(config.categories).pipe(
                    filter((cat) => !this.isContainerTypeCategory(cat)),
                    map((cat) => {
                        const segments: string[] = [];
                        let currentCat: Category | undefined = cat;
                        while (currentCat) {
                            segments.unshift(currentCat.name);
                            currentCat = currentCat.parentId ? categoryMap.get(currentCat.parentId) : undefined;
                        }

                        let filePlanName = '';
                        if (cat.filePlanId) {
                            const filePlan = filePlanMap.get(cat.filePlanId);
                            if (filePlan) {
                                filePlanName = filePlan.name;
                            }
                        }
                        if (filePlanName) {
                            segments.unshift(filePlanName);
                        }

                        const label =
                            segments.length <= 2
                                ? segments.map((seg) => this.truncateSegment(seg, 7)).join('/')
                                : `${this.truncateSegment(segments[0], 7)}/.../${this.truncateSegment(segments.at(-1) ?? '', 7)}`;
                        const rawPath = segments.join('/');

                        return {
                            label,
                            value: cat.id,
                            tooltip: rawPath,
                        };
                    }),
                    toArray()
                );
            })
        );
    }

    toQueryParams(data: MultiSelectListSearchFilterData): any {
        if (!data?.values?.length) {
            return {};
        }

        return {
            [this.QUERY_PARAM]: data.values.map((item) => item.value),
        };
    }

    fromQueryParams(params: Record<string, any>): MultiSelectListSearchFilterData | undefined {
        const categoryParam = params[this.QUERY_PARAM];
        if (!categoryParam) {
            return undefined;
        }

        const values = Array.isArray(categoryParam) ? categoryParam : [categoryParam];

        if (values.length === 0) {
            return undefined;
        }

        const placeholderValues = values.map((id) => ({
            label: '',
            value: id,
        }));

        return new MultiSelectListSearchFilterData(placeholderValues);
    }

    private isContainerTypeCategory(category: Category): boolean {
        return category.retentionPolicy == null ||
            (category.retentionPolicy?.contentFocus == null
                && category.retentionPolicy?.triggerCondition == null
                && category.retentionPolicy?.retentionPeriod == null
                && category.retentionPolicy?.disposition == null);
    }

    /**
     * Truncate a text segment to the specified max length, adding an ellipsis if truncated.
     */
    private truncateSegment(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        // Reserve one character for the ellipsis
        const sliceLength = Math.max(0, maxLength - 1);
        return text.slice(0, sliceLength) + '…';
    }
}
