/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    ExtensionService,
    NavBarGroupRef,
    NavBarLinkRef,
    NavigationState,
    NodePermissions,
    ProfileState,
    RuleContext,
    RuleEvaluator,
    SelectionState,
} from '@alfresco/adf-extensions';
import { RepositoryInfo } from '@alfresco/js-api';
import { inject, Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidenavExtensionService implements RuleContext {
    repository: RepositoryInfo;
    auth: any;
    selection: SelectionState;
    navigation: NavigationState;
    profile: ProfileState;
    permissions: NodePermissions;
    private sidenavGroupsSubject$ = new ReplaySubject<NavBarGroupRef[]>();
    readonly sidenavGroups$ = this.sidenavGroupsSubject$.asObservable();

    private readonly extensionService = inject(ExtensionService);

    getEvaluator = (key: string): RuleEvaluator => {
        return this.extensionService.getEvaluator(key);
    };

    loadSidenavItems(navBarGroups: NavBarGroupRef[]): void {
        const sidenavItems = this.getSidenavItems(navBarGroups);
        this.sidenavGroupsSubject$.next(sidenavItems);
    }

    private getSidenavItems(navBarGroups: NavBarGroupRef[]): NavBarGroupRef[] {
        const rootNavBarGroups = navBarGroups.filter((group: NavBarGroupRef) => this.evaluateVisibleRule(group));

        const parseLinks = (links: NavBarLinkRef[]) => {
            const visibleLinks = links.filter((link: NavBarLinkRef) => this.evaluateVisibleRule(link));

            const sortedLinks = visibleLinks.sort((a, b) => (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY));

            return sortedLinks.map((link) => {
                if (link.children?.length) {
                    return parseLinks(link.children);
                }

                return link;
            });
        };

        return rootNavBarGroups.map((rootNavBarGroup) => {
            let rootNavBarGroupItems = rootNavBarGroup.items;

            if (rootNavBarGroupItems?.length) {
                rootNavBarGroupItems = parseLinks(rootNavBarGroupItems);
            }

            return {
                ...rootNavBarGroup,
                items: rootNavBarGroupItems,
            };
        });
    }

    private evaluateVisibleRule(item: NavBarGroupRef | NavBarLinkRef): boolean {
        if (item?.rules?.visible) {
            return this.extensionService.evaluateRule(item.rules.visible, this);
        }
        return true;
    }
}
