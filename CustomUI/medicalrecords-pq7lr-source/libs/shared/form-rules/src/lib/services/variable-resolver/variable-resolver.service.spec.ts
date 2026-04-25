/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormModel, FormRulesEvent } from '@alfresco/adf-core';
import { TestBed } from '@angular/core/testing';
import { VariableResolverService } from './variable-resolver.service';

describe('VariableResolverService', () => {
    let service: VariableResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [VariableResolverService],
        });
        service = TestBed.inject(VariableResolverService);
    });

    it('should resolve field expression to field value if field value is not empty', () => {
        const expectedValue = 'value1';
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [{ id: 'field1', value: 'value1' }],
            } as FormModel,
        } as FormRulesEvent;

        const result = service.resolveExpression('${field.field1}', event);
        expect(result).toBe(expectedValue);
    });

    it('should resolve field expression to empty string if field value is empty string', () => {
        const expectedValue = '';
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [{ id: 'field2', value: '' }],
            } as FormModel,
        } as FormRulesEvent;

        const result = service.resolveExpression('${field.field2}', event);
        expect(result).toBe(expectedValue);
    });

    it('should resolve field expression to empty string if field value is null', () => {
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [{ id: 'field3', value: null }],
            } as FormModel,
        } as FormRulesEvent;

        const result = service.resolveExpression('${field.field3}', event);
        expect(result).toBe('');
    });

    it('should resolve field expression to empty string if field value is undefined', () => {
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [{ id: 'field4' }],
            } as FormModel,
        } as FormRulesEvent;

        const result = service.resolveExpression('${field.field4}', event);
        expect(result).toBe('');
    });

    it('should resolve field expression to raw expression if field is not in the form', () => {
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [{ id: 'otherField', value: 'some-value' }],
            } as FormModel,
        } as FormRulesEvent;

        const result = service.resolveExpression('${field.someMissingField}', event);
        expect(result).toBe('${field.someMissingField}');
    });

    it('should return null if allowNull is true and value is null', () => {
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [{ id: 'field5', value: null }],
            } as FormModel,
        } as FormRulesEvent;

        const result = service.resolveExpression('${field.field5}', event, true);
        expect(result).toBeNull();
    });

    describe('formula', () => {
        it('should NOT perform logic if expression does not start with =', () => {
            const expectedValue = '5 + 5';
            const event: FormRulesEvent = {
                form: {
                    getFormFields: () => [],
                } as FormModel,
            } as FormRulesEvent;

            const result = service.resolveExpression('5 + 5', event);
            expect(result).toBe(expectedValue);
        });

        describe('without variables', () => {
            it('should correctly perform addition', () => {
                const expectedValue = '10';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=5 + 5', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform subtraction', () => {
                const expectedValue = '3';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=5 - 2', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform multiplication', () => {
                const expectedValue = '25';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=5 * 5', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform division', () => {
                const expectedValue = '2.5';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=5 / 2', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform division when dividing by 0', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=5 / 0', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform division with only 2 decimal points', () => {
                const expectedValue = '0.33';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=1 / 3', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform complex operation', () => {
                const expectedValue = '10';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=(5 + 5) * 2 / 4 + 5', event);
                expect(result).toBe(expectedValue);
            });
        });

        describe('with variables', () => {
            it('should correctly perform addition', () => {
                const expectedValue = '15';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: '10' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform subtraction', () => {
                const expectedValue = '5';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: '5' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} - ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform multiplication', () => {
                const expectedValue = '50';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: '10' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} * ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform division', () => {
                const expectedValue = '2';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: '5' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform division when dividing by 0', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: '0' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform division with only 2 decimal points', () => {
                const expectedValue = '0.33';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '1' },
                            { id: 'field2', value: '3' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform complex operation', () => {
                const expectedValue = '35';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: '10' },
                            { id: 'field3', value: '2' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=(${field.field1} + ${field.field2}) * ${field.field3} + ${field.field1}', event);
                expect(result).toBe(expectedValue);
            });
        });

        describe('with mix of variables and numbers', () => {
            it('should correctly perform addition', () => {
                const expectedValue = '15';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'field1', value: '5' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + 10', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform subtraction', () => {
                const expectedValue = '5';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'field1', value: '10' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} - 5', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform multiplication', () => {
                const expectedValue = '50';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'field1', value: '5' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} * 10', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform division', () => {
                const expectedValue = '2';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'field1', value: '10' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / 5', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform division when dividing by 0', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'field1', value: '10' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / 0', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform division with only 2 decimal points', () => {
                const expectedValue = '0.33';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'field1', value: '1' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / 3', event);
                expect(result).toBe(expectedValue);
            });

            it('should correctly perform complex operation', () => {
                const expectedValue = '35';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: '10' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=(${field.field1} + ${field.field2}) * 2 + ${field.field1}', event);
                expect(result).toBe(expectedValue);
            });
        });

        describe('with empty variables', () => {
            it('should perform addition even if variables are not defined', () => {
                const expectedValue = '5';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: '' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should perform subtraction even if variables are not defined', () => {
                const expectedValue = '10';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: '' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} - ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should perform multiplication even if variables are not defined', () => {
                const expectedValue = '0';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '' },
                            { id: 'field2', value: '10' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} * ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should perform addition even if sum of the variables has >15 significant digits', () => {
                const expectedValue = '12.03';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '1.48' },
                            { id: 'field2', value: '10.55' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform division if variables are not defined', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: '' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should perform complex operation even if variables are not defined [replacing undefined with zero]', () => {
                const expectedValue = '15';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: '' },
                            { id: 'field3', value: '2' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=(${field.field1} + ${field.field2}) * ${field.field3} + ${field.field1}', event);
                expect(result).toBe(expectedValue);
            });

            it('should return null if there are no variables', () => {
                const expectedValue = null;
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [{ id: 'Result', value: '' }],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('${process.variable.Result}', event);
                expect(result).toBe(expectedValue);
            });
        });

        describe('with invalid variables', () => {
            it('should NOT perform addition if variables are not valid', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: 'a' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform subtraction if variables are not valid', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: 'b' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} - ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform multiplication if variables are not valid', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: 'c' },
                            { id: 'field2', value: '10' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} * ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform division if variables are not valid', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '10' },
                            { id: 'field2', value: 'd' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} / ${field.field2}', event);
                expect(result).toBe(expectedValue);
            });

            it('should NOT perform complex operation if variables are not valid', () => {
                const expectedValue = '';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: '5' },
                            { id: 'field2', value: 'e' },
                            { id: 'field3', value: '2' },
                        ],
                    } as FormModel,
                } as FormRulesEvent;

                const result = service.resolveExpression('=(${field.field1} + ${field.field2}) * ${field.field3} + ${field.field1}', event);
                expect(result).toBe(expectedValue);
            });
        });

        describe('with ternary and null operators', () => {
            const TERNARY_SUM_FORMULA =
                '=(${field.Cost1} != null ? ${field.Cost1} : 0) + (${field.Cost2} != null ? ${field.Cost2} : 0) + (${field.Cost3} != null ? ${field.Cost3} : 0)';

            function createEvent(fields: { id: string; value: any }[]): FormRulesEvent {
                return { form: { getFormFields: () => fields } as FormModel } as FormRulesEvent;
            }

            describe('null handling', () => {
                it('should sum all fields when all have numeric values', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: '10' },
                        { id: 'Cost2', value: '20' },
                        { id: 'Cost3', value: '30' },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('60');
                });

                it('should skip null fields and sum only non-null values', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: '10' },
                        { id: 'Cost2', value: null },
                        { id: 'Cost3', value: '30' },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('40');
                });

                it('should return zero when all fields are null', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: null },
                        { id: 'Cost2', value: null },
                        { id: 'Cost3', value: null },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('0');
                });

                it('should treat empty string fields as zero', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: '15' },
                        { id: 'Cost2', value: '' },
                        { id: 'Cost3', value: '' },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('15');
                });

                it('should treat undefined fields as zero', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: undefined },
                        { id: 'Cost2', value: '25' },
                        { id: 'Cost3', value: undefined },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('25');
                });

                it('should treat zero-value fields as valid non-null values', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: 0 },
                        { id: 'Cost2', value: '10' },
                        { id: 'Cost3', value: 0 },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('10');
                });
            });

            describe('null comparison operators', () => {
                it('should evaluate != null as true for non-null literal', () => {
                    const event = createEvent([]);

                    expect(service.resolveExpression('=5 != null ? 5 : 0', event)).toBe('5');
                });

                it('should evaluate != null as false for null literal', () => {
                    const event = createEvent([]);

                    expect(service.resolveExpression('=null != null ? 1 : 0', event)).toBe('0');
                });

                it('should evaluate == null as true for null literal', () => {
                    const event = createEvent([]);

                    expect(service.resolveExpression('=null == null ? 10 : 20', event)).toBe('10');
                });
            });

            describe('decimal precision with ternary null-check pattern', () => {
                it.each([
                    ['10.55', '12.03'],
                    ['10.56', '12.04'],
                    ['10.64', '12.12'],
                    ['10.71', '12.19'],
                    ['10.80', '12.28'],
                    ['10.97', '12.45'],
                    ['10.05', '11.53'],
                    ['10.13', '11.61'],
                ])('should calculate 1.48 + %s = %s without floating point precision loss', (cost2Value, expectedResult) => {
                    const event = createEvent([
                        { id: 'Cost1', value: '1.48' },
                        { id: 'Cost2', value: cost2Value },
                        { id: 'Cost3', value: null },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe(expectedResult);
                });

                it('should sum three fields with problematic decimals', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: '1.48' },
                        { id: 'Cost2', value: '10.55' },
                        { id: 'Cost3', value: '10.97' },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('23');
                });
            });

            describe('nested ternary', () => {
                const NESTED_TERNARY_FORMULA = '=${field.Cost1} != null ? (${field.Cost1} > 50 ? ${field.Cost1} : 50) : 0';

                it('should return field value when above threshold', () => {
                    const event = createEvent([{ id: 'Cost1', value: '100' }]);

                    expect(service.resolveExpression(NESTED_TERNARY_FORMULA, event)).toBe('100');
                });

                it('should return threshold when field value is below it', () => {
                    const event = createEvent([{ id: 'Cost1', value: '30' }]);

                    expect(service.resolveExpression(NESTED_TERNARY_FORMULA, event)).toBe('50');
                });
            });

            describe('error handling', () => {
                it('should return empty string when field has non-numeric value', () => {
                    const event = createEvent([
                        { id: 'Cost1', value: 'abc' },
                        { id: 'Cost2', value: '20' },
                        { id: 'Cost3', value: null },
                    ]);

                    expect(service.resolveExpression(TERNARY_SUM_FORMULA, event)).toBe('');
                });
            });

            describe('with multiplication operator', () => {
                const TERNARY_MULTIPLY_FORMULA =
                    '=(${field.Price} != null ? ${field.Price} : 0) * (${field.Quantity} != null ? ${field.Quantity} : 1)';

                it('should multiply when both fields have values', () => {
                    const event = createEvent([
                        { id: 'Price', value: '25' },
                        { id: 'Quantity', value: '4' },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('100');
                });

                it('should use fallback multiplier when Quantity is null', () => {
                    const event = createEvent([
                        { id: 'Price', value: '25' },
                        { id: 'Quantity', value: null },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('25');
                });

                it('should use fallback multiplier when Quantity is undefined', () => {
                    const event = createEvent([
                        { id: 'Price', value: '25' },
                        { id: 'Quantity', value: undefined },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('25');
                });

                it('should use fallback multiplier when Quantity is empty string', () => {
                    const event = createEvent([
                        { id: 'Price', value: '25' },
                        { id: 'Quantity', value: '' },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('25');
                });

                it('should return zero when Price is null', () => {
                    const event = createEvent([
                        { id: 'Price', value: null },
                        { id: 'Quantity', value: '4' },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('0');
                });

                it('should return zero when both fields are null', () => {
                    const event = createEvent([
                        { id: 'Price', value: null },
                        { id: 'Quantity', value: null },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('0');
                });

                it('should treat zero Quantity as valid non-null value', () => {
                    const event = createEvent([
                        { id: 'Price', value: '25' },
                        { id: 'Quantity', value: '0' },
                    ]);

                    expect(service.resolveExpression(TERNARY_MULTIPLY_FORMULA, event)).toBe('0');
                });
            });
        });

        describe('with zero value variables', () => {
            it('should perform addition if variables are all set to zero', () => {
                const expectedValue = '0';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: 0 },
                            { id: 'field2', value: 0 },
                            { id: 'field3', value: 0 },
                        ],
                    } as FormModel,
                    type: 'formLoaded',
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + ${field.field2} + ${field.field3}', event);
                expect(result).toBe(expectedValue);
            });

            it('should perform addition if some variables are set to zero', () => {
                const expectedValue = '4';
                const event: FormRulesEvent = {
                    form: {
                        getFormFields: () => [
                            { id: 'field1', value: 2 },
                            { id: 'field2', value: 0 },
                            { id: 'field3', value: 2 },
                        ],
                    } as FormModel,
                    type: 'formLoaded',
                } as FormRulesEvent;

                const result = service.resolveExpression('=${field.field1} + ${field.field2} + ${field.field3}', event);
                expect(result).toBe(expectedValue);
            });
        });
    });

    it('should build variable context with process variable values', () => {
        const mockFormModel: Partial<FormModel> = {
            getFormFields: () => [],
            variables: [
                { id: 'var1', name: 'variable1' },
                { id: 'var2', name: 'variable2' },
            ],
            getProcessVariableValue: (name: string) => `value_of_${name}`,
        };

        const event: FormRulesEvent = {
            form: mockFormModel as FormModel,
        } as FormRulesEvent;

        const context = service.buildVariableContext(event);

        expect(context.variable['var1']).toBe('value_of_variable1');
        expect(context.variable['variable1']).toBe('value_of_variable1');
        expect(context.variable['var2']).toBe('value_of_variable2');
        expect(context.variable['variable2']).toBe('value_of_variable2');
    });

    it('should clear context', () => {
        service['context'] = { field: {}, variable: {} };

        service.clearContext();

        expect(service['context']).toBeNull();
    });

    it('should return non-string match as is in resolveExpression', () => {
        const event = { form: { getFormFields: () => [] } } as FormRulesEvent;

        expect(service.resolveExpression(123, event)).toBe(123);
    });

    it('should handle empty string expression in resolveExpression', () => {
        const event = { form: { getFormFields: () => [] } } as FormRulesEvent;

        expect(service.resolveExpression('', event)).toBe('');
    });

    it('should resolve variable with allowNull', () => {
        const event: FormRulesEvent = {
            form: {
                getFormFields: () => [],
                variables: [{ id: 'var1', name: 'variable1' }],
                getProcessVariableValue: () => null,
            } as FormModel,
        } as FormRulesEvent;

        expect(service.resolveExpression('${variable.var1}', event, true)).toBeNull();
    });

    describe('resolveExpressionString', () => {
        it('should preserve string type for numeric string values', () => {
            const event: FormRulesEvent = {
                form: {
                    getFormFields: () => [{ id: 'employeeId', value: '1234' }],
                } as FormModel,
            } as FormRulesEvent;

            const result = service.resolveExpressionString('${field.employeeId}', event, true);

            expect(result).toBe('1234');
            expect(typeof result).toBe('string');
        });

        it('should preserve number type for actual number values', () => {
            const event: FormRulesEvent = {
                form: {
                    getFormFields: () => [{ id: 'count', value: 1234 }],
                } as FormModel,
            } as FormRulesEvent;

            const result = service.resolveExpressionString('${field.count}', event, true);

            expect(result).toBe(1234);
            expect(typeof result).toBe('number');
        });
    });
});
