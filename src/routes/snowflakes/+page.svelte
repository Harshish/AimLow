<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	import snowflake1 from '$lib/assets/textures/snowflake1.png';
	import snowflake2 from '$lib/assets/textures/snowflake2.png';
	import snowflake3 from '$lib/assets/textures/snowflake3.png';
	import snowflake4 from '$lib/assets/textures/snowflake4.png';
	import snowflake5 from '$lib/assets/textures/snowflake5.png';

	let container: HTMLDivElement;

	let camera: THREE.PerspectiveCamera;
	let scene: THREE.Scene;
	let renderer: THREE.WebGLRenderer;

	let mouseX = 0;
	let mouseY = 0;

	let windowHalfX = 0;
	let windowHalfY = 0;

	const materials: THREE.PointsMaterial[] = [];

	type Parameter = {
		color: [number, number, number];
		sprite: THREE.Texture;
		size: number;
	};

	const parameters: Parameter[] = [];

	let animationFrame = 0;

	onMount(() => {
		// safe: browser-only
		windowHalfX = window.innerWidth / 2;
		windowHalfY = window.innerHeight / 2;

		init();
		animate();

		window.addEventListener('resize', onWindowResize);
		window.addEventListener('pointermove', onPointerMove);

		return () => {
			cancelAnimationFrame(animationFrame);

			window.removeEventListener('resize', onWindowResize);
			window.removeEventListener('pointermove', onPointerMove);

			renderer?.dispose();
			if (container && renderer?.domElement) {
				container.removeChild(renderer.domElement);
			}
		};
	});

	function init() {
		// ---------------- CAMERA ----------------
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
		camera.position.z = 1000;

		// ---------------- SCENE ----------------
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0x000000, 0.0008);

		// ---------------- GEOMETRY ----------------
		const geometry = new THREE.BufferGeometry();
		const vertices: number[] = [];

		for (let i = 0; i < 10000; i++) {
			vertices.push(
				Math.random() * 2000 - 1000,
				Math.random() * 2000 - 1000,
				Math.random() * 2000 - 1000
			);
		}

		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

		// ---------------- TEXTURES ----------------
		const loader = new THREE.TextureLoader();

		const load = (t: string) => {
			const tex = loader.load(t);
			tex.colorSpace = THREE.SRGBColorSpace;
			return tex;
		};

		const sprite1 = load(snowflake1);
		const sprite2 = load(snowflake2);
		const sprite3 = load(snowflake3);
		const sprite4 = load(snowflake4);
		const sprite5 = load(snowflake5);

		parameters.push(
			{ color: [1.0, 0.2, 0.5], sprite: sprite2, size: 20 },
			{ color: [0.95, 0.1, 0.5], sprite: sprite3, size: 15 },
			{ color: [0.9, 0.05, 0.5], sprite: sprite1, size: 10 },
			{ color: [0.85, 0, 0.5], sprite: sprite5, size: 8 },
			{ color: [0.8, 0, 0.5], sprite: sprite4, size: 5 }
		);

		// ---------------- PARTICLES ----------------
		for (let i = 0; i < parameters.length; i++) {
			const { color, sprite, size } = parameters[i];

			const material = new THREE.PointsMaterial({
				size,
				map: sprite,
				blending: THREE.AdditiveBlending,
				depthTest: false,
				transparent: true
			});

			material.color.setHSL(color[0], color[1], color[2]);

			materials.push(material);

			const points = new THREE.Points(geometry, material);

			points.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

			scene.add(points);
		}

		// ---------------- RENDERER ----------------
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);

		container.appendChild(renderer.domElement);
	}

	function onWindowResize() {
		windowHalfX = window.innerWidth / 2;
		windowHalfY = window.innerHeight / 2;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function onPointerMove(event: PointerEvent) {
		mouseX = event.clientX - windowHalfX;
		mouseY = event.clientY - windowHalfY;
	}

	function animate() {
		animationFrame = requestAnimationFrame(animate);
		render();
	}

	function render() {
		const time = Date.now() * 0.00005;

		camera.position.x += (mouseX - camera.position.x) * 0.05;
		camera.position.y += (-mouseY - camera.position.y) * 0.05;

		camera.lookAt(scene.position);

		scene.children.forEach((obj, i) => {
			if (obj instanceof THREE.Points) {
				obj.rotation.y = time * (i < 4 ? i + 1 : -(i + 1));
			}
		});

		for (let i = 0; i < materials.length; i++) {
			const c = parameters[i].color;

			const h = ((360 * (c[0] + time)) % 360) / 360;

			materials[i].color.setHSL(h, c[1], c[2]);
		}

		renderer.render(scene, camera);
	}
</script>

<div bind:this={container} class="scene-container"></div>
<button
	class="absolute top-4 right-4 z-50 cursor-pointer rounded bg-white
         px-3 py-2 text-black hover:bg-gray-200"
>
	Click me here
</button>

<style>
	.scene-container {
		position: fixed;
		inset: 0;
		background: black;
		overflow: hidden;
		z-index: -99;
	}
</style>
