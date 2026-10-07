import * as THREE from 'three/webgpu';
import type Physics from './Physics';
import type { LoadedAssets } from '../Utils/Assets';

/** Static level resources live until App disposal, not until the end of a round. */
export default class Environment {
	constructor(scene: THREE.Scene, physics: Physics, assets: LoadedAssets) {
		scene.background = new THREE.Color(0x30435e);
		scene.fog = new THREE.Fog(0x30435e, 60, 130);
		scene.add(new THREE.HemisphereLight(0xddeaff, 0x718598, 1.35));
		const key = new THREE.DirectionalLight(0xffffff, 1.1);
		key.position.set(-6, 18, 18);
		scene.add(key);
		// Soft, static stage spots: color on the porcelain without washing out the arena.
		for (const [color, x, y, z, targetX, targetY] of [
			[0x42cfff, -6, 14, 10, -1, 7],
			[0xff72aa, 6, 13, 9, 1, 7],
			[0x9674ff, 0, 16, 6, 0, 4]
		]) {
			const spot = new THREE.SpotLight(color, 180, 32, Math.PI / 7, 0.65, 2);
			spot.position.set(x, y, z);
			spot.target.position.set(targetX, targetY, 3.5);
			scene.add(spot, spot.target);
		}

		const urinal = assets.urinal.scene;
		urinal.scale.setScalar(12);
		urinal.position.set(0, 0, 2);
		scene.add(urinal);
		urinal.updateMatrixWorld(true);
		urinal.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) physics.add(child, 'fixed', 'trimesh', { kind: 'shell' });
		});
		// Catch the inner bowl behind the lip, before porcelain bounces can eject valid shots.
		physics.addSensor(new THREE.Vector3(0.2, 8, 4.7), new THREE.Vector3(1.3, 2.3, 0.75), {
			kind: 'capture'
		});
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.55, 0.035, 8, 40),
			new THREE.MeshBasicMaterial({ color: 0x81ffd3 })
		);
		ring.position.set(0.2, 6.02, 5.3);
		ring.rotation.x = -Math.PI / 2;
		scene.add(ring);

		assets.floor.colorSpace = THREE.SRGBColorSpace;
		assets.floor.wrapS = assets.floor.wrapT = THREE.RepeatWrapping;
		assets.floor.repeat.set(8, 8);
		const floor = new THREE.Mesh(
			new THREE.BoxGeometry(128, 0.2, 128),
			new THREE.MeshStandardMaterial({ map: assets.floor, roughness: 0.8, color: 0xbbcdd8 })
		);
		floor.position.y = -0.1;
		scene.add(floor);
		physics.add(floor, 'fixed', 'cuboid', { kind: 'spill' });
		assets.wall.colorSpace = THREE.SRGBColorSpace;
		assets.wall.wrapS = assets.wall.wrapT = THREE.RepeatWrapping;
		assets.wall.repeat.set(10, 5);
		const wall = new THREE.Mesh(
			new THREE.BoxGeometry(100, 45, 0.2),
			new THREE.MeshStandardMaterial({ map: assets.wall, roughness: 0.85, color: 0xa9bbc9 })
		);
		wall.position.set(0, 20, 0.5);
		scene.add(wall);
		physics.add(wall, 'fixed', 'cuboid', { kind: 'spill' });
	}
}
