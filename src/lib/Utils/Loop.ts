import App from '../App';
import Camera from '../Camera';
import Renderer from '../Renderer';
import World from '../World/World';

export default class Loop {
	app: App;
	camera: Camera;
	renderer: Renderer;
	world: World;
	constructor() {
		console.log('Loop Init');
		this.app = new App();
		this.camera = this.app.camera;
		this.renderer = this.app.renderer;
		this.world = this.app.world;
		this.loop();
	}

	loop() {
		this.camera.loop();
		this.renderer.loop();
		this.world.loop();
		window.requestAnimationFrame(() => this.loop());
	}
}
