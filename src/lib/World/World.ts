import * as THREE from 'three';
import App from '../App';
import Physics from './Physics';
import Environment from './Environment';
import { appStateStore } from '$lib/Utils/Store';
import { appStatusStore } from '../Utils/Store';

export default class World {
	app: App;
	scene: THREE.Scene;
	physics: Physics;
	environment!: Environment;
	appStarted: boolean = false;
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

		this.loop();
	}

	loop() {
		if (!this.appStarted) return;
		this.physics.loop();
	}
}
