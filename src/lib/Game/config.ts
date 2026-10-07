export const RULES_VERSION = 'arcade-5';
export const STEP = 1 / 60;
export const FLOW_RATE = 150;
export const PARTICLE_LIFE = 3;
export const PARTICLE_RADIUS = 0.11;
export const PRESSURE_DRAIN = 1.25;
export const LATE_WAVE_DRAIN = 0.15;
export const KILL_PRESSURE_GAIN = 8;
export const DRINK_PRESSURE_GAIN = 15;
export const BOWL_STREAK_SECONDS = 3;
export const BOWL_STREAK_GRACE = 0.15;
export const POWERUP_DURATION = 8;
export const MIN_SPAWN_INTERVAL = 1.6;
export const KEYBOARD_AIM_SPEED = 18;
export const AIM_LIMIT_X = 10;
export const WAVE_BREAK = 3;
export const MAX_WAVE_SIZE = 8;
export const MAX_ACTIVE_ENEMIES = 4;
export const SCORE_PER_FLOW = 100;
export const SPILL_PENALTY_PER_FLOW = 35;
export const DAMAGE_PER_FLOW = 45;
export const DRINKS = {
	beer: {
		name: 'Foam Party',
		description: 'Big pressure. Bigger mess.',
		speed: 1.4,
		spread: 3,
		color: 0x38d9ef
	},
	cola: {
		name: 'Cola Laser',
		description: 'Small stream. Big precision.',
		speed: 1.1,
		spread: 0.25,
		color: 0x689dff
	}
} as const;
export type DrinkKind = keyof typeof DRINKS;
export const BUGS = {
	spider: { health: 9, deadline: 3, reward: 150, penalty: 12, radius: 1.2, size: 4.4 },
	wasp: { health: 6, deadline: 2.75, reward: 200, penalty: 18, radius: 1.05, size: 3.6 }
} as const;
export type BugKind = keyof typeof BUGS;

// All lanes share the aim plane and stay clear of the porcelain shell.
export const ENEMY_LANES = [
	{ kind: 'spider', x: -7.8, y: 0 },
	{ kind: 'spider', x: 7.8, y: 0 },
	{ kind: 'wasp', x: -8, y: 7.5 },
	{ kind: 'wasp', x: 8, y: 7.5 },
	{ kind: 'wasp', x: -7.8, y: 11.5 },
	{ kind: 'wasp', x: 7.8, y: 11.5 }
] as const;

export type Settings = {
	sound: boolean;
	music: boolean;
	sensitivity: number;
	reducedMotion: boolean;
	quality: 'low' | 'high';
};
export const DEFAULT_SETTINGS: Settings = {
	sound: true,
	music: false,
	sensitivity: 1,
	reducedMotion: false,
	quality: 'high'
};

export function jetProfile(pressure: number, drink: DrinkKind | null) {
	const p = Math.max(0, Math.min(1, pressure / 20));
	const effect = drink ? DRINKS[drink] : null;
	return {
		// Low pressure looks weaker without making a last-second kill impossible.
		speed: pressure > 0 ? 24 * (0.85 + 0.15 * p) * (effect?.speed ?? 1) : 0,
		emission: pressure > 0 ? FLOW_RATE * (0.7 + 0.3 * p) : 0,
		spread: 0.32 * (effect?.spread ?? 1),
		color: effect?.color ?? 0x249dff
	};
}
