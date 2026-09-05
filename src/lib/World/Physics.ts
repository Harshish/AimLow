import * as THREE from 'three';
import App from '../App';
import RAPIER_TYPE from '@dimforge/rapier3d-compat';
import { appStateStore, gameStateStore } from '$lib/Utils/Store';
import { CollisionHandler } from '$lib/Utils/CollisionHandler';

type RigidBodyType = 'fixed' | 'dynamic' | 'kinematic' | 'kinematicPosition';
type ColliderType = 'cuboid' | 'ball' | 'trimesh';

export default class Physics {
	app: App;
	scene: THREE.Scene;
	world!: RAPIER_TYPE.World;
	cubeMesh!: THREE.Mesh;
	rapierLoaded = false;
	rapier!: typeof RAPIER_TYPE;
	meshMap!: Map<THREE.Mesh, RAPIER_TYPE.RigidBody>;
	eventQueue!: RAPIER_TYPE.EventQueue;
	colliderMap!: Map<number, THREE.Mesh>;
	collisionHandler: CollisionHandler;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;
		this.meshMap = new Map();
		this.colliderMap = new Map<number, THREE.Mesh>();
		this.collisionHandler = new CollisionHandler();

		import('@dimforge/rapier3d-compat').then(async (module) => {
			const RAPIER = module.default;
			await RAPIER.init();
			const gravity = { x: 0, y: -9.81, z: 0 };
			this.world = new RAPIER.World(gravity);
			this.rapier = RAPIER;
			this.rapierLoaded = true;
			this.eventQueue = new RAPIER.EventQueue(true);
			appStateStore.set({ physicsReady: true });
		});
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
			.setMass(0.3);

		this.world.createCollider(colliderDesc, rigidBody);

		return rigidBody;
	}

	removeParticle(rigidBody: RAPIER_TYPE.RigidBody) {
		this.world.removeRigidBody(rigidBody);
	}

	add(mesh: THREE.Mesh, type: RigidBodyType, collider: ColliderType, collision: boolean = false) {
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

		// Create Physics Wolrld Object
		let rigidBody = this.world.createRigidBody(rigidBodyType);

		// Define Collider Type
		let colliderType;
		switch (collider) {
			case 'cuboid':
				const diemensions = this.computeCuboidDimensions(mesh);
				colliderType = this.rapier.ColliderDesc.cuboid(
					diemensions.x / 2,
					diemensions.y / 2,
					diemensions.z / 2
				);
				break;
			case 'ball':
				const radius = this.computeBallDimensions(mesh);
				colliderType = this.rapier.ColliderDesc.ball(radius);
				break;
			case 'trimesh':
				const { scaledVertices, indices } = this.computeTrimeshDimensions(mesh);
				colliderType = this.rapier.ColliderDesc.trimesh(scaledVertices, indices);
				break;
		}

		if (collision) {
			colliderType.setActiveEvents(RAPIER_TYPE.ActiveEvents.COLLISION_EVENTS);
		}

		const colliderDesc = this.world.createCollider(colliderType, rigidBody);

		const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
		const worldRotation = mesh.getWorldQuaternion(new THREE.Quaternion());

		rigidBody.setTranslation(worldPosition, false);
		rigidBody.setRotation(worldRotation, false);
		this.meshMap.set(mesh, rigidBody);
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
		if (!this.rapierLoaded) return;

		this.world.timestep = Math.min(deltaTime, 0.1);
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

			const position = new THREE.Vector3(translation.x, translation.y, translation.z);

			const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

			if (mesh.parent) {
				mesh.parent.worldToLocal(position);

				const parentQuaternion = new THREE.Quaternion();
				mesh.parent.getWorldQuaternion(parentQuaternion);

				parentQuaternion.invert();
				quaternion.premultiply(parentQuaternion);
			}

			mesh.position.copy(position);
			mesh.quaternion.copy(quaternion);
		});
	}
}
