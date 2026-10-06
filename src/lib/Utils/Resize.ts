export default class Resize {
	constructor(
		private readonly resize: (width: number, height: number, pixelRatio: number) => void
	) {
		window.addEventListener('resize', this.update);
		this.update();
	}

	private update = () => {
		this.resize(
			Math.max(window.innerWidth, 1),
			Math.max(window.innerHeight, 1),
			Math.min(window.devicePixelRatio, 2)
		);
	};

	dispose() {
		window.removeEventListener('resize', this.update);
	}
}
