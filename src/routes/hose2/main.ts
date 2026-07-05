import * as THREE from 'three';
import { SceneBuilder } from '$lib/sceneBuilder';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WaterJet } from '$lib/waterJet';

function addLights(scene: THREE.Scene) {
	// 1. Ambient Light - Soft base color (slightly warm)
	const ambient = new THREE.AmbientLight(0xfff0e0, 0.8);
	scene.add(ambient);

	// 2. Hemisphere Light - Creates nice sky/ground gradient (very useful for games)
	const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x668833, 0.8);
	hemiLight.position.set(0, 20, 0);
	scene.add(hemiLight);

	// 3. Main Directional Light (Sun-like)
	const sunLight = new THREE.DirectionalLight(0xffeecc, 2);
	sunLight.position.set(8, 15, 19);
	scene.add(sunLight);

	// 4. Colored Accent Lights (makes scene feel alive and encouraging)
	const accent1 = new THREE.DirectionalLight(0x66aaff, 0.8); // Cool blue
	accent1.position.set(-12, 8, -8);
	scene.add(accent1);

	const accent2 = new THREE.DirectionalLight(0xff88aa, 0.7); // Warm pink/magenta
	accent2.position.set(10, 6, -12);
	scene.add(accent2);

	// Optional: Point light for extra glow
	const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
	pointLight.position.set(0, 8, 10);
	scene.add(pointLight);
}

function addBox(scene: THREE.Scene): THREE.Mesh {
	const box = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
	const mesh = new THREE.Mesh(box, material);
	scene.add(mesh);
	return mesh;
}

function addGround(scene: THREE.Scene) {
	const mesh = new THREE.Mesh(
		new THREE.CircleGeometry(30, 32),
		new THREE.MeshPhongMaterial({
			color: 0x222222,
			emissive: 0x072534,
			side: THREE.DoubleSide,
			flatShading: true
		})
	);
	mesh.position.set(0, 0, 0);
	mesh.rotation.x = -Math.PI / 2;
	mesh.receiveShadow = true;
	scene.add(mesh);
}

function addUrinalModel(scene: THREE.Scene) {
	const loader = new GLTFLoader();

	loader.load(
		'/models/urinal.glb',
		(gltf) => {
			const model = gltf.scene;

			model.scale.set(12, 12, 12);
			model.position.set(0, -4, 2);
			model.rotation.y = 2 * Math.PI;

			scene.add(model);

			model.traverse((child) => {
				if ((child as THREE.Mesh).isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
		},
		(progress) => {
			console.log('Urinal GLB loading progress:', progress);
		},
		(error) => {
			console.error('Urinal GLB load failed:', error);
		}
	);
}

function addHornet(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
	const loader = new GLTFLoader();
	const clock = new THREE.Clock();
	let mixer: THREE.AnimationMixer;

	loader.load(
		'/models/hornet.glb',
		(gltf) => {
			const model = gltf.scene;

			model.scale.set(0.003, 0.003, 0.003);
			model.position.set(0, 0, 0);
			model.rotation.y = Math.PI;

			scene.add(model);

			model.traverse((child) => {
				if ((child as THREE.Mesh).isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			// animation setup
			if (gltf.animations.length > 0) {
				mixer = new THREE.AnimationMixer(model);

				gltf.animations.forEach((clip) => {
					mixer.clipAction(clip).play();
				});
			}

			// SINGLE render loop (safe)
			renderer.setAnimationLoop(() => {
				const delta = clock.getDelta();

				if (mixer) mixer.update(delta);
			});
		},
		(progress) => {
			console.log('GLTF loading progress:', progress);
		},
		(error) => {
			console.error('GLTF load failed:', error);
		}
	);
}

export class HoseSceneBuilder extends SceneBuilder {
	animationFrame: number = 0;
	waterJet!: WaterJet;

	constructor(container: HTMLElement) {
		super(container);

		const hosePos = new THREE.Vector3(0, 3, 10);

		addLights(this.scene);

		//addHornet(this.scene, this.renderer);
		//addBox(this.scene);
		addGround(this.scene);
		addUrinalModel(this.scene);

		this.waterJet = new WaterJet(this.scene, hosePos);
	}

	setupCamera() {
		super.setupCamera();
		this.camera.position.z = 10;
		this.camera.position.y = 10;
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));
	}

	animate() {
		this.waterJet.render();
		this.renderer.render(this.scene, this.camera);
		this.animationFrame = requestAnimationFrame(() => this.animate());
	}

	cleanup() {
		super.cleanup();
		cancelAnimationFrame(this.animationFrame);
	}
}
