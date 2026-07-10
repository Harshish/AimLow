import * as THREE from 'three';
import Camera from './Camera';
import Renderer from './Renderer';
import Loop from './Utils/Loop';
import World from './World/World';
import Resize from './Utils/Resize';

let instance: App | null = null;

export default class App {
	canvas!: HTMLCanvasElement;
	camera!: Camera;
	scene!: THREE.Scene;
	renderer!: Renderer;
	world!: World;
	loop!: Loop;
	resize!: Resize;
	constructor() {
		console.log('App Init');
		if (instance) return instance;
		instance = this;
		this.canvas = document.querySelector('canvas.threejs') as HTMLCanvasElement;
		this.scene = new THREE.Scene();
		this.camera = new Camera();
		this.renderer = new Renderer();
		this.world = new World();
		this.loop = new Loop();
		this.resize = new Resize();
	}
}
