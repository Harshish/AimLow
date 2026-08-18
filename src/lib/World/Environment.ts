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
	cubeMesh2!: THREE.Mesh;
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

		this.cubeMesh.position.set(0, 10, 0);
		this.cubeMesh.rotation.set(1, 0, 1);
		//this.scene.add(this.cubeMesh);

		//mesh 2

		const material2 = new THREE.MeshStandardMaterial({ color: 'green' });
		this.cubeMesh2 = new THREE.Mesh(geometry, material2);

		this.cubeMesh2.position.set(0, 15, 0);
		this.cubeMesh2.rotation.set(2, 0, 2);
		this.cubeMesh2.scale.set(2, 2, 2);
		//this.scene.add(this.cubeMesh2);

		const group = new THREE.Group();
		group.add(this.cubeMesh, this.cubeMesh2);
		group.position.set(0, 10, 0);
		group.rotation.x = 0.5;
		this.scene.add(group);

		this.physics.add(this.cubeMesh);
		this.physics.add(this.cubeMesh2);
	}
}
