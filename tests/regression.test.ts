import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import ScoreDatabase from '../src/lib/server/ScoreDatabase';
import * as THREE from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import Loop from '../src/lib/Utils/Loop';
import InputController from '../src/lib/UI/InputController';
import Camera from '../src/lib/Camera';
import Enemy from '../src/lib/World/Elements/Enemy';
import Session from '../src/lib/Game/Session';
import {
	jetProfile,
	STEP,
	RULES_VERSION,
	BUGS,
	KILL_PRESSURE_GAIN,
	DRINK_PRESSURE_GAIN,
	PARTICLE_RADIUS,
	MIN_SPAWN_INTERVAL,
	WAVE_BREAK,
	MAX_WAVE_SIZE,
	MAX_ACTIVE_ENEMIES,
	ENEMY_LANES,
	BOWL_STREAK_SECONDS,
	BOWL_STREAK_GRACE,
	POWERUP_DURATION,
	DEFAULT_SETTINGS,
	AIM_LIMIT_X,
	KEYBOARD_AIM_SPEED,
	LATE_WAVE_DRAIN,
	DAMAGE_PER_FLOW,
	FLOW_RATE,
	type DrinkKind
} from '../src/lib/Game/config';
import {
	validEntry,
	validResult,
	rankScores,
	loadScores,
	saveScore,
	type ScoreEntry
} from '../src/lib/Game/leaderboard';
import EnemyManager from '../src/lib/World/EnemyManager';
import Environment from '../src/lib/World/Environment';
import World from '../src/lib/World/World';
import type { LoadedAssets } from '../src/lib/Utils/Assets';
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
	return Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600, performance });
}

function model(): GLTF {
	const scene = new THREE.Group();
	// Only scene resources are used by the loader; parser internals are irrelevant here.
	return { scene, scenes: [scene], animations: [], cameras: [], asset: {} } as unknown as GLTF;
}

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

test('aim input handles aliases, pause, focus loss, and listener cleanup', (t) => {
	const target = browserWindow();
	mockGlobal(t, 'window', target);
	mockGlobal(t, 'document', new EventTarget());
	const canvas = new EventTarget() as unknown as HTMLCanvasElement;
	let paused = 0;
	const input = new InputController(
		canvas,
		new THREE.PerspectiveCamera(),
		() => true,
		() => paused++,
		() => paused++
	);
	const key = (type: string, code: string) =>
		target.dispatchEvent(Object.assign(new Event(type), { code }));
	key('keydown', 'KeyW');
	key('keydown', 'ArrowUp');
	key('keyup', 'KeyW');
	input.update(0.1);
	assert.equal(input.aim.y, 6.25 + KEYBOARD_AIM_SPEED * 0.1);
	key('keyup', 'ArrowUp');
	const y = input.aim.y;
	input.update(0.1);
	assert.equal(input.aim.y, y);
	key('keydown', 'Escape');
	assert.equal(paused, 1);
	key('keydown', 'KeyA');
	target.dispatchEvent(new Event('blur'));
	const x = input.aim.x;
	input.update(0.1);
	assert.equal(input.aim.x, x);
	assert.equal(paused, 2);
	input.dispose();
	key('keydown', 'KeyW');
	input.update(0.1);
	assert.equal(input.aim.y, y);
});

test('elevated camera frames ground and flying targets with reachable pointer and keyboard aim', (t) => {
	const target = browserWindow();
	mockGlobal(t, 'window', target);
	mockGlobal(t, 'document', new EventTarget());
	const camera = new Camera();
	const canvas = Object.assign(new EventTarget(), {
		getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
	}) as unknown as HTMLCanvasElement;
	const input = new InputController(
		canvas,
		camera.instance,
		() => true,
		() => {},
		() => {}
	);
	try {
		for (const [width, height] of [
			[1280, 720],
			[390, 844],
			[800, 600]
		]) {
			camera.resize(width, height);
			assert.ok(camera.instance.getWorldDirection(new THREE.Vector3()).y < -0.75);
			for (const x of [-AIM_LIMIT_X, AIM_LIMIT_X]) {
				for (const y of [0, 12]) {
					const point = new THREE.Vector3(x, y, 5.5);
					const screen = point.clone().project(camera.instance);
					assert.ok(Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1, 'target stays in frame');
					canvas.dispatchEvent(
						Object.assign(new Event('pointermove'), {
							clientX: (screen.x + 1) * 400,
							clientY: (1 - screen.y) * 300
						})
					);
					assert.ok(input.aim.distanceTo(point) < 1e-6, 'pointer reaches target height');
				}
			}
		}
		target.dispatchEvent(Object.assign(new Event('keydown'), { code: 'ArrowDown' }));
		input.update(10);
		assert.equal(input.aim.y, 0, 'keyboard reaches the floor');
	} finally {
		input.dispose();
	}
});

test('all stream profiles use blue or cyan rather than yellow', () => {
	for (const drink of [null, 'beer', 'cola'] as const) {
		const color = new THREE.Color(jetProfile(100, drink).color);
		assert.ok(color.b > color.r && color.g > color.r);
	}
});

