import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import * as THREE from 'three/webgpu';
import { get } from 'svelte/store';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import FixedStep from '../src/lib/Utils/FixedStep';
import Loop from '../src/lib/Utils/Loop';
import InputController from '../src/lib/UI/InputController';
import { inputStore, gameStateStore } from '../src/lib/Utils/Store';
import { CollisionHandler } from '../src/lib/Utils/CollisionHandler';
import { disposeResources } from '../src/lib/Utils/disposeResources';
import Physics from '../src/lib/World/Physics';
import { WaterJet } from '../src/lib/World/Elements/WaterJet';
import AssetLoader from '../src/lib/Utils/AssetLoader';

function mockGlobal(t: TestContext, name: string, value: unknown) {
	const original = Object.getOwnPropertyDescriptor(globalThis, name);
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
	t.after(() => {
		if (original) Object.defineProperty(globalThis, name, original);
		else Reflect.deleteProperty(globalThis, name);
	});
}

function browserWindow() {
	return Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600 });
}

function model(): GLTF {
	const scene = new THREE.Group();
	// Only scene resources are used by the loader; parser internals are irrelevant here.
	return { scene, scenes: [scene], animations: [], cameras: [], asset: {} } as unknown as GLTF;
}

test('fixed simulation produces 60 steps per second across rendering rates', () => {
	for (const fps of [30, 60, 120, 144]) {
		const clock = new FixedStep();
		let steps = 0;
		for (let frame = 0; frame < fps; frame++) {
			clock.advance(1 / fps, (delta) => {
				assert.equal(delta, 1 / 60);
				steps++;
			});
		}
		assert.equal(steps, 60, `${fps} FPS`);
	}
});

test('fixed simulation bounds catch-up and rejects invalid elapsed times', () => {
	const clock = new FixedStep();
	let steps = 0;
	const step = () => steps++;
	for (const delta of [0, -1, NaN, Infinity]) clock.advance(delta, step);
	assert.equal(steps, 0);
	clock.advance(30, step);
	assert.equal(steps, 6);
	clock.advance(1 / 120, step);
	assert.equal(steps, 6);
	clock.advance(1 / 120, step);
	assert.equal(steps, 7);
});

test('animation loop starts once, bounds elapsed time, and cancels on disposal', (t) => {
	let id = 0;
	const frames = new Map<number, FrameRequestCallback>();
	mockGlobal(t, 'requestAnimationFrame', (callback: FrameRequestCallback) => {
		frames.set(++id, callback);
		return id;
	});
	mockGlobal(t, 'cancelAnimationFrame', (frame: number) => frames.delete(frame));
	const deltas: number[] = [];
	const loop = new Loop((delta) => deltas.push(delta));
	const tick = (time: number) => {
		const [frame, callback] = frames.entries().next().value!;
		frames.delete(frame);
		callback(time);
	};
	loop.start();
	loop.start();
	assert.equal(frames.size, 1);
	tick(100);
	tick(116);
	tick(20000);
	assert.deepEqual(deltas, [0, 0.016, 0.1]);
	loop.dispose();
	loop.dispose();
	assert.equal(frames.size, 0);
	loop.start();
	tick(30000);
	assert.equal(deltas.at(-1), 0);
	loop.dispose();
});

test('input handles overlapping key aliases, focus loss, and listener cleanup', (t) => {
	const target = browserWindow();
	mockGlobal(t, 'window', target);
	const input = new InputController();
	const key = (type: string, code: string) =>
		target.dispatchEvent(Object.assign(new Event(type), { code }));
	key('keydown', 'KeyW');
	key('keydown', 'ArrowUp');
	key('keyup', 'KeyW');
	assert.equal(get(inputStore).forward, true);
	key('keyup', 'ArrowUp');
	assert.equal(get(inputStore).forward, false);
	key('keydown', 'KeyA');
	target.dispatchEvent(new Event('blur'));
	assert.equal(get(inputStore).left, false);
	input.dispose();
	key('keydown', 'KeyW');
	assert.equal(get(inputStore).forward, false);
});

test('collision routing accepts groups, is order-independent, and unregisters safely', () => {
	const collisions = new CollisionHandler();
	const group = new THREE.Group();
	group.userData.name = 'urinal';
	let calls = 0;
	const removeOld = collisions.addCollisionHandler('urinal', undefined, () => calls++);
	collisions.resolveCollision(undefined, group, true);
	assert.equal(calls, 1);
	const removeNew = collisions.addCollisionHandler(undefined, 'urinal', () => (calls += 10));
	removeOld();
	collisions.resolveCollision(group, undefined, true);
	assert.equal(calls, 11);
	removeNew();
	collisions.resolveCollision(group, undefined, true);
	assert.equal(calls, 11);
	assert.notEqual(collisions.resolveKeyOrder('a:b', 'c'), collisions.resolveKeyOrder('a', 'b:c'));
});

test('shared GPU resources and ImageBitmaps are disposed only once', (t) => {
	let bitmapCloses = 0;
	class Bitmap {
		close() {
			bitmapCloses++;
		}
	}
	mockGlobal(t, 'ImageBitmap', Bitmap);
	const geometry = new THREE.BoxGeometry();
	const texture = new THREE.Texture();
	texture.image = new Bitmap();
	const clone = texture.clone();
	const material = new THREE.MeshStandardMaterial({ map: texture });
	const scene = new THREE.Scene();
	scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
	const counts = [0, 0, 0];
	geometry.addEventListener('dispose', () => counts[0]++);
	material.addEventListener('dispose', () => counts[1]++);
	texture.addEventListener('dispose', () => counts[2]++);
	disposeResources([scene, scene.children[0], texture, clone]);
	assert.deepEqual(counts, [1, 1, 1]);
	assert.equal(bitmapCloses, 1);
});

