import { DEFAULT_SETTINGS, type Settings } from './config';

export function loadSettings(): Settings {
	const defaults = {
		...DEFAULT_SETTINGS,
		reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
	};
	try {
		const s = JSON.parse(localStorage.getItem('aimlow.settings') ?? 'null');
		if (!s || typeof s !== 'object') return defaults;
		return {
			sound: typeof s.sound === 'boolean' ? s.sound : defaults.sound,
			music: typeof s.music === 'boolean' ? s.music : defaults.music,
			reducedMotion:
				typeof s.reducedMotion === 'boolean' ? s.reducedMotion : defaults.reducedMotion,
			sensitivity: Number.isFinite(s.sensitivity) ? Math.max(0.5, Math.min(2, s.sensitivity)) : 1,
			quality: s.quality === 'low' ? 'low' : 'high'
		};
	} catch {
		return defaults;
	}
}
export function saveSettings(settings: Settings) {
	try {
		localStorage.setItem('aimlow.settings', JSON.stringify(settings));
	} catch {
		/* Settings still work for this visit. */
	}
}
