import * as THREE from 'three/webgpu';
import type RAPIER from '@dimforge/rapier3d-compat';
import type Physics from '../Physics';
import type Effects from '../Effects';
import { orderHits, type ParticleHit, type Target } from '../../Utils/CollisionHandler';
import {
	FLOW_RATE,
	MAX_FLOW_RATE,
	PARTICLE_LIFE,
	PARTICLE_RADIUS,
	jetProfile
} from '../../Game/config';

type Particle = { body: RAPIER.RigidBody; life: number };
const UP = new THREE.Vector3(0, 1, 0);
// Above 1 so the stream feeds the bloom pass and reads as glowing water.
const GLOW = 2.4;

export class WaterJet {
	readonly particles = new Map<number, Particle>();
	readonly startPos = new THREE.Vector3(0, 7, 17);
	readonly particlesMesh: THREE.InstancedMesh;
	private readonly geometry = new THREE.SphereGeometry(PARTICLE_RADIUS, 6, 4);
	private readonly material = new THREE.MeshBasicMaterial({
		color: jetProfile(100, null).color,
		transparent: true,
		opacity: 0.95,
		toneMapped: false
	});
	private readonly matrix = new THREE.Matrix4();
	private readonly velocity = new THREE.Vector3();
	private readonly direction = new THREE.Vector3();
	private readonly rotation = new THREE.Quaternion();
	private readonly scale = new THREE.Vector3();
	private readonly point = new THREE.Vector3();
	private tint = jetProfile(100, null).color;
	private nextId = 0;
	private accumulator = 0;
	private disposed = false;

	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		private readonly effects?: Effects
	) {
		this.particlesMesh = new THREE.InstancedMesh(
			this.geometry,
			this.material,
			Math.ceil(MAX_FLOW_RATE * PARTICLE_LIFE) + 8
		);
		this.particlesMesh.count = 0;
		this.particlesMesh.frustumCulled = false;
		this.particlesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		scene.add(this.particlesMesh);
	}
	update(dt: number, aim: THREE.Vector3, profile: ReturnType<typeof jetProfile>) {
		if (this.disposed) return;
		this.tint = profile.color;
		this.material.color.set(profile.color).multiplyScalar(GLOW);
		for (const p of this.particles.values()) p.life -= dt;
		this.accumulator += dt * profile.emission;
		while (this.accumulator >= 1 && profile.speed > 0) {
			this.accumulator--;
			const dx = aim.x - this.startPos.x,
				dz = aim.z - this.startPos.z;
			const time = Math.hypot(dx, dz) / profile.speed;
			// Compensate gravity at every speed, including boosted shots at high flying targets.
			this.velocity.set(
				dx / time,
				(aim.y - this.startPos.y + 4.905 * time * time) / time,
				dz / time
			);
			this.velocity.x += (Math.random() - 0.5) * profile.spread * 2;
			this.velocity.y += (Math.random() - 0.5) * profile.spread * 2;
			const id = ++this.nextId;
			this.particles.set(id, {
				body: this.physics.addParticle(id, this.startPos, this.velocity),
				life: PARTICLE_LIFE
			});
		}
	}
	resolve(hits: ParticleHit[], hitTarget: (target: Target) => boolean) {
		let captured = 0,
			spilled = 0,
			targeted = 0;
		for (const { particleId, target } of orderHits(hits)) {
			const particle = this.particles.get(particleId);
			if (!particle || target.kind === 'shell') continue;
			if (target.kind === 'enemy') {
				if (!hitTarget(target)) continue;
				targeted += 1 / FLOW_RATE;
			} else if (target.kind === 'capture') {
				// Containment counts at any angle, including rising shots into the inner bowl.
				captured += 1 / FLOW_RATE;
			} else spilled += 1 / FLOW_RATE;
			this.effects?.splash(particle.body.translation(), target.kind, this.tint);
			this.remove(particleId);
		}
		for (const [id, particle] of this.particles) {
			const p = particle.body.translation();
			if (particle.life <= 0 || p.y < -1 || Math.abs(p.x) > 16 || p.z < 0 || p.z > 25) {
				spilled += 1 / FLOW_RATE;
				this.remove(id);
			}
		}
		return { captured, spilled, targeted };
	}
	private remove(id: number) {
		const particle = this.particles.get(id);
		if (!particle) return;
		this.physics.removeBody(particle.body);
		this.particles.delete(id);
	}
	/** `offset` seconds shifts each droplet along its velocity to the render time between steps. */
	syncInstances(offset = 0) {
		let i = 0;
		for (const { body } of this.particles.values()) {
			const v = body.linvel();
			const speed = Math.hypot(v.x, v.y, v.z);
			// Stretch each droplet along its travel so the beads read as one continuous stream.
			if (speed > 1e-3)
				this.rotation.setFromUnitVectors(UP, this.direction.set(v.x, v.y, v.z).divideScalar(speed));
			else this.rotation.identity();
			this.scale.set(0.75, 1 + Math.min(2.4, speed * 0.09), 0.75);
			this.point
				.copy(body.translation())
				.addScaledVector(this.direction.set(v.x, v.y, v.z), offset);
			this.matrix.compose(this.point, this.rotation, this.scale);
			this.particlesMesh.setMatrixAt(i++, this.matrix);
		}
		this.particlesMesh.count = i;
		// Upload only live droplets; menus and breaks draw nothing and upload nothing.
		if (i) {
			this.particlesMesh.instanceMatrix.addUpdateRange(0, i * 16);
			this.particlesMesh.instanceMatrix.needsUpdate = true;
		}
	}
	reset() {
		for (const id of this.particles.keys()) this.remove(id);
		this.accumulator = 0;
		this.syncInstances();
	}
	dispose() {
		if (this.disposed) return;
		this.reset();
		this.disposed = true;
		this.scene.remove(this.particlesMesh);
		this.particlesMesh.dispose();
		this.geometry.dispose();
		this.material.dispose();
	}
}
