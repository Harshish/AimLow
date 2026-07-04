import * as THREE from 'three';

type Particle = {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	life: number;
};

export class WaterJet {
	startPos!: THREE.Vector3;
	particles!: Particle[];
	gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
	mouseX: number = 0;
	mouseY: number = 0;
	halfX: number = window.innerWidth / 2;
	halfY: number = window.innerHeight / 2;
	scene: THREE.Scene;
	acc: number = 0;
	geometry?: THREE.BufferGeometry;
	material?: THREE.PointsMaterial;
	points?: THREE.Points;
	constructor(scene: THREE.Scene, startPos: THREE.Vector3) {
		this.scene = scene;
		this.startPos = startPos;
		this.particles = [];
		this.onPointerMove = this.onPointerMove.bind(this);
		window.addEventListener('pointermove', this.onPointerMove);
		this.onWindowResize = this.onWindowResize.bind(this);
		window.addEventListener('resize', this.onWindowResize);
	}

	private spawnWater() {
		const dir = new THREE.Vector3(
			(this.mouseX / this.halfX) * 2,
			(this.mouseY / this.halfY) * 1.5 + 1,
			-2
		).normalize();

		this.particles.push({
			position: this.startPos.clone(),
			velocity: dir.multiplyScalar(6),
			life: 2
		});
	}

	private onPointerMove(e: PointerEvent) {
		this.mouseX = e.clientX - this.halfX;
		this.mouseY = e.clientY - this.halfY;
	}

	private onWindowResize() {
		this.halfX = window.innerWidth / 2;
		this.halfY = window.innerHeight / 2;
	}

	private update() {
		// emit continuously
		this.acc += 0.02;

		while (this.acc > 0.02) {
			this.spawnWater();
			this.acc -= 0.02;
		}

		// update particles
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];

			p.velocity.add(this.gravity.clone().multiplyScalar(0.016));
			p.position.add(p.velocity.clone().multiplyScalar(0.016));

			p.life -= 0.016;

			// ground collision (y = 0 plane)
			if (p.position.y < 0) {
				p.position.y = 0;
				p.velocity.y *= -0.2;
				p.velocity.x *= 0.7;
				p.velocity.z *= 0.7;
			}

			if (p.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
	}

	preRender() {
		this.update();

		// render particles as simple points (cheap + fast)
		this.geometry = new THREE.BufferGeometry();
		const positions: number[] = [];

		for (const p of this.particles) {
			positions.push(p.position.x, p.position.y, p.position.z);
		}

		this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

		const material = new THREE.PointsMaterial({
			color: 0x4dabf7,
			size: 0.08,
			transparent: true,
			opacity: 0.8
		});

		this.points = new THREE.Points(this.geometry, material);
		this.scene.add(this.points);
	}

	postRender() {
		if (this.points) this.scene.remove(this.points);
		if (this.geometry) this.geometry.dispose();
		if (this.material) this.material.dispose();
	}
}
