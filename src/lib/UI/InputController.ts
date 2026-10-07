import * as THREE from 'three/webgpu';
import { AIM_LIMIT_X, KEYBOARD_AIM_SPEED } from '../Game/config';

const keys = new Set([
	'KeyW',
	'KeyA',
	'KeyS',
	'KeyD',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight'
]);

export default class InputController {
	readonly aim = new THREE.Vector3(0.2, 6.25, 5.5);
	sensitivity = 1;
	private readonly pressed = new Set<string>();
	private readonly ray = new THREE.Raycaster();
	private readonly pointer = new THREE.Vector2();
	private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -5.5);
	private readonly target = new THREE.Vector3();
	private readonly abort = new AbortController();

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly camera: THREE.Camera,
		private readonly active: () => boolean,
		private readonly togglePause: () => void,
		private readonly pause: () => void
	) {
		const options = { signal: this.abort.signal };
		canvas.addEventListener('pointermove', this.onPointer, options);
		canvas.addEventListener(
			'pointerdown',
			(e) => {
				if (this.active()) {
					canvas.setPointerCapture(e.pointerId);
					this.onPointer(e);
				}
			},
			options
		);
		window.addEventListener('keydown', this.onKeyDown, options);
		window.addEventListener('keyup', (e) => this.pressed.delete(e.code), options);
		window.addEventListener('blur', this.onBlur, options);
		document.addEventListener(
			'visibilitychange',
			() => {
				if (document.hidden) this.onBlur();
			},
			options
		);
	}

	private onPointer = (e: PointerEvent) => {
		if (!this.active()) return;
		const rect = this.canvas.getBoundingClientRect();
		this.pointer.set(
			((e.clientX - rect.left) / rect.width) * 2 - 1,
			-((e.clientY - rect.top) / rect.height) * 2 + 1
		);
		this.ray.setFromCamera(this.pointer, this.camera);
		if (this.ray.ray.intersectPlane(this.plane, this.target)) {
			this.aim.copy(this.target);
			this.clamp();
		}
	};
	private onKeyDown = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement | null;
		if (
			typeof target?.closest === 'function' &&
			target.closest('input, textarea, select, [contenteditable="true"]')
		)
			return;
		if (e.code === 'Escape' && !e.repeat) {
			this.togglePause();
			this.pressed.clear();
		}
		if (this.active() && keys.has(e.code)) {
			e.preventDefault();
			this.pressed.add(e.code);
		}
	};
	private onBlur = () => {
		this.pressed.clear();
		this.pause();
	};
	private clamp() {
		this.aim.x = THREE.MathUtils.clamp(this.aim.x, -AIM_LIMIT_X, AIM_LIMIT_X);
		this.aim.y = THREE.MathUtils.clamp(this.aim.y, 0, 14);
	}
	update(dt: number) {
		const held = (...codes: string[]) => (codes.some((code) => this.pressed.has(code)) ? 1 : 0);
		this.aim.x +=
			(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft')) *
			dt *
			KEYBOARD_AIM_SPEED *
			this.sensitivity;
		this.aim.y +=
			(held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown')) *
			dt *
			KEYBOARD_AIM_SPEED *
			this.sensitivity;
		this.clamp();
	}
	reset() {
		this.pressed.clear();
		this.aim.set(0.2, 6.25, 5.5);
	}
	dispose() {
		this.abort.abort();
		this.pressed.clear();
	}
}
