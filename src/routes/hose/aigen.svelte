<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	let container: HTMLDivElement;

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let hose: THREE.Group;
	let points: THREE.Points;
	let geometry: THREE.BufferGeometry;

	let mouseX = 0;
	let mouseY = 0;
	let halfX = 0;
	let halfY = 0;

	const MAX_PARTICLES = 50000;
	const positions = new Float32Array(MAX_PARTICLES * 3);
	const velocities = new Float32Array(MAX_PARTICLES * 3);
	const sizes = new Float32Array(MAX_PARTICLES);
	const life = new Float32Array(MAX_PARTICLES);

	let spawnIndex = 0;
	let acc = 0;

	let config = {
		flowRate: 0.00105,
		pressure: 16.5,
		spread: 0.28,
		gravity: -12,
		life: 2.3,
		nozzleLength: 3.6
	};

	const hosePos = new THREE.Vector3(-2.5, -1.2, 0);
	let hoseDir = new THREE.Vector3(0, 0.2, -1).normalize();

	onMount(() => {
		halfX = window.innerWidth / 2;
		halfY = window.innerHeight / 2;
		init();
		animate();

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('resize', onResize);

		return () => {
			renderer.dispose();
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('resize', onResize);
		};
	});

	function init() {
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0x0a0e1a, 0.03);

		camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
		camera.position.set(0, 1.2, 9.5);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		container.appendChild(renderer.domElement);

		// Hose
		hose = new THREE.Group();
		const body = new THREE.Mesh(
			new THREE.CylinderGeometry(0.13, 0.17, 4.2, 28),
			new THREE.MeshStandardMaterial({ color: 0x1f252f, roughness: 0.8 })
		);
		body.rotation.x = Math.PI / 2;
		body.position.z = 1.8;
		hose.add(body);

		const nozzle = new THREE.Mesh(
			new THREE.CylinderGeometry(0.085, 0.12, 0.75, 28),
			new THREE.MeshStandardMaterial({ color: 0x11171f, metalness: 0.9, roughness: 0.3 })
		);
		nozzle.rotation.x = Math.PI / 2;
		nozzle.position.z = 4.1;
		hose.add(nozzle);

		const glow = new THREE.Mesh(
			new THREE.SphereGeometry(0.16, 16, 16),
			new THREE.MeshBasicMaterial({ color: 0x99ddff })
		);
		glow.position.z = 4.45;
		hose.add(glow);

		hose.position.copy(hosePos);
		scene.add(hose);

		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const dirLight = new THREE.DirectionalLight(0xaaddff, 1.4);
		dirLight.position.set(5, 8, 4);
		scene.add(dirLight);

		geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

		const material = new THREE.PointsMaterial({
			color: 0x77ccff,
			size: 0.085,
			transparent: true,
			opacity: 0.9,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});

		points = new THREE.Points(geometry, material);
		scene.add(points);
	}

	function updateHose() {
		const targetX = (mouseX / halfX) * 3;
		const targetY = -(mouseY / halfY) * 2.6;
		hoseDir.set(targetX, targetY + 0.4, -1).normalize();

		const targetPoint = hosePos.clone().add(hoseDir.clone().multiplyScalar(10));
		hose.lookAt(targetPoint);
	}

	function spawnParticle(i: number) {
		const i3 = i * 3;
		const nozzleTip = hosePos.clone().add(hoseDir.clone().multiplyScalar(config.nozzleLength));

		positions[i3] = nozzleTip.x;
		positions[i3 + 1] = nozzleTip.y;
		positions[i3 + 2] = nozzleTip.z;

		const spread = config.spread;
		const speed = config.pressure + Math.random() * 7;

		velocities[i3] = hoseDir.x * speed + (Math.random() - 0.5) * spread;
		velocities[i3 + 1] = hoseDir.y * speed + (Math.random() - 0.5) * spread * 0.6;
		velocities[i3 + 2] = hoseDir.z * speed + (Math.random() - 0.5) * spread;

		sizes[i] = 0.06 + Math.random() * 0.09;
		life[i] = config.life + Math.random() * 0.9;
	}

	function update() {
		updateHose();

		acc += 0.016;
		while (acc > config.flowRate) {
			spawnParticle(spawnIndex);
			spawnIndex = (spawnIndex + 1) % MAX_PARTICLES;
			acc -= config.flowRate;
		}

		for (let i = 0; i < MAX_PARTICLES; i++) {
			if (life[i] <= 0) continue;
			const i3 = i * 3;

			velocities[i3 + 1] += config.gravity * 0.016;

			velocities[i3] *= 0.978;
			velocities[i3 + 1] *= 0.978;
			velocities[i3 + 2] *= 0.978;

			positions[i3] += velocities[i3] * 0.016;
			positions[i3 + 1] += velocities[i3 + 1] * 0.016;
			positions[i3 + 2] += velocities[i3 + 2] * 0.016;

			// === IMPROVED GROUND COLLISION ===
			if (positions[i3 + 1] < -3.4) {
				const incomingSpeed = Math.abs(velocities[i3 + 1]);

				positions[i3 + 1] = -3.4;

				// Small bounce + strong radial splash
				velocities[i3 + 1] = incomingSpeed * 0.12 + Math.random() * 1.2;
				const splashPower = 4.2 + incomingSpeed * 0.4;

				velocities[i3] += (Math.random() - 0.5) * splashPower;
				velocities[i3 + 2] += (Math.random() - 0.5) * splashPower;

				velocities[i3] *= 0.75;
				velocities[i3 + 2] *= 0.75;

				// FAST DISAPPEARANCE ON GROUND
				sizes[i] *= 0.6;
				life[i] = Math.min(life[i] * 0.35, 0.45);
			}

			life[i] -= 0.016;

			// Faster fade when life is low
			if (life[i] < 0.6) {
				sizes[i] *= 0.89;
			}
		}

		geometry.attributes.position.needsUpdate = true;
		geometry.attributes.size.needsUpdate = true;
	}

	function animate() {
		requestAnimationFrame(animate);
		update();
		renderer.render(scene, camera);
	}

	function setPreset(name: string) {
		if (name === 'gentle') {
			config.flowRate = 0.002;
			config.pressure = 11;
			config.spread = 0.48;
			config.gravity = -9;
		} else if (name === 'powerful') {
			config.flowRate = 0.0008;
			config.pressure = 24;
			config.spread = 0.18;
			config.gravity = -13.8;
		} else if (name === 'wide') {
			config.flowRate = 0.0012;
			config.pressure = 14.5;
			config.spread = 0.72;
			config.gravity = -10.5;
		}
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

<div class="controls">
	<h3>Water Hose Controls</h3>
	<button on:click={() => setPreset('gentle')}>Gentle Spray</button>
	<button on:click={() => setPreset('powerful')}>Powerful Jet</button>
	<button on:click={() => setPreset('wide')}>Wide Fan</button>

	<div class="slider">
		<label>Pressure: {config.pressure}</label>
		<input type="range" min="8" max="28" step="0.5" bind:value={config.pressure} />
	</div>
	<div class="slider">
		<label>Spread: {config.spread.toFixed(2)}</label>
		<input type="range" min="0.1" max="0.8" step="0.01" bind:value={config.spread} />
	</div>
	<div class="slider">
		<label>Flow: {(1 / config.flowRate).toFixed(0)}/sec</label>
		<input type="range" min="0.0006" max="0.003" step="0.00005" bind:value={config.flowRate} />
	</div>
</div>

<style>
	.scene {
		position: fixed;
		inset: 0;
		background: radial-gradient(circle at 40% 30%, #1e2a44, #0b0f1a);
	}

	.controls {
		position: fixed;
		top: 15px;
		right: 15px;
		background: rgba(10, 15, 35, 0.85);
		padding: 16px 20px;
		border-radius: 12px;
		color: #fff;
		z-index: 100;
		backdrop-filter: blur(10px);
		min-width: 260px;
	}

	button {
		width: 100%;
		margin: 6px 0;
		padding: 10px;
		background: #3366ff;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	button:hover {
		background: #4488ff;
	}

	.slider {
		margin: 16px 0;
	}
	.slider label {
		display: block;
		margin-bottom: 5px;
		font-size: 0.9em;
	}
</style>
