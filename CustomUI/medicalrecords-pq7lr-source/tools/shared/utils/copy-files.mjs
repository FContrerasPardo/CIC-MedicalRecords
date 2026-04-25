import { cp } from 'fs/promises';
import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.split('=')));

if (!args.src || !args.dest) {
    console.error('Please provide source and destination paths as arguments, e.g.: src=tools/files-to-copy dest=node_modules/where-to-copy');
    process.exit(1);
}

const src = path.resolve(args.src);
const dest = path.resolve(args.dest);

await cp(src, dest, { recursive: true, force: true });
