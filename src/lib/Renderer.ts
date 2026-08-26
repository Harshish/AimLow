import * as THREE from 'three';
import App from './App';
import Camera from './Camera';
import { sizesStore } from './Utils/Store';
import { get } from 'svelte/store';

export default class Renderer {
	app: App;
	canvas!: HTMLCanvasElement;
	scene!: THREE.Scene;
	instance!: THREE.WebGLRenderer;
	camera!: Camera;
	constructor() {
		console.log('Renderer Init');
		this.app = new App();
		this.canvas = this.app.canvas;
		this.camera = this.app.camera;
		this.scene = this.app.scene;
		this.setInstance();
		this.setResizeListner();
	}

	setInstance() {
		console.log('Renderer setInstance Called');

		this.instance = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true
		});
		this.instance.shadowMap.enabled = true;
		this.instance.shadowMap.type = THREE.VSMShadowMap;
		this.instance.setSize(get(sizesStore).width, get(sizesStore).height);
		this.instance.setPixelRatio(Math.min(get(sizesStore).pixelRatio, 2));
	}

	setResizeListner() {
		sizesStore.subscribe((sizes) => {
			this.instance.setSize(sizes.width, sizes.height);
			this.instance.setPixelRatio(sizes.pixelRatio);
		});
	}

	// This will be called in the renderer loop class
	loop() {
		this.instance.render(this.scene, this.camera.instance);
	}
}
