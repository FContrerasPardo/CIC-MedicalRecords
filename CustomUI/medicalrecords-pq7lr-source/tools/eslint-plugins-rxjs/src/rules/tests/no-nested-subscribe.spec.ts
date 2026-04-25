/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import rule from '../no-nested-subscribe';
import * as path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RuleTester } = require('@typescript-eslint/rule-tester');

const ruleTester = new RuleTester({
    languageOptions: {
        parserOptions: {
            projectService: {
                allowDefaultProject: ['*.ts'],
                defaultProject: path.join(__dirname, 'tsconfig.json'),
            },
            tsconfigRootDir: __dirname,
        },
    },
});

const preamble = 'import { Observable, of, Subject } from \'rxjs\';';

ruleTester.run('no-nested-subscribe', rule, {
    valid: [
        {
            name: 'single subscribe is allowed',
            code: `
                ${preamble}
                of(1).subscribe(value => console.log(value));
            `,
        },
        {
            name: 'sequential subscribes are allowed',
            code: `
                ${preamble}
                of(1).subscribe(value => console.log(value));
                of(2).subscribe(value => console.log(value));
            `,
        },
        {
            name: 'subscribe in separate class methods is allowed',
            code: `
                ${preamble}
                class MyComponent {
                    obs$ = of(1);
                    method1() {
                        this.obs$.subscribe(v => console.log(v));
                    }
                    method2() {
                        this.obs$.subscribe(v => console.log(v));
                    }
                }
            `,
        },
        {
            name: 'method calling another method without subscribe is allowed',
            code: `
                ${preamble}
                class MyComponent {
                    obs$ = of(1);
                    init() {
                        this.obs$.subscribe(v => this.handleValue(v));
                    }
                    handleValue(v: number) {
                        console.log(v);
                    }
                }
            `,
        },
        {
            name: 'subscribe with pipe operators is allowed',
            code: `
                ${preamble}
                import { switchMap } from 'rxjs/operators';
                class MyComponent {
                    outer$ = of(1);
                    inner$ = of(2);
                    init() {
                        this.outer$.pipe(
                            switchMap(() => this.inner$)
                        ).subscribe(v => console.log(v));
                    }
                }
            `,
        },
        {
            name: 'non-Observable subscribe inside subscribe callback is allowed',
            code: `
                ${preamble}
                class EventBus {
                    subscribe(handler: (v: number) => void) { handler(1); }
                }
                class MyComponent {
                    obs$ = of(1);
                    bus = new EventBus();
                    init() {
                        this.obs$.subscribe(v => {
                            this.bus.subscribe(val => console.log(val));
                        });
                    }
                }
            `,
        },
    ],
    invalid: [
        {
            name: 'direct nested subscribe is forbidden',
            code: `
                ${preamble}
                of(1).subscribe(value => {
                    of(2).subscribe(inner => console.log(inner));
                });
            `,
            errors: [{ messageId: 'forbidden' }],
        },
        {
            name: 'direct nested subscribe inside class method is forbidden',
            code: `
                ${preamble}
                class MyComponent {
                    outer$ = of(1);
                    inner$ = of(2);
                    init() {
                        this.outer$.subscribe(v => {
                            this.inner$.subscribe(inner => console.log(inner));
                        });
                    }
                }
            `,
            errors: [{ messageId: 'forbidden' }],
        },
        {
            name: 'deeply nested subscribe (3 levels) is forbidden',
            code: `
                ${preamble}
                of(1).subscribe(a => {
                    of(2).subscribe(b => {
                        of(3).subscribe(c => console.log(c));
                    });
                });
            `,
            errors: [{ messageId: 'forbidden' }, { messageId: 'forbidden' }],
        },
        {
            name: 'indirect nested subscribe via this.method() is forbidden',
            code: `
                ${preamble}
                class MyComponent {
                    outer$ = of(1);
                    inner$ = of(2);
                    init() {
                        this.outer$.subscribe(v => {
                            this.doWork(v);
                        });
                    }
                    doWork(v: number) {
                        this.inner$.subscribe(inner => console.log(inner));
                    }
                }
            `,
            errors: [{ messageId: 'forbiddenIndirect', data: { methodName: 'doWork' } }],
        },
        {
            name: 'indirect nested subscribe via two levels of method calls is forbidden',
            code: `
                ${preamble}
                class MyComponent {
                    obs$ = of(1);
                    inner$ = of(2);
                    init() {
                        this.obs$.subscribe(v => {
                            this.step1(v);
                        });
                    }
                    step1(v: number) {
                        this.step2(v);
                    }
                    step2(v: number) {
                        this.inner$.subscribe(inner => console.log(inner));
                    }
                }
            `,
            errors: [{ messageId: 'forbiddenIndirect', data: { methodName: 'step1' } }],
        },
        {
            name: 'indirect nested subscribe via method called directly (no block body)',
            code: `
                ${preamble}
                class MyComponent {
                    obs$ = of(1);
                    inner$ = of(2);
                    init() {
                        this.obs$.subscribe(v => this.doWork(v));
                    }
                    doWork(v: number) {
                        this.inner$.subscribe(inner => console.log(inner));
                    }
                }
            `,
            errors: [{ messageId: 'forbiddenIndirect', data: { methodName: 'doWork' } }],
        },
        {
            name: 'indirect nested subscribe via arrow function property is forbidden',
            code: `
                ${preamble}
                class MyComponent {
                    obs$ = of(1);
                    inner$ = of(2);
                    doWork = (v: number) => {
                        this.inner$.subscribe(inner => console.log(inner));
                    };
                    init() {
                        this.obs$.subscribe(v => {
                            this.doWork(v);
                        });
                    }
                }
            `,
            errors: [{ messageId: 'forbiddenIndirect', data: { methodName: 'doWork' } }],
        },
    ],
});
