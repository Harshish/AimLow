import * as THREE from 'three/webgpu';
import { assetStore } from '$lib/Utils/AssetStore';
import { get } from 'svelte/store';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Physics from '$lib/World/Physics';
import App from '$lib/App';

export class Wasp {
	app: App;
	physics!: Physics;
	alive = true;
	scene!: THREE.Scene;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;
		this.physics = this.app?.world?.physics;
		this.init();
	}

	init() {
		const gltfAsset = get(assetStore).loadedAssets['wasp'] as GLTF;
		const wasp = gltfAsset.scene;
		// wasp.scale.set(12, 12, 12);
		wasp.position.set(5, 7, 5);
		wasp.rotation.y = -Math.PI / 2;
		wasp.userData.name = 'wasp';
		wasp.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				child.userData.name = 'wasp';
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
		this.physics.add(wasp, 'kinematicPosition', 'ball', true, 0.8, new THREE.Vector3(0.8, 2.5, 0));
		this.scene.add(wasp);
	}
}
