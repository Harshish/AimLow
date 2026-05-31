import * as THREE from 'three';

type Particle = {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	life: number;
};

class WaterJet {
	particles!: Particle[];
	gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
	constructor() {}
}
