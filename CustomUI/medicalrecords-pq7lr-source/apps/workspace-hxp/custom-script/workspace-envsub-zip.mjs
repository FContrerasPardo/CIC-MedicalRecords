#! /usr/bin/env node

import { execSync } from 'node:child_process';
import { chdir } from 'node:process';

const isWin = process.platform === 'win32';

if (isWin) {
    console.log("Running on Windows");
    execSync('node apps/workspace-hxp/remove-me-setup.mjs', { stdio: 'inherit' });
    execSync('npm run envsub -- --env-file apps/workspace-hxp/.env --env APP_CONFIG_BPM_HOST=http://localhost:4200 --env APP_CONFIG_ECM_HOST=http://localhost:4200 --env NUCLEUS_API_HOST=http://localhost:4200 --env HXP_INTELLIGENT_DOCUMENT_PROCESSING_URL=http://localhost:4200 --all apps/workspace-hxp/.tmp/app.config.json.tpl apps/workspace-hxp/.tmp/app.config.json', { stdio: 'inherit' });
    execSync('node scripts/utils/validate-app-config.js node_modules/@alfresco/adf-core/app.config.schema.json apps/workspace-hxp/.tmp/app.config.json', { stdio: 'inherit' });
} else {
    console.log("Running on native Linux or macOS");
    chdir('apps/workspace-hxp');
    execSync('node remove-me-setup.mjs', { stdio: 'inherit' });
    execSync('npm run envsub -- --env-file .env --env APP_CONFIG_BPM_HOST=http://localhost:4200 --env APP_CONFIG_ECM_HOST=http://localhost:4200 --env NUCLEUS_API_HOST=http://localhost:4200 --env HXP_INTELLIGENT_DOCUMENT_PROCESSING_URL=http://localhost:4200 --all apps/workspace-hxp/.tmp/app.config.json.tpl apps/workspace-hxp/.tmp/app.config.json', { stdio: 'inherit' });
    execSync('node ../../scripts/utils/validate-app-config.js ../../node_modules/@alfresco/adf-core/app.config.schema.json .tmp/app.config.json', { stdio: 'inherit' });
}
