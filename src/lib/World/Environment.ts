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
	groundMesh!: THREE.Mesh;
	constructor() {
		this.app = new App();
		this.scene = this.app?.scene;
		this.physics = this.app?.world?.physics;

		this.loadEnvironment();
		this.addGround();
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

	addGround() {
		const groundGeometry = new THREE.BoxGeometry(50, 1, 50);
		const groundMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
		this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
		this.scene.add(this.groundMesh);
		this.physics.add(this.groundMesh, 'fixed', 'cuboid');
	}

	addMeshes() {
		// Create ThreeJS Mesh
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshStandardMaterial({ color: 'blue' });

		for (let i = 0; i < 100; i++) {
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(Math.random() * 10, Math.random() + 50, Math.random() * 10);
			mesh.scale.set(Math.random() + 0.5, Math.random() + 0.5, Math.random() + 0.5);
			mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
			this.scene.add(mesh);
			this.physics.add(mesh, 'dynamic', 'trimesh');
		}
	}
}
