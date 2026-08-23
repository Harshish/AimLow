import App from '../App';
import Camera from '../Camera';
import Renderer from '../Renderer';
import World from '../World/World';
import * as THREE from 'three';

export default class Loop {
	app: App;
	camera: Camera;
	renderer: Renderer;
	world: World;
	timer: THREE.Timer;
	previousElapsedTime: number;
	constructor() {
		console.log('Loop Init');
		this.app = new App();
		this.camera = this.app.camera;
		this.renderer = this.app.renderer;
		this.world = this.app.world;

		this.timer = new THREE.Timer();
		this.previousElapsedTime = 0;
		this.loop(0);
	}

	loop(time: number) {
		this.timer.update();
		const elapsedTime = this.timer.getElapsed();
		const deltaTime = elapsedTime - this.previousElapsedTime;
		this.previousElapsedTime = elapsedTime;

		this.world.loop(deltaTime, elapsedTime);
		this.camera.loop();
		this.renderer.loop();
		window.requestAnimationFrame((time) => this.loop(time));
	}
}
