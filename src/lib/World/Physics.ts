import * as THREE from 'three';
import App from '../App';
import RAPIER from '@dimforge/rapier3d-compat';

export default class Physics {
	app: App;
	scene: THREE.Scene;
	world: any;
	cubeMesh!: THREE.Mesh;
	rigidBody!: RAPIER.RigidBody;
	rapierLoaded = false;
	groundMesh!: THREE.Mesh;
	groundRigidBody!: RAPIER.RigidBody;
	constructor() {
		this.app = new App();
		this.scene = this.app.scene;

		import('@dimforge/rapier3d-compat').then(async (module) => {
			const RAPIER = module.default;
			await RAPIER.init();
			const gravity = { x: 0, y: -9.81, z: 0 };
			this.world = new RAPIER.World(gravity);

			// Create ThreeJS Mesh
			const geomentry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({ color: 'orange' });
			this.cubeMesh = new THREE.Mesh(geomentry, material);
			this.cubeMesh.position.y = 30;
			this.cubeMesh.rotation.x = 1;
			this.cubeMesh.rotation.z = 1;
			this.scene.add(this.cubeMesh);

			const groundGeometry = new THREE.BoxGeometry(10, 1, 10);
			const groundMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
			this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
			this.scene.add(this.groundMesh);

			// Create Physics Wolrld Object
			const rigidBodyType = RAPIER.RigidBodyDesc.dynamic();
			this.rigidBody = this.world.createRigidBody(rigidBodyType);
			this.rigidBody.setTranslation(
				{
					x: this.cubeMesh.position.x,
					y: this.cubeMesh.position.y,
					z: this.cubeMesh.position.z
				},
				true
			);
			this.rigidBody.setRotation(
				{
					x: this.cubeMesh.quaternion.x,
					y: this.cubeMesh.quaternion.y,
					z: this.cubeMesh.quaternion.z,
					w: this.cubeMesh.quaternion.w
				},
				true
			);

			const colliderType = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
			this.world.createCollider(colliderType, this.rigidBody);

			const groundRigidBodyType = RAPIER.RigidBodyDesc.fixed();
			this.groundRigidBody = this.world.createRigidBody(groundRigidBodyType);

			const groundColliderType = RAPIER.ColliderDesc.cuboid(5, 0.5, 5);
			this.world.createCollider(groundColliderType, this.groundRigidBody);

			this.rapierLoaded = true;
		});
	}

	loop() {
		// Update the ThreeJS Mesh According to Physics World Object
		if (!this.rapierLoaded) return;

		this.world.step();

		const position = this.rigidBody.translation();
		const rotation = this.rigidBody.rotation();

		this.cubeMesh.position.copy(position);
		this.cubeMesh.quaternion.copy(rotation);
	}
}
