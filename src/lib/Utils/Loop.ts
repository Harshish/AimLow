import App from '../App';
import Camera from '../Camera';
import Renderer from '../Renderer';
import World from '../World/World';
import * as THREE from 'three/webgpu';
import RapierDebugger from './RapierDebugger';

export default class Loop {
	app: App;
	camera: Camera;
	renderer: Renderer;
	world: World;
	timer: THREE.Timer;
	debugger?: RapierDebugger;
	constructor() {
		console.log('Loop Init');
		this.app = new App();
		this.camera = this.app.camera;
		this.renderer = this.app.renderer;
		this.world = this.app.world;

		//this.debugger = new RapierDebugger();

		this.timer = new THREE.Timer();
		this.loop();
	}

	loop() {
		this.timer.update();
		const elapsedTime = this.timer.getElapsed();
		const deltaTime = this.timer.getDelta();

		this.world.loop(deltaTime, elapsedTime);
		this.camera.loop();
		this.renderer.loop();
		this.debugger?.loop();
		window.requestAnimationFrame(() => this.loop());
	}
}
