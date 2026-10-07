export const RULES_VERSION = 'arcade-7';
export const STEP = 1 / 60;
export const FLOW_RATE = 150;
export const PARTICLE_LIFE = 3;
export const PARTICLE_RADIUS = 0.11;
export const PRESSURE_DRAIN = 1.25;
export const WAVE_PRESSURE_DRAIN = 0.25;
export const KILL_PRESSURE_GAIN = 8;
export const DRINK_PRESSURE_GAIN = 15;
export const BOWL_STREAK_SECONDS = 3;
export const BOWL_STREAK_GRACE = 0.15;
export const POWERUP_DURATION = 8;
export const MIN_SPAWN_INTERVAL = 1;
export const KEYBOARD_AIM_SPEED = 18;
export const AIM_LIMIT_X = 10;
export const WAVE_BREAK = 4;
export const MAX_WAVE_SIZE = 10;
export const MAX_ACTIVE_ENEMIES = 4;
export const SCORE_PER_FLOW = 100;
export const SPILL_PENALTY_PER_FLOW = 35;
export const DAMAGE_PER_FLOW = 45;
export const DRINKS = {
	beer: {
		name: 'Foam Party',
		description: '25% more flow. Big pressure. Bigger mess.',
		speed: 1.4,
		emission: 1.25,
		spread: 3,
		color: 0x38d9ef
	},
	cola: {
		name: 'Cola Laser',
		description: '60% faster. 50% more flow. Laser precision.',
		speed: 1.6,
		emission: 1.5,
		spread: 0.15,
		color: 0x689dff
	}
} as const;
export type DrinkKind = keyof typeof DRINKS;
export const MAX_FLOW_RATE =
	FLOW_RATE * Math.max(1, ...Object.values(DRINKS).map((drink) => drink.emission));
export const BUGS = {
	spider: { health: 9, deadline: 3, reward: 150, penalty: 12, radius: 1.2, size: 4.4 },
	wasp: { health: 6, deadline: 2.75, reward: 200, penalty: 18, radius: 1.05, size: 3.6 }
} as const;
export type BugKind = keyof typeof BUGS;

// Lane centers stay beside the porcelain; later spiders also crawl behind the aim plane.
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

export function waveProfile(wave: number) {
	const level = Math.max(0, wave - 1);
	return {
		spawnInterval: Math.max(MIN_SPAWN_INTERVAL, 2.4 - level * 0.17),
		// Gradual stat pressure plus new movement, without shrinking hitboxes or escape windows.
		healthMultiplier: 1 + Math.min(0.8, level * 0.06),
		pressureDrain: PRESSURE_DRAIN + level * WAVE_PRESSURE_DRAIN,
		waspHover: Math.max(0.7, 1.25 - level * 0.04)
	};
}

export function jetProfile(pressure: number, drink: DrinkKind | null) {
	const p = Math.max(0, Math.min(1, pressure / 20));
	const effect = drink ? DRINKS[drink] : null;
	return {
		// Low pressure looks weaker without making a last-second kill impossible.
		speed: pressure > 0 ? 24 * (0.85 + 0.15 * p) * (effect?.speed ?? 1) : 0,
		emission: pressure > 0 ? FLOW_RATE * (0.7 + 0.3 * p) * (effect?.emission ?? 1) : 0,
		spread: 0.32 * (effect?.spread ?? 1),
		color: effect?.color ?? 0x249dff
	};
}
