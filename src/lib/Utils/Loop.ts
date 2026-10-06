export default class Loop {
	private frame: number | undefined;
	private previousTime: number | undefined;
	private readonly update: (deltaTime: number) => void;

	constructor(update: (deltaTime: number) => void) {
		this.update = update;
	}

	start() {
		if (this.frame !== undefined) return;
		this.previousTime = undefined;
		this.frame = requestAnimationFrame(this.tick);
	}

	private tick = (time: number) => {
		const delta = this.previousTime === undefined ? 0 : (time - this.previousTime) / 1000;
		this.previousTime = time;
		// Bound catch-up after background tabs and slow frames.
		this.update(Math.max(0, Math.min(delta, 0.1)));
		if (this.frame !== undefined) this.frame = requestAnimationFrame(this.tick);
	};

	dispose() {
		if (this.frame !== undefined) cancelAnimationFrame(this.frame);
		this.frame = undefined;
		this.previousTime = undefined;
	}
}
