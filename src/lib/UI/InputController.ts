import { inputStore } from '../Utils/Store.ts';

const directions = {
	forward: ['KeyW', 'ArrowUp'],
	backward: ['KeyS', 'ArrowDown'],
	left: ['KeyA', 'ArrowLeft'],
	right: ['KeyD', 'ArrowRight']
} as const;
const movementKeys = new Set<string>(Object.values(directions).flat());

export default class InputController {
	private readonly pressed = new Set<string>();

	constructor() {
		this.reset();
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		window.addEventListener('blur', this.reset);
	}

	private onKeyDown = (event: KeyboardEvent) => {
		if (!movementKeys.has(event.code) || this.pressed.has(event.code)) return;
		this.pressed.add(event.code);
		this.publish();
	};

	private onKeyUp = (event: KeyboardEvent) => {
		if (this.pressed.delete(event.code)) this.publish();
	};

	private publish() {
		inputStore.set({
			forward: directions.forward.some((key) => this.pressed.has(key)),
			backward: directions.backward.some((key) => this.pressed.has(key)),
			left: directions.left.some((key) => this.pressed.has(key)),
			right: directions.right.some((key) => this.pressed.has(key))
		});
	}

	private reset = () => {
		this.pressed.clear();
		this.publish();
	};

	dispose() {
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		window.removeEventListener('blur', this.reset);
		this.reset();
	}
}
