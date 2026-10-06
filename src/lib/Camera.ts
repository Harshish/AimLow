import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default class Camera {
	readonly instance = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
	readonly controls: OrbitControls;

	constructor(canvas: HTMLCanvasElement) {
		this.instance.position.set(0, 21, 17);
		this.controls = new OrbitControls(this.instance, canvas);
		this.controls.enableDamping = true;
	}

	resize(width: number, height: number) {
		this.instance.aspect = width / height;
		this.instance.updateProjectionMatrix();
	}

	loop() {
		this.controls.update();
	}

	dispose() {
		this.controls.dispose();
	}
}
