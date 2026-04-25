#!/usr/bin/env node

/**
 * License Header Migration Script
 * 
 * Automatically updates copyright headers in TypeScript and JavaScript files:
 * - Replaces old Alfresco headers with current Hyland headers
 * - Updates Hyland headers to use the current year (e.g., 2005-2027 in 2027)
 * - Adds headers to files without any header
 * - Handles both Unix (\n) and Windows (\r\n) line endings
 * - Cleans up duplicate headers
 * 
 * Usage:
 *   node tools/scripts/update-license-headers.mjs [options]
 * 
 * Options:
 *   --dry-run   Preview changes without modifying files
 *   --verbose   Show detailed output for each file
 *   --stats     Show summary statistics (enabled by default)
 * 
 * The script automatically uses the current year, so you can run it annually
 * to keep all headers up to date (e.g., in 2027 it will use 2005-2027).
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const showStats = args.includes('--stats') || true; // Always show stats

// Get current year for dynamic header
const currentYear = new Date().getFullYear();

// Read the new license header from the source file
const licenseHeaderPath = path.join(__dirname, '../../license-header.txt');
let NEW_HEADER = readFileSync(licenseHeaderPath, 'utf-8').trim() + '\n';

// Replace the year in the header with current year (handles YYYY-YYYY format)
NEW_HEADER = NEW_HEADER.replace(/Copyright (\d{4})-(\d{4}) Hyland Software/g, `Copyright $1-${currentYear} Hyland Software`);

// Patterns to detect headers (handle both Unix \n and Windows \r\n line endings)
// Match any Alfresco header with any year range
const OLD_ALFRESCO_HEADER_PATTERN = /\/\*\r?\n \* Copyright (?:©\s*)?20\d{2}\s*-?\s*20\d{2} Alfresco Software[\s\S]*?\*\/\r?\n*/g;

// Match Hyland headers with any year range (so we can update them to current year)
const OLD_HYLAND_HEADER_PATTERN = /^\/\*\r?\n \* Copyright 2005-20\d{2} Hyland Software[\s\S]*?\*\/\r?\n*/;

// Current year Hyland header pattern
const CURRENT_HYLAND_HEADER_PATTERN = new RegExp(`^\\/\\*\\r?\\n \\* Copyright 2005-${currentYear} Hyland Software[\\s\\S]*?\\*\\/\\r?\\n*`);

const SHEBANG_PATTERN = /^#!.*\r?\n/;

