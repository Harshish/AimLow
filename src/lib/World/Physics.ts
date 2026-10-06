import * as THREE from 'three/webgpu';
import type RAPIER_TYPE from '@dimforge/rapier3d-compat';
import { CollisionHandler } from '../Utils/CollisionHandler';

type RigidBodyType = 'fixed' | 'dynamic' | 'kinematic' | 'kinematicPosition';
type ColliderType = 'cuboid' | 'ball' | 'trimesh';

export default class Physics {
	readonly world: RAPIER_TYPE.World;
	readonly meshMap = new Map<THREE.Object3D, RAPIER_TYPE.RigidBody>();
	readonly eventQueue: RAPIER_TYPE.EventQueue;
	readonly colliderMap = new Map<number, THREE.Object3D>();
	readonly collisionHandler = new CollisionHandler();
	private readonly position = new THREE.Vector3();
	private readonly quaternion = new THREE.Quaternion();
	private readonly parentQuaternion = new THREE.Quaternion();
	private disposed = false;
	private static initialization: Promise<void> | undefined;
	private static readonly GROUP_PARTICLE = 1 << 3;
	private static readonly GROUP_WORLD = 1 << 0;

	private constructor(readonly rapier: typeof RAPIER_TYPE) {
		this.world = new rapier.World({ x: 0, y: -9.81, z: 0 });
		this.eventQueue = new rapier.EventQueue(true);
	}

	static async create() {
		const { default: rapier } = await import('@dimforge/rapier3d-compat');
		await (Physics.initialization ??= rapier.init());
		return new Physics(rapier);
	}

	addParticle(x: number, y: number, z: number, velocity: THREE.Vector3): RAPIER_TYPE.RigidBody {
		const rigidBodyDesc = this.rapier.RigidBodyDesc.dynamic()
			.setTranslation(x, y, z)
			.setLinvel(velocity.x, velocity.y, velocity.z)
			.setCcdEnabled(true);

		const rigidBody = this.world.createRigidBody(rigidBodyDesc);

		const colliderDesc = this.rapier.ColliderDesc.ball(0.045)
			.setRestitution(0.15)
			.setFriction(0.05)
			.setMass(0.3)
			.setCollisionGroups((Physics.GROUP_PARTICLE << 16) | Physics.GROUP_WORLD);

		this.world.createCollider(colliderDesc, rigidBody);

		return rigidBody;
	}

	removeParticle(rigidBody: RAPIER_TYPE.RigidBody) {
		this.world.removeRigidBody(rigidBody);
	}

	add(
		mesh: THREE.Object3D,
		type: RigidBodyType,
		collider: ColliderType,
		collision: boolean = false,
		size?: number,
		offset?: THREE.Vector3
	) {
		let rigidBodyType: RAPIER_TYPE.RigidBodyDesc;
		switch (type) {
			case 'dynamic':
				rigidBodyType = this.rapier.RigidBodyDesc.dynamic();
				break;
			case 'fixed':
				rigidBodyType = this.rapier.RigidBodyDesc.fixed();
				break;
			case 'kinematic':
				rigidBodyType = this.rapier.RigidBodyDesc.kinematicVelocityBased();
				break;
			case 'kinematicPosition':
				rigidBodyType = this.rapier.RigidBodyDesc.kinematicPositionBased();
				break;
		}

		// Validate collider geometry before allocating a body in the physics world.
		let colliderType;
		switch (collider) {
			case 'cuboid': {
				if (!(mesh as THREE.Mesh).isMesh) {
					throw new Error('Mesh is not a THREE.Mesh');
				}
				const diemensions = this.computeCuboidDimensions(mesh as THREE.Mesh);
				colliderType = this.rapier.ColliderDesc.cuboid(
					diemensions.x / 2,
					diemensions.y / 2,
					diemensions.z / 2
				);
				break;
			}
			case 'ball':
				if ((mesh as THREE.Mesh).isMesh) {
					const radius = this.computeBallDimensions(mesh as THREE.Mesh);
					colliderType = this.rapier.ColliderDesc.ball(radius);
				} else {
					colliderType = this.rapier.ColliderDesc.ball(size ?? 0.35);
				}
				break;
			case 'trimesh': {
				if (!(mesh as THREE.Mesh).isMesh) {
					throw new Error('Mesh is not a THREE.Mesh');
				}
				const { scaledVertices, indices } = this.computeTrimeshDimensions(mesh as THREE.Mesh);
				colliderType = this.rapier.ColliderDesc.trimesh(scaledVertices, indices);
				break;
			}
		}

		if (collision) {
			colliderType.setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);
			colliderType.setCollisionGroups((Physics.GROUP_WORLD << 16) | Physics.GROUP_PARTICLE);
		}

