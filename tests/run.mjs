import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Reuse the installed TS bundler; no additional test framework or browser required.
await mkdir('.svelte-kit', { recursive: true });
const directory = await mkdtemp('.svelte-kit/tests-');
try {
	const outfile = resolve(directory, 'regression.test.mjs');
	await build({
		entryPoints: ['tests/regression.test.ts'],
		outfile,
		bundle: true,
		platform: 'node',
		format: 'esm',
		packages: 'external',
		sourcemap: 'inline'
	});
	execFileSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
} finally {
	await rm(directory, { recursive: true, force: true });
}
