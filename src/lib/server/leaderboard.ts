import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { resolve } from 'node:path';
import { validEntry } from '$lib/Game/leaderboard';
import ScoreDatabase from './ScoreDatabase';

let database: ScoreDatabase | undefined;
function scores() {
	try {
		return (database ??= new ScoreDatabase(resolve(env.AIMLOW_DB_PATH || '.data/aimlow.sqlite')));
	} catch {
		error(503, 'Cannot open the local score database. Check the database folder permissions.');
	}
}
if (import.meta.hot)
	import.meta.hot.dispose(() => {
		database?.close();
		database = undefined;
	});

/** Bound the streamed body too; Content-Length alone is supplied by the caller. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
	if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
		error(415, 'Expected application/json.');
	if (Number(request.headers.get('content-length')) > 4096) error(413, 'Request too large.');
	if (!request.body) error(400, 'Missing request body.');
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 4096) {
				await reader.cancel();
				error(413, 'Request too large.');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	let body: unknown;
	try {
		body = JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		error(400, 'Invalid JSON.');
	}
	if (!body || typeof body !== 'object' || Array.isArray(body))
		error(400, 'Expected a JSON object.');
	return body as Record<string, unknown>;
}

export function submit(body: Record<string, unknown>) {
	if (!validEntry(body.entry)) error(400, 'Invalid score submission.');
	let saved;
	try {
		saved = scores().save(body.entry);
	} catch {
		error(
			503,
			'Could not save to SQLite. Your browser copy is safe; retry when the database is available.'
		);
	}
	if (!saved) error(409, 'This run already has a different saved score.');
	return saved;
}
export function leaderboard(period: string) {
	if (period !== 'daily' && period !== 'all-time') error(400, 'Invalid leaderboard period.');
	try {
		return scores().list(period);
	} catch {
		error(503, 'The local score database is unavailable.');
	}
}
