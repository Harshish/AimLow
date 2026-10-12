import * as THREE from 'three/webgpu';
import { renderOutput, screenUV, toonOutlinePass, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export default class Renderer {
	readonly instance: THREE.WebGPURenderer;
	private readonly pipeline: THREE.RenderPipeline;
	private readonly scenePass: ReturnType<typeof toonOutlinePass>;
	private readonly effects: { dispose(): void }[];
	private environment?: THREE.Texture;
	private ready = false;
	private disposed = false;
	private settled = false;
	private initialization?: Promise<void>;

	constructor(
		canvas: HTMLCanvasElement,
		private readonly scene: THREE.Scene,
		camera: THREE.PerspectiveCamera
	) {
		this.instance = new THREE.WebGPURenderer({ canvas, antialias: false });
		// Neutral keeps comic colors saturated and whites white; ACES washed them out.
		this.instance.toneMapping = THREE.NeutralToneMapping;
		this.instance.toneMappingExposure = 1;
		this.instance.setClearColor(0x121a26);
		this.instance.shadowMap.enabled = true;
		// Crisp shadow edges read as ink, not soft studio light.
		this.instance.shadowMap.type = THREE.PCFShadowMap;
		this.pipeline = new THREE.RenderPipeline(this.instance);
		// Tone mapping happens in the graph so FXAA can run on display colors last.
		this.pipeline.outputColorTransform = false;
		// Toon materials get an inked back-face hull; thickness is in clip space, so it holds at any size.
		this.scenePass = toonOutlinePass(scene, camera, new THREE.Color(0x0b0d14), 0.004);
		const color = this.scenePass.getTextureNode('output');
		// High threshold: only the ring, drinks and sparks glow; lit porcelain stays crisp.
		const glow = bloom(color, 0.05, 0.3, 0.95);
		// Darkened corners pull the eye toward the bowl and the lanes.
		const vignette = screenUV.sub(0.5).length().mul(0.95).pow(2).oneMinus();
		const smooth = fxaa(renderOutput(vec4(color.add(glow).rgb.mul(vignette), 1)));
		this.effects = [glow, smooth];
		this.pipeline.outputNode = smooth;
	}

	init(): Promise<void> {
		return (this.initialization ??= this.initialize());
	}

	private async initialize() {
		try {
			await this.instance.init();
			if (!this.disposed) {
				// Soft studio reflections give the wet floor and bug shells a sheen.
				const pmrem = new THREE.PMREMGenerator(this.instance);
				const room = new RoomEnvironment();
				this.environment = pmrem.fromScene(room, 0.04).texture;
				room.dispose();
				pmrem.dispose();
				this.scene.environment = this.environment;
				this.scene.environmentIntensity = 0.15;
			}
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
