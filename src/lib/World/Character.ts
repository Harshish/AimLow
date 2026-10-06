import * as THREE from 'three/webgpu';
import type RAPIER from '@dimforge/rapier3d-compat';
import type Physics from './Physics';

import { inputStore } from '../Utils/Store.ts';

export default class Character {
	private readonly unsubscribe: () => void;
	private readonly movement = new THREE.Vector3();
	private readonly nextPosition = new THREE.Vector3();
	character!: THREE.Mesh;
	forward: boolean = false;
	backward: boolean = false;
	left: boolean = false;
	right: boolean = false;
	characterRigidBody!: RAPIER.RigidBody;
	rigidBodyType!: RAPIER.RigidBodyDesc;
	rigidBody!: RAPIER.RigidBody;
	colliderType!: RAPIER.ColliderDesc;
	collider!: RAPIER.Collider;
	characterController!: RAPIER.KinematicCharacterController;
	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics
	) {
		this.unsubscribe = inputStore.subscribe((state) => {
			this.forward = state.forward;
			this.backward = state.backward;
			this.left = state.left;
			this.right = state.right;
		});

		this.instantiateCharacter();
	}

	instantiateCharacter() {
		// Create a character in ThreeJS
		const geometry = new THREE.BoxGeometry(2, 2, 2);
		const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
		this.character = new THREE.Mesh(geometry, material);
		this.character.castShadow = true;
		this.character.position.set(0, 2.5, 0);
		this.scene.add(this.character);

		// Create a rigid body
		this.rigidBodyType = this.physics.rapier.RigidBodyDesc.kinematicPositionBased();
		this.rigidBody = this.physics.world.createRigidBody(this.rigidBodyType);

		// create a collider
		this.colliderType = this.physics.rapier.ColliderDesc.cuboid(1, 1, 1);
		this.collider = this.physics.world.createCollider(this.colliderType, this.rigidBody);

		// set rigid body position to character position
		const worldPosition = this.character.getWorldPosition(new THREE.Vector3());
		const worldRotation = this.character.getWorldQuaternion(new THREE.Quaternion());
		this.rigidBody.setTranslation(worldPosition, true);
		this.rigidBody.setRotation(worldRotation, true);

		this.characterController = this.physics.world.createCharacterController(0.01);
		this.characterController.setApplyImpulsesToDynamicBodies(true);
		this.characterController.enableAutostep(3, 0.1, true);
		this.characterController.enableSnapToGround(1);
	}

	loop(deltaTime: number) {
		const movement = this.movement.set(0, 0, 0);

		if (this.forward) {
			movement.z -= 1;
		}
		if (this.backward) {
			movement.z += 1;
		}
		if (this.left) {
			movement.x -= 1;
		}
		if (this.right) {
			movement.x += 1;
		}

		movement.normalize().multiplyScalar(deltaTime * 30);
		movement.y = -1;
		this.characterController.computeColliderMovement(this.collider, movement);

		const newPosition = this.nextPosition
			.copy(this.rigidBody.translation())
			.add(this.characterController.computedMovement());

		this.rigidBody.setNextKinematicTranslation(newPosition);

		this.character.position.copy(this.rigidBody.translation());
	}

	dispose() {
		this.unsubscribe();
		this.physics.world.removeCharacterController(this.characterController);
		this.physics.world.removeRigidBody(this.rigidBody);
		this.scene.remove(this.character);
		this.character.geometry.dispose();
		(this.character.material as THREE.Material).dispose();
	}
}
