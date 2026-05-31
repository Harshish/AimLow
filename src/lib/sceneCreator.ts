import * as THREE from 'three';

export class SceneBuilder {
	container!: HTMLElement;
	scene!: THREE.Scene;
	camera!: THREE.PerspectiveCamera;
	renderer!: THREE.WebGLRenderer;

	constructor(container: HTMLElement) {
		this.container = container;
		this.setupScene();
		this.setupCamera();
		this.setupRenderer();
		this.onWindowResize = this.onWindowResize.bind(this);
		window.addEventListener('resize', this.onWindowResize);
		this.container.appendChild(this.renderer.domElement);
	}

	setupScene() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xa0a0a0);
		this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);
		//this.scene.fog = new THREE.FogExp2(0x000000, 0.02);
	}

	setupCamera() {
		const width = window.innerWidth;
		const height = window.innerHeight;

		this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		this.camera.position.z = 10;
		this.camera.position.y = 0;
	}

	setupRenderer() {
		const width = window.innerWidth;
		const height = window.innerHeight;
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(width, height);
	}

	onWindowResize() {
		const width = window.innerWidth;
		const height = window.innerHeight;
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	debugMode() {
		// this.scene.background = new THREE.Color(0x222222);

		// Grid on XZ plane (most common)
		const grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
		this.scene.add(grid);

		// Axes with labels
		const axes = new THREE.AxesHelper(5);
		this.scene.add(axes);

		// Optional: Add text labels (requires CSS2D or Sprite)
		console.log('✅ AxesHelper: Red = +X | Green = +Y | Blue = +Z');
	}

	cleanup() {
		window.removeEventListener('resize', this.onWindowResize);
		this.renderer?.dispose();
		if (this.container && this.renderer?.domElement) {
			this.container.removeChild(this.renderer.domElement);
		}
	}
}
