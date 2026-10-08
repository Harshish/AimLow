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
import Session from './Game/Session';
import Audio from './Game/Audio';
import { DEFAULT_SETTINGS, type Settings } from './Game/config';

/** Composition root. Simulation owns rules; Svelte receives snapshots, never engine services. */
export default class App {
	readonly scene = new THREE.Scene();
	readonly camera = new Camera();
	readonly session = new Session();
	readonly renderer: Renderer;
	private settings = { ...DEFAULT_SETTINGS };
	private readonly audio = new Audio(this.settings);
	private readonly assetLoader = new AssetLoader();
	private readonly input: InputController;
	private readonly resize: Resize;
	private readonly loop: Loop;
	private physics?: Physics;
	private world?: World;
	private initialization?: Promise<void>;
	private disposed = false;
	private lastNotice = 0;
	private lastKills = 0;
	private lastMissed = 0;
	private publishedAt = 0;
	private lastPhase = this.session.state.phase;

	constructor(canvas: HTMLCanvasElement) {
		this.publish();
		this.renderer = new Renderer(canvas, this.scene, this.camera.instance);
		this.input = new InputController(
			canvas,
			this.camera.instance,
			() => this.session.playing,
			() => this.togglePause(),
			() => this.pause()
		);
		this.resize = new Resize((width, height, pixelRatio) => {
			this.camera.resize(width, height);
			this.renderer.resize(
				width,
				height,
				Math.min(pixelRatio, this.settings.quality === 'low' ? 1 : 1.5)
			);
		});
		this.loop = new Loop((dt) => {
			this.world?.loop(dt, this.settings);
			const { phase, notice } = this.session.state;
			if (notice && notice.id !== this.lastNotice) {
				this.lastNotice = notice.id;
				this.audio.cue(notice.tone);
				if (notice.tone === 'drink') this.haptic([15, 30, 15, 30, 40]);
			}
			this.feedback();
			this.camera.update(dt, !this.settings.reducedMotion);
			if (phase !== this.lastPhase) {
				if (phase === 'playing' && this.lastPhase === 'countdown') this.audio.cue('start');
				if (phase === 'gameover') this.audio.cue('end');
				this.publish();
				this.lastPhase = phase;
			}
			this.audio.update(phase, this.session.state.pressure > 0);
			this.publishedAt += dt;
			// Only the HUD needs a steady feed; other screens change on phase transitions.
			if ((phase === 'playing' || phase === 'countdown') && this.publishedAt >= 1 / 30) {
				this.publish();
				this.publishedAt = 0;
			}
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
			this.world = new World(
				this.scene,
				physics,
				assets,
				this.session,
				this.input,
				this.camera.instance
			);
			const { haze, hero } = this.world.environment;
			this.renderer.setHaze(haze.material, hero);
			this.prewarm();
			// Starts suspended (no gesture yet); the play click resumes it without a stall.
			this.audio.prepare();
			this.loop.start();
		} catch (error) {
			if (!this.disposed) {
				this.dispose();
				throw error;
			}
		}
	}
	start() {
		if (!this.world || this.disposed) return;
		this.audio.unlock();
		this.world.reset();
		this.input.reset();
		this.session.start();
		this.publish();
	}
	pause() {
		this.session.pause();
		this.publish();
	}
	resume() {
		this.audio.unlock();
		this.session.resume();
		this.publish();
	}
	togglePause() {
		if (this.session.state.phase === 'paused') this.resume();
		else this.pause();
	}
	menu() {
		this.world?.reset();
		this.session.menu();
		this.publish();
	}
	setSettings(settings: Settings) {
		const qualityChanged = settings.quality !== this.settings.quality;
		this.settings = { ...settings };
		this.audio.settings = this.settings;
		this.input.sensitivity = settings.sensitivity;
		this.renderer.setQuality(settings.quality);
		// Only quality changes the pixel ratio; toggles and sliders must not reallocate GPU targets.
		if (qualityChanged) {
			this.resize.update();
			// Quality toggles the hero shadow, which changes every lit shader: rebuild them now.
			this.prewarm();
		}
	}
	private prewarm() {
		this.world?.prewarm(() => this.renderer.loop());
	}
	/** Kill and escape impacts: screen shake, a wet splat, and a buzz on phones. */
	private feedback() {
		const { kills, missed } = this.session.state;
		if (kills > this.lastKills) {
			this.camera.shake(0.28);
			this.audio.splat();
			this.haptic(14);
		}
		if (missed > this.lastMissed) {
			this.camera.shake(0.55);
			this.haptic([35, 40, 35]);
		}
		this.lastKills = kills;
		this.lastMissed = missed;
	}
	private haptic(pattern: number | number[]) {
		// Unsupported browsers (including iOS Safari) simply have no vibrate().
		if (this.settings.haptics) navigator.vibrate?.(pattern);
	}
	private publish() {
		gameStateStore.set(this.session.snapshot());
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.loop.dispose();
		this.resize.dispose();
		this.input.dispose();
		this.audio.dispose();
		this.world?.dispose();
		this.physics?.dispose();
		this.renderer.dispose();
		this.assetLoader.dispose(this.scene);
		this.scene.clear();
	}
}
