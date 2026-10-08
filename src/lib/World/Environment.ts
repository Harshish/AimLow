import * as THREE from 'three/webgpu';
import { Fn, color, texture, texture3D, time, uniform, vec3, screenCoordinate } from 'three/tsl';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { bayer16 } from 'three/addons/tsl/math/Bayer.js';
import type Physics from './Physics';
import type { LoadedAssets } from '../Utils/Assets';

/** Lights on this layer scatter through the haze volume; the main camera never draws it. */
export const HAZE_LAYER = 10;
const BACKDROP = 0x121a26;

/** Static level resources live until App disposal, not until the end of a round. */
export default class Environment {
	/** Shadowed downlight that makes the bowl the brightest, most readable target. */
	readonly hero: THREE.SpotLight;
	/** Colored lane fills; World tints them for power-ups and escapes. */
	readonly accents: { light: THREE.SpotLight; base: THREE.Color }[] = [];
	/** Raymarched dust the hero beam scatters through; rendered only by the high-quality pass. */
	readonly haze: THREE.Mesh<THREE.BoxGeometry, THREE.VolumeNodeMaterial>;
	readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;

	constructor(scene: THREE.Scene, physics: Physics, assets: LoadedAssets) {
		scene.background = new THREE.Color(BACKDROP);
		scene.fog = new THREE.Fog(BACKDROP, 45, 120);
		// Dim fill keeps edges readable; contrast comes from the hero and lane lights.
		scene.add(new THREE.HemisphereLight(0x9fb6ff, 0x1d1620, 0.45));
		const key = new THREE.DirectionalLight(0xffe8d6, 0.4);
		key.position.set(-6, 18, 24);
		scene.add(key);

		// High and to the left: a visible diagonal beam and a long shadow across the bricks.
		this.hero = new THREE.SpotLight(0xfff1dc, 3200, 70, 0.32, 0.55, 2);
		this.hero.position.set(-7, 30, 10);
		this.hero.target.position.set(0.2, 7, 4);
		this.hero.castShadow = true;
		this.hero.shadow.mapSize.set(1024, 1024);
		this.hero.shadow.bias = -0.0004;
		this.hero.shadow.intensity = 0.9;
		this.hero.layers.enable(HAZE_LAYER);
		scene.add(this.hero, this.hero.target);
		// Wide washes over each bug lane: targets pop against the darker wall.
		for (const [hex, side] of [
			[0x26d9ff, -1],
			[0xff3fa4, 1]
		]) {
			const light = new THREE.SpotLight(hex, 2900, 90, Math.PI / 7, 0.8, 2);
			light.position.set(side * 14, 34, 16);
			light.target.position.set(side * 8, 5, 5.5);
			scene.add(light, light.target);
			this.accents.push({ light, base: light.color.clone() });
		}

		this.haze = new THREE.Mesh(new THREE.BoxGeometry(18, 28, 12), hazeMaterial());
		this.haze.position.set(-2, 14, 6.5);
		this.haze.layers.set(HAZE_LAYER);
		scene.add(this.haze);

		const urinal = assets.urinal.scene;
		urinal.scale.setScalar(12);
		urinal.position.set(0, 0, 2);
		scene.add(urinal);
		urinal.updateMatrixWorld(true);
		urinal.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;
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
		const tag = new THREE.MeshStandardNodeMaterial({
			transparent: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -2,
			roughness: 0.6
		});
		tag.colorNode = color(0xc8f25a);
		tag.opacityNode = texture(assets.graffiti).a.mul(0.85);
		const decal = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), tag);
		decal.rotation.x = -Math.PI / 2;
		decal.position.set(0.2, 0.01, 11.5);
		decal.receiveShadow = true;
		scene.add(decal);
	}
}

function hazeMaterial() {
	const material = new THREE.VolumeNodeMaterial();
	const noise = noiseTexture();
	const density = uniform(1.6);
	material.steps = 14;
	// Dithered ray starts trade banding for fine noise; the composite blur removes it.
	material.offsetNode = bayer16(screenCoordinate);
	material.scatteringNode = Fn(({ positionRay }: { positionRay: THREE.Node<'vec3'> }) => {
		const drift = vec3(time.mul(0.35), time.mul(0.12), time.mul(0.2));
		const grain = (scale: number, speed: number) =>
			texture3D(noise, positionRay.add(drift.mul(speed)).mul(scale).mod(1), 0).r.add(0.5);
		// Two drifting octaves read as dust in the beam rather than a flat cone.
		const dust = grain(0.05, 1).mul(grain(0.12, 1.6));
		return density.mix(1, dust);
	});
	return material;
}

function noiseTexture() {
	// ponytail: 32³ noise is ~33k samples at load; upscale only if the dust looks blocky.
	const size = 32;
	const data = new Uint8Array(size ** 3);
	const perlin = new ImprovedNoise();
	for (let z = 0, i = 0; z < size; z++)
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++, i++) data[i] = 128 + 128 * perlin.noise(x / 4, y / 4, z / 4);
	const noise = new THREE.Data3DTexture(data, size, size, size);
	noise.format = THREE.RedFormat;
	noise.minFilter = noise.magFilter = THREE.LinearFilter;
	noise.wrapS = noise.wrapT = noise.wrapR = THREE.RepeatWrapping;
	noise.unpackAlignment = 1;
	noise.needsUpdate = true;
	return noise;
}
