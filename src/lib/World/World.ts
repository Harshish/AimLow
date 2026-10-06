import * as THREE from 'three/webgpu';
import type Physics from './Physics';
import Environment from './Environment';
import type { LoadedAssets } from '../Utils/Assets';
import { WaterJet } from './Elements/WaterJet';

export default class World {
	started = false;
	private readonly waterJet: WaterJet;

	constructor(
		scene: THREE.Scene,
		private readonly physics: Physics,
		assets: LoadedAssets
	) {
		new Environment(scene, physics, assets);
		this.waterJet = new WaterJet(scene, physics, new THREE.Vector3(0, 10, 17));
	}

	private step = (timestep: number) => {
		this.waterJet.update(timestep);
		this.physics.loop(timestep);
	};

	loop(deltaTime: number) {
		if (!this.started) return;
		// One Rapier step per rendered frame. Loop bounds stalls without fixing the rate.
		if (Number.isFinite(deltaTime) && deltaTime > 0) this.step(deltaTime);
		// Upload once per render, after the simulation step.
		this.waterJet.syncInstances();
	}

	dispose() {
		this.waterJet.dispose();
	}
}
