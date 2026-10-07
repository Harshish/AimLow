import * as THREE from 'three/webgpu';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { ColliderEntity, ParticleHit, Target } from '../Utils/CollisionHandler';
import { PARTICLE_RADIUS } from '../Game/config';

export default class Physics {
	readonly world: RAPIER.World;
	readonly eventQueue: RAPIER.EventQueue;
	readonly meshMap = new Map<THREE.Object3D, RAPIER.RigidBody>();
	readonly colliderMap = new Map<number, ColliderEntity>();
	private static initialization: Promise<void> | undefined;
	private disposed = false;
	private readonly position = new THREE.Vector3();
	private readonly rotation = new THREE.Quaternion();
	private readonly parentRotation = new THREE.Quaternion();

	private constructor(readonly rapier: typeof RAPIER) {
		this.world = new rapier.World({ x: 0, y: -9.81, z: 0 });
		this.eventQueue = new rapier.EventQueue(true);
	}
	static async create() {
		const { default: rapier } = await import('@dimforge/rapier3d-compat');
		await (Physics.initialization ??= rapier.init());
		return new Physics(rapier);
	}
	private attach(desc: RAPIER.ColliderDesc, body: RAPIER.RigidBody, entity: ColliderEntity) {
		// Droplets hit the world/targets, never each other. Sensors use the same masks.
		desc.setCollisionGroups(entity.kind === 'particle' ? (8 << 16) | 1 : (1 << 16) | 8);
		desc.setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);
		const collider = this.world.createCollider(desc, body);
		this.colliderMap.set(collider.handle, entity);
		return collider;
	}
	addParticle(id: number, position: THREE.Vector3, velocity: THREE.Vector3) {
		const body = this.world.createRigidBody(
			this.rapier.RigidBodyDesc.dynamic()
				.setTranslation(position.x, position.y, position.z)
				.setLinvel(velocity.x, velocity.y, velocity.z)
				.setCcdEnabled(true)
		);
		this.attach(
			this.rapier.ColliderDesc.ball(PARTICLE_RADIUS)
				.setRestitution(0.1)
				.setFriction(0.05)
				.setMass(0.03),
			body,
			{ kind: 'particle', id }
		);
		return body;
	}
	addSensor(position: THREE.Vector3, halfSize: THREE.Vector3, target: Target) {
		const body = this.world.createRigidBody(
			this.rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z)
		);
		this.attach(
			this.rapier.ColliderDesc.cuboid(halfSize.x, halfSize.y, halfSize.z).setSensor(true),
			body,
			target
		);
		return body;
	}
	add(
		mesh: THREE.Object3D,
		type: 'fixed' | 'dynamic' | 'kinematicPosition',
		shape: 'ball' | 'cuboid' | 'trimesh',
		target: Target = { kind: 'shell' },
		radius = 0.35
	) {
		const r = this.rapier;
		let collider: RAPIER.ColliderDesc;
		if (shape === 'ball') collider = r.ColliderDesc.ball(radius);
		else {
			if (!(mesh as THREE.Mesh).isMesh) throw new Error('Mesh is not a THREE.Mesh');
			const geometry = (mesh as THREE.Mesh).geometry;
			const scale = mesh.getWorldScale(new THREE.Vector3());
			if (shape === 'cuboid') {
				geometry.computeBoundingBox();
				const size = geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(scale);
				collider = r.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
			} else {
				const attribute = geometry.attributes.position;
				if (!geometry.index) throw new Error('No index');
				const vertices = new Float32Array(attribute.count * 3);
				for (let i = 0; i < attribute.count; i++) {
					vertices[i * 3] = attribute.getX(i) * scale.x;
					vertices[i * 3 + 1] = attribute.getY(i) * scale.y;
					vertices[i * 3 + 2] = attribute.getZ(i) * scale.z;
				}
				collider = r.ColliderDesc.trimesh(vertices, new Uint32Array(geometry.index.array));
			}
		}
		const position = mesh.getWorldPosition(new THREE.Vector3());
		const rotation = mesh.getWorldQuaternion(new THREE.Quaternion());
		const desc =
			type === 'fixed'
				? r.RigidBodyDesc.fixed()
				: type === 'dynamic'
					? r.RigidBodyDesc.dynamic()
					: r.RigidBodyDesc.kinematicPositionBased();
		const body = this.world.createRigidBody(
			desc.setTranslation(position.x, position.y, position.z).setRotation(rotation)
		);
		this.attach(collider, body, target);
		if (type !== 'fixed') this.meshMap.set(mesh, body);
		return body;
	}
	removeBody(body: RAPIER.RigidBody) {
		if (!body.isValid()) return;
		for (let i = 0; i < body.numColliders(); i++) this.colliderMap.delete(body.collider(i).handle);
		for (const [mesh, candidate] of this.meshMap) if (candidate === body) this.meshMap.delete(mesh);
		this.world.removeRigidBody(body);
	}
	loop(dt: number): ParticleHit[] {
		if (this.disposed) return [];
		this.world.timestep = dt;
		this.world.step(this.eventQueue);
		const hits: ParticleHit[] = [];
		this.eventQueue.drainCollisionEvents((a, b, started) => {
			if (!started) return;
			const first = this.colliderMap.get(a),
				second = this.colliderMap.get(b);
			if (first?.kind === 'particle' && second && second.kind !== 'particle')
				hits.push({ particleId: first.id, target: second });
			else if (second?.kind === 'particle' && first && first.kind !== 'particle')
				hits.push({ particleId: second.id, target: first });
		});
		for (const [mesh, body] of this.meshMap) {
			this.position.copy(body.translation());
			this.rotation.copy(body.rotation());
			if (mesh.parent) {
				mesh.parent.worldToLocal(this.position);
				mesh.parent.getWorldQuaternion(this.parentRotation);
				this.rotation.premultiply(this.parentRotation.invert());
			}
			mesh.position.copy(this.position);
			mesh.quaternion.copy(this.rotation);
		}
		return hits;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.colliderMap.clear();
		this.meshMap.clear();
		this.eventQueue.free();
		this.world.free();
	}
}
