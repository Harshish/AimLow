import type * as THREE from 'three/webgpu';
import type Physics from './Physics';
import type { LoadedAssets } from '../Utils/Assets';
import Session from '../Game/Session';
import {
	DAMAGE_PER_FLOW,
	FLOW_RATE,
	MIN_SPAWN_INTERVAL,
	WAVE_BREAK,
	MAX_WAVE_SIZE,
	MAX_ACTIVE_ENEMIES,
	ENEMY_LANES
} from '../Game/config';
import Enemy from './Elements/Enemy';

export default class EnemyManager {
	readonly enemies = new Map<number, Enemy>();
	private nextSpawn = 0;
	private nextWaveAt: number | null = WAVE_BREAK;
	private pending = 0;
	private sequence = 0;
	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		private readonly assets: LoadedAssets,
		private readonly session: Session
	) {}

	update(dt: number, reducedMotion: boolean) {
		if (!this.session.playing) return;
		const time = this.session.state.elapsed;
		if (this.nextWaveAt !== null && time >= this.nextWaveAt) {
			this.pending = Math.min(MAX_WAVE_SIZE, this.session.state.wave + 3);
			this.session.beginWave(this.pending);
			this.nextWaveAt = null;
			this.nextSpawn = time;
		}
		if (this.pending > 0 && time >= this.nextSpawn && this.enemies.size < MAX_ACTIVE_ENEMIES) {
			const kind = (this.sequence + this.session.state.wave) % 2 ? 'spider' : 'wasp';
			const occupied = new Set([...this.enemies.values()].map((enemy) => enemy.lane));
			const lanes = ENEMY_LANES.map((_, i) => i).filter(
				(i) => ENEMY_LANES[i].kind === kind && !occupied.has(i)
			);
			if (lanes.length) {
				const lane = lanes[Math.floor(Math.random() * lanes.length)];
				const id = ++this.sequence;
				this.enemies.set(
					id,
					new Enemy(id, kind, this.assets[kind], this.scene, this.physics, lane)
				);
				this.pending--;
				this.nextSpawn =
					time + Math.max(MIN_SPAWN_INTERVAL, 2.4 - (this.session.state.wave - 1) * 0.1);
			}
		}
		for (const [id, enemy] of this.enemies) {
			enemy.update(dt, reducedMotion);
			if (enemy.retiredFor >= 0.65) {
				enemy.dispose();
				this.enemies.delete(id);
			}
		}
		if (this.nextWaveAt === null && this.pending === 0 && this.enemies.size === 0) {
			this.nextWaveAt = time + WAVE_BREAK;
			this.session.endWave();
		}
	}
	hit(id: number) {
		const enemy = this.enemies.get(id);
		if (!enemy || !enemy.damage(DAMAGE_PER_FLOW / FLOW_RATE)) return false;
		if (enemy.status === 'dead') this.session.kill(enemy.kind);
		return true;
	}
	resolveDeadlines() {
		for (const enemy of this.enemies.values()) {
			if (!this.session.playing) break;
			if (enemy.active && enemy.remaining <= 0) {
				enemy.retire('escaped');
				this.session.miss(enemy.kind);
			}
		}
	}
	reset() {
		for (const e of this.enemies.values()) e.dispose();
		this.enemies.clear();
		this.nextSpawn = 0;
		this.nextWaveAt = WAVE_BREAK;
		this.pending = 0;
		this.sequence = 0;
	}
}
