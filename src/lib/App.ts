import * as THREE from 'three/webgpu';
import Camera from './Camera';
import Renderer from './Renderer';
import Loop from './Utils/Loop';
import World from './World/World';
import Physics from './World/Physics';
import Resize from './Utils/Resize';
import AssetLoader from './Utils/AssetLoader';
import InputController from './UI/InputController';
import { gameStateStore } from './Utils/Store';

/** Composition root: dependencies flow down, never back to App. */
export default class App {
	readonly scene = new THREE.Scene();
	readonly camera: Camera;
	readonly renderer: Renderer;
	private readonly assetLoader = new AssetLoader();
	private readonly inputController = new InputController();
	private readonly resize: Resize;
	private readonly loop: Loop;
	private physics?: Physics;
	private world?: World;
	private initialization?: Promise<void>;
	private disposed = false;

	constructor(canvas: HTMLCanvasElement) {
		gameStateStore.set({ score: 0 });
		this.camera = new Camera(canvas);
		this.renderer = new Renderer(canvas, this.scene, this.camera.instance);
		this.resize = new Resize((width, height, pixelRatio) => {
			this.camera.resize(width, height);
			this.renderer.resize(width, height, pixelRatio);
		});
		this.loop = new Loop((deltaTime) => {
			this.world?.loop(deltaTime);
			this.camera.loop();
			this.renderer.loop();
		});
	}

	init(onProgress: (progress: number) => void = () => {}): Promise<void> {
		return (this.initialization ??= this.initialize(onProgress));
	}

	private async initialize(onProgress: (progress: number) => void) {
		if (this.disposed) return;
		try {
			const [assets, physics] = await Promise.all([
				this.assetLoader.load(onProgress),
				Physics.create().then((physics) => {
					if (this.disposed) physics.dispose();
					else this.physics = physics;
					return physics;
				}),
				this.renderer.init()
			]);
			if (this.disposed) return;
			this.world = new World(this.scene, physics, assets);
			this.loop.start();
		} catch (error) {
			// Unmounting during startup is cancellation, not a loading failure.
			if (this.disposed) return;
			this.dispose();
			throw error;
		}
	}

	start() {
		if (this.world && !this.disposed) this.world.started = true;
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.loop.dispose();
		this.resize.dispose();
		this.inputController.dispose();
		this.world?.dispose();
		this.physics?.dispose();
		this.camera.dispose();
		this.renderer.dispose();
		// Dispose loaded and generated resources together to deduplicate shared assets.
		this.assetLoader.dispose(this.scene);
		this.scene.clear();
	}
}
