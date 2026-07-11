import * as THREE from 'three';
import App from '../App';
import Physics from './Physics';
import Environment from './Environment';

export default class World {
	app: App;
	scene: THREE.Scene;
	physics: Physics;
	environment: Environment;
	constructor() {
		console.log('World Init');
		this.app = new App();
		this.scene = this.app.scene;

		this.physics = new Physics();
		this.environment = new Environment();

		this.loop();
	}

	loop() {
		this.physics.loop();
	}
}
