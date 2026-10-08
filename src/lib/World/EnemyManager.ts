import * as THREE from 'three/webgpu';
import type Physics from './Physics';
import type { LoadedAssets } from '../Utils/Assets';
import Session from '../Game/Session';
import {
	BUGS,
	DAMAGE_PER_FLOW,
	FLOW_RATE,
	waveProfile,
	WAVE_BREAK,
	MAX_WAVE_SIZE,
	MAX_ACTIVE_ENEMIES,
	ENEMY_LANES,
	BUG_SPEEDS,
	QUICK_KILL_WINDOW
} from '../Game/config';
import Enemy from './Elements/Enemy';
import type Effects from './Effects';

export default class EnemyManager {
	readonly enemies = new Map<number, Enemy>();
	/** One hidden, bodiless bug per kind. Never despawned, so their compiled shaders are never freed. */
	private readonly templates: Enemy[] = [];
	private nextSpawn = 0;
	private nextWaveAt: number | null = WAVE_BREAK;
	private pending = 0;
	private sequence = 0;
	private readonly aimRay = new THREE.Ray();
	private readonly aimSphere = new THREE.Sphere();
	private readonly aimHit = new THREE.Vector3();
	private readonly shotAim = new THREE.Vector3();
	/** True while the aim ray passes through a live bug; drives the reticle lock-on. */
	locked = false;
	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		private readonly assets: LoadedAssets,
		private readonly session: Session,
		private readonly effects?: Effects
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
			const dropping =
				kind === 'spider' && this.session.state.wave >= 7 && (this.sequence + 1) % 3 === 0;
			const lanes = ENEMY_LANES.map((_, i) => i).filter(
				(i) =>
					ENEMY_LANES[i].kind === kind &&
					!occupied.has(i) &&
					// Reserve the falling spider's side so it does not pass through a wasp.
					![...this.enemies.values()].some(
						(enemy) =>
							Math.sign(ENEMY_LANES[enemy.lane].x) === Math.sign(ENEMY_LANES[i].x) &&
							(enemy.dropping || (dropping && enemy.kind === 'wasp'))
					)
			);
			if (lanes.length) {
				const lane = lanes[Math.floor(Math.random() * lanes.length)];
				const id = ++this.sequence;
				const wave = this.session.state.wave;
				const tier =
					Math.random() < waveProfile(wave).fastChance ? BUG_SPEEDS.fast : BUG_SPEEDS.normal;
				const enemy = new Enemy(
					id,
					kind,
					this.assets[kind],
					this.scene,
					this.physics,
					lane,
					wave,
					THREE.MathUtils.randFloat(tier[0], tier[1])
				);
				this.enemies.set(id, enemy);
				this.effects?.spawn(enemy.root.position, enemy.fast);
				this.pending--;
				this.nextSpawn = time + waveProfile(this.session.state.wave).spawnInterval;
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
	/** Shows (or hides) the templates; drawing them once compiles every bug material before play. */
	showTemplates(visible: boolean) {
		if (!this.templates.length)
			for (const kind of ['spider', 'wasp'] as const) {
				const lane = ENEMY_LANES.findIndex((lane) => lane.kind === kind);
				const template = new Enemy(-1, kind, this.assets[kind], this.scene, this.physics, lane);
				this.physics.removeBody(template.body);
				this.templates.push(template);
			}
		for (const template of this.templates) template.root.visible = visible;
	}
	render(alpha: number) {
		for (const enemy of this.enemies.values()) enemy.render(alpha);
	}
	resolveAim(aim: THREE.Vector3, camera: THREE.Camera) {
		// Keep the cursor's screen direction, but shoot at the depth of the bug under it.
		// This works for pointer, touch, and keyboard without snapping sideways to targets.
		camera.getWorldPosition(this.aimRay.origin);
		this.aimRay.direction.subVectors(aim, this.aimRay.origin).normalize();
		let nearest = Infinity,
			depth = aim.z;
		for (const enemy of this.enemies.values()) {
			if (enemy.status === 'dead' || enemy.status === 'escaped') continue;
			this.aimSphere.center.copy(enemy.root.position);
			this.aimSphere.radius = BUGS[enemy.kind].radius;
			if (!this.aimRay.intersectSphere(this.aimSphere, this.aimHit)) continue;
			const distance = this.aimHit.distanceToSquared(this.aimRay.origin);
			if (distance < nearest) {
				nearest = distance;
				depth = enemy.root.position.z;
			}
		}
		this.locked = nearest < Infinity;
		if (Math.abs(this.aimRay.direction.z) < 1e-6) return this.shotAim.copy(aim);
		return this.aimRay.at((depth - this.aimRay.origin.z) / this.aimRay.direction.z, this.shotAim);
	}
	hit(id: number) {
		const enemy = this.enemies.get(id);
		if (!enemy || !enemy.damage(DAMAGE_PER_FLOW / FLOW_RATE)) return false;
		if (enemy.status === 'dead') {
			const points = this.session.kill(enemy.kind, enemy.speed, enemy.age);
			const quick = enemy.age <= QUICK_KILL_WINDOW / 2;
			this.effects?.kill(enemy.root.position, enemy.kind, enemy.fast, points, quick);
		}
		return true;
	}
	resolveDeadlines() {
		for (const enemy of this.enemies.values()) {
			if (!this.session.playing) break;
			if (enemy.active && enemy.remaining <= 0) {
				enemy.retire('escaped');
				this.session.miss(enemy.kind);
				this.effects?.escape(enemy.root.position);
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
		this.locked = false;
	}
	dispose() {
		this.reset();
		for (const template of this.templates) template.dispose();
		this.templates.length = 0;
	}
}
