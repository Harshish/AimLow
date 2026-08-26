import * as THREE from 'three';
import App from '$lib/App';
import { appStateStore } from '$lib/Utils/Store';
import type Physics from '$lib/World/Physics';
import RAPIER_TYPE from '@dimforge/rapier3d-compat';

type Particle = {
	life: number;
	body: RAPIER_TYPE.RigidBody;
};

export class WaterJet {
	app: App;
	physics!: Physics;
	startPos!: THREE.Vector3;
	particles: Particle[] = [];
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
	maxParticles: number = 300;
	constructor(startPos: THREE.Vector3) {
		this.app = new App();
		this.scene = this.app.scene;
		this.startPos = startPos.clone();

		// Water Droplet
		this.positions = new Float32Array(this.maxParticles * 3);
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
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

		this.onPointerMove = this.onPointerMove.bind(this);
		window.addEventListener('pointermove', this.onPointerMove);

		this.onWindowResize = this.onWindowResize.bind(this);
		window.addEventListener('resize', this.onWindowResize);

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.physics = this.app?.world?.physics;
			}
		});
	}

	private spawnWater() {
		if (!this.physics) return;

		// Screen space mouse dir
		const dir = new THREE.Vector3(
			(this.mouseX / this.halfX) * 2,
			(this.mouseY / this.halfY) * 1.5 + 1,
			-2
		).normalize();

		const speed = 15;
		const velocity = dir.multiplyScalar(speed);

		// tiny turbulence
		velocity.x += (Math.random() - 0.5) * 0.2;
		velocity.y += (Math.random() - 0.5) * 0.2;
		velocity.z += (Math.random() - 0.5) * 0.1;

		const body = this.physics.addParticle(
			this.startPos.x,
			this.startPos.y,
			this.startPos.z,
			velocity
		);

		this.particles.push({
			body,
			life: 5
		});

		if (this.particles.length > this.maxParticles) {
			const oldParticle = this.particles.shift(); // remove oldest
			if (oldParticle) this.physics.removeParticle(oldParticle.body);
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

	private update(deltaTime: number) {
		if (!this.physics) return;

		const EMIT_RATE = 150; // hose strength

		this.acc += deltaTime * EMIT_RATE;

		while (this.acc >= 1) {
			this.spawnWater();
			this.acc -= 1;
		}

		// update particles
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const particle = this.particles[i];
			particle.life -= deltaTime;

			if (particle.life <= 0) {
				this.physics.removeParticle(particle.body);
				this.particles.splice(i, 1);
			}
		}
	}

	loop(deltaTime: number) {
		if (!this.physics) return;
		this.update(deltaTime);

		// render particles as simple points (cheap + fast)
		let index = 0;
		for (const particle of this.particles) {
			const translation = particle.body.translation();
			this.positions[index++] = translation.x;
			this.positions[index++] = translation.y;
			this.positions[index++] = translation.z;
		}
		this.geometry.setDrawRange(0, index);
		const positionAttribute = this.geometry.attributes.position;
		positionAttribute.needsUpdate = true;
	}

	dispose() {
		window.removeEventListener('pointermove', this.onPointerMove);
		window.removeEventListener('resize', this.onWindowResize);

		if (this.physics) {
			for (const particle of this.particles) {
				this.physics.removeParticle(particle.body);
			}
		}

		this.particles.length = 0;

		this.scene.remove(this.points);

		this.geometry.dispose();
		this.material.dispose();
	}
}
