<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	let container: HTMLDivElement;

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;

	let mouseX = 0;
	let mouseY = 0;
	let halfX = 0;
	let halfY = 0;

	let animationFrame = 0;

	// ---------------- PARTICLES ----------------
	type Particle = {
		position: THREE.Vector3;
		velocity: THREE.Vector3;
		life: number;
	};

	const particles: Particle[] = [];

	const gravity = new THREE.Vector3(0, -9.8, 0);

	// hose position (bottom center)
	const hosePos = new THREE.Vector3(0, -5, 0);

	onMount(() => {
		halfX = window.innerWidth / 2;
		halfY = window.innerHeight / 2;

		init();
		animate();

		window.addEventListener('resize', onResize);
		window.addEventListener('pointermove', onPointerMove);

		return () => {
			cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('pointermove', onPointerMove);
			renderer.dispose();
		};
	});

	function init() {
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0x000000, 0.02);

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		camera.position.z = 10;
		camera.position.y = 0;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);

		container.appendChild(renderer.domElement);

		// ---------------- HOSE ----------------
		const hoseGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 16);
		const hoseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
		const hose = new THREE.Mesh(hoseGeometry, hoseMaterial);

		hose.position.copy(hosePos);
		hose.rotation.x = Math.PI / 2;

		scene.add(hose);

		// ---------------- LIGHT ----------------
		const light = new THREE.DirectionalLight(0xffffff, 1);
		light.position.set(5, 10, 5);
		scene.add(light);

		scene.add(new THREE.AmbientLight(0xffffff, 0.5));
	}

	function spawnWater() {
		const dir = new THREE.Vector3((mouseX / halfX) * 2, (mouseY / halfY) * 1.5 + 1, -2).normalize();

		particles.push({
			position: hosePos.clone(),
			velocity: dir.multiplyScalar(6),
			life: 2
		});
	}

	let acc = 0;

	function animate() {
		animationFrame = requestAnimationFrame(animate);

		update();
		render();
	}

	function update() {
		// emit continuously
		acc += 0.02;

		while (acc > 0.02) {
			spawnWater();
			acc -= 0.02;
		}

		// update particles
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];

			p.velocity.add(gravity.clone().multiplyScalar(0.016));
			p.position.add(p.velocity.clone().multiplyScalar(0.016));

			p.life -= 0.016;

			// ground collision (y = -5 plane)
			if (p.position.y < -5) {
				p.position.y = -5;
				p.velocity.y *= -0.2;
				p.velocity.x *= 0.7;
				p.velocity.z *= 0.7;
			}

			if (p.life <= 0) {
				particles.splice(i, 1);
			}
		}
	}

	function render() {
		camera.position.x += (mouseX * 0.01 - camera.position.x) * 0.05;
		camera.position.y += (-mouseY * 0.01 - camera.position.y) * 0.05;

		camera.lookAt(0, -2, 0);

		// render particles as simple points (cheap + fast)
		const geometry = new THREE.BufferGeometry();
		const positions: number[] = [];

		for (const p of particles) {
			positions.push(p.position.x, p.position.y, p.position.z);
		}

		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

		const material = new THREE.PointsMaterial({
			color: 0x4dabf7,
			size: 0.08,
			transparent: true,
			opacity: 0.8
		});

		const points = new THREE.Points(geometry, material);

		scene.add(points);

		renderer.render(scene, camera);

		scene.remove(points);
		geometry.dispose();
		material.dispose();
	}

	function onPointerMove(e: PointerEvent) {
		mouseX = e.clientX - halfX;
		mouseY = e.clientY - halfY;
	}

	function onResize() {
		halfX = window.innerWidth / 2;
		halfY = window.innerHeight / 2;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}
</script>

<div bind:this={container} class="scene"></div>

<style>
	.scene {
		position: fixed;
		inset: 0;
		overflow: hidden;
	}
</style>
