import * as THREE from 'three';

import App from '../App';

// Used for addding Lights to our scene
export default class Environment {
	app: App;
	scene: THREE.Scene;
	directionalLight!: THREE.DirectionalLight;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;

		this.loadEnvironment();
	}

	loadEnvironment() {
		// lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		this.directionalLight.position.set(1, 1, 1);
		this.directionalLight.castShadow = true;
		this.scene.add(this.directionalLight);
	}
}
