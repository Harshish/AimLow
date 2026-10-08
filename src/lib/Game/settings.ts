import { DEFAULT_SETTINGS, type Settings } from './config';

export function loadSettings(): Settings {
	const defaults = {
		...DEFAULT_SETTINGS,
		reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
		// Phones start on Low: god rays and shadows cost more frame time than they add there.
		quality: matchMedia('(pointer: coarse)').matches ? 'low' : 'high'
	} satisfies Settings;
	try {
		const s = JSON.parse(localStorage.getItem('aimlow.settings') ?? 'null');
		if (!s || typeof s !== 'object') return defaults;
		return {
			sound: typeof s.sound === 'boolean' ? s.sound : defaults.sound,
			music: typeof s.music === 'boolean' ? s.music : defaults.music,
			haptics: typeof s.haptics === 'boolean' ? s.haptics : defaults.haptics,
			reducedMotion:
				typeof s.reducedMotion === 'boolean' ? s.reducedMotion : defaults.reducedMotion,
			sensitivity: Number.isFinite(s.sensitivity) ? Math.max(0.5, Math.min(2, s.sensitivity)) : 1,
			quality: s.quality === 'low' || s.quality === 'high' ? s.quality : defaults.quality
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