test('physics validates before allocation and synchronizes only moving bodies', async () => {
	const physics = await Physics.create();
	const scene = new THREE.Scene();
	try {
		assert.throws(() => physics.add(new THREE.Group(), 'fixed', 'cuboid'), /THREE.Mesh/);
		assert.equal(physics.world.bodies.len(), 0);
		const floor = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
		floor.position.y = -10;
		scene.add(floor);
		physics.add(floor, 'fixed', 'cuboid');
		assert.equal(physics.meshMap.size, 0);
		const parent = new THREE.Group();
		parent.position.set(4, 2, 3);
		parent.rotation.y = 0.5;
		scene.add(parent);
		const moving = new THREE.Group();
		parent.add(moving);
		const body = physics.add(moving, 'dynamic', 'ball');
		assert.equal(physics.meshMap.size, 1);
		physics.loop(1 / 60);
		const actual = moving.getWorldPosition(new THREE.Vector3());
		assert.ok(actual.distanceTo(new THREE.Vector3().copy(body.translation())) < 1e-6);
		assert.ok(body.translation().y < 2);
	} finally {
		physics.dispose();
		physics.dispose();
		disposeResources([scene]);
	}
});

test('water simulation is bounded, uploads current positions, scores collisions, and cleans up', async (t) => {
	const target = browserWindow();
	mockGlobal(t, 'window', target);
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const jet = new WaterJet(scene, physics, new THREE.Vector3(0, 10, 17));
	try {
		for (let i = 0; i < 240; i++) {
			jet.update(1 / 60);
			physics.loop(1 / 60);
		}
		jet.syncInstances();
		assert.equal(jet.particles.length, 300);
		assert.equal(physics.world.bodies.len(), 300);
		assert.equal(jet.particlesMesh.count, 300);
		const matrix = new THREE.Matrix4();
		jet.particlesMesh.getMatrixAt(0, matrix);
		const position = new THREE.Vector3().setFromMatrixPosition(matrix);
		assert.ok(
			position.distanceTo(new THREE.Vector3().copy(jet.particles[0].body.translation())) < 1e-4
		);
		gameStateStore.set({ score: 0 });
		const object = new THREE.Group();
		object.userData.name = 'urinal';
		physics.collisionHandler.resolveCollision(object, undefined, true);
		physics.collisionHandler.resolveCollision(object, undefined, false);
		assert.equal(get(gameStateStore).score, 1);
		object.userData.name = 'wall';
		physics.collisionHandler.resolveCollision(undefined, object, true);
		assert.equal(get(gameStateStore).score, 0);
		jet.dispose();
		jet.dispose();
		assert.equal(physics.world.bodies.len(), 0);
		assert.equal(scene.children.length, 0);
		physics.collisionHandler.resolveCollision(undefined, object, true);
		assert.equal(get(gameStateStore).score, 0);
		target.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 700, clientY: 500 }));
		assert.equal(jet.mouseX, 0);
	} finally {
		jet.dispose();
		physics.dispose();
	}
});

test('assets load together and report completion without global readiness subscriptions', async (t) => {
	t.mock.method(GLTFLoader.prototype, 'loadAsync', async () => model());
	t.mock.method(THREE.TextureLoader.prototype, 'loadAsync', async () => new THREE.Texture());
	const loader = new AssetLoader();
	const progress: number[] = [];
	try {
		const assets = await loader.load((value) => progress.push(value));
		assert.equal(Object.keys(assets).length, 6);
		assert.equal(progress.length, 6);
		assert.equal(progress.at(-1), 1);
		assert.ok(assets.urinal.scene instanceof THREE.Group);
		assert.ok(assets.floor instanceof THREE.Texture);
	} finally {
		loader.dispose(new THREE.Scene());
	}
});

test('assets completing after disposal release resources and do not publish progress', async (t) => {
	let finish!: (value: THREE.Texture) => void;
	const texture = new THREE.Texture();
	const pending = new Promise<THREE.Texture>((resolve) => {
		finish = resolve;
	});
	let disposals = 0;
	texture.addEventListener('dispose', () => disposals++);
	t.mock.method(GLTFLoader.prototype, 'loadAsync', async () => model());
	t.mock.method(THREE.TextureLoader.prototype, 'loadAsync', () => pending);
	const loader = new AssetLoader();
	let progress = 0;
	const loading = loader.load(() => progress++);
	loader.dispose(new THREE.Scene());
	finish(texture);
	await assert.rejects(loading, /Failed to load/);
	assert.equal(progress, 0);
	assert.equal(disposals, 3);
});

test('asset errors identify the failing URL instead of leaving loading stuck', async (t) => {
	t.mock.method(GLTFLoader.prototype, 'loadAsync', async () => {
		throw new Error('404');
	});
	t.mock.method(THREE.TextureLoader.prototype, 'loadAsync', async () => new THREE.Texture());
	const loader = new AssetLoader();
	try {
		await assert.rejects(
			loader.load(() => {}),
			/Failed to load \/models\/urinal.glb/
		);
	} finally {
		loader.dispose(new THREE.Scene());
	}
});
