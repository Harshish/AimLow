import * as THREE from 'three/webgpu';
import App from '$lib/App';
import { appStateStore, gameStateStore } from '$lib/Utils/Store';
import type Physics from '$lib/World/Physics';
import RAPIER_TYPE from '@dimforge/rapier3d-compat';

/*
Rapier particles
       ↓
Float32Array positions
       ↓
Instanced quad
       ↓
WebGPU
*/

type Particle = {
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
	geometry!: THREE.PlaneGeometry;
	material!: THREE.MeshBasicNodeMaterial;
	particlesMesh!: THREE.InstancedMesh;
	maxParticles: number = 200;
	emitRate: number = 100;
	private instanceMatrix = new THREE.Matrix4();
	constructor(startPos: THREE.Vector3) {
		this.app = new App();
		this.scene = this.app.scene;
		this.startPos = startPos.clone();

		// Water Droplet
		const DROPLET_SIZE = 0.15;

		this.geometry = new THREE.PlaneGeometry(DROPLET_SIZE, DROPLET_SIZE);

		this.material = new THREE.MeshBasicNodeMaterial({
			color: 0xff0000
		});

		this.particlesMesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxParticles);
		this.particlesMesh.count = 0;
		this.scene.add(this.particlesMesh);

		this.onPointerMove = this.onPointerMove.bind(this);
		window.addEventListener('pointermove', this.onPointerMove);

		this.onWindowResize = this.onWindowResize.bind(this);
		window.addEventListener('resize', this.onWindowResize);

		appStateStore.subscribe((state) => {
			if (state.physicsReady) {
				this.physics = this.app?.world?.physics;
				this.physics.collisionHandler.addCollisionHandler(
					'ground',
					undefined,
					this.handleCollision
				);
				this.physics.collisionHandler.addCollisionHandler(
					'urinal',
					undefined,
					this.handleCollision
				);
				this.physics.collisionHandler.addCollisionHandler('wall', undefined, this.handleCollision);
			}
		});
	}

	private handleCollision(
		mesh1: THREE.Mesh | undefined,
		mesh2: THREE.Mesh | undefined,
		started: boolean
	) {
		if (!started) return;
		let name = mesh1 ? mesh1.userData.name : mesh2?.userData.name;
		if (name === 'urinal') {
			gameStateStore.update((state) => {
				state.score += 1;
				return state;
			});
		}
		if (name === 'ground' || name === 'wall') {
			gameStateStore.update((state) => {
				state.score -= 1;
				return state;
			});
		}
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
			body
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

		this.acc += deltaTime * this.emitRate;

		while (this.acc >= 1) {
			this.spawnWater();
			this.acc -= 1;
		}

		// update particles
		// for (let i = this.particles.length - 1; i >= 0; i--) {
		// 	const particle = this.particles[i];
		// 	particle.life -= deltaTime;
		//
		// 	if (particle.life <= 0) {
		// 		this.physics.removeParticle(particle.body);
		// 		this.particles.splice(i, 1);
		// 	}
		// }
	}

	loop(deltaTime: number) {
		if (!this.physics) return;
		this.update(deltaTime);

		let index = 0;
		for (const particle of this.particles) {
			const translation = particle.body.translation();

			this.instanceMatrix.makeTranslation(translation.x, translation.y, translation.z);

			this.particlesMesh.setMatrixAt(index, this.instanceMatrix);

			index++;
		}
		this.particlesMesh.count = index;
		this.particlesMesh.instanceMatrix.needsUpdate = true;
	}

	dispose() {
		window.removeEventListener('pointermove', this.onPointerMove);
		window.removeEventListener('resize', this.onWindowResize);

		if (this.physics) {
			for (const particle of this.particles) {
				this.physics.removeParticle(particle.body);
			}
		}

		this.scene.remove(this.particlesMesh);
		this.particles.length = 0;
		this.geometry.dispose();
	}
}