test('round rules freeze, drain consistently, and finalize exactly once', () => {
	for (const fps of [30, 60, 120]) {
		const session = new Session();
		session.start();
		session.tick(3);
		assert.equal(jetProfile(100, 'beer').speed, 24 * 1.4);
		session.pause();
		session.tick(100);
		assert.equal(session.state.pressure, 100);
		session.resume();
		for (let i = 0; i < fps * 10; i++) session.tick(1 / fps);
		assert.ok(Math.abs(session.state.pressure - 87.5) < 1e-8);
		assert.equal(session.state.drink, null);
		session.flow(2, 1);
		assert.equal(session.state.score, 165, 'spills cost less than accurate flow earns');
		session.kill('spider');
		assert.equal(session.state.score, 315);
		session.miss('wasp');
		assert.ok(Math.abs(session.state.pressure - (69.5 + KILL_PRESSURE_GAIN)) < 1e-8);
		for (let i = 0; i < fps * 80; i++) session.tick(1 / fps);
		const result = session.state.result;
		assert.ok(Object.isFrozen(result));
		session.kill('wasp');
		session.flow(100, 0);
		session.miss('spider');
		assert.equal(session.state.result, result);
		assert.equal(session.state.score, 315);
		assert.equal(session.state.pressure, 0);
		assert.equal(jetProfile(0, 'beer').emission, 0);
		session.start();
		assert.equal(session.state.score, 0);
		assert.equal(session.state.pressure, 100);
		assert.equal(session.state.result, null);
	}
});

test('combat hits count toward accuracy without double-awarding score', () => {
	const session = new Session();
	session.start();
	session.tick(3);
	session.flow(2, 1, 3);
	assert.equal(session.state.score, 165);
	session.tick(80);
	assert.equal(session.state.result!.accuracy, 5 / 6);
	assert.equal(session.state.result!.score, 165);
	session.start();
	assert.equal(session.state.targeted, 0);
	session.tick(3);
	session.flow(0, 0, 1);
	session.tick(80);
	assert.equal(session.state.result!.accuracy, 1, 'combat-only hits are accurate too');
});

test('late waves increase pressure drain gradually without changing early waves', () => {
	const drain = (wave: number) => {
		const session = new Session();
		session.start();
		session.tick(3);
		session.state.wave = wave;
		session.tick(1);
		return 100 - session.state.pressure;
	};
	assert.equal(drain(1), 1.25);
	assert.equal(drain(8), 1.25);
	assert.ok(Math.abs(drain(9) - (1.25 + LATE_WAVE_DRAIN)) < 1e-8);
	assert.ok(drain(16) > drain(9));
	for (const pressure of [1, 5, 10]) {
		assert.ok(jetProfile(pressure, null).emission >= 150 * 0.7);
		assert.ok(jetProfile(pressure, null).speed >= 24 * 0.85);
	}
	assert.equal(jetProfile(0, null).emission, 0);
	assert.equal(jetProfile(0, null).speed, 0);
});

test('kill recovery caps at 100 and never revives an ended or paused round', () => {
	const session = new Session();
	session.start();
	session.tick(3);
	session.tick(40);
	for (const kind of ['spider', 'wasp'] as const) {
		const before = session.state.pressure;
		session.kill(kind);
		assert.equal(session.state.pressure, before + KILL_PRESSURE_GAIN);
	}
	session.pause();
	const paused = session.state.pressure;
	session.kill('spider');
	assert.equal(session.state.pressure, paused);
	session.resume();
	for (let i = 0; i < 5; i++) session.kill('wasp');
	assert.equal(session.state.pressure, 100);
	session.tick(80);
	const result = session.state.result;
	assert.ok(result && result.duration > 80.1);
	assert.ok(validResult(result), 'refill-extended runs remain eligible for scores');
	session.kill('wasp');
	assert.equal(session.state.pressure, 0);
	assert.equal(session.state.result, result);
});

test('clean bowl streaks award alternating power-ups once, respect pause, and reset between rounds', () => {
	for (const fps of [30, 60, 120]) {
		const session = new Session();
		const dt = 1 / fps;
		const feed = (frames: number) => {
			for (let i = 0; i < frames; i++) {
				session.flow(dt, 0, 0, dt);
				session.tick(dt);
			}
		};
		session.start();
		session.tick(3);
		session.tick(40);
		feed(BOWL_STREAK_SECONDS * fps - 1);
		assert.equal(session.state.drink, null, 'no early reward');
		const beforeReward = session.state.pressure;
		session.flow(dt, 0, 0, dt);
		assert.equal(session.snapshot().drink?.kind, 'beer');
		assert.equal(session.state.pressure, beforeReward + DRINK_PRESSURE_GAIN);
		assert.equal(session.state.bowlStreak, 0);
		assert.equal(session.snapshot().drink?.remaining, POWERUP_DURATION);
		session.tick(dt);
		session.pause();
		const paused = session.snapshot();
		feed(fps * 10);
		assert.deepEqual(session.snapshot(), paused);
		session.resume();
		const boostedPressure = session.state.pressure;
		feed(fps * 2);
		assert.equal(session.state.bowlStreak, 0, 'no charging during a power-up');
		assert.ok(Math.abs(session.state.pressure - (boostedPressure - 2.5)) < 1e-8);
		assert.ok(
			Math.abs(session.snapshot().drink!.remaining - (POWERUP_DURATION - 2 - dt)) < 1e-8,
			'clean hits do not refresh a buff'
		);
		session.tick(POWERUP_DURATION);
		assert.equal(session.state.drink, null);
		feed(BOWL_STREAK_SECONDS * fps);
		assert.equal(session.snapshot().drink?.kind, 'cola');
		session.tick(200);
		const result = session.state.result;
		feed(BOWL_STREAK_SECONDS * fps);
		assert.equal(session.state.pressure, 0);
		assert.equal(session.state.drink, null, 'a finished round cannot award another power-up');
		assert.equal(session.state.result, result);
		session.start();
		session.tick(3);
		feed(BOWL_STREAK_SECONDS * fps);
		assert.equal(session.snapshot().drink?.kind, 'beer', 'reward order restarts each round');
		assert.ok(session.state.pressure <= 100);
		session.menu();
		assert.equal(session.state.bowlStreak, 0);
		assert.equal(session.state.drink, null);
	}
});

