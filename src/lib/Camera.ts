import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import App from './App';
import { sizesStore } from './Utils/Store';
import { get } from 'svelte/store';

export default class Camera {
	app!: App;
	canvas!: HTMLCanvasElement;
	instance!: THREE.PerspectiveCamera;
	controls!: OrbitControls;
	constructor() {
		console.log('Camera Init');
		this.app = new App();
		this.canvas = this.app.canvas;
		this.setInstance();
		this.setControls();
		this.setResizeListner();
	}

	setInstance() {
		console.log('Camera setInstance Called');

		this.instance = new THREE.PerspectiveCamera(
			35,
			get(sizesStore).width / get(sizesStore).height,
			0.1,
			200
		);

		this.instance.position.z = 60;
		this.instance.position.y = 20;
	}

	setResizeListner() {
		sizesStore.subscribe((sizes) => {
			this.instance.aspect = sizes.width / sizes.height;
			this.instance.updateProjectionMatrix();
		});
	}

	setControls() {
		// instantiate the controls
		this.controls = new OrbitControls(this.instance, this.canvas);
		this.controls.enableDamping = true;
	}

	// This will be called in the renderer loop class
	loop() {
		this.controls.update();
		// console.log("Camera loop called");
	}
}
