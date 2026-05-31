import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function getOrbitControls(camera: THREE.Camera, renderedCanvas: HTMLCanvasElement) {
	const controls = new OrbitControls(camera, renderedCanvas);
	controls.enableDamping = true; // smooth movement
	controls.dampingFactor = 0.05;
	controls.enableZoom = true;
	controls.enablePan = true; // ← This enables panning
	controls.panSpeed = 1.0;

	// Optional: Limit vertical rotation
	controls.minPolarAngle = 0;
	controls.maxPolarAngle = Math.PI;
	return controls;
}
