import { json } from '@sveltejs/kit';
import { leaderboard } from '$lib/server/leaderboard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	json(leaderboard(url.searchParams.get('period') ?? 'all-time'), {
		headers: { 'Cache-Control': 'no-store' }
	});
