import * as THREE from 'three/webgpu';
import App from './App';
import Camera from './Camera';
import { sizesStore } from './Utils/Store';
import { get } from 'svelte/store';

export default class Renderer {
	app: App;
	canvas!: HTMLCanvasElement;
	scene!: THREE.Scene;
	instance!: THREE.WebGPURenderer;
	camera!: Camera;
	ready = false;
	constructor() {
		console.log('Renderer Init');
		this.app = new App();
		this.canvas = this.app.canvas;
		this.camera = this.app.camera;
		this.scene = this.app.scene;
		this.setInstance().then(() => {
			this.ready = true;
		});
		this.setResizeListner();
	}

	async setInstance() {
		if (typeof window === 'undefined') return;
		console.log('Renderer setInstance Called');

		const { Inspector } = await import('three/addons/inspector/Inspector.js');

		this.instance = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true
		});

		this.instance.setSize(get(sizesStore).width, get(sizesStore).height);
		this.instance.inspector = new Inspector();
		document.body.appendChild(this.instance.domElement);
		await this.instance.init();

		this.instance.shadowMap.enabled = true;
		this.instance.shadowMap.type = THREE.VSMShadowMap;
		this.instance.setClearColor(0x000000);
		this.instance.setPixelRatio(Math.min(get(sizesStore).pixelRatio, 2));
	}

	setResizeListner() {
		if (!this.ready) return;
		sizesStore.subscribe((sizes) => {
			this.instance.setSize(sizes.width, sizes.height);
			this.instance.setPixelRatio(sizes.pixelRatio);
		});
	}

	// This will be called in the renderer loop class
	loop() {
		if (!this.ready) return;
		this.instance.render(this.scene, this.camera.instance);
	}
}
