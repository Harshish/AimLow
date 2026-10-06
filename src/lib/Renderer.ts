import * as THREE from 'three/webgpu';

export default class Renderer {
	readonly instance: THREE.WebGPURenderer;
	private ready = false;
	private disposed = false;
	private settled = false;
	private initialization?: Promise<void>;

	constructor(
		canvas: HTMLCanvasElement,
		private readonly scene: THREE.Scene,
		private readonly camera: THREE.PerspectiveCamera
	) {
		this.instance = new THREE.WebGPURenderer({ canvas, antialias: true });
		this.instance.shadowMap.enabled = true;
		this.instance.shadowMap.type = THREE.VSMShadowMap;
		this.instance.setClearColor(0x000000);
	}

	init(): Promise<void> {
		return (this.initialization ??= this.initialize());
	}

	private async initialize() {
		try {
			await this.instance.init();
			this.ready = true;
		} finally {
			this.settled = true;
			// WebGPU initialization cannot be cancelled. Release it after it settles.
			if (this.disposed) this.instance.dispose();
		}
	}

	resize(width: number, height: number, pixelRatio: number) {
		this.instance.setPixelRatio(pixelRatio);
		this.instance.setSize(width, height);
	}

	loop() {
		if (this.ready && !this.disposed) this.instance.render(this.scene, this.camera);
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		if (this.settled || !this.initialization) this.instance.dispose();
	}
}
