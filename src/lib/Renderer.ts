import * as THREE from 'three/webgpu';
import { pass, renderOutput, screenUV, uniform, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HAZE_LAYER } from './World/Environment';

export default class Renderer {
	readonly instance: THREE.WebGPURenderer;
	private readonly pipeline: THREE.RenderPipeline;
	private readonly scenePass: ReturnType<typeof pass>;
	private haze?: { material: THREE.VolumeNodeMaterial; light: THREE.SpotLight };
	private high = true;
	private effects: { dispose(): void }[] = [];
	private environment?: THREE.Texture;
	private ready = false;
	private disposed = false;
	private settled = false;
	private initialization?: Promise<void>;

	constructor(
		canvas: HTMLCanvasElement,
		private readonly scene: THREE.Scene,
		private readonly camera: THREE.PerspectiveCamera
	) {
		this.instance = new THREE.WebGPURenderer({ canvas, antialias: false });
		this.instance.toneMapping = THREE.ACESFilmicToneMapping;
		this.instance.toneMappingExposure = 0.7;
		this.instance.setClearColor(0x121a26);
		this.instance.shadowMap.enabled = true;
		this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
		this.pipeline = new THREE.RenderPipeline(this.instance);
		// Tone mapping happens in the graph so FXAA can run on display colors last.
		this.pipeline.outputColorTransform = false;
		// Single-sample on purpose: WebGPU cannot sample an MSAA depth texture for the haze.
		this.scenePass = pass(scene, camera);
		this.compose();
	}

	init(): Promise<void> {
		return (this.initialization ??= this.initialize());
	}

	private async initialize() {
		try {
			await this.instance.init();
			if (!this.disposed) {
				// Soft studio reflections make the porcelain read as glossy, not flat white.
				const pmrem = new THREE.PMREMGenerator(this.instance);
				const room = new RoomEnvironment();
				this.environment = pmrem.fromScene(room, 0.04).texture;
				room.dispose();
				pmrem.dispose();
				this.scene.environment = this.environment;
				this.scene.environmentIntensity = 0.35;
			}
			this.ready = true;
		} finally {
			this.settled = true;
			// WebGPU initialization cannot be cancelled. Release it after it settles.
			if (this.disposed) this.instance.dispose();
		}
	}

	/** Enables god rays through `material` from `light` when quality allows. */
	setHaze(material: THREE.VolumeNodeMaterial, light: THREE.SpotLight) {
		this.haze = { material, light };
		this.compose();
	}

	setQuality(quality: 'low' | 'high') {
		if (this.high === (quality === 'high')) return;
		this.high = quality === 'high';
		this.compose();
	}

	private compose() {
		for (const effect of this.effects) effect.dispose();
		const color = this.scenePass.getTextureNode('output');
		const glow = bloom(color, 0.05, 0.35, 0.62);
		this.effects = [glow];
		let output = color.add(glow);
		if (this.haze) this.haze.light.castShadow = this.high;
		if (this.haze && this.high) {
			const layers = new THREE.Layers();
			layers.set(HAZE_LAYER);
			const volume = pass(this.scene, this.camera, { depthBuffer: false });
			volume.setLayers(layers);
			volume.setResolutionScale(0.1);
			// Occlude the beam behind porcelain and bugs using the main pass depth.
			this.haze.material.depthNode = this.scenePass.getTextureNode('depth').sample(screenUV);
			this.haze.material.needsUpdate = true;
			const rays = gaussianBlur(volume, uniform(0.2));
			this.effects.push(volume, rays);
			output = output.add(rays.mul(0.15));
		}
		// Darkened corners pull the eye toward the bowl and the lanes.
		const vignette = screenUV.sub(0.5).length().mul(0.95).pow(2).oneMinus();
		const smooth = fxaa(renderOutput(vec4(output.rgb.mul(vignette), 1)));
		this.effects.push(smooth);
		this.pipeline.outputNode = smooth;
		this.pipeline.needsUpdate = true;
	}

	resize(width: number, height: number, pixelRatio: number) {
		this.instance.setPixelRatio(pixelRatio);
		this.instance.setSize(width, height);
	}

	loop() {
		if (this.ready && !this.disposed) this.pipeline.render();
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const effect of this.effects) effect.dispose();
		this.scenePass.dispose();
		this.pipeline.dispose();
		this.environment?.dispose();
		if (this.settled || !this.initialization) this.instance.dispose();
	}
}
