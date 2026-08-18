import * as THREE from 'three';

import App from '../App';
import Physics from './Physics';

// Used for addding Lights to our scene
export default class Environment {
	app: App;
	scene!: THREE.Scene;
	directionalLight!: THREE.DirectionalLight;
	physics!: Physics;
	cubeMesh!: THREE.Mesh;
	constructor() {
		this.app = new App();
		this.scene = this.app?.scene;
		this.physics = this.app?.world?.physics;

		this.loadEnvironment();
		this.addMeshes();
	}

	loadEnvironment() {
		if (!this.scene) return;
		// lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(ambientLight);

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		this.directionalLight.position.set(1, 1, 1);
		this.directionalLight.castShadow = true;
		this.scene.add(this.directionalLight);
	}

	addMeshes() {
		// Create ThreeJS Mesh
		const geometry = new THREE.BoxGeometry(2, 2, 2);
		const material = new THREE.MeshStandardMaterial({ color: 'orange' });
		this.cubeMesh = new THREE.Mesh(geometry, material);

		this.cubeMesh.position.set(1, 40, 1);
		this.cubeMesh.castShadow = true;
		this.cubeMesh.rotation.set(0, 0, Math.PI / 4);
		this.scene.add(this.cubeMesh);

		this.physics.add(this.cubeMesh);
	}
}
