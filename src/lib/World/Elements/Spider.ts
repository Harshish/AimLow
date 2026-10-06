import * as THREE from 'three/webgpu';

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type Physics from '$lib/World/Physics';

export class Spider {
	alive = true;
	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		gltfAsset: GLTF
	) {
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
