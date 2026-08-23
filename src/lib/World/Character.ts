import * as THREE from 'three';
import App from '../App.js';
import RAPIER from '@dimforge/rapier3d-compat';
import Physics from './Physics';

import { inputStore } from '../Utils/Store.ts';

export default class Character {
	app: App;
	scene: THREE.Scene;
	character!: THREE.Mesh;
	forward: boolean = false;
	backward: boolean = false;
	left: boolean = false;
	right: boolean = false;
	characterRigidBody!: RAPIER.RigidBody;
	physics: Physics;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;
		this.physics = this.app.world.physics;

		inputStore.subscribe((state) => {
			this.forward = state.forward;
			this.backward = state.backward;
			this.left = state.left;
			this.right = state.right;
		});

		this.instantiateCharacter();
	}

	instantiateCharacter() {
		const geometry = new THREE.BoxGeometry(2, 2, 2);
		const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
		this.character = new THREE.Mesh(geometry, material);
		this.character.position.set(0, 2.5, 0);
		this.scene.add(this.character);
		this.characterRigidBody = this.physics.add(this.character, 'kinematicPosition', 'cuboid');
	}

	loop() {
		let { x, y, z } = this.characterRigidBody.translation();
		//this.characterRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

		if (this.forward) {
			z = z - 5;
		}

		if (this.backward) {
			z = z + 5;
		}

		if (this.left) {
			x = x - 5;
		}

		if (this.right) {
			x = x + 5;
		}

		//this.characterRigidBody.setLinvel({ x, y, z }, true);
		this.characterRigidBody.setNextKinematicTranslation({ x, y, z });
	}
}
