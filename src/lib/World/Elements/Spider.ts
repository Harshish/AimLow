import * as THREE from 'three/webgpu';
import { assetStore } from '$lib/Utils/AssetStore';
import { appStateStore } from '$lib/Utils/Store';
import { get } from 'svelte/store';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Physics from '$lib/World/Physics';
import App from '$lib/App';

export class Spider {
	app: App;
	physics!: Physics;
	alive = true;
	scene!: THREE.Scene;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.physics = this.app?.world?.physics;
			}
		});

		assetStore.subscribe((state) => {
			if (state.ready) {
				this.init();
			}
		});
	}

	init() {
		const gltfAsset = get(assetStore).loadedAssets['spider'] as GLTF;
		const spider = gltfAsset.scene;
		spider.position.set(7, 3, 5);
		spider.scale.set(0.1, 0.1, 0.1);
		//spider.rotation.y = -Math.PI / 2;
		spider.userData.name = 'spider';
		spider.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				child.userData.name = 'spider';
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
		this.physics.add(spider, 'kinematicPosition', 'ball', false, 0.8, new THREE.Vector3(0, 0.2, 0));
		this.scene.add(spider);
	}
}