// Directories and patterns to ignore (matching eslint.config.mjs patterns)
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.angular/**',
  '**/.nx/**',
  '**/coverage/**',
  '**/nxcache/**',
  '**/tmp/**',
  '**/.tmp/**',
  // Don't ignore .d.ts files - they need headers too
];

// Statistics tracking
const stats = {
  total: 0,
  alreadyHasNew: 0,
  replacedOld: 0,
  addedNew: 0,
  updatedYear: 0,
  skipped: 0,
  errors: 0,
};

function processFile(filePath) {
  stats.total++;

  try {
    let content = readFileSync(filePath, 'utf-8');

    // Skip empty or whitespace-only files
    if (content.trim().length === 0) {
      if (isVerbose) {
        console.log(`[SKIP] Empty file: ${filePath}`);
      }
      stats.skipped++;
      return;
    }

    // Extract shebang if present
    let shebang = '';
    const shebangMatch = content.match(SHEBANG_PATTERN);
    if (shebangMatch) {
      shebang = shebangMatch[0];
      content = content.slice(shebang.length);
    }

    // First, remove ALL old Alfresco headers (handles duplicate header cases)
    let hasOldAlfrescoHeader = false;
    let oldAlfrescoHeaderCount = 0;
    
    // Use replace with a function to count Alfresco header matches
    const contentAfterAlfrescoRemoval = content.replace(OLD_ALFRESCO_HEADER_PATTERN, (match) => {
      hasOldAlfrescoHeader = true;
      oldAlfrescoHeaderCount++;
      return '';
    });
    
    content = contentAfterAlfrescoRemoval;

    // Check if file has an outdated Hyland header (wrong year)
    const hasOutdatedHylandHeader = OLD_HYLAND_HEADER_PATTERN.test(content) && !CURRENT_HYLAND_HEADER_PATTERN.test(content);
    
    // Remove outdated Hyland header if present
    if (hasOutdatedHylandHeader) {
      content = content.replace(OLD_HYLAND_HEADER_PATTERN, '');
    }

    // Check if file already has the current year Hyland header
    const hasCurrentHeader = CURRENT_HYLAND_HEADER_PATTERN.test(content);

    let newContent;
    let action;

    if (hasCurrentHeader && hasOldAlfrescoHeader) {
      // Had both current header and old Alfresco header(s) - removed old one(s), keep current
      newContent = content;
      action = 'CLEAN_DUPLICATE';
      stats.replacedOld++;
    } else if (hasOldAlfrescoHeader || hasOutdatedHylandHeader) {
      // Had old header(s) or outdated Hyland header - add current header
      newContent = NEW_HEADER + '\n' + content;
      action = hasOutdatedHylandHeader ? 'UPDATE_YEAR' : 'REPLACE';
      if (hasOutdatedHylandHeader) {
        stats.updatedYear++;
      } else {
        stats.replacedOld++;
      }
    } else if (hasCurrentHeader) {
      // Already has current header and no old ones - nothing to do
      if (isVerbose) {
        console.log(`[OK] Already has current header: ${filePath}`);
      }
      stats.alreadyHasNew++;
      return;
    } else {
      // No header at all - add new header
      newContent = NEW_HEADER + '\n' + content;
      action = 'ADD';
      stats.addedNew++;
    }

    // Restore shebang if it was present
    if (shebang) {
      newContent = shebang + newContent;
    }

    if (isDryRun) {
      console.log(`[DRY-RUN][${action}] ${filePath}`);
      if (isVerbose && (hasOldAlfrescoHeader || hasOutdatedHylandHeader)) {
        if (hasOldAlfrescoHeader) {
          console.log(`  Removed ${oldAlfrescoHeaderCount} old Alfresco header(s)`);
        }
        if (hasOutdatedHylandHeader) {
          console.log(`  Updated Hyland header to year ${currentYear}`);
        }
      }
    } else {
      writeFileSync(filePath, newContent, 'utf-8');
      if (isVerbose) {
        console.log(`[${action}] ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`[ERROR] Failed to process ${filePath}:`, error.message);
    stats.errors++;
  }
}

async function main() {
  console.log('License Header Migration Script');
  console.log('================================\n');
  console.log(`Target year: 2005-${currentYear}\n`);

  if (isDryRun) {
    console.log('Running in DRY-RUN mode (no files will be modified)\n');
  }

  // Find all TypeScript and JavaScript files
  const patterns = [
    'libs/**/*.ts', 'libs/**/*.js',
    'apps/**/*.ts', 'apps/**/*.js',
    'e2es/**/*.ts', 'e2es/**/*.js',
    'tools/**/*.ts', 'tools/**/*.js',
    'scripts/**/*.ts', 'scripts/**/*.js',
    'jest/**/*.ts', 'jest/**/*.js',
    '**/.storybook/**/*.ts', '**/.storybook/**/*.js',
    '*.ts', '*.js' // Root level files
  ];

  console.log('Discovering files...\n');

  const files = await glob(patterns, {
    ignore: IGNORE_PATTERNS,
    nodir: true,
    absolute: true,
  });

  console.log(`Found ${files.length} files to process\n`);

  if (isVerbose) {
    console.log('Processing files...\n');
  } else {
    console.log('Processing files (use --verbose for detailed output)...\n');
  }

  // Process each file
  for (const file of files) {
    processFile(file);
  }

  // Display statistics
  if (showStats) {
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total files processed:        ${stats.total}`);
    console.log(`Already have current header:  ${stats.alreadyHasNew}`);
    console.log(`Replaced old Alfresco header: ${stats.replacedOld}`);
    console.log(`Updated header year:          ${stats.updatedYear}`);
    console.log(`Added new header:             ${stats.addedNew}`);
    console.log(`Skipped (empty):              ${stats.skipped}`);
    console.log(`Errors:                       ${stats.errors}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\nTo apply these changes, run without --dry-run flag');
    } else {
      console.log('\nMigration complete!');
    }
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

main();
