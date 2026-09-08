import * as THREE from 'three/webgpu';
import * as RAPIER from '@dimforge/rapier3d-compat';
import App from '../App';
import { appStateStore } from '$lib/Utils/Store';

export default class RapierDebugger {
	app: App;
	world!: RAPIER.World;
	mesh: THREE.LineSegments;

	// Pre-allocated attributes and tracking capacity
	private positionAttribute: THREE.BufferAttribute;
	private colorAttribute: THREE.BufferAttribute;
	private maxCapacity: number = 0;

	constructor(initialCapacity = 10000) {
		this.app = new App();

		const geometry = new THREE.BufferGeometry();

		// Initialize buffers with an estimated maximum capacity
		this.positionAttribute = new THREE.BufferAttribute(new Float32Array(initialCapacity * 3), 3);
		this.colorAttribute = new THREE.BufferAttribute(new Float32Array(initialCapacity * 4), 4);

		// Set usage to DynamicDraw so Three.js optimizes updates for WebGPU/WebGL
		this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
		this.colorAttribute.setUsage(THREE.DynamicDrawUsage);

		geometry.setAttribute('position', this.positionAttribute);
		geometry.setAttribute('color', this.colorAttribute);

		this.mesh = new THREE.LineSegments(
			geometry,
			new THREE.LineBasicNodeMaterial({ vertexColors: true })
		);
		this.mesh.frustumCulled = false;
		this.mesh.visible = false;

		this.app.scene.add(this.mesh);

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.world = this.app.world.physics.world;
			}
		});
	}

	loop() {
		if (!this.world) return;

		const { vertices, colors } = this.world.debugRender();
		const pointCount = vertices.length / 3;

		// Resize pre-allocated buffers if physics world exceeds current capacity
		if (vertices.length > this.positionAttribute.array.length) {
			this.maxCapacity = vertices.length * 1.5; // Grow buffer with headroom

			this.positionAttribute = new THREE.BufferAttribute(new Float32Array(this.maxCapacity), 3);
			this.colorAttribute = new THREE.BufferAttribute(
				new Float32Array(this.maxCapacity * (4 / 3)),
				4
			);

			this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
			this.colorAttribute.setUsage(THREE.DynamicDrawUsage);

			this.mesh.geometry.setAttribute('position', this.positionAttribute);
			this.mesh.geometry.setAttribute('color', this.colorAttribute);
		}

		// Update existing array buffers in place (Zero allocation)
		this.positionAttribute.array.set(vertices);
		this.colorAttribute.array.set(colors);

		// Limit rendered element count to current active debug lines
		this.mesh.geometry.setDrawRange(0, pointCount);

		// Signal to GPU to re-upload buffer content
		this.positionAttribute.needsUpdate = true;
		this.colorAttribute.needsUpdate = true;

		this.mesh.visible = pointCount > 0;
	}

	// Clean up resources when debugger is destroyed
	destroy() {
		this.mesh.geometry.dispose();
		(this.mesh.material as THREE.Material).dispose();
		this.app.scene.remove(this.mesh);
	}
}
