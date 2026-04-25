/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdentityGroupModel } from '../models/identity-group.model';
import { IdentityGroupFilterInterface } from '../models/identity-group-filter.interface';

export const mockVegetableAubergine: IdentityGroupModel = { id: 'aubergine', name: 'Vegetable Aubergine' };
export const mockMeatChicken: IdentityGroupModel = { id: 'chicken', name: 'Meat Chicken' };
export const mockFruitsGroup: IdentityGroupModel[] = [{ id: '1', name: 'Apple' }];
export const mockFruitsGroupSearch: IdentityGroupModel[] = [
    { id: '2', name: 'Apple Green' },
    { id: '3', name: 'Apple Red' },
    { id: '1', name: 'Apple' },
];
export const mockFoodGroups = [mockVegetableAubergine, mockMeatChicken];

export const mockSearchGroupEmptyFilters: IdentityGroupFilterInterface = {
    roles: [],
    withinApplication: '',
};
