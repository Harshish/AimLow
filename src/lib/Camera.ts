import * as THREE from 'three/webgpu';
import { AIM_LIMIT_X } from './Game/config';

export default class Camera {
	readonly instance = new THREE.PerspectiveCamera(48, 1, 0.1, 160);
	private readonly target = new THREE.Vector3(0, 5.5, 5.5);

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
		this.instance.position
			.copy(this.target)
			.add(new THREE.Vector3(0, distance * 0.8, distance * 0.6));
		this.instance.lookAt(this.target);
		this.instance.updateProjectionMatrix();
		this.instance.updateMatrixWorld();
	}
}
