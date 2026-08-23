import * as THREE from 'three';
import App from '../App';
import Physics from './Physics';
import Environment from './Environment';
import { appStateStore } from '$lib/Utils/Store';
import { appStatusStore } from '../Utils/Store';
import Character from './Character';

export default class World {
	app: App;
	scene: THREE.Scene;
	physics: Physics;
	environment!: Environment;
	character!: Character;
	appStarted: boolean = false;
	constructor() {
		console.log('World Init');
		this.app = new App();
		this.scene = this.app.scene;

		this.physics = new Physics();

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.environment = new Environment();
				this.character = new Character();
			}
		});

		appStatusStore.subscribe((state) => {
			this.appStarted = state.started;
		});

		this.loop(0, 0);
	}

	loop(deltaTime: number, elapsedTime: number) {
		if (!this.appStarted) return;
		this.physics.loop();
		if (this.character) this.character.loop(deltaTime);
	}
}
