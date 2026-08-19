import * as THREE from 'three';
import App from '../App';
import RAPIER_TYPE from '@dimforge/rapier3d-compat';
import { appStateStore } from '$lib/Utils/Store';

type RigidBodyType = 'fixed' | 'dynamic';
type ColliderType = 'cuboid' | 'ball' | 'trimesh';

export default class Physics {
	app: App;
	scene: THREE.Scene;
	world!: RAPIER_TYPE.World;
	cubeMesh!: THREE.Mesh;
	rigidBody!: RAPIER_TYPE.RigidBody;
	rapierLoaded = false;
	groundRigidBody!: RAPIER_TYPE.RigidBody;
	rapier!: typeof RAPIER_TYPE;
	meshMap!: Map<THREE.Mesh, RAPIER_TYPE.RigidBody>;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;
		this.meshMap = new Map();

		import('@dimforge/rapier3d-compat').then(async (module) => {
			const RAPIER = module.default;
			await RAPIER.init();
			const gravity = { x: 0, y: -9.81, z: 0 };
			this.world = new RAPIER.World(gravity);
			this.rapier = RAPIER;
			this.rapierLoaded = true;
			appStateStore.set({ physicsReady: true });
		});
	}

	add(mesh: THREE.Mesh, type: RigidBodyType, collider: ColliderType) {
		let rigidBodyType: RAPIER_TYPE.RigidBodyDesc;
		if (type === 'fixed') {
			rigidBodyType = this.rapier.RigidBodyDesc.fixed();
		} else {
			rigidBodyType = this.rapier.RigidBodyDesc.dynamic();
		}

		// Create Physics Wolrld Object
		this.rigidBody = this.world.createRigidBody(rigidBodyType);

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

		this.world.createCollider(colliderType, this.rigidBody);

		const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
		const worldRotation = mesh.getWorldQuaternion(new THREE.Quaternion());

		this.rigidBody.setTranslation(worldPosition, false);
		this.rigidBody.setRotation(worldRotation, false);
		this.meshMap.set(mesh, this.rigidBody);
	}

	// mesh.geometry.boundingBox is initially null until you run the
	// computeBoundingBox() function. The getSize function is a bit unusual:
	// it requires a vector as an argument and then returns the updated vector.
	// It would be more convenient if it directly returned the result, but it
	// needs a Vector input. We need getWorldScale because scaling the geometry
	// directly can cause incorrect physics behavior.
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

	loop() {
		// Update the ThreeJS Mesh According to Physics World Object
		if (!this.rapierLoaded) return;

		this.world.step();

		this.meshMap.forEach((rigidBody, mesh) => {
			const position = new THREE.Vector3().copy(rigidBody.translation());
			const rotation = new THREE.Quaternion().copy(rigidBody.rotation());

			if (mesh.parent) {
				//for position
				mesh.parent.worldToLocal(position);

				//for rotation
				const inverseParentMatrix = new THREE.Matrix4()
					.extractRotation(mesh.parent.matrixWorld)
					.invert();
				const inverseParentRotation = new THREE.Quaternion().setFromRotationMatrix(
					inverseParentMatrix
				);

				rotation.premultiply(inverseParentRotation);
			}

			mesh.position.copy(position);
			mesh.quaternion.copy(rotation);
		});
	}
}
