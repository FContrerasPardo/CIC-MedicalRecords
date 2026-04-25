# @alfresco-dbp/eslint-plugin-rxjs

> ESLint rules for RxJS - ESLint 9 compatible fork

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

This is a fork of [eslint-plugin-rxjs](https://github.com/cartant/eslint-plugin-rxjs) by Nicholas Jamieson, updated to support **ESLint 9** and maintained within the Alfresco DBP monorepo.

## Original Project

- **Original Author**: Nicholas Jamieson
- **Original Repository**: https://github.com/cartant/eslint-plugin-rxjs
- **License**: MIT
- **NPM Package**: https://www.npmjs.com/package/eslint-plugin-rxjs

## What's Different?

This fork includes the following modifications:

- ✅ **ESLint 9 Support** - Updated for ESLint 9.x compatibility
- ✅ **Updated Dependencies** - `@typescript-eslint/utils@^8.0.0` and other modern dependencies
- ✅ **Monorepo Integration** - Built and maintained as part of the Alfresco DBP frontend monorepo
- ✅ **Same Great Rules** - All original RxJS linting rules preserved

## Installation

This package is private to the Alfresco DBP monorepo and installed automatically as part of the workspace dependencies.

```bash
# Already included in the monorepo - no manual installation needed
npm install
```

## Usage

### In Your `.eslintrc.json`

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "sourceType": "module"
  },
  "plugins": ["@alfresco-dbp/eslint-plugin-rxjs"],
  "rules": {
    "@alfresco-dbp/eslint-plugin-rxjs/no-async-subscribe": "error",
    "@alfresco-dbp/eslint-plugin-rxjs/no-ignored-subscription": "error",
    "@alfresco-dbp/eslint-plugin-rxjs/no-nested-subscribe": "error",
    "@alfresco-dbp/eslint-plugin-rxjs/no-unbound-methods": "error",
    "@alfresco-dbp/eslint-plugin-rxjs/throw-error": "error"
  }
}
```

### Using Recommended Configuration

```json
{
  "extends": ["plugin:@alfresco-dbp/eslint-plugin-rxjs/recommended"]
}
```

## Available Rules

Rules marked with ✅ are included in the recommended configuration.

| Rule | Description | Recommended |
| --- | --- | --- |
| `ban-observables` | Forbids the use of banned observables. | |
| `ban-operators` | Forbids the use of banned operators. | |
| `no-async-subscribe` | Forbids passing `async` functions to `subscribe`. | ✅ |
| `no-create` | Forbids the calling of `Observable.create`. | ✅ |
| `no-ignored-notifier` | Forbids observables not composed from the `repeatWhen` or `retryWhen` notifier. | ✅ |
| `no-ignored-replay-buffer` | Forbids using `ReplaySubject`, `publishReplay` or `shareReplay` without buffer size. | ✅ |
| `no-ignored-subscribe` | Forbids calling `subscribe` without specifying arguments. | |
| `no-ignored-subscription` | Forbids ignoring the subscription returned by `subscribe`. | |
| `no-ignored-takewhile-value` | Forbids ignoring the value within `takeWhile`. | ✅ |
| `no-implicit-any-catch` | Enforces explicit typing in `catchError` operators. | ✅ |
| `no-index` | Forbids importation from index modules. | ✅ |
| `no-internal` | Forbids importation of RxJS internals. | ✅ |
| `no-nested-subscribe` | Forbids calling `subscribe` within a `subscribe` callback. | ✅ |
| `no-redundant-notify` | Forbids redundant notifications from completed or errored observables. | ✅ |
| `no-sharereplay` | Forbids using the `shareReplay` operator. | ✅ |
| `no-subject-unsubscribe` | Forbids calling `unsubscribe` on a subject instance. | ✅ |
| `no-subject-value` | Forbids accessing the `value` property of a `BehaviorSubject`. | |
| `no-unbound-methods` | Forbids the passing of unbound methods. | ✅ |
| `no-unsafe-catch` | Forbids unsafe `catchError` usage in effects and epics. | |
| `no-unsafe-first` | Forbids unsafe `first`/`take` usage in effects and epics. | |
| `no-unsafe-subject-next` | Forbids unsafe optional `next` calls. | ✅ |
| `no-unsafe-switchmap` | Forbids unsafe `switchMap` usage in effects and epics. | |
| `no-unsafe-takeuntil` | Forbids operators after `takeUntil`. | ✅ |
| `throw-error` | Enforces passing `Error` values to error notifications. | |

For detailed documentation on each rule, refer to the [original repository's docs](https://github.com/cartant/eslint-plugin-rxjs/tree/main/docs/rules).

## Building

This plugin is built as part of the monorepo build process:

```bash
# Build the plugin
nx build eslint-plugin-rxjs

# The output will be in dist/tools/eslint-plugin-rxjs/
```

## Development

### Making Changes

1. Modify the source files in `tools/eslint-plugin-rxjs/src/`
2. Build the plugin: `nx build eslint-plugin-rxjs`
3. Test with linting: `nx lint <any-app>`

### Running Tests

```bash
# Run plugin tests
nx test eslint-plugin-rxjs
```

### Syncing Upstream Changes

To incorporate updates from the original repository:

```bash
# Add the upstream remote (one-time setup)
cd tools/eslint-plugin-rxjs
git remote add upstream https://github.com/cartant/eslint-plugin-rxjs.git

# Fetch and merge upstream changes
git fetch upstream
git merge upstream/main

# Resolve conflicts and rebuild
nx build eslint-plugin-rxjs
```

## Contributing

This fork is maintained by the Alfresco DBP team. If you find issues specific to the ESLint 9 compatibility:

1. Open an issue in the Alfresco DBP monorepo
2. Submit a PR with fixes

For issues with the original rules, consider contributing to the [upstream repository](https://github.com/cartant/eslint-plugin-rxjs).

## Credits

- **Original Author**: [Nicholas Jamieson](https://github.com/cartant)
- **Original Package**: [eslint-plugin-rxjs](https://www.npmjs.com/package/eslint-plugin-rxjs)
- **Maintainer**: Alfresco DBP Team

## License

MIT - See [LICENSE](./LICENSE) file

This project maintains the original MIT license from [eslint-plugin-rxjs](https://github.com/cartant/eslint-plugin-rxjs).
