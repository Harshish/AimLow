import * as THREE from 'three/webgpu';
import type Physics from './Physics';
import Environment from './Environment';
import type { LoadedAssets } from '../Utils/Assets';
import { WaterJet } from './Elements/WaterJet';
import EnemyManager from './EnemyManager';
import Effects from './Effects';
import Session from '../Game/Session';
import InputController from '../UI/InputController';
import { STEP, BOWL_STREAK_SECONDS, DRINKS, jetProfile, type Settings } from '../Game/config';

const RING = new THREE.Color(0x81ffd3);
const WHITE = new THREE.Color(0xffffff);
const LOCK = new THREE.Color(0xff9a3d);
const ALARM = new THREE.Color(0xff2a3a);

export default class World {
	readonly environment: Environment;
	readonly waterJet: WaterJet;
	readonly enemies: EnemyManager;
	readonly effects: Effects;
	private accumulator = 0;
	private time = 0;
	private hitPulse = 0;
	private alarm = 0;
	private lastMissed = 0;
	private readonly tint = new THREE.Color();
	private readonly reticle = new THREE.Mesh(
		new THREE.RingGeometry(0.12, 0.155, 24),
		new THREE.MeshBasicMaterial({
			color: 0xffffff,
			depthTest: false,
			transparent: true,
			opacity: 0.9
		})
	);

	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		assets: LoadedAssets,
		private readonly session: Session,
		private readonly input: InputController,
		private readonly camera: THREE.Camera
	) {
		this.environment = new Environment(scene, physics, assets);
		this.effects = new Effects(scene);
		this.waterJet = new WaterJet(scene, physics, this.effects);
		this.enemies = new EnemyManager(scene, physics, assets, session, this.effects);
		this.reticle.renderOrder = 5;
		this.reticle.visible = false;
		scene.add(this.reticle);
	}
	loop(delta: number, settings: Settings) {
		const phase = this.session.state.phase;
		this.reticle.visible = phase === 'playing';
		if (phase === 'paused') {
			this.accumulator = 0;
			return;
		}
		// Cosmetics settle on the menu and results screens too; only pause freezes them.
		this.effects.update(Math.min(delta, 0.1));
		this.react(delta, settings.reducedMotion);
		if (phase === 'menu' || phase === 'results') {
			this.accumulator = 0;
			return;
		}
		const frame = Math.max(0, Math.min(delta, 0.1));
		// Keyboard aim moves per display frame so the reticle is as smooth as the screen allows.
		if (this.session.playing) this.input.update(frame);
		this.accumulator += frame;
		while (this.accumulator + 1e-9 >= STEP) {
			this.accumulator -= STEP;
			if (this.session.playing) {
				this.enemies.update(STEP, settings.reducedMotion);
				const state = this.session.state;
				this.waterJet.update(
					STEP,
					this.enemies.resolveAim(this.input.aim, this.camera),
					jetProfile(state.pressure, state.drink?.kind ?? null)
				);
				const flow = this.waterJet.resolve(
					this.physics.loop(STEP),
					(target) => target.kind === 'enemy' && this.enemies.hit(target.id)
				);
				if (flow.targeted > 0) this.hitPulse = 0.12;
				this.session.flow(flow.captured, flow.spilled, flow.targeted, STEP);
				this.enemies.resolveDeadlines();
				this.session.tick(STEP);
				if (!this.session.playing) this.enemies.reset();
			} else {
				if (this.session.state.phase === 'gameover') {
					// Let the last drops fall as a cosmetic ending, without scoring or damage.
					this.waterJet.update(STEP, this.input.aim, jetProfile(0, null));
					this.waterJet.resolve(this.physics.loop(STEP), () => false);
				}
				this.session.tick(STEP);
				if (this.session.state.phase === 'results') this.waterJet.reset();
			}
		}
		// Rules tick at a fixed 60 Hz; draw between the last two steps so bugs and droplets
		// move every display frame (120/144 Hz and up) instead of judder on step boundaries.
		const alpha = this.accumulator / STEP;
		this.enemies.render(alpha);
		this.waterJet.syncInstances((alpha - 1) * STEP);
		this.reticle.position.copy(this.input.aim);
		this.reticle.quaternion.copy(this.camera.quaternion);
	}
	/** Presentation that answers the rules: lock-on, hit pulse, streak charge, and light cues. */
	private react(delta: number, reducedMotion: boolean) {
		const { bowlStreak, drink, missed } = this.session.state;
		this.time += delta;
		this.hitPulse = Math.max(0, this.hitPulse - delta);
		if (missed > this.lastMissed) this.alarm = 0.6;
		this.lastMissed = missed;
		this.alarm = Math.max(0, this.alarm - delta);

		const locked = this.enemies.locked;
		this.reticle.material.color.copy(locked || this.hitPulse > 0 ? LOCK : WHITE);
		this.reticle.scale.setScalar(1 + (locked ? 0.35 : 0) + this.hitPulse * 4);

		// The bowl ring fills with light as the clean streak charges, then shows the reward.
		const charge = Math.min(1, bowlStreak / BOWL_STREAK_SECONDS);
		const beat = reducedMotion ? 0 : Math.sin(this.time * 9) * 0.06;
		const ring = this.environment.ring;
		ring.material.color.copy(drink ? this.tint.set(DRINKS[drink.kind].color) : RING);
		ring.material.color.multiplyScalar(1.2 + charge * 2.8);
		ring.scale.setScalar(1 + charge * 0.3 + (drink || charge > 0 ? beat : 0));

		// Lane lights lean toward the active drink, and flash red when a bug escapes.
		for (const { light, base } of this.environment.accents) {
			light.color.copy(base);
			if (drink) light.color.lerp(this.tint.set(DRINKS[drink.kind].color), 0.45);
			light.color.lerp(ALARM, Math.min(1, this.alarm * 2));
		}
	}
	/**
	 * Draws one frame with everything that otherwise first appears mid-play (bugs, bars, sparks,
	 * score popup, stream, reticle), so shaders compile behind the loading screen, not on a kill.
	 * Gameplay state is untouched; the next loop() restores reticle visibility.
	 */
	prewarm(render: () => void) {
		this.enemies.showTemplates(true);
		this.effects.kill({ x: 0, y: 5, z: 5 }, 'wasp', true, 0, false);
		this.effects.update(0.2);
		this.waterJet.particlesMesh.count = 1;
		this.reticle.visible = true;
		render();
		this.enemies.showTemplates(false);
		this.effects.reset();
		this.waterJet.syncInstances();
	}
	reset() {
		this.waterJet.reset();
		this.enemies.reset();
		this.effects.reset();
		this.accumulator = 0;
		this.hitPulse = this.alarm = this.lastMissed = 0;
		this.reticle.visible = false;
	}
	dispose() {
		this.reset();
		this.enemies.dispose();
		this.waterJet.dispose();
		this.effects.dispose();
		this.scene.remove(this.reticle);
		this.reticle.geometry.dispose();
		this.reticle.material.dispose();
	}
}
