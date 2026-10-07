import {
	BUGS,
	DRINKS,
	KILL_PRESSURE_GAIN,
	DRINK_PRESSURE_GAIN,
	BOWL_STREAK_SECONDS,
	BOWL_STREAK_GRACE,
	POWERUP_DURATION,
	STEP,
	PRESSURE_DRAIN,
	LATE_WAVE_DRAIN,
	SCORE_PER_FLOW,
	SPILL_PENALTY_PER_FLOW,
	type BugKind,
	type DrinkKind
} from './config';

export type Phase = 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'results';
export type RoundResult = Readonly<{
	score: number;
	accuracy: number | null;
	kills: number;
	duration: number;
	missed: number;
}>;
export type Notice = { id: number; text: string; tone: 'good' | 'bad' | 'drink' };
export type GameState = {
	phase: Phase;
	score: number;
	pressure: number;
	elapsed: number;
	countdown: number;
	captured: number;
	spilled: number;
	targeted: number;
	kills: number;
	missed: number;
	wave: number;
	waveRemaining: number;
	bowlStreak: number;
	drink: { kind: DrinkKind; remaining: number } | null;
	notice: Notice | null;
	result: RoundResult | null;
};
export function initialState(): GameState {
	return {
		phase: 'menu',
		score: 0,
		pressure: 100,
		elapsed: 0,
		countdown: 3,
		captured: 0,
		spilled: 0,
		targeted: 0,
		kills: 0,
		missed: 0,
		wave: 0,
		waveRemaining: 0,
		bowlStreak: 0,
		drink: null,
		notice: null,
		result: null
	};
}

/** Owns round rules only. No renderer, timers, storage, or DOM dependencies. */
export default class Session {
	state = initialState();
	private resumedPhase: 'playing' | 'countdown' = 'playing';
	private ending = 0;
	private noticeId = 0;
	private noticeRemaining = 0;
	private streakGap = 0;
	private nextDrink: DrinkKind = 'beer';

	start() {
		this.state = { ...initialState(), phase: 'countdown' };
		this.ending = 0;
		this.resetStreak();
		this.nextDrink = 'beer';
	}
	menu() {
		this.state = initialState();
		this.resetStreak();
		this.nextDrink = 'beer';
	}
	pause() {
		if (this.state.phase !== 'playing' && this.state.phase !== 'countdown') return;
		this.resumedPhase = this.state.phase;
		this.state.phase = 'paused';
	}
	resume() {
		if (this.state.phase === 'paused') this.state.phase = this.resumedPhase;
	}
	get playing() {
		return this.state.phase === 'playing';
	}

	tick(dt: number) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		const s = this.state;
		if (s.phase === 'countdown') {
			s.countdown = Math.max(0, s.countdown - dt);
			if (s.countdown < 1e-8) {
				s.countdown = 0;
				s.phase = 'playing';
			}
		} else if (s.phase === 'gameover') {
			this.ending += dt;
			if (this.ending >= 0.75) s.phase = 'results';
		} else if (this.playing) {
			s.elapsed += dt;
			this.noticeRemaining -= dt;
			if (this.noticeRemaining <= 0) s.notice = null;
			if (s.drink) {
				s.drink.remaining -= dt;
				if (s.drink.remaining <= 0) s.drink = null;
			}
			// Endless difficulty grows gently without shrinking hit windows or crowding lanes.
			this.losePressure((PRESSURE_DRAIN + Math.max(0, s.wave - 8) * LATE_WAVE_DRAIN) * dt);
		}
	}

	flow(captured: number, spilled: number, targeted = 0, dt = STEP) {
		if (!this.playing) return;
		this.state.captured += captured;
		this.state.spilled += spilled;
		this.state.targeted += targeted;
		this.state.score = Math.max(
			0,
			this.state.score + captured * SCORE_PER_FLOW - spilled * SPILL_PENALTY_PER_FLOW
		);
		if (this.state.drink || spilled > 0 || targeted > 0) {
			this.resetStreak();
			return;
		}
		if (captured > 0) {
			this.streakGap = 0;
			// Count clean contact time, not particle count; a burst cannot award instantly.
			this.state.bowlStreak += dt;
			if (this.state.bowlStreak + 1e-8 >= BOWL_STREAK_SECONDS) this.awardPowerup();
		} else {
			// Bridge small gaps between droplets, but never add progress during a gap.
			this.streakGap += dt;
			if (this.streakGap >= BOWL_STREAK_GRACE) this.resetStreak();
		}
	}
	private resetStreak() {
		this.state.bowlStreak = 0;
		this.streakGap = 0;
	}
	beginWave(count: number) {
		if (!this.playing) return;
		this.state.wave++;
		this.state.waveRemaining = count;
		this.announce(
			`WAVE ${this.state.wave} · ${count} BUGS INCOMING!${this.state.wave > 8 ? ' · PRESSURE RISING' : ''}`,
			'good'
		);
	}
	endWave() {
		if (!this.playing) return;
		this.announce(`WAVE ${this.state.wave} COMPLETE · CATCH YOUR BREATH!`, 'good');
	}
	kill(kind: BugKind) {
		if (!this.playing) return;
		this.state.kills++;
		this.state.waveRemaining = Math.max(0, this.state.waveRemaining - 1);
		this.state.score += BUGS[kind].reward;
		this.state.pressure = Math.min(100, this.state.pressure + KILL_PRESSURE_GAIN);
		this.announce(
			`+${BUGS[kind].reward} · +${KILL_PRESSURE_GAIN}% PRESSURE · ${kind === 'wasp' ? 'BUZZ OFF!' : 'EIGHT LEGS. ZERO CHANCE.'}`,
			'good'
		);
	}
	miss(kind: BugKind) {
		if (!this.playing) return;
		this.state.missed++;
		this.state.waveRemaining = Math.max(0, this.state.waveRemaining - 1);
		this.announce(`−${BUGS[kind].penalty}% · ${kind.toUpperCase()} GOT AWAY`, 'bad');
		this.losePressure(BUGS[kind].penalty);
	}
	private awardPowerup() {
		const kind = this.nextDrink;
		this.nextDrink = kind === 'beer' ? 'cola' : 'beer';
		this.resetStreak();
		this.state.drink = { kind, remaining: POWERUP_DURATION };
		this.state.pressure = Math.min(100, this.state.pressure + DRINK_PRESSURE_GAIN);
		this.announce(
			`CLEAN STREAK! ${DRINKS[kind].name.toUpperCase()} · +${DRINK_PRESSURE_GAIN}% PRESSURE`,
			'drink'
		);
	}
	private announce(text: string, tone: Notice['tone']) {
		this.state.notice = { id: ++this.noticeId, text, tone };
		this.noticeRemaining = 1.8;
	}
	private losePressure(amount: number) {
		this.state.pressure = Math.max(0, this.state.pressure - amount);
		if (this.state.pressure < 1e-8) {
			this.state.pressure = 0;
			this.state.phase = 'gameover';
			this.state.drink = null;
			this.resetStreak();
			const { captured, targeted, spilled, score, kills, elapsed, missed } = this.state;
			const successful = captured + targeted;
			this.state.result = Object.freeze({
				score: Math.floor(score),
				accuracy: successful + spilled > 0 ? successful / (successful + spilled) : null,
				kills,
				duration: elapsed,
				missed
			});
		}
	}
	snapshot(): GameState {
		return { ...this.state, drink: this.state.drink ? { ...this.state.drink } : null };
	}
}
