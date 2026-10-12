import * as THREE from 'three/webgpu';
import { color, smoothstep, texture } from 'three/tsl';
import type Physics from './Physics';
import type { LoadedAssets } from '../Utils/Assets';

const BACKDROP = 0x121a26;

/** Static level resources live until App disposal, not until the end of a round. */
export default class Environment {
	/** Shadowed downlight that makes the bowl the brightest, most readable target. */
	readonly hero: THREE.SpotLight;
	/** Colored lane fills; World tints them for power-ups and escapes. */
	readonly accents: { light: THREE.SpotLight; base: THREE.Color }[] = [];
	readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;

	constructor(scene: THREE.Scene, physics: Physics, assets: LoadedAssets) {
		scene.background = new THREE.Color(BACKDROP);
		scene.fog = new THREE.Fog(BACKDROP, 45, 120);
		// Low fill: the stage stays readable, but the spotlight pool owns the contrast.
		scene.add(new THREE.HemisphereLight(0x9fb6ff, 0x1d1620, 0.22));
		const key = new THREE.DirectionalLight(0xffe8d6, 0.1);
		key.position.set(-6, 18, 24);
		scene.add(key);

		// Stage spotlight: a tight, hard-edged pool on the bowl, like a comic panel's focus.
		this.hero = new THREE.SpotLight(0xfffaf2, 2600, 80, 0.3, 0.12, 2);
		this.hero.position.set(-6, 32, 16);
		this.hero.target.position.set(0.2, 8, 3);
		this.hero.castShadow = true;
		this.hero.shadow.mapSize.set(1024, 1024);
		this.hero.shadow.bias = -0.0004;
		this.hero.shadow.intensity = 0.9;
		scene.add(this.hero, this.hero.target);
		// Narrow washes over each bug lane; they stop short of the bowl so it stays clean white.
		for (const [hex, side] of [
			[0x26d9ff, -1],
			[0xff3fa4, 1]
		]) {
			const light = new THREE.SpotLight(hex, 2400, 90, Math.PI / 10, 0.5, 2);
			light.position.set(side * 16, 34, 16);
			light.target.position.set(side * 10, 5, 5.5);
			scene.add(light, light.target);
			this.accents.push({ light, base: light.color.clone() });
		}

		const urinal = assets.urinal.scene;
		urinal.scale.setScalar(12);
		urinal.position.set(0, 0, 2);
		scene.add(urinal);
		urinal.updateMatrixWorld(true);
		// Three flat tones and an ink outline (Renderer) instead of glossy porcelain glare.
		const gradientMap = new THREE.DataTexture(
			new Uint8Array([70, 160, 255]),
			3,
			1,
			THREE.RedFormat
		);
		gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
		gradientMap.needsUpdate = true;
		const porcelain = new THREE.MeshToonMaterial({
			color: 0xf7f6f2,
			gradientMap,
			side: THREE.DoubleSide
		});
		urinal.traverse((child) => {
			const mesh = child as THREE.Mesh;
			if (!mesh.isMesh) return;
			(mesh.material as THREE.Material).dispose();
			mesh.material = porcelain;
			child.castShadow = child.receiveShadow = true;
			physics.add(child, 'fixed', 'trimesh', { kind: 'shell' });
		});
		// Catch the inner bowl behind the lip, before porcelain bounces can eject valid shots.
		physics.addSensor(new THREE.Vector3(0.2, 8, 4.7), new THREE.Vector3(1.3, 2.3, 0.75), {
			kind: 'capture'
		});
		this.ring = new THREE.Mesh(
			new THREE.TorusGeometry(0.55, 0.035, 8, 40),
			new THREE.MeshBasicMaterial({ color: 0x81ffd3 })
		);
		this.ring.position.set(0.2, 6.02, 5.3);
		this.ring.rotation.x = -Math.PI / 2;
		scene.add(this.ring);

		assets.floor.colorSpace = THREE.SRGBColorSpace;
		assets.floor.wrapS = assets.floor.wrapT = THREE.RepeatWrapping;
		assets.floor.repeat.set(8, 8);
		const floor = new THREE.Mesh(
			new THREE.BoxGeometry(128, 0.2, 128),
			// Wet tiles: a soft sheen picks up the spotlights and reflections.
			new THREE.MeshStandardMaterial({ map: assets.floor, roughness: 0.42, color: 0x93a3b0 })
		);
		floor.position.y = -0.1;
		floor.receiveShadow = true;
		scene.add(floor);
		physics.add(floor, 'fixed', 'cuboid', { kind: 'spill' });
		assets.wall.colorSpace = THREE.SRGBColorSpace;
		assets.wall.wrapS = assets.wall.wrapT = THREE.RepeatWrapping;
		assets.wall.repeat.set(10, 5);
		const wall = new THREE.Mesh(
			new THREE.BoxGeometry(100, 45, 0.2),
			new THREE.MeshStandardMaterial({ map: assets.wall, roughness: 0.9, color: 0x8796a6 })
		);
		wall.position.set(0, 20, 0.5);
		wall.receiveShadow = true;
		scene.add(wall);
		physics.add(wall, 'fixed', 'cuboid', { kind: 'spill' });

		// The title as a lime floor tag in front of the bowl: on brand, never behind a bug lane.
		// Half-opaque paint lets the wet tiles read through; the text stays in front of spider lanes.
		const tag = new THREE.MeshStandardNodeMaterial({
			transparent: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -2,
			roughness: 0.6
		});
		tag.colorNode = color(0xc8f25a);
		// The PNG carries a faint haze (alpha <= 21/255) over the whole square; cut it so only paint shows.
		tag.opacityNode = smoothstep(0.1, 0.25, texture(assets.graffiti).a).mul(0.5);
		const decal = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), tag);
		decal.rotation.x = -Math.PI / 2;
		decal.position.set(0.2, 0.01, 11);
		decal.receiveShadow = true;
		scene.add(decal);
	}
}
