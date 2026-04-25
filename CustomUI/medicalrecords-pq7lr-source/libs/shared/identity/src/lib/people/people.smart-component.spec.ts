/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InitialUsernamePipe, NoopTranslateModule, NoopAuthModule } from '@alfresco/adf-core';
import { AlfrescoApiService, AlfrescoApiServiceMock } from '@alfresco/adf-content-services';
import { DebugElement, SimpleChange } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import {
    mockFoodUsers,
    mockKielbasaSausage,
    mockShepherdsPie,
    mockYorkshirePudding,
    mockPreselectedFoodUsers,
    mockTestUser,
    mockAnotherTestUser,
} from '../mock/people.mock';
import { IdentityUserService } from '../services/identity-user.service';
import { ChipHarnessUtils, TooltipHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';

import { PeopleSmartComponent } from './people.smart-component';
import { SharedIdentityFullNamePipe } from '../pipe/full-name.pipe';
import { SHARED_IDENTITY_USER_SERVICE_TOKEN } from '../services/identity-user-service.token';
import { SHARED_IDENTITY_FULL_NAME_PIPE_INCLUDE_EMAIL } from '../pipe/full-name-email-required.token';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const TYPING_DEBOUNCE_TIME = 500;

describe('PeopleSmartComponent', () => {
    let component: PeopleSmartComponent;
    let fixture: ComponentFixture<PeopleSmartComponent>;
    let element: HTMLElement;
    let identityUserService: IdentityUserService;
    let searchSpy: jest.SpyInstance;

    function getElement<T = HTMLElement>(selector: string): T {
        return fixture.nativeElement.querySelector(selector);
    }

    function searchUsers(value: string) {
        const input = getElement<HTMLInputElement>('input');
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('keyup'));
        input.dispatchEvent(new Event('input'));

        tick(TYPING_DEBOUNCE_TIME);
        fixture.detectChanges();
        tick();
    }

    async function searchUsersAndBlur(value: string) {
        const input = getElement<HTMLInputElement>('input');
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('keyup'));
        input.dispatchEvent(new Event('input'));

        await fixture.whenStable();
        fixture.detectChanges();

        input.blur();
        fixture.detectChanges();
    }

    function getUsersListUI(): DebugElement[] {
        return fixture.debugElement.queryAll(By.css('[data-automation-id="ama-identity-people-row"]'));
    }

    function getFirstUserFromListUI(): Element | null {
        return element.querySelector('[data-automation-id="ama-identity-people-row"]');
    }

    function getTestBedConfig(includeEmailInjectionToken?: boolean) {
        return {
            imports: [
                NoopTranslateModule,
                NoopAnimationsModule,
                NoopAuthModule,
                InitialUsernamePipe,
                PeopleSmartComponent,
                SharedIdentityFullNamePipe,
                MatIconTestingModule,
            ],
            providers: [
                { provide: AlfrescoApiService, useClass: AlfrescoApiServiceMock },
                { provide: SHARED_IDENTITY_USER_SERVICE_TOKEN, useClass: IdentityUserService },
                { provide: SHARED_IDENTITY_FULL_NAME_PIPE_INCLUDE_EMAIL, useValue: includeEmailInjectionToken },
            ],
        };
    }

    function setupBeforeEachAction() {
        identityUserService = TestBed.inject(SHARED_IDENTITY_USER_SERVICE_TOKEN);

        fixture = TestBed.createComponent(PeopleSmartComponent);
        component = fixture.componentInstance;
    }

    describe('Include email injection token disabled', () => {
        beforeEach(() => {
            TestBed.configureTestingModule(getTestBedConfig());

            setupBeforeEachAction();
        });

        it('should populate placeholder when title is present', () => {
            component.title = 'TITLE_KEY';
            fixture.detectChanges();

            const matLabel = getElement<HTMLInputElement>('#ama-identity-people-title-id');

            expect(matLabel?.textContent?.trim()).toEqual('TITLE_KEY');
        });

        it('should not populate placeholder when title is not present', () => {
            fixture.detectChanges();

            const matLabel = getElement<HTMLInputElement>('#ama-identity-people-title-id');

            expect(matLabel?.textContent?.trim()).toEqual('');
        });

        describe('Search user', () => {
            beforeEach(() => {
                fixture.detectChanges();
                element = fixture.nativeElement;
                searchSpy = jest.spyOn(identityUserService, 'search').mockReturnValue(of(mockFoodUsers));
                component.preSelectUsers = [];
                component.excludedUsers = [];
            });

            // Jest fake timers removed - not needed and conflicts with Zone.js

            it('should list the users as dropdown options if the search term has results', fakeAsync(() => {
                searchUsers('first');

                expect(getUsersListUI().length).toEqual(3);
                expect(searchSpy).toHaveBeenCalled();
            }));

            it('should not make request if search term is empty', fakeAsync(() => {
                searchUsers('');

                expect(getUsersListUI().length).toEqual(0);
                expect(searchSpy).not.toHaveBeenCalled();
            }));

            it('should not make request if trimmed search term is empty', fakeAsync(() => {
                searchUsers('    ');

                expect(getUsersListUI().length).toEqual(0);
                expect(searchSpy).not.toHaveBeenCalled();
            }));

            it('should make request and list users as dropdown if trimmed search term has results', fakeAsync(() => {
                searchUsers('    first     ');

                expect(getUsersListUI().length).toEqual(3);
                expect(searchSpy).toHaveBeenCalled();
            }));

            it('should not be able to search for a user that his username matches one of the preselected users username', fakeAsync(() => {
                component.preSelectUsers = [mockKielbasaSausage];
                const changes = new SimpleChange(null, [{ username: mockKielbasaSausage.username }], false);
                component.ngOnChanges({ preSelectUsers: changes });
                fixture.detectChanges();
                tick();

                searchUsers('first-name');

                expect(getUsersListUI().length).toEqual(2);
            }));

            it('should not be able to search for a user that his id matches one of the preselected users id', fakeAsync(() => {
                component.preSelectUsers = [mockKielbasaSausage];
                const changes = new SimpleChange(null, [{ id: mockKielbasaSausage.id }], false);
                component.ngOnChanges({ preSelectUsers: changes });
                fixture.detectChanges();
                tick();

                searchUsers('first-name');

                expect(getUsersListUI().length).toEqual(2);
            }));

            it('should not be able to search for a user that his email matches one of the preselected users email', fakeAsync(() => {
                component.preSelectUsers = [mockKielbasaSausage];
                const changes = new SimpleChange(null, [{ email: mockKielbasaSausage.email }], false);
                component.ngOnChanges({ preSelectUsers: changes });
                fixture.detectChanges();
                tick();

                searchUsers('first-name');

                expect(getUsersListUI().length).toEqual(2);
            }));

            it('should not be able to search for a user that his email matches one of the excluded users email', fakeAsync(() => {
                component.excludedUsers = [
                    {
                        email: mockKielbasaSausage.email,
                        username: 'new-username',
                        firstName: 'new-first-name',
                        lastName: 'new-last-name',
                    },
                ];
                fixture.detectChanges();
                tick();

                searchUsers('first-name');

                expect(getUsersListUI().length).toEqual(2);
            }));

            it('should not be able to search for a user that his id matches one of the excluded users id', fakeAsync(() => {
                component.excludedUsers = [
                    {
                        id: mockKielbasaSausage.id,
                        username: 'new-username',
                        firstName: 'new-first-name',
                        lastName: 'new-last-name',
                        email: 'new-email@food.com',
                    },
                ];
                fixture.detectChanges();
                tick();

                searchUsers('first-name');

                expect(getUsersListUI().length).toEqual(2);
            }));

            it('should not be able to search for a user that his username matches one of the excluded users username', fakeAsync(() => {
                component.excludedUsers = [
                    {
                        username: mockKielbasaSausage.username,
                        firstName: 'new-first-name',
                        lastName: 'new-last-name',
                        email: 'new-email@food.com',
                    },
                ];
                fixture.detectChanges();
                tick();

                searchUsers('first-name');

                expect(getUsersListUI().length).toEqual(2);
            }));

            it('should hide result list if input is empty', fakeAsync(() => {
                fixture.detectChanges();
                tick();

                searchUsers('');
                expect(getFirstUserFromListUI()).toBeNull();
            }));

            it('should update selected users when a user is selected', () => {
                fixture.detectChanges();
                const selectEmitSpy = jest.spyOn(component.selectUser, 'emit');
                const changedUsersSpy = jest.spyOn(component.changedUsers, 'emit');

                component.onSelect(mockShepherdsPie);
                fixture.detectChanges();

                expect(selectEmitSpy).toHaveBeenCalledWith(mockShepherdsPie);
                expect(changedUsersSpy).toHaveBeenCalledWith([mockShepherdsPie]);
                expect(component.getSelectedUsers()).toEqual([mockShepherdsPie]);
            });

            it('should replace the user in single-selection mode', () => {
                component.mode = 'single';

                component.onSelect(mockShepherdsPie);
                expect(component.getSelectedUsers()).toEqual([mockShepherdsPie]);

                component.onSelect(mockYorkshirePudding);
                expect(component.getSelectedUsers()).toEqual([mockYorkshirePudding]);
            });

            it('should allow multiple users in multi-selection mode', () => {
                component.mode = 'multiple';

                component.onSelect(mockShepherdsPie);
                component.onSelect(mockYorkshirePudding);

                expect(component.getSelectedUsers()).toEqual([mockShepherdsPie, mockYorkshirePudding]);
            });

            it('should allow only unique users in multi-selection mode', () => {
                component.mode = 'multiple';

                component.onSelect(mockShepherdsPie);
                component.onSelect(mockYorkshirePudding);
                component.onSelect(mockShepherdsPie);
                component.onSelect(mockYorkshirePudding);

                expect(component.getSelectedUsers()).toEqual([mockShepherdsPie, mockYorkshirePudding]);
            });

            it('should show an error message if the search result empty', async () => {
                searchSpy.mockReturnValue(of([]));
                fixture.detectChanges();

                await searchUsersAndBlur('INCORRECT_VALUE');

                const errorMessage = element.querySelector('[data-automation-id="invalid-users-typing-error"]');
                expect(errorMessage).not.toBeNull();
                expect(errorMessage?.textContent).toContain('SHARED_IDENTITY.PEOPLE.ERROR.NOT_FOUND');
            });
        });

        describe('No preselected users', () => {
            it('should not pre-select any user when preSelectUsers is empty - single mode', () => {
                component.mode = 'single';
                fixture.detectChanges();
                return ChipHarnessUtils.getChipRows({ fixture }).then((chips) => {
                    expect(chips.length).toEqual(0);
                });
            });

            it('should not pre-select any users when preSelectUsers is empty - multiple mode', () => {
                component.mode = 'multiple';
                fixture.detectChanges();
                return ChipHarnessUtils.getChipRows({ fixture }).then((chips) => {
                    expect(chips.length).toEqual(0);
                });
            });
        });

        describe('Single Mode with Pre-selected users', () => {
            const changes = new SimpleChange(null, mockPreselectedFoodUsers, false);

            beforeEach(() => {
                component.mode = 'single';
                component.preSelectUsers = mockPreselectedFoodUsers;
                return component.ngOnChanges({ preSelectUsers: changes }).then(() => {
                    fixture.detectChanges();
                    element = fixture.nativeElement;
                });
            });

            it('should show only one mat chip with the first preSelectedUser', () => {
                return ChipHarnessUtils.getChipRows({ fixture })
                    .then((chips) => {
                        expect(chips.length).toEqual(1);
                        return chips[0].host();
                    })
                    .then((host) => {
                        return host.matchesSelector(`[data-automation-id="ama-identity-people-chip-${mockPreselectedFoodUsers[0].username}"]`);
                    })
                    .then((matches) => {
                        expect(matches).toBe(true);
                    });
            });
        });

        describe('Multiple Mode with Pre-selected Users', () => {
            beforeEach(() => {
                component.mode = 'multiple';
            });

            it('should render multiple preselected users', () => {
                const changes = new SimpleChange(null, mockPreselectedFoodUsers, false);

                component.preSelectUsers = mockPreselectedFoodUsers;
                return component
                    .ngOnChanges({ preSelectUsers: changes })
                    .then(() => {
                        return ChipHarnessUtils.getChipRows({ fixture });
                    })
                    .then((chips) => {
                        expect(chips.length).toEqual(2);
                        return chips[0].host();
                    })
                    .then((host0) => {
                        return host0.matchesSelector(`[data-automation-id="ama-identity-people-chip-${mockPreselectedFoodUsers[0].username}"]`);
                    })
                    .then((matches0) => {
                        expect(matches0).toBe(true);
                        return ChipHarnessUtils.getChipRows({ fixture });
                    })
                    .then((chips) => {
                        return chips[1].host();
                    })
                    .then((host1) => {
                        return host1.matchesSelector(`[data-automation-id="ama-identity-people-chip-${mockPreselectedFoodUsers[1].username}"]`);
                    })
                    .then((matches1) => {
                        expect(matches1).toBe(true);
                    });
            });

            it('Should not show remove icon for pre-selected users if readonly property set to true', () => {
                component.preSelectUsers = [
                    { ...mockKielbasaSausage, readonly: true },
                    { ...mockYorkshirePudding, readonly: true },
                ];

                const change = new SimpleChange(null, component.preSelectUsers, false);
                return component
                    .ngOnChanges({ preSelectUsers: change })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return ChipHarnessUtils.getChipRows({ fixture });
                    })
                    .then((chips) => {
                        expect(chips.length).toBe(2);
                        expect(component.preSelectUsers[0].readonly).toBeTruthy();
                        expect(component.preSelectUsers[1].readonly).toBeTruthy();
                        return ChipHarnessUtils.isEditable({ fixture });
                    })
                    .then((isEditable) => {
                        expect(isEditable).toBe(false);
                    });
            });

            it('Should be able to remove preselected users if readonly property set to false', () => {
                component.preSelectUsers = mockPreselectedFoodUsers;

                const change = new SimpleChange(null, component.preSelectUsers, false);
                const removeUserSpy = jest.spyOn(component.removeUser, 'emit');

                return component
                    .ngOnChanges({ preSelectUsers: change })
                    .then(() => {
                        fixture.detectChanges();
                        return ChipHarnessUtils.getChipRow({
                            fixture,
                            chipOptionFilters: {
                                selector: `[data-automation-id="ama-identity-people-chip-${mockPreselectedFoodUsers[0].username}"]`,
                            },
                        });
                    })
                    .then((removableChip) => {
                        return ChipHarnessUtils.getChipRows({ fixture })
                            .then((chips) => {
                                expect(chips.length).toBe(2);
                                expect(component.preSelectUsers[0].readonly).toBe(false);
                                expect(component.preSelectUsers[1].readonly).toBe(false);
                                return removableChip.remove();
                            })
                            .then(() => {
                                expect(removeUserSpy).toHaveBeenCalled();
                                return ChipHarnessUtils.getChipRows({ fixture });
                            })
                            .then((chips) => {
                                expect(chips.length).toBe(1);
                            });
                    });
            });

            describe('Component readonly mode', () => {
                const change = new SimpleChange(null, mockPreselectedFoodUsers, false);

                it('should chip list be disabled and show one single chip - single mode', () => {
                    component.mode = 'single';
                    component.readOnly = true;
                    component.preSelectUsers = mockPreselectedFoodUsers;
                    return component
                        .ngOnChanges({ preSelectUsers: change })
                        .then(() => {
                            fixture.detectChanges();
                            return ChipHarnessUtils.getChipGrid({ fixture });
                        })
                        .then((chipList) => {
                            return chipList
                                .getRows()
                                .then((rows) => {
                                    expect(rows.length).toBe(1);
                                    return chipList.isDisabled();
                                })
                                .then((isDisabled) => {
                                    expect(isDisabled).toBe(true);
                                });
                        });
                });

                it('should chip list be disabled and show mat chips for all the preselected users - multiple mode', () => {
                    component.mode = 'multiple';
                    component.readOnly = true;
                    component.preSelectUsers = mockPreselectedFoodUsers;
                    return component
                        .ngOnChanges({ preSelectUsers: change })
                        .then(() => {
                            fixture.detectChanges();
                            return ChipHarnessUtils.getChipGrid({ fixture });
                        })
                        .then((chipList) => {
                            return chipList
                                .getRows()
                                .then((rows) => {
                                    expect(rows.length).toBe(2);
                                    return chipList.isDisabled();
                                })
                                .then((isDisabled) => {
                                    expect(isDisabled).toBe(true);
                                });
                        });
                });
            });
        });

        describe('Preselected users and validation enabled', () => {
            let identitySpy;

            beforeEach(() => {
                component.validate = true;
                component.preSelectUsers = [mockPreselectedFoodUsers[0], mockPreselectedFoodUsers[1]];
            });

            it('should check validation only for the first user and emit warning when user is invalid - single mode', async () => {
                identitySpy = jest.spyOn(identityUserService, 'search').mockImplementation(() => {
                    throw new Error('Invalid user');
                });
                component.mode = 'single';
                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(null, [mockPreselectedFoodUsers[0], mockPreselectedFoodUsers[1]], false),
                });

                fixture.detectChanges();
                await fixture.whenStable();

                expect(component.invalidUsers.length).toEqual(1);
            });

            it('should check validation for all the users and emit warning - multiple mode', async () => {
                identitySpy = jest.spyOn(identityUserService, 'search').mockImplementation(() => {
                    throw new Error('Invalid user');
                });
                component.mode = 'multiple';
                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(null, [mockPreselectedFoodUsers[0], mockPreselectedFoodUsers[1]], false),
                });

                fixture.detectChanges();
                await fixture.whenStable();

                expect(component.invalidUsers.length).toEqual(2);
            });

            it('should skip warnings if validation disabled', async () => {
                identitySpy = jest.spyOn(identityUserService, 'search').mockImplementation(() => {
                    throw new Error('Invalid user');
                });
                jest.spyOn(component, 'equalsUsers').mockReturnValue(false);
                component.mode = 'multiple';
                component.validate = false;
                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(null, [mockPreselectedFoodUsers[0], mockPreselectedFoodUsers[1]], false),
                });

                fixture.detectChanges();
                await fixture.whenStable();

                expect(component.invalidUsers.length).toEqual(0);
            });

            it('should retrieve groups from identity provider when validated', async () => {
                identitySpy = jest
                    .spyOn(identityUserService, 'search')
                    .mockReturnValueOnce(of([mockYorkshirePudding]))
                    .mockReturnValueOnce(of([mockKielbasaSausage]));
                component.validate = true;
                component.mode = 'multiple';
                component.preSelectUsers = mockPreselectedFoodUsers.map((user) => ({ username: user.username, readonly: false }));

                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(
                        null,
                        mockPreselectedFoodUsers.map((user) => ({
                            username: user.username,
                        })),
                        false
                    ),
                });
                fixture.detectChanges();
                await fixture.whenStable();

                expect(component.selectedUsers).toEqual(mockPreselectedFoodUsers);
                expect(identitySpy).toHaveBeenCalled();
            });

            it('should validate users when endpoint returns two results with username inside another user email', async () => {
                identitySpy = jest.spyOn(identityUserService, 'search').mockReturnValueOnce(of([mockTestUser, mockAnotherTestUser]));
                component.validate = true;
                component.mode = 'multiple';
                component.preSelectUsers = [mockTestUser];

                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(null, [mockTestUser, mockAnotherTestUser], false),
                });
                fixture.detectChanges();
                await fixture.whenStable();

                expect(component.selectedUsers).toEqual([mockTestUser]);
                expect(component.invalidUsers).toEqual([]);
                expect(identitySpy).toHaveBeenCalled();
            });

            it('should validate users and show default error message when preselected user is not found in the endpoint response', async () => {
                identitySpy = jest.spyOn(identityUserService, 'search').mockReturnValueOnce(of([]));
                component.preSelectUsers = [mockTestUser];

                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(null, [mockTestUser], false),
                });
                fixture.detectChanges();
                await fixture.whenStable();

                const errorMessage = fixture.nativeElement.querySelector('[data-automation-id="preselected-user-error"]');
                expect(errorMessage).not.toBeNull();
                expect(errorMessage?.textContent).toContain('SHARED_IDENTITY.PEOPLE.ERROR.NOT_FOUND');
            });

            it('should validate users and show custom error message when preselected user is not found in the endpoint response', async () => {
                identitySpy = jest.spyOn(identityUserService, 'search').mockReturnValueOnce(of([]));
                fixture.componentRef.setInput('preselectedUserErrorKey', 'SHARED_IDENTITY.PEOPLE.ERROR.INVALID_PRESELECTED_USER');
                component.preSelectUsers = [mockTestUser];

                await component.ngOnChanges({
                    preSelectUsers: new SimpleChange(null, [mockTestUser], false),
                });
                fixture.detectChanges();
                await fixture.whenStable();

                const errorMessage = fixture.nativeElement.querySelector('[data-automation-id="preselected-user-error"]');
                expect(errorMessage).not.toBeNull();
                expect(errorMessage?.textContent).toContain('SHARED_IDENTITY.PEOPLE.ERROR.INVALID_PRESELECTED_USER');
            });
        });

        it('should removeDuplicateUsers return only unique users', () => {
            const duplicatedUsers = [mockShepherdsPie, mockShepherdsPie];
            expect(component.removeDuplicatedUsers(duplicatedUsers)).toEqual([mockShepherdsPie]);
        });

        describe('Tooltip', () => {
            const selectedUsers = [{ ...mockYorkshirePudding, readonly: false }];
            beforeEach(() => {
                component.mode = 'single';
            });

            it('should display input tooltip', () => {
                component.inputTooltip = 'INPUT_TOOLTIP';
                component.preSelectUsers = selectedUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, selectedUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                selector: '[data-automation-id="ama-identity-people-search-input"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('INPUT_TOOLTIP');
                    });
            });

            it('should not display tooltip when user is not readonly', () => {
                selectedUsers[0].readonly = false;
                component.preSelectUsers = selectedUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, selectedUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                ancestor: '[data-automation-id="ama-identity-people-chip-list"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('');
                    });
            });

            it('should display readonly tooltip when user is readonly', () => {
                selectedUsers[0].readonly = true;
                component.preSelectUsers = selectedUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, selectedUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                ancestor: '[data-automation-id="ama-identity-people-chip-list"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('SHARED_IDENTITY.PEOPLE.MANDATORY');
                    });
            });
        });
    });

    describe('Include email injection token enabled', () => {
        beforeEach(() => {
            TestBed.configureTestingModule(getTestBedConfig(true));

            setupBeforeEachAction();
        });

        describe('Tooltip', () => {
            const selectedUsers = [{ ...mockYorkshirePudding, readonly: false }];
            beforeEach(() => {
                component.mode = 'single';
            });

            it('should display the email address in the tooltip when user is not readonly', () => {
                selectedUsers[0].readonly = false;
                component.preSelectUsers = selectedUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, selectedUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                ancestor: '[data-automation-id="ama-identity-people-chip-list"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('pudding@food.com');
                    });
            });

            it('should display the email address and readonly tooltip when user is readonly', () => {
                selectedUsers[0].readonly = true;
                component.preSelectUsers = selectedUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, selectedUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                ancestor: '[data-automation-id="ama-identity-people-chip-list"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('pudding@food.com\nSHARED_IDENTITY.PEOPLE.MANDATORY');
                    });
            });

            it('should not display the tooltip when user has no email address', () => {
                const noEmailUsers = [
                    {
                        ...mockYorkshirePudding,
                        readonly: false,
                        email: undefined,
                    },
                ];
                component.preSelectUsers = noEmailUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, noEmailUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                ancestor: '[data-automation-id="ama-identity-people-chip-list"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('');
                    });
            });

            it('should display readonly tooltip when user is readonly', () => {
                const noEmailUsers = [
                    {
                        ...mockYorkshirePudding,
                        readonly: true,
                        email: undefined,
                    },
                ];
                component.preSelectUsers = noEmailUsers;
                return component
                    .ngOnChanges({
                        preSelectUsers: new SimpleChange(null, noEmailUsers, false),
                    })
                    .then(() => {
                        return fixture.whenStable();
                    })
                    .then(() => {
                        fixture.detectChanges();
                        return TooltipHarnessUtils.getTooltipText({
                            fixture,
                            tooltipFilters: {
                                ancestor: '[data-automation-id="ama-identity-people-chip-list"]',
                            },
                            fromRoot: true,
                        });
                    })
                    .then((tooltipText) => {
                        expect(tooltipText).toEqual('SHARED_IDENTITY.PEOPLE.MANDATORY');
                    });
            });
        });
    });
});
