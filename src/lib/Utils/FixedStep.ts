/** Fixed simulation time with bounded catch-up; rendering remains frame-rate independent. */
export default class FixedStep {
	readonly timestep = 1 / 60;
	private accumulator = 0;

	advance(deltaTime: number, step: (timestep: number) => void) {
		if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
		this.accumulator += Math.min(deltaTime, 0.1);
		while (this.accumulator + Number.EPSILON >= this.timestep) {
			this.accumulator = Math.max(0, this.accumulator - this.timestep);
			step(this.timestep);
		}
	}
}
