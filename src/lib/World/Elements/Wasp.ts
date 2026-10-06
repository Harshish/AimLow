import * as THREE from 'three/webgpu';

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Physics from '$lib/World/Physics';

export class Wasp {
	alive = true;
	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		gltfAsset: GLTF
	) {
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