test('spills, combat, and sustained gaps break streaks; stray drops cannot bank a reward', () => {
	const session = new Session();
	session.start();
	session.tick(3);
	const charge = () => {
		for (let i = 0; i < 60; i++) session.flow(STEP, 0);
	};
	charge();
	const progress = session.state.bowlStreak;
	session.pause();
	session.flow(STEP, 0);
	session.tick(10);
	assert.equal(session.state.bowlStreak, progress);
	session.resume();
	session.flow(0, 0, 0, BOWL_STREAK_GRACE / 2);
	assert.equal(
		session.state.bowlStreak,
		progress,
		'tiny particle gaps preserve but do not add progress'
	);
	session.flow(0, 0, 0, BOWL_STREAK_GRACE);
	assert.equal(session.state.bowlStreak, 0);
	charge();
	session.flow(STEP, 1 / FLOW_RATE);
	assert.equal(
		session.state.bowlStreak,
		0,
		'a spill breaks the streak even with some captured flow'
	);
	charge();
	session.flow(STEP, 0, 1 / FLOW_RATE);
	assert.equal(session.state.bowlStreak, 0, 'shooting a bug breaks the streak');
	for (let i = 0; i < 60; i++) {
		session.flow(1 / FLOW_RATE, 0);
		session.flow(0, 0, 0, BOWL_STREAK_GRACE);
	}
	assert.equal(session.state.drink, null);
	assert.equal(session.state.bowlStreak, 0);
	session.flow(1000, 0);
	assert.equal(session.state.bowlStreak, STEP, 'a large collision batch is not multiple seconds');
	assert.equal(session.state.drink, null);
	session.start();
	assert.equal(session.state.bowlStreak, 0);
	session.flow(10, 0);
	assert.equal(session.state.bowlStreak, 0, 'countdown cannot charge a power-up');
});

test('real world bowl contacts charge a streak reward without collectible cans', async (t) => {
	mockGlobal(t, 'window', browserWindow());
	mockGlobal(t, 'document', new EventTarget());
	const loader = new GLTFLoader();
	loader.register((parser) => {
		parser.loadTexture = async () => new THREE.Texture();
		return { name: 'test-textures' };
	});
	const file = readFileSync('static/models/urinal.glb');
	const urinal = await loader.parseAsync(
		file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
		''
	);
	const bug = model();
	bug.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
	const assets = {
		urinal,
		spider: bug,
		wasp: bug,
		floor: new THREE.Texture(),
		wall: new THREE.Texture()
	};
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const session = new Session();
	const camera = new THREE.PerspectiveCamera();
	const input = new InputController(
		new EventTarget() as unknown as HTMLCanvasElement,
		camera,
		() => session.playing,
		() => session.pause(),
		() => session.pause()
	);
	const world = new World(scene, physics, assets, session, input, camera);
	try {
		session.start();
		session.tick(3);
		for (let frame = 0; frame < 120; frame++) world.loop(STEP, DEFAULT_SETTINGS);
		assert.ok(session.state.bowlStreak > 1, 'actual captures charge the meter');
		assert.equal(session.state.drink, null);
		session.pause();
		const paused = session.snapshot();
		world.loop(10, DEFAULT_SETTINGS);
		assert.deepEqual(session.snapshot(), paused);
		session.resume();
		for (let frame = 0; frame < 150; frame++) world.loop(STEP, DEFAULT_SETTINGS);
		assert.equal(session.snapshot().drink?.kind, 'beer');
		assert.equal(session.state.bowlStreak, 0);
		assert.equal(
			scene.children.filter((child) => child instanceof THREE.Group && child !== urinal.scene)
				.length,
			world.enemies.enemies.size,
			'only bugs occupy actor groups'
		);
		world.reset();
		session.start();
		assert.equal(session.state.bowlStreak, 0);
		assert.equal(session.state.drink, null);
		assert.equal(world.waterJet.particles.size, 0);
	} finally {
		world.dispose();
		input.dispose();
		physics.dispose();
		disposeResources([scene, bug.scene]);
	}
});

