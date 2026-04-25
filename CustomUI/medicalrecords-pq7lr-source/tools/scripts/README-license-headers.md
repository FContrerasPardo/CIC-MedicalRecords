# License Header Migration Script

Automatically updates copyright headers in TypeScript and JavaScript files across the Nx monorepo.

## Features

- **Dynamic year handling**: Automatically uses the current year (e.g., 2027 → "2005-2027")
- **Replaces old Alfresco headers** with current Hyland headers
- **Updates outdated Hyland headers** to use the current year
- **Adds headers** to files without any header
- **Handles both Unix and Windows line endings** (`\n` and `\r\n`)
- **Cleans up duplicate headers**
- **Dry-run mode** for safe preview

## Usage

```bash
# Preview changes (recommended first)
node tools/scripts/update-license-headers.mjs --dry-run

# Preview with detailed output
node tools/scripts/update-license-headers.mjs --dry-run --verbose

# Apply changes
node tools/scripts/update-license-headers.mjs

# Apply with verbose output
node tools/scripts/update-license-headers.mjs --verbose
```

## Annual Update Process

In 2027 (or any future year):

1. Update [`license-header.txt`](../../license-header.txt) with the new year: `2005-2027`
2. Run the script:
   ```bash
   node tools/scripts/update-license-headers.mjs --dry-run  # Preview
   node tools/scripts/update-license-headers.mjs            # Apply
   ```

The script will automatically:
- Update all `2005-2026` headers to `2005-2027`
- Replace any remaining old Alfresco headers
- Add headers to new files

## What Gets Updated

The script processes all TypeScript (`.ts`) and JavaScript (`.js`) files in:
- `libs/` - All libraries
- `apps/` - All applications
- `e2es/` - E2E tests
- `tools/` - Tooling and scripts
- `scripts/` - Utility scripts
- `jest/` - Test configs
- `.storybook/` - Storybook configs
- Root level files

## Excluded Files

Automatically skips:
- `node_modules/`
- `dist/` and build output
- `.angular/`, `.nx/`, `coverage/`
- Empty files

## Options

- `--dry-run`: Preview changes without modifying files
- `--verbose`: Show detailed output for each file processed
- `--stats`: Show summary statistics (enabled by default)
