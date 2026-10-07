import { json } from '@sveltejs/kit';
import { submit, readBody } from '$lib/server/leaderboard';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) =>
	json(submit(await readBody(request)), {
		headers: { 'Cache-Control': 'no-store' }
	});
