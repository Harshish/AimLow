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
	previousElapsedTime: number;
	constructor() {
		console.log('Loop Init');
		this.app = new App();
		this.camera = this.app.camera;
		this.renderer = this.app.renderer;
		this.world = this.app.world;

		this.previousElapsedTime = 0;
		this.loop(0);
	}

	loop(time: number) {
		const deltaTime = time - this.previousElapsedTime;
		this.previousElapsedTime = time;

		this.camera.loop();
		this.renderer.loop();
		this.world.loop();
		window.requestAnimationFrame((time) => this.loop(time));
	}
}
