import * as THREE from 'three';
import { SceneBuilder } from '$lib/sceneCreator';
import { getOrbitControls } from '$lib/utils';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
	pointLight.position.set(0, 8, 5);
	scene.add(pointLight);
}

function addBox(scene: THREE.Scene): THREE.Mesh {
	const box = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
	const mesh = new THREE.Mesh(box, material);
	scene.add(mesh);
	return mesh;
}

function addHose(scene: THREE.Scene): THREE.Mesh {
	const hosePos = new THREE.Vector3(0, 3, 10);
	const hoseGeometry = new THREE.CylinderGeometry(0.1, 0.2, 2, 16);
	const hoseMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
	const hose = new THREE.Mesh(hoseGeometry, hoseMaterial);

	hose.position.copy(hosePos);
	hose.rotation.x = Math.PI / 2;
	scene.add(hose);
	return hose;
}

function addGround(scene: THREE.Scene) {
	const mesh = new THREE.Mesh(
		new THREE.PlaneGeometry(100, 100),
		new THREE.MeshPhongMaterial({ color: 0xffffff, depthWrite: false })
	);
	mesh.rotation.x = -Math.PI / 2;
	mesh.receiveShadow = true;
	scene.add(mesh);
}

function addFly(scene: THREE.Scene) {
	const loader = new GLTFLoader();

	loader.load(
		'/models/hornet.glb',
		(gltf) => {
			const model = gltf.scene;
			model.scale.set(1, 1, 1);
			model.position.set(0, 0, 0);

			model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.castShadow = true;
					child.receiveShadow = true; // ← also important
				}
			});

			scene.add(model);
		},
		(error) => {
			console.error('Error loading model:', error);
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

			model.scale.set(0.006, 0.006, 0.006);
			model.position.set(0, 0, 0);

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
	box!: THREE.Mesh;
	controls!: OrbitControls;
	animationFrame: number = 0;
	timer = new THREE.Timer();

	constructor(container: HTMLElement) {
		super(container);

		addLights(this.scene);
		addHose(this.scene);

		addHornet(this.scene, this.renderer);
		addGround(this.scene);
		this.controls = getOrbitControls(this.camera, this.renderer.domElement);
	}

	setupCamera() {
		super.setupCamera();
		this.camera.position.z = 9;
		this.camera.position.y = 15;
	}

	animate() {
		this.controls.update(); // required for damping
		this.renderer.render(this.scene, this.camera);
		this.animationFrame = requestAnimationFrame(() => this.animate());
	}

	cleanup() {
		super.cleanup();
		cancelAnimationFrame(this.animationFrame);
		this.controls.dispose();
	}
}