		const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
		const worldRotation = mesh.getWorldQuaternion(new THREE.Quaternion());

		if (offset) {
			const colliderOffset = offset.clone();
			colliderType.setTranslation(colliderOffset.x, colliderOffset.y, colliderOffset.z);
		}
		const rigidBody = this.world.createRigidBody(rigidBodyType);
		const colliderDesc = this.world.createCollider(colliderType, rigidBody);

		rigidBody.setTranslation(worldPosition, false);
		rigidBody.setRotation(worldRotation, false);
		// Static level geometry never needs a physics-to-render transform update.
		if (type !== 'fixed') this.meshMap.set(mesh, rigidBody);
		this.colliderMap.set(colliderDesc.handle, mesh);

		return rigidBody;
	}

	computeCuboidDimensions(mesh: THREE.Mesh): THREE.Vector3 {
		mesh.geometry.computeBoundingBox();
		if (!mesh.geometry.boundingBox) throw new Error('No bounding box');
		const size = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
		const worldScale = mesh.getWorldScale(new THREE.Vector3());
		size.multiply(worldScale);
		return size;
	}

	computeBallDimensions(mesh: THREE.Mesh): number {
		mesh.geometry.computeBoundingSphere();
		if (!mesh.geometry.boundingSphere) throw new Error('No bounding sphere');
		const radius = mesh.geometry.boundingSphere.radius;
		const worldScale = mesh.getWorldScale(new THREE.Vector3());
		const maxScale = Math.max(worldScale.x, worldScale.y, worldScale.z);
		return radius * maxScale;
	}

	computeTrimeshDimensions(mesh: THREE.Mesh): {
		scaledVertices: Float32Array;
		indices: Uint32Array;
	} {
		const position = mesh.geometry.attributes.position;
		const index = mesh.geometry.index;

		if (!index) {
			throw new Error('No index');
		}

		const worldScale = mesh.getWorldScale(new THREE.Vector3());

		const scaledVertices = new Float32Array(position.count * 3);

		for (let i = 0; i < position.count; i++) {
			scaledVertices[i * 3] = position.getX(i) * worldScale.x;
			scaledVertices[i * 3 + 1] = position.getY(i) * worldScale.y;
			scaledVertices[i * 3 + 2] = position.getZ(i) * worldScale.z;
		}

		const indices = new Uint32Array(index.count);

		for (let i = 0; i < index.count; i++) {
			indices[i] = index.getX(i);
		}

		return {
			scaledVertices,
			indices
		};
	}

	loop(deltaTime: number) {
		if (this.disposed) return;
		this.world.timestep = deltaTime;
		this.world.step(this.eventQueue);

		this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
			/* Handle the collision event. */

			const mesh1 = this.colliderMap.get(handle1);
			const mesh2 = this.colliderMap.get(handle2);

			if (!mesh1 && !mesh2) return;
			this.collisionHandler.resolveCollision(mesh1, mesh2, started);
		});

		this.meshMap.forEach((rigidBody, mesh) => {
			const translation = rigidBody.translation();
			const rotation = rigidBody.rotation();

			const position = this.position.set(translation.x, translation.y, translation.z);
			const quaternion = this.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

			if (mesh.parent) {
				mesh.parent.worldToLocal(position);

				const parentQuaternion = this.parentQuaternion;
				mesh.parent.getWorldQuaternion(parentQuaternion);

				parentQuaternion.invert();
				quaternion.premultiply(parentQuaternion);
			}

			mesh.position.copy(position);
			mesh.quaternion.copy(quaternion);
		});
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.collisionHandler.clear();
		this.meshMap.clear();
		this.colliderMap.clear();
		this.eventQueue.free();
		this.world.free();
	}
}
