import * as THREE from 'three/webgpu';
import { AIM_LIMIT_X } from './Game/config';

export default class Camera {
	readonly instance = new THREE.PerspectiveCamera(48, 1, 0.1, 160);
	private readonly target = new THREE.Vector3(0, 5.5, 5.5);
	private readonly base = new THREE.Vector3();
	private trauma = 0;

	constructor() {
		this.resize(window.innerWidth, window.innerHeight);
	}

	resize(width: number, height: number) {
		const aspect = width / Math.max(1, height);
		this.instance.aspect = aspect;
		// Fit outer lanes plus model width, with extra depth for high flying targets.
		const distance = Math.max(
			28,
			(AIM_LIMIT_X + 2) / (Math.tan(THREE.MathUtils.degToRad(24)) * aspect) + 7
		);
		// Elevated three-quarter view: show the floor without flattening airborne targets.
		this.base.copy(this.target).add(new THREE.Vector3(0, distance * 0.8, distance * 0.6));
		this.instance.position.copy(this.base);
		this.instance.lookAt(this.target);
		this.instance.updateProjectionMatrix();
		this.instance.updateMatrixWorld();
	}

	/** Adds impact trauma (0–1); kills nudge, escapes jolt. */
	shake(amount: number) {
		this.trauma = Math.min(1, this.trauma + amount);
	}

	update(dt: number, enabled: boolean) {
		this.trauma = Math.max(0, this.trauma - dt * 2.2);
		// Squared trauma: small hits stay subtle, stacked hits escalate quickly.
		const offset = enabled ? this.trauma ** 2 * 0.55 : 0;
		this.instance.position.set(
			this.base.x + (Math.random() * 2 - 1) * offset,
			this.base.y + (Math.random() * 2 - 1) * offset,
			this.base.z
		);
		this.instance.updateMatrixWorld();
	}
}
