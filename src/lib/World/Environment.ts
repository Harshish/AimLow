import * as THREE from 'three/webgpu';

import type Physics from './Physics';
import type { LoadedAssets } from '../Utils/Assets';
import { Wasp } from './Elements/Wasp';
import { Spider } from './Elements/Spider';

// Used for addding Lights to our scene
export default class Environment {
	groundMesh!: THREE.Mesh;
	constructor(
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		private readonly assets: LoadedAssets
	) {
		this.loadEnvironment();
	}

	addLights() {
		// 1. Ambient Light - Soft base color (slightly warm)
		const ambient = new THREE.AmbientLight(0xfff0e0, 0.8);
		this.scene.add(ambient);

		// 2. Hemisphere Light - Creates nice sky/ground gradient (very useful for games)
		const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x668833, 0.8);
		hemiLight.position.set(0, 20, 0);
		this.scene.add(hemiLight);

		// 3. Main Directional Light (Sun-like)
		const sunLight = new THREE.DirectionalLight(0xffeecc, 2);
		sunLight.position.set(0, -3, 25);
		this.scene.add(sunLight);

		// 4. Colored Accent Lights (makes scene feel alive and encouraging)
		const accent1 = new THREE.DirectionalLight(0x66aaff, 0.8); // Cool blue
		accent1.position.set(-12, 8, -4);
		this.scene.add(accent1);

		const accent2 = new THREE.DirectionalLight(0xff88aa, 0.7); // Warm pink/magenta
		accent2.position.set(10, 6, -2);
		this.scene.add(accent2);

		// Optional: Point light for extra glow
		const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
		pointLight.position.set(0, 10, 15);
		this.scene.add(pointLight);
	}

	addUrinal() {
		const gltfAsset = this.assets.urinal;
		const urinal = gltfAsset.scene;
		urinal.scale.set(12, 12, 12);
		urinal.position.set(0, 0, 2);
		urinal.rotation.y = 2 * Math.PI;
		urinal.userData.name = 'urinal';
		urinal.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				this.physics.add(child as THREE.Mesh, 'fixed', 'trimesh', true);
				child.userData.name = 'urinal';
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
		this.scene.add(urinal);
	}

	loadEnvironment() {
		this.addLights();
		this.addUrinal();
		this.addGround();
		this.addWall();

		new Wasp(this.scene, this.physics, this.assets.wasp);
		new Spider(this.scene, this.physics, this.assets.spider);
	}

	addGround() {
		const texture = this.assets.floor;
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(8, 8);

		this.groundMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(128, 128),
			new THREE.MeshStandardMaterial({
				map: texture,
				metalness: 0.2,
				roughness: 0.4,
				color: 0xffffff
			})
		);

		this.groundMesh.position.set(0, 0, 19.2);
		this.groundMesh.rotation.x = -Math.PI / 2;
		this.groundMesh.receiveShadow = true;
		this.groundMesh.userData = { name: 'ground' };

		this.scene.add(this.groundMesh);
		this.physics.add(this.groundMesh, 'fixed', 'cuboid', true);
	}

	addWall() {
		const texture = this.assets.wall;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(6, 6);

		const material = new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 1.0,
			metalness: 0
		});

		const graffiti_texture = this.assets.graffiti;
		graffiti_texture.colorSpace = THREE.SRGBColorSpace;

		const material2 = new THREE.MeshBasicMaterial({
			map: graffiti_texture,
			transparent: true,
			alphaTest: 0.1,
			side: THREE.DoubleSide
		});

		const gwall = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), material2);

		gwall.position.set(0, 15, 0.6);

		const wall = new THREE.Mesh(new THREE.PlaneGeometry(128, 128), material);

		wall.position.set(0, 10, 0.5);
		wall.receiveShadow = true;
		wall.userData = { name: 'wall' };

		this.scene.add(wall);
		this.scene.add(gwall);

		this.physics.add(wall, 'fixed', 'cuboid', true);
	}
}
