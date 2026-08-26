import * as THREE from 'three';
import Camera from './Camera';
import Renderer from './Renderer';
import Loop from './Utils/Loop';
import World from './World/World';
import Resize from './Utils/Resize';
import Preloader from './UI/Preloader';
import AssetLoader from './Utils/AssetLoader';
import { sizesStore } from './Utils/Store';
import { debugStore } from './Utils/Store';
import InputController from './UI/InputController';

let instance: App | null = null;

export default class App {
	canvas!: HTMLCanvasElement;
	camera!: Camera;
	scene!: THREE.Scene;
	renderer!: Renderer;
	world!: World;
	loop!: Loop;
	resize!: Resize;
	assetLoader!: AssetLoader;
	preloader!: Preloader;
	inputController!: InputController;
	constructor() {
		console.log('App Init');
		if (instance) return instance;
		instance = this;

		sizesStore.set({
			width: window.innerWidth,
			height: window.innerHeight,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		});

		// Enable Debug
		//debugStore.set({ debug: true });

		// Canvas & Scene
		this.canvas = document.querySelector('canvas.threejs') as HTMLCanvasElement;
		this.scene = new THREE.Scene();

		//Load Assets
		this.assetLoader = new AssetLoader();
		this.preloader = new Preloader();
		this.inputController = new InputController();

		// World
		this.world = new World();

		// Camera & Renderer
		this.camera = new Camera();
		this.renderer = new Renderer();

		this.loop = new Loop();
		this.resize = new Resize();
	}
}