test('stage lighting uses three distinct, targeted spotlights and softer ambient light', async () => {
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const assets = {
		urinal: model(),
		floor: new THREE.Texture(),
		wall: new THREE.Texture()
	} as LoadedAssets;
	try {
		new Environment(scene, physics, assets);
		const spots = scene.children.filter(
			(child): child is THREE.SpotLight => child instanceof THREE.SpotLight
		);
		assert.equal(spots.length, 3);
		assert.equal(new Set(spots.map((spot) => spot.color.getHex())).size, 3);
		for (const spot of spots) {
			assert.equal(spot.target.parent, scene);
			assert.ok(spot.position.y > spot.target.position.y);
			assert.ok(spot.penumbra > 0.5);
		}
		const ambient = scene.children.find((child) => child instanceof THREE.HemisphereLight)!;
		assert.ok((ambient as THREE.HemisphereLight).intensity < 1.5);
	} finally {
		physics.dispose();
		disposeResources([scene, assets.floor, assets.wall]);
	}
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

test('droplets resolve once, ignore shell contacts, and release all physics identities', async () => {
	const scene = new THREE.Scene(),
		physics = await Physics.create();
	const jet = new WaterJet(scene, physics);
	try {
		assert.equal(
			(jet.particlesMesh.geometry as THREE.SphereGeometry).parameters.radius,
			PARTICLE_RADIUS
		);
		assert.ok(PARTICLE_RADIUS >= 0.11, 'droplets are at least twice the original visual radius');
		const material = jet.particlesMesh.material as THREE.MeshBasicMaterial;
		assert.equal(material.toneMapped, false);
		assert.ok(material.opacity >= 0.95);
		const sensor = physics.addSensor(new THREE.Vector3(0, 6, 5.5), new THREE.Vector3(2, 1, 2), {
			kind: 'capture'
		});
		let captured = 0;
		for (let i = 0; i < 240; i++) {
			jet.update(STEP, new THREE.Vector3(0, 6, 5.5), jetProfile(100, null));
			captured += jet.resolve(physics.loop(STEP), () => false).captured;
		}
		assert.ok(captured > 1, 'real Rapier sensor captures descending droplets');
		assert.ok(jet.particles.size <= 458);
		jet.syncInstances();
		assert.equal(jet.particlesMesh.count, jet.particles.size);
		const id = jet.particles.keys().next().value!;
		assert.ok(Math.abs(jet.particles.get(id)!.body.collider(0).radius() - PARTICLE_RADIUS) < 1e-6);
		assert.deepEqual(
			jet.resolve([{ particleId: id, target: { kind: 'shell' } }], () => false),
			{ captured: 0, spilled: 0, targeted: 0 }
		);
		jet.particles.get(id)!.body.setLinvel({ x: 0, y: -1, z: 0 }, true);
		const outcomes = jet.resolve(
			[
				{ particleId: id, target: { kind: 'capture' } },
				{ particleId: id, target: { kind: 'spill' } }
			],
			() => false
		);
		assert.equal(outcomes.captured, 0);
		assert.equal(outcomes.spilled, 1 / 150);
		assert.equal(
			jet.resolve([{ particleId: id, target: { kind: 'capture' } }], () => false).captured,
			0
		);
		const hitId = jet.particles.keys().next().value!;
		const targetHits = jet.resolve(
			[
				{ particleId: hitId, target: { kind: 'enemy', id: 1 } },
				{ particleId: hitId, target: { kind: 'enemy', id: 2 } }
			],
			() => true
		);
		assert.deepEqual(targetHits, { captured: 0, spilled: 0, targeted: 1 / 150 });
		assert.equal(
			jet.resolve([{ particleId: hitId, target: { kind: 'enemy', id: 1 } }], () => true).targeted,
			0
		);
		for (let i = 0; i < 20; i++) {
			jet.reset();
			jet.update(STEP, new THREE.Vector3(0, 6, 5.5), jetProfile(100, null));
		}
		jet.dispose();
		jet.dispose();
		physics.removeBody(sensor);
		assert.equal(physics.world.bodies.len(), 0);
		assert.equal(physics.colliderMap.size, 0);
		assert.equal(scene.children.length, 0);
	} finally {
		jet.dispose();
		physics.dispose();
	}
});

test('animated spider feet stay on the floor and the stream can hit their collider', async () => {
	const loader = new GLTFLoader();
	// Keep the real rig and animation; textures need a browser and do not affect grounding.
	loader.register((parser) => {
		parser.loadTexture = async () => new THREE.Texture();
		return { name: 'test-textures' };
	});
	const file = readFileSync('static/models/spider.glb');
	const asset = await loader.parseAsync(
		file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
		''
	);
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const spider = new Enemy(1, 'spider', asset, scene, physics, 0);
	const jet = new WaterJet(scene, physics);
	const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 30), new THREE.MeshBasicMaterial());
	floor.position.y = -0.1;
	scene.add(floor);
	physics.add(floor, 'fixed', 'cuboid', { kind: 'spill' });
	try {
		let hits = 0;
		const startX = spider.root.position.x;
		for (let i = 0; i < 180; i++) {
			spider.update(STEP, false);
			jet.update(STEP, spider.root.position, jetProfile(100, null));
			jet.resolve(physics.loop(STEP), (target) => {
				if (target.kind !== 'enemy') return false;
				hits++;
				return true;
			});
			const model = spider.root.children[0];
			scene.updateMatrixWorld(true);
			model.traverse((object) => {
				if ((object as THREE.SkinnedMesh).isSkinnedMesh)
					(object as THREE.SkinnedMesh).computeBoundingBox();
			});
			const bounds = new THREE.Box3().setFromObject(model);
			assert.ok(Math.abs(bounds.min.y) < 0.03, `feet at ${bounds.min.y}, expected floor level`);
			assert.ok(bounds.max.y < 1.5, 'larger spider stays horizontal');
			if (i === 60)
				assert.ok(bounds.getSize(new THREE.Vector3()).x > 3, 'spider is visibly larger');
		}
		assert.ok(
			Math.abs(spider.root.position.x - startX) > 1,
			'spider crawls quickly in either direction'
		);
		assert.ok(hits > 0, 'grounded collider intercepts the stream before the floor');
	} finally {
		jet.dispose();
		spider.dispose();
		physics.dispose();
		disposeResources([scene, asset.scene]);
	}
});

