import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import App from '../App';
import { appStateStore } from '$lib/Utils/Store';

export default class RapierDebugger {
	app: App;
	world!: RAPIER.World;
	mesh: THREE.LineSegments;

	constructor() {
		this.app = new App();

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.world = this.app.world.physics.world;
			}
		});
		this.mesh = new THREE.LineSegments(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ color: 0xffffff, vertexColors: true })
		);
		this.mesh.frustumCulled = false;
		this.app.scene.add(this.mesh);
	}

	loop() {
		if (!this.world) return;
		const { vertices, colors } = this.world.debugRender();
		this.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
		this.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
		this.mesh.visible = true;
	}
}
