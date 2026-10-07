import * as THREE from 'three/webgpu';
import type Physics from './Physics';
import Environment from './Environment';
import type { LoadedAssets } from '../Utils/Assets';
import { WaterJet } from './Elements/WaterJet';
import EnemyManager from './EnemyManager';
import Session from '../Game/Session';
import InputController from '../UI/InputController';
import { STEP, jetProfile, type Settings } from '../Game/config';

export default class World {
	readonly waterJet: WaterJet;
	readonly enemies: EnemyManager;
	private accumulator = 0;
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
		new Environment(scene, physics, assets);
		this.waterJet = new WaterJet(scene, physics);
		this.enemies = new EnemyManager(scene, physics, assets, session);
		this.reticle.renderOrder = 5;
		this.reticle.visible = false;
		scene.add(this.reticle);
	}
	loop(delta: number, settings: Settings) {
		const phase = this.session.state.phase;
		this.reticle.visible = phase === 'playing';
		if (phase === 'paused' || phase === 'menu' || phase === 'results') {
			this.accumulator = 0;
			return;
		}
		this.accumulator += Math.max(0, Math.min(delta, 0.1));
		while (this.accumulator + 1e-9 >= STEP) {
			this.accumulator -= STEP;
			if (this.session.playing) {
				this.input.update(STEP);
				this.enemies.update(STEP, settings.reducedMotion);
				const state = this.session.state;
				this.waterJet.update(
					STEP,
					this.input.aim,
					jetProfile(state.pressure, state.drink?.kind ?? null)
				);
				const flow = this.waterJet.resolve(
					this.physics.loop(STEP),
					(target) => target.kind === 'enemy' && this.enemies.hit(target.id)
				);
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
		this.waterJet.syncInstances();
		this.reticle.position.copy(this.input.aim);
		this.reticle.quaternion.copy(this.camera.quaternion);
	}
	reset() {
		this.waterJet.reset();
		this.enemies.reset();
		this.accumulator = 0;
		this.reticle.visible = false;
	}
	dispose() {
		this.reset();
		this.waterJet.dispose();
		this.scene.remove(this.reticle);
		this.reticle.geometry.dispose();
		this.reticle.material.dispose();
	}
}
