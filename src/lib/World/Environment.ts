import * as THREE from 'three';

import App from '../App';
import Physics from './Physics';
import { assetStore } from '$lib/Utils/AssetStore';
import { get } from 'svelte/store';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
	}

	addLights() {
		// 1. Ambient Light - Soft base color (slightly warm)
		const ambient = new THREE.AmbientLight(0xfff0e0, 0.8);
		this.scene.add(ambient);

		// 2. Hemisphere Light - Creates nice sky/ground gradient (very useful for games)
		const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x668833, 0.8);
		hemiLight.position.set(0, 20, 0);
		this.scene.add(hemiLight);

		// 3. Main Directional Light (Sun-like)
		const sunLight = new THREE.DirectionalLight(0xffeecc, 2);
		sunLight.position.set(8, 15, 19);
		this.scene.add(sunLight);

		// 4. Colored Accent Lights (makes scene feel alive and encouraging)
		const accent1 = new THREE.DirectionalLight(0x66aaff, 0.8); // Cool blue
		accent1.position.set(-12, 8, -8);
		this.scene.add(accent1);

		const accent2 = new THREE.DirectionalLight(0xff88aa, 0.7); // Warm pink/magenta
		accent2.position.set(10, 6, -12);
		this.scene.add(accent2);

		// Optional: Point light for extra glow
		const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
		pointLight.position.set(0, 8, 10);
		this.scene.add(pointLight);
	}

	addUrinal() {
		const gltfAsset = get(assetStore).loadedAssets['urinal'] as GLTF;
		const urinal = gltfAsset.scene;
		urinal.scale.set(12, 12, 12);
		urinal.position.set(0, -3, 2);
		urinal.rotation.y = 2 * Math.PI;
		urinal.userData.name = 'urinal';
		urinal.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				this.physics.add(child as THREE.Mesh, 'fixed', 'trimesh', true);
				child.userData.name = 'urinal';
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
		this.scene.add(urinal);
	}

	loadEnvironment() {
		if (!this.scene) return;
		this.addLights();
		this.addUrinal();
	}

	addGround() {
		this.groundMesh = new THREE.Mesh(
			new THREE.CircleGeometry(30, 32),
			new THREE.MeshPhongMaterial({
				color: 0x222222,
				emissive: 0x072534,
				side: THREE.DoubleSide,
				flatShading: true
			})
		);
		this.groundMesh.position.set(0, 0, 0);
		this.groundMesh.rotation.x = -Math.PI / 2;
		this.groundMesh.receiveShadow = true;
		this.groundMesh.userData = { name: 'ground' };
		this.scene.add(this.groundMesh);
		this.physics.add(this.groundMesh, 'fixed', 'cuboid', true);
	}
}
