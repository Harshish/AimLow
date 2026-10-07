import { MIN_SPAWN_INTERVAL, RULES_VERSION } from './config';
import type { RoundResult } from './Session';

export type ScoreEntry = RoundResult & {
	id: string;
	name: string;
	timestamp: string;
	rulesVersion: string;
};
export const SCORE_KEY = `aimlow.scores.${RULES_VERSION}`;
const safeName = /^[\p{L}\p{N} _.'-]{1,12}$/u;
export function validName(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.trim() === value &&
		safeName.test(value) &&
		value.length <= 12
	);
}
export function playerName(value: string) {
	return validName(value.trim()) ? value.trim() : 'PLAYER';
}
export function validResult(value: unknown): value is RoundResult {
	if (!value || typeof value !== 'object') return false;
	const s = value as RoundResult;
	return (
		Number.isSafeInteger(s.score) &&
		s.score >= 0 &&
		Number.isFinite(s.duration) &&
		s.duration > 0 &&
		// Refills can extend a run beyond the original 80-second tank.
		Number.isSafeInteger(s.kills) &&
		s.kills >= 0 &&
		Number.isSafeInteger(s.missed) &&
		s.missed >= 0 &&
		s.kills + s.missed <= Math.ceil(s.duration / MIN_SPAWN_INTERVAL) &&
		s.score <= Math.ceil(s.duration * 100 + s.kills * 200) &&
		(s.accuracy === null || (Number.isFinite(s.accuracy) && s.accuracy >= 0 && s.accuracy <= 1))
	);
}
export function validEntry(value: unknown): value is ScoreEntry {
	if (!validResult(value)) return false;
	const s = value as ScoreEntry;
	return (
		typeof s.id === 'string' &&
		/^[\w-]{1,64}$/.test(s.id) &&
		validName(s.name) &&
		s.rulesVersion === RULES_VERSION &&
		typeof s.timestamp === 'string' &&
		Number.isFinite(Date.parse(s.timestamp))
	);
}
export function rankScores(entries: ScoreEntry[]) {
	return [...entries].sort(
		(a, b) =>
			b.score - a.score ||
			(b.accuracy ?? -1) - (a.accuracy ?? -1) ||
			Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
			a.id.localeCompare(b.id)
	);
}
export function loadScores(): ScoreEntry[] {
	try {
		const value: unknown = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '[]');
		return Array.isArray(value) ? rankScores(value.filter(validEntry)).slice(0, 10) : [];
	} catch {
		return [];
	}
}
export function saveScore(entries: ScoreEntry[], entry: ScoreEntry) {
	const scores = rankScores([...entries.filter((s) => s.id !== entry.id), entry]).slice(0, 10);
	let persisted = true;
	try {
		localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
	} catch {
		persisted = false;
	}
	return { scores, persisted };
}
export function resultTitle(result: RoundResult) {
	return (result.accuracy ?? 0) >= 0.8
		? 'PORCELAIN PRO'
		: result.kills >= 5
			? 'PEST CONTROL'
			: result.score >= 2000
				? 'NATURAL TALENT'
				: 'FLOOR MANAGER';
}

async function request(path: string, body?: unknown) {
	const response = await fetch(path, {
		method: body === undefined ? 'GET' : 'POST',
		headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(8000)
	});
	if (!response.ok) {
		const data = await response.json().catch(() => null);
		throw new Error(data?.message ?? 'Leaderboard unavailable. Your local score is safe.');
	}
	return response.json();
}
export async function submitScore(entry: ScoreEntry): Promise<void> {
	await request('/api/scores', { entry });
}
export async function databaseScores(period: 'daily' | 'all-time'): Promise<ScoreEntry[]> {
	const data = await request(`/api/leaderboard?period=${period}`);
	if (!Array.isArray(data)) throw new Error('Invalid leaderboard response.');
	return data.filter(validEntry);
}

export async function shareScore(entry: ScoreEntry): Promise<'shared' | 'downloaded'> {
	const canvas = document.createElement('canvas');
	canvas.width = 1080;
	canvas.height = 1080;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Score cards are unavailable in this browser.');
	ctx.fillStyle = '#111e2a';
	ctx.fillRect(0, 0, 1080, 1080);
	ctx.strokeStyle = '#263f48';
	ctx.lineWidth = 2;
	for (let i = 0; i < 1080; i += 90) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i, 1080);
		ctx.moveTo(0, i);
		ctx.lineTo(1080, i);
		ctx.stroke();
	}
	ctx.fillStyle = '#dfff6a';
	ctx.font = '900 140px sans-serif';
	ctx.fillText('AIM LOW.', 75, 205);
	ctx.fillStyle = '#f2f3e9';
	ctx.font = 'bold 40px sans-serif';
	ctx.fillText('LOW AIM. HIGH SCORES.', 80, 285);
	ctx.font = '900 190px sans-serif';
	ctx.fillText(entry.score.toLocaleString(), 75, 555);
	ctx.fillStyle = '#8ae8d2';
	ctx.font = 'bold 40px sans-serif';
	ctx.fillText(resultTitle(entry), 80, 635);
	ctx.fillStyle = '#f2f3e9';
	ctx.font = '32px sans-serif';
	ctx.fillText(
		`${entry.name}  /  ${entry.kills} bugs  /  ${Math.round((entry.accuracy ?? 0) * 100)}% accuracy`,
		80,
		740
	);
	ctx.fillText('Think you can aim lower?', 80, 870);
	ctx.fillStyle = '#dfff6a';
	ctx.font = '26px sans-serif';
	ctx.fillText(location.origin, 80, 945);
	const blob = await new Promise<Blob>((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Unable to create score card.'))),
			'image/png'
		)
	);
	const file = new File([blob], 'aim-low-score.png', { type: 'image/png' });
	if (navigator.canShare?.({ files: [file] })) {
		await navigator.share({
			files: [file],
			title: 'Aim Low',
			text: `I scored ${entry.score} in Aim Low. Your turn.`,
			url: location.origin
		});
		return 'shared';
	}
	const url = URL.createObjectURL(blob),
		link = document.createElement('a');
	link.href = url;
	link.download = file.name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	return 'downloaded';
}
