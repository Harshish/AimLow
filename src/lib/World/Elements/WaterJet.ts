import * as THREE from 'three';
import App from '$lib/App';

type Particle = {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	life: number;
};

export class WaterJet {
	app: App;
	startPos!: THREE.Vector3;
	particles!: Particle[];
	gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
	mouseX: number = 0;
	mouseY: number = 0;
	halfX: number = window.innerWidth / 2;
	halfY: number = window.innerHeight / 2;
	scene: THREE.Scene;
	acc: number = 0;
	geometry!: THREE.BufferGeometry;
	material!: THREE.PointsMaterial;
	points!: THREE.Points;
	positions!: Float32Array;
	maxParticles: number = 10000;
	gacc!: THREE.Vector3;
	constructor(startPos: THREE.Vector3) {
		this.app = new App();
		this.scene = this.app.scene;
		this.startPos = startPos;
		this.particles = [];
		this.onPointerMove = this.onPointerMove.bind(this);
		window.addEventListener('pointermove', this.onPointerMove);
		this.onWindowResize = this.onWindowResize.bind(this);
		window.addEventListener('resize', this.onWindowResize);

		this.gacc = this.gravity.clone().multiplyScalar(0.016);
		// Water Droplet
		this.geometry = new THREE.BufferGeometry();
		const material = new THREE.PointsMaterial({
			color: 0x66ccff,
			size: 0.09,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});

		this.points = new THREE.Points(this.geometry, material);
		this.scene.add(this.points);

		// Water Jet
		this.positions = new Float32Array(this.maxParticles * 3);
		this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
	}

	private spawnWater() {
		const dir = new THREE.Vector3(
			(this.mouseX / this.halfX) * 2,
			(this.mouseY / this.halfY) * 1.5 + 1,
			-2
		).normalize();

		const velocity = dir.multiplyScalar(15);

		// tiny turbulence
		velocity.x += (Math.random() - 0.5) * 0.2;
		velocity.y += (Math.random() - 0.5) * 0.2;
		velocity.z += (Math.random() - 0.5) * 0.1;

		this.particles.push({
			position: this.startPos.clone(),
			velocity: velocity,
			life: 2
		});

		if (this.particles.length >= this.maxParticles) {
			this.particles.shift(); // remove oldest
		}
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
		const EMIT_RATE = 300; // hose strength
		const dt = 0.016;

		this.acc += dt * EMIT_RATE;

		while (this.acc >= 1) {
			this.spawnWater();
			this.acc -= 1;
		}

		// update particles
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];

			p.velocity.add(this.gacc);
			p.position.add(p.velocity.clone().multiplyScalar(0.016));

			//drag
			p.velocity.multiplyScalar(0.99);

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

	loop(deltaTime: number) {
		this.update();

		// render particles as simple points (cheap + fast)
		let i3 = 0;
		for (const p of this.particles) {
			this.positions[i3++] = p.position.x;
			this.positions[i3++] = p.position.y;
			this.positions[i3++] = p.position.z;
		}
		this.geometry.setDrawRange(0, this.particles.length);
		this.geometry.attributes.position.needsUpdate = true;
	}
}
