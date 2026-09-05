import * as THREE from 'three/webgpu';
import App from '../App';
import Physics from './Physics';
import Environment from './Environment';
import { appStateStore } from '$lib/Utils/Store';
import { appStatusStore } from '../Utils/Store';
import { WaterJet } from '$lib/World/Elements/WaterJet';

export default class World {
	app: App;
	scene: THREE.Scene;
	physics: Physics;
	environment!: Environment;
	appStarted: boolean = false;
	waterJet: WaterJet;
	constructor() {
		console.log('World Init');
		this.app = new App();
		this.scene = this.app.scene;

		this.physics = new Physics();

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.environment = new Environment();
			}
		});

		appStatusStore.subscribe((state) => {
			this.appStarted = state.started;
		});

		const hosePos = new THREE.Vector3(0, 4, 12);
		this.waterJet = new WaterJet(hosePos);

		this.loop(0, 0);
	}

	loop(deltaTime: number, elapsedTime: number) {
		if (!this.appStarted) return;
		this.waterJet.loop(deltaTime);
		this.physics.loop(deltaTime);
	}
}
