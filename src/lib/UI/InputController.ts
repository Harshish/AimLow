import { inputStore } from '../Utils/Store';
import { get } from 'svelte/store';

export default class InputController {
	inputStore: typeof inputStore;
	keyPressed: { [key: string]: boolean };
	constructor() {
		this.startListening();
		this.inputStore = inputStore;
		this.keyPressed = {};
	}

	startListening() {
		window.addEventListener('keydown', (event) => {
			this.onKeyDown(event);
		});

		window.addEventListener('keyup', (event) => {
			this.onKeyUp(event);
		});
	}

	onKeyDown(event: KeyboardEvent) {
		if (this.keyPressed[event.code]) return;

		switch (event.code) {
			case 'KeyW':
			case 'ArrowUp':
				inputStore.set({ ...get(inputStore), forward: true });
				break;
			case 'KeyA':
			case 'ArrowLeft':
				inputStore.set({ ...get(inputStore), left: true });
				break;
			case 'KeyS':
			case 'ArrowDown':
				inputStore.set({ ...get(inputStore), backward: true });
				break;
			case 'KeyD':
			case 'ArrowRight':
				inputStore.set({ ...get(inputStore), right: true });
				break;
		}
		this.keyPressed[event.code] = true;
	}

	onKeyUp(event: KeyboardEvent) {
		switch (event.code) {
			case 'KeyW':
			case 'ArrowUp':
				inputStore.set({ ...get(inputStore), forward: false });
				break;
			case 'KeyA':
			case 'ArrowLeft':
				inputStore.set({ ...get(inputStore), left: false });
				break;
			case 'KeyS':
			case 'ArrowDown':
				inputStore.set({ ...get(inputStore), backward: false });
				break;
			case 'KeyD':
			case 'ArrowRight':
				inputStore.set({ ...get(inputStore), right: false });
				break;
		}
		this.keyPressed[event.code] = false;
	}
}