test('jet captures the inner bowl at varied angles and rescues low pressure in every outer lane', async (t) => {
	let seed = 42;
	t.mock.method(Math, 'random', () => (seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
	const loader = new GLTFLoader();
	loader.register((parser) => {
		parser.loadTexture = async () => new THREE.Texture();
		return { name: 'test-textures' };
	});
	const [urinal, spider, wasp] = await Promise.all(
		['urinal', 'spider', 'wasp'].map(async (kind) => {
			const file = readFileSync(`static/models/${kind}.glb`);
			return loader.parseAsync(
				file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
				''
			);
		})
	);
	const assets = { urinal, spider, wasp, floor: new THREE.Texture(), wall: new THREE.Texture() };
	try {
		const cases: [number, number, DrinkKind | null][] = ENEMY_LANES.map((_, lane) => [
			lane,
			5,
			null
		]);
		for (const drink of [null, 'beer', 'cola'] as const) cases.push([5, 100, drink]);
		for (const [lane, pressure, drink] of cases) {
			seed = 42;
			const scene = new THREE.Scene();
			const physics = await Physics.create();
			new Environment(scene, physics, assets);
			const session = new Session();
			const kind = ENEMY_LANES[lane].kind;
			const enemy = new Enemy(1, kind, assets[kind], scene, physics, lane);
			const jet = new WaterJet(scene, physics);
			try {
				session.start();
				session.tick(3);
				session.state.pressure = pressure;
				while (session.playing && enemy.status !== 'dead' && session.state.elapsed < 3.5) {
					enemy.update(STEP, false);
					jet.update(STEP, enemy.root.position, jetProfile(session.state.pressure, drink));
					const flow = jet.resolve(physics.loop(STEP), (target) => {
						if (target.kind !== 'enemy' || !enemy.damage(DAMAGE_PER_FLOW / FLOW_RATE)) return false;
						if (enemy.status === 'dead') session.kill(kind);
						return true;
					});
					session.flow(flow.captured, flow.spilled, flow.targeted);
					session.tick(STEP);
				}
				assert.equal(
					enemy.status,
					'dead',
					`lane ${lane}, pressure ${pressure}, drink ${drink} stays hittable`
				);
				assert.equal(session.state.kills, 1);
				assert.ok(session.state.targeted > 0, 'combat hits improve accuracy');
				if (pressure === 5) assert.ok(session.state.pressure > 5, 'a timely kill rescues the tank');
			} finally {
				jet.dispose();
				enemy.dispose();
				physics.dispose();
				scene.remove(urinal.scene);
				disposeResources([scene]);
			}
		}
		for (const drink of [null, 'beer', 'cola'] as const) {
			seed = 42;
			const scene = new THREE.Scene();
			const physics = await Physics.create();
			new Environment(scene, physics, assets);
			const jet = new WaterJet(scene, physics);
			let captured = 0;
			try {
				for (let frame = 0; frame < 300; frame++) {
					jet.update(
						STEP,
						new THREE.Vector3(0.2, 6.25, 5.5),
						jetProfile(frame < 180 ? 100 : 0, drink)
					);
					captured += jet.resolve(physics.loop(STEP), () => false).captured;
				}
				assert.ok(
					captured > (drink === 'beer' ? 1.8 : 2.7),
					`${drink}: faster stream still lands in the basin (${captured}/3)`
				);
			} finally {
				jet.dispose();
				physics.dispose();
				scene.remove(urinal.scene);
				disposeResources([scene]);
			}
		}
		// The drain-only sensor and downward-velocity gate used to reject these clean shots.
		const bowlAims = [-1, 0.2, 1].flatMap((x) => [6.5, 7.5, 9, 10].map((y) => [x, y]));
		const outsideAims = [
			[-3, 8],
			[3.5, 8],
			[0.2, 3],
			[6, 0]
		];
		for (const pressure of [5, 100]) {
			for (const [x, y] of [...bowlAims, ...outsideAims]) {
				seed = 42;
				const inside = Math.abs(x) <= 1 && y >= 6.5;
				const label = `aim (${x}, ${y}), pressure ${pressure}`;
				const scene = new THREE.Scene();
				const physics = await Physics.create();
				new Environment(scene, physics, assets);
				const jet = new WaterJet(scene, physics);
				const session = new Session();
				session.start();
				session.tick(3);
				try {
					for (let frame = 0; frame < 360; frame++) {
						jet.update(STEP, new THREE.Vector3(x, y, 5.5), jetProfile(pressure, null));
						const flow = jet.resolve(physics.loop(STEP), () => false);
						session.flow(flow.captured, flow.spilled, flow.targeted);
					}
					if (inside) {
						assert.equal(session.state.drink?.kind, 'beer', `${label}: clean shots earn a streak`);
						assert.equal(session.state.spilled, 0, `${label}: contained shots do not time out`);
					} else {
						assert.equal(session.state.captured, 0, `${label}: exterior shots do not count`);
						assert.equal(session.state.drink, null);
						assert.ok(session.state.spilled > 0, `${label}: misses still spill`);
					}
				} finally {
					jet.dispose();
					physics.dispose();
					scene.remove(urinal.scene);
					disposeResources([scene]);
				}
			}
		}
	} finally {
		disposeResources([urinal.scene, spider.scene, wasp.scene, assets.floor, assets.wall]);
	}
});

test('bugs move quickly, have short reaction windows, and need only a brief burst', async (t) => {
	t.mock.method(Math, 'random', () => 0);
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const bug = model();
	bug.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
	const wasp = new Enemy(1, 'wasp', bug, scene, physics, 3);
	try {
		wasp.update(0.01, false);
		physics.loop(STEP);
		const start = wasp.root.position.clone();
		wasp.update(0.2, false);
		physics.loop(STEP);
		assert.ok(wasp.root.position.distanceTo(start) > 0.45, 'wasp flight is faster');
		assert.equal(wasp.mixer.timeScale, 1.8);
		assert.equal(BUGS.spider.deadline, 3);
		assert.equal(BUGS.wasp.deadline, 2.75);
		assert.ok(BUGS.spider.health / DAMAGE_PER_FLOW <= 0.2);
		assert.ok(BUGS.wasp.health / DAMAGE_PER_FLOW <= 0.15);
	} finally {
		wasp.dispose();
		physics.dispose();
		disposeResources([bug.scene]);
	}
});

test('enemies clone independently, reward final-tick kills once, and penalize timeouts once', async () => {
	const scene = new THREE.Scene(),
		physics = await Physics.create(),
		session = new Session();
	const bug = model();
	bug.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
	const manager = new EnemyManager(
		scene,
		physics,
		{ spider: bug, wasp: bug } as LoadedAssets,
		session
	);
	try {
		session.start();
		session.tick(3);
		session.tick(3);
		manager.update(0.3, false);
		const spider = manager.enemies.get(1)!;
		assert.ok(spider, 'first bug arrives after three seconds');
		session.tick(4);
		manager.update(0.3, false);
		const wasp = manager.enemies.get(2)!;
		assert.notEqual(spider.root, wasp.root);
		assert.equal(manager.enemies.size, 2);
		spider.age = BUGS.spider.deadline + 0.3;
		spider.health = 0.3;
		const beforeKill = session.state.pressure;
		assert.equal(manager.hit(1), true);
		manager.resolveDeadlines();
		assert.equal(session.state.kills, 1);
		assert.equal(session.state.missed, 0);
		assert.equal(manager.hit(1), false);
		assert.equal(
			session.state.pressure,
			beforeKill + KILL_PRESSURE_GAIN,
			'kill refills exactly once'
		);
		wasp.age = BUGS.wasp.deadline + 0.3;
		const pressure = session.state.pressure;
		manager.resolveDeadlines();
		manager.resolveDeadlines();
		assert.equal(session.state.missed, 1);
		assert.equal(session.state.pressure, pressure - 18);
		manager.reset();
		assert.equal(physics.world.bodies.len(), 0);
		assert.equal(physics.colliderMap.size, 0);
	} finally {
		manager.reset();
		physics.dispose();
		disposeResources([bug.scene]);
	}
});

test('waves grow, vary spawn lanes, wait between waves, and reset cleanly', async (t) => {
	let seed = 42;
	t.mock.method(Math, 'random', () => (seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const session = new Session();
	const bug = model();
	bug.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
	const manager = new EnemyManager(
		scene,
		physics,
		{ spider: bug, wasp: bug } as LoadedAssets,
		session
	);
	const seen = new Set<number>();
	const lanes = new Set<number>();
	const counts = new Map<number, number>();
	let lastSpawnAt = -Infinity;
	let lastWave = 0,
		waveTotal = 0,
		resolvedAtStart = 0,
		clearedAt: number | null = null;
	try {
		session.start();
		session.tick(3);
		for (let frame = 0; frame < 60 * 180; frame++) {
			manager.update(STEP, false);
			physics.loop(STEP);
			const state = session.state;
			if (state.wave !== lastWave) {
				if (clearedAt !== null) assert.ok(state.elapsed - clearedAt >= WAVE_BREAK - 1e-6);
				lastWave = state.wave;
				waveTotal = Math.min(MAX_WAVE_SIZE, state.wave + 2);
				resolvedAtStart = state.kills + state.missed;
				assert.equal(state.waveRemaining, waveTotal);
				assert.match(state.notice!.text, /BUGS INCOMING/);
				clearedAt = null;
			}
			for (const enemy of manager.enemies.values()) {
				if (!seen.has(enemy.id)) {
					assert.ok(
						state.elapsed - lastSpawnAt >= MIN_SPAWN_INTERVAL - 1e-6,
						'waves leave time to aim'
					);
					lastSpawnAt = state.elapsed;
					seen.add(enemy.id);
					lanes.add(enemy.lane);
					counts.set(state.wave, (counts.get(state.wave) ?? 0) + 1);
				}
				if (enemy.active && enemy.age > 0.6 && enemy.id % 5 !== 0) {
					enemy.health = 0.3;
					assert.equal(manager.hit(enemy.id), true);
				}
			}
			manager.resolveDeadlines();
			assert.equal(state.waveRemaining, waveTotal - (state.kills + state.missed - resolvedAtStart));
			assert.ok(manager.enemies.size <= MAX_ACTIVE_ENEMIES);
			assert.equal(
				new Set([...manager.enemies.values()].map((enemy) => enemy.lane)).size,
				manager.enemies.size
			);
			if (
				state.wave > 0 &&
				state.waveRemaining === 0 &&
				manager.enemies.size === 0 &&
				clearedAt === null
			) {
				clearedAt = state.elapsed;
				assert.match(state.notice!.text, /COMPLETE/);
			}
			if (frame === 240) {
				session.pause();
				const before = session.snapshot();
				const ages = [...manager.enemies.values()].map((enemy) => enemy.age);
				manager.update(10, false);
				session.tick(10);
				assert.deepEqual(session.snapshot(), before);
				assert.deepEqual(
					[...manager.enemies.values()].map((enemy) => enemy.age),
					ages
				);
				session.resume();
			}
			if (state.wave === 8 && clearedAt !== null) break;
			session.tick(STEP);
			assert.equal(session.playing, true);
		}
		assert.equal(session.state.wave, 8);
		assert.equal(session.state.waveRemaining, 0);
		assert.ok(session.state.missed > 0, 'escaped enemies also resolve wave progress');
		assert.equal(lanes.size, ENEMY_LANES.length, 'both sides and both flight heights are used');
		for (let wave = 1; wave <= 8; wave++)
			assert.equal(counts.get(wave), Math.min(MAX_WAVE_SIZE, wave + 2));
		manager.reset();
		session.start();
		assert.equal(session.state.wave, 0);
		assert.equal(physics.world.bodies.len(), 0);
		session.tick(3);
		session.tick(WAVE_BREAK - STEP);
		manager.update(STEP, false);
		assert.equal(manager.enemies.size, 0);
		session.tick(STEP);
		manager.update(STEP, false);
		assert.equal(session.state.wave, 1);
		assert.equal(session.state.waveRemaining, 3);
		assert.ok(manager.enemies.has(1));
	} finally {
		manager.reset();
		physics.dispose();
		disposeResources([bug.scene]);
	}
});

test('busy waves cap simultaneous bugs and keep occupied lanes exclusive', async () => {
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	const session = new Session();
	const bug = model();
	bug.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
	const manager = new EnemyManager(
		scene,
		physics,
		{ spider: bug, wasp: bug } as LoadedAssets,
		session
	);
	try {
		session.start();
		session.tick(3);
		session.state.wave = 7;
		session.tick(WAVE_BREAK);
		for (let frame = 0; frame < 60 * 12; frame++) {
			manager.update(STEP, true);
			session.tick(STEP);
			assert.ok(manager.enemies.size <= MAX_ACTIVE_ENEMIES);
		}
		assert.equal(manager.enemies.size, MAX_ACTIVE_ENEMIES);
		assert.equal(
			session.state.waveRemaining,
			MAX_WAVE_SIZE,
			'pending spawns are not lost when lanes fill'
		);
		assert.equal(
			new Set([...manager.enemies.values()].map((enemy) => enemy.lane)).size,
			MAX_ACTIVE_ENEMIES
		);
	} finally {
		manager.reset();
		physics.dispose();
		disposeResources([bug.scene]);
	}
});

test('larger animated bugs fit every spawn lane on desktop and portrait screens', async (t) => {
	mockGlobal(t, 'window', browserWindow());
	const camera = new Camera();
	const loader = new GLTFLoader();
	loader.register((parser) => {
		parser.loadTexture = async () => new THREE.Texture();
		return { name: 'test-textures' };
	});
	const assets = await Promise.all(
		['spider', 'wasp'].map(async (kind) => {
			const file = readFileSync(`static/models/${kind}.glb`);
			return loader.parseAsync(
				file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
				''
			);
		})
	);
	const scene = new THREE.Scene();
	const physics = await Physics.create();
	try {
		for (const random of [0, 0.75]) {
			t.mock.method(Math, 'random', () => random);
			for (let lane = 0; lane < ENEMY_LANES.length; lane++) {
				const kind = ENEMY_LANES[lane].kind;
				const enemy = new Enemy(
					lane,
					kind,
					assets[kind === 'spider' ? 0 : 1],
					scene,
					physics,
					lane
				);
				try {
					for (let frame = 0; frame < 12; frame++) {
						enemy.update(0.4, false);
						physics.loop(STEP);
						scene.updateMatrixWorld(true);
						enemy.root.traverse((object) => {
							if ((object as THREE.SkinnedMesh).isSkinnedMesh)
								(object as THREE.SkinnedMesh).computeBoundingBox();
						});
						assert.ok(
							Math.abs(enemy.root.position.x) <= AIM_LIMIT_X && enemy.root.position.y < 14,
							'aim can reach the target'
						);
						const bounds = new THREE.Box3().setFromObject(enemy.root);
						assert.ok(
							bounds.min.x >= 4 || bounds.max.x <= -4,
							'bugs leave clear space around the urinal'
						);
						if (kind === 'spider')
							assert.ok(Math.abs(bounds.min.y) < 0.03, 'feet stay grounded in both directions');
						for (const [width, height] of [
							[1280, 720],
							[390, 844],
							[800, 800],
							[844, 390]
						]) {
							camera.resize(width, height);
							for (const x of [bounds.min.x, bounds.max.x])
								for (const y of [bounds.min.y, bounds.max.y])
									for (const z of [bounds.min.z, bounds.max.z]) {
										const screen = new THREE.Vector3(x, y, z).project(camera.instance);
										assert.ok(
											Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1,
											`${kind} lane ${lane} clipped at ${width}x${height}: ${screen.x}, ${screen.y}`
										);
									}
						}
					}
				} finally {
					enemy.dispose();
				}
			}
		}
	} finally {
		physics.dispose();
		disposeResources(assets.map((asset) => asset.scene));
	}
});

test('leaderboard validates untrusted results, sorts, deduplicates, and survives broken storage', (t) => {
	const entry: ScoreEntry = {
		id: 'one',
		name: 'PLAYER',
		score: 200,
		accuracy: 0.9,
		kills: 1,
		missed: 0,
		duration: 10,
		timestamp: '2026-01-01T00:00:00Z',
		rulesVersion: RULES_VERSION
	};
	assert.equal(validEntry(entry), true);
	for (const patch of [
		{ score: NaN },
		{ score: -1 },
		{ score: 999999 },
		{ duration: Infinity },
		{ duration: NaN },
		{ duration: 0 },
		{ score: Number.MAX_SAFE_INTEGER + 1 },
		{ kills: 500 },
		{ accuracy: 2 }
	])
		assert.equal(validResult({ ...entry, ...patch }), false);
	assert.equal(validEntry({ ...entry, duration: 180, kills: 20 }), true);
	assert.equal(
		validResult({ ...entry, duration: 100, kills: Math.ceil(100 / MIN_SPAWN_INTERVAL) }),
		true
	);
	assert.equal(
		validResult({ ...entry, duration: 100, kills: Math.ceil(100 / MIN_SPAWN_INTERVAL) + 1 }),
		false
	);
	assert.equal(validEntry({ ...entry, name: '<script>' }), false);
	assert.equal(validEntry({ ...entry, rulesVersion: 'old' }), false);
	assert.equal(rankScores([entry, { ...entry, id: 'two', accuracy: 1 }])[0].id, 'two');
	mockGlobal(t, 'localStorage', {
		getItem: () => '{oops',
		setItem: () => {
			throw new Error('full');
		}
	});
	assert.deepEqual(loadScores(), []);
	const saved = saveScore([entry], { ...entry, score: 250 });
	assert.equal(saved.persisted, false);
	assert.equal(saved.scores.length, 1);
	assert.equal(saved.scores[0].score, 250);
});

test('SQLite persists scores, rejects changed retries, ranks, and bounds local boards', (t) => {
	const directory = mkdtempSync(join(tmpdir(), 'aimlow-scores-'));
	const filename = join(directory, 'scores.sqlite');
	let database = new ScoreDatabase(filename);
	t.after(() => {
		database.close();
		rmSync(directory, { recursive: true, force: true });
	});
	const entry: ScoreEntry = {
		id: 'sqlite-run',
		name: "O'NEIL",
		score: 200,
		accuracy: 0.9,
		kills: 1,
		missed: 0,
		duration: 10,
		timestamp: '2000-01-01T00:00:00Z',
		rulesVersion: RULES_VERSION
	};
	const saved = database.save(entry)!;
	assert.equal(saved.name, entry.name);
	assert.notEqual(saved.timestamp, entry.timestamp, 'database records its own receipt time');
	assert.deepEqual(database.save(entry), saved);
	assert.equal(database.save({ ...entry, score: 201 }), null);
	assert.equal(database.list('daily').length, 1);
	database.close();
	database = new ScoreDatabase(filename);
	assert.deepEqual(database.list('all-time'), [saved]);
	for (let i = 0; i < 55; i++) database.save({ ...entry, id: `run-${i}`, score: i });
	const scores = database.list('all-time');
	assert.equal(scores.length, 50);
	assert.equal(scores[0].id, entry.id);
	assert.equal(scores[1].score, 54);
});

test('SQLite upgrades the old duration constraint without losing scores and saves extended runs', (t) => {
	const directory = mkdtempSync(join(tmpdir(), 'aimlow-upgrade-'));
	const filename = join(directory, 'scores.sqlite');
	const legacy = new DatabaseSync(filename);
	legacy.exec(`CREATE TABLE scores (
		id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL,
		accuracy REAL, kills INTEGER NOT NULL, missed INTEGER NOT NULL,
		duration REAL NOT NULL CHECK(duration > 0 AND duration <= 80.1),
		rules_version TEXT NOT NULL, created_at TEXT NOT NULL
	) STRICT;
	CREATE INDEX scores_ranking ON scores(rules_version, score DESC, accuracy DESC, created_at, id);
	INSERT INTO scores VALUES ('legacy', 'PLAYER', 200, 0.9, 1, 0, 10, 'arcade-1', '2026-01-01T00:00:00Z');`);
	legacy.close();
	let database = new ScoreDatabase(filename);
	t.after(() => {
		database.close();
		rmSync(directory, { recursive: true, force: true });
	});
	const entry: ScoreEntry = {
		id: 'extended',
		name: 'PLAYER',
		score: 8000,
		accuracy: 0.9,
		kills: 20,
		missed: 1,
		duration: 180,
		rulesVersion: RULES_VERSION,
		timestamp: '2026-01-01T00:00:00Z'
	};
	assert.ok(validEntry(entry));
	assert.equal(database.save(entry)?.duration, 180);
	database.close();
	database = new ScoreDatabase(filename);
	assert.equal(database.list('all-time')[0].id, entry.id);
	const inspect = new DatabaseSync(filename);
	try {
		assert.equal(inspect.prepare("SELECT score FROM scores WHERE id = 'legacy'").get()!.score, 200);
		assert.ok(
			inspect
				.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'scores_ranking'")
				.get()
		);
		assert.equal(inspect.prepare('PRAGMA user_version').get()!.user_version, 1);
	} finally {
		inspect.close();
	}
});

test('assets load together and report completion without global readiness subscriptions', async (t) => {
	t.mock.method(GLTFLoader.prototype, 'loadAsync', async () => model());
	t.mock.method(THREE.TextureLoader.prototype, 'loadAsync', async () => new THREE.Texture());
	const loader = new AssetLoader();
	const progress: number[] = [];
	try {
		const assets = await loader.load((value) => progress.push(value));
		assert.equal(Object.keys(assets).length, 5);
		assert.equal(progress.length, 5);
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
	assert.equal(disposals, 2);
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
