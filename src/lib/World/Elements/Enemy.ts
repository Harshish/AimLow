import * as THREE from 'three/webgpu';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type RAPIER from '@dimforge/rapier3d-compat';
import type Physics from '../Physics';
import { BUGS, ENEMY_LANES, type BugKind } from '../../Game/config';

/** One data-driven actor, not a subclass hierarchy for two nearly identical bugs. */
export default class Enemy {
	readonly root = new THREE.Group();
	readonly mixer: THREE.AnimationMixer;
	readonly body: RAPIER.RigidBody;
	health: number;
	age = 0;
	status: 'spawning' | 'active' | 'dead' | 'escaped' = 'spawning';
	retiredFor = 0;
	private readonly model: THREE.Object3D;
	private readonly materials: THREE.Material[] = [];
	private readonly healthBar: THREE.Mesh;
	private readonly timerBar: THREE.Mesh;
	private readonly barGeometry = new THREE.PlaneGeometry(1.9, 0.11);
	private readonly healthMaterial = new THREE.MeshBasicMaterial({
		color: 0x91ffd1,
		depthTest: false
	});
	private readonly timerMaterial = new THREE.MeshBasicMaterial({
		color: 0xffb74d,
		depthTest: false
	});
	private readonly position = new THREE.Vector3();
	private readonly groundHeight: number;
	private readonly inward = Math.random() < 0.5;
	private readonly motionPhase = Math.random() * Math.PI * 2;
	private hitFlash = 0;
	private currentAction?: THREE.AnimationAction;
	private disposed = false;

	constructor(
		readonly id: number,
		readonly kind: BugKind,
		private readonly asset: GLTF,
		private readonly scene: THREE.Scene,
		private readonly physics: Physics,
		readonly lane: number
	) {
		this.health = BUGS[kind].health;
		this.model = clone(asset.scene);
		const side = Math.sign(ENEMY_LANES[lane].x);
		this.model.rotation.y =
			kind === 'spider' ? (side * (this.inward ? 1 : -1) * Math.PI) / 2 : (-side * Math.PI) / 2;
		this.mixer = new THREE.AnimationMixer(this.model);
		this.mixer.timeScale = 1.8;
		this.play(kind === 'spider' ? 'walk cycle' : 'Wasp_Flying');
		// Measure the walking pose, not the rig's bind pose, so the feet meet the floor.
		this.mixer.update(0);
		this.model.updateMatrixWorld(true);
		this.model.traverse((object) => {
			if ((object as THREE.SkinnedMesh).isSkinnedMesh)
				(object as THREE.SkinnedMesh).computeBoundingBox();
		});
		const box = new THREE.Box3().setFromObject(this.model);
		const size = box.getSize(new THREE.Vector3());
		this.model.scale.multiplyScalar(BUGS[kind].size / Math.max(size.x, size.y, size.z));
		box.setFromObject(this.model);
		this.model.position.sub(box.getCenter(new THREE.Vector3()));
		this.groundHeight = box.getSize(size).y / 2;
		const copies = new Map<THREE.Material, THREE.Material>();
		this.model.traverse((object) => {
			const mesh = object as THREE.Mesh;
			if (!mesh.isMesh) return;
			const copy = (material: THREE.Material) => {
				if (!copies.has(material)) copies.set(material, material.clone());
				return copies.get(material)!;
			};
			mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
			mesh.frustumCulled = false;
		});
		this.materials = [...copies.values()];
		this.root.add(this.model);
		this.healthBar = new THREE.Mesh(this.barGeometry, this.healthMaterial);
		this.timerBar = new THREE.Mesh(this.barGeometry, this.timerMaterial);
		this.healthBar.position.set(0, this.groundHeight + 0.65, 0.8);
		this.timerBar.position.set(0, this.groundHeight + 0.45, 0.8);
		this.healthBar.rotation.x = this.timerBar.rotation.x = -Math.atan2(0.8, 0.6);
		this.root.add(this.healthBar, this.timerBar);
		this.move();
		this.root.position.copy(this.position);
		scene.add(this.root);
		this.body = physics.add(
			this.root,
			'kinematicPosition',
			'ball',
			{ kind: 'enemy', id },
			BUGS[kind].radius
		);
	}
	get active() {
		return this.status === 'active';
	}
	get remaining() {
		return Math.max(0, BUGS[this.kind].deadline - Math.max(0, this.age - 0.3));
	}
	private play(suffix: string, once = false) {
		const clip = this.asset.animations.find((clip) => clip.name.endsWith(suffix));
		if (!clip) return;
		const action = this.mixer.clipAction(clip);
		action.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
		action.clampWhenFinished = once;
		if (this.currentAction) action.crossFadeFrom(this.currentAction, 0.15, true);
		action.play();
		this.currentAction = action;
	}
	private move() {
		const lane = ENEMY_LANES[this.lane];
		const side = Math.sign(lane.x);
		const progress = Math.min(1, Math.max(0, this.age - 0.3) / BUGS[this.kind].deadline);
		// Stay beside the porcelain: targets must never hide behind its physical shell.
		if (this.kind === 'spider')
			this.position.set(
				lane.x + side * (this.inward ? 1 - progress * 2 : progress * 2 - 1),
				this.groundHeight * this.root.scale.y,
				5.5
			);
		else
			this.position.set(
				lane.x + Math.sin(this.age * 3.6 + this.motionPhase) * 0.7,
				lane.y + Math.sin(this.age * 4.8 + this.motionPhase) * 0.55,
				5.5
			);
	}
	update(dt: number, reducedMotion: boolean) {
		if (this.status === 'dead' || this.status === 'escaped') {
			this.retiredFor += dt;
			this.mixer.update(dt);
			this.root.scale.setScalar(Math.max(0.01, 1 - this.retiredFor / 0.65));
			if (!reducedMotion && this.status === 'dead') this.root.rotation.z += dt * 6;
			return;
		}
		this.age += dt;
		if (this.age >= 0.3) this.status = 'active';
		const pop = Math.min(1, this.age / 0.3);
		this.root.scale.setScalar(
			reducedMotion ? 1 : Math.sin((pop * Math.PI) / 2) * (1 + 0.18 * Math.sin(pop * Math.PI))
		);
		this.move();
		this.body.setNextKinematicTranslation(this.position);
		this.mixer.update(dt);
		this.healthBar.scale.x = Math.max(0.01, this.health / BUGS[this.kind].health);
		this.timerBar.scale.x = Math.max(0.01, this.remaining / BUGS[this.kind].deadline);
		this.timerMaterial.color.set(this.remaining < 2 ? 0xff6577 : 0xffb74d);
		this.hitFlash = Math.max(0, this.hitFlash - dt);
		for (const material of this.materials) {
			const lit = material as THREE.MeshStandardMaterial;
			if (lit.emissive) {
				lit.emissive.set(0x8adfff);
				lit.emissiveIntensity = this.hitFlash > 0 ? 0.6 : this.kind === 'spider' ? 0.2 : 0.05;
			}
		}
	}
	damage(amount: number) {
		if (!this.active) return false;
		this.health = Math.max(0, this.health - amount);
		this.hitFlash = 0.08;
		if (this.health < 1e-8) this.retire('dead');
		return true;
	}
	retire(status: 'dead' | 'escaped') {
		if (!this.active) return;
		this.status = status;
		this.physics.removeBody(this.body);
		this.healthBar.visible = this.timerBar.visible = false;
		if (this.kind === 'wasp') this.play(status === 'dead' ? 'Wasp_Death' : 'Wasp_Attack', true);
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.physics.removeBody(this.body);
		this.mixer.stopAllAction();
		this.mixer.uncacheRoot(this.model);
		this.model.traverse((object) => {
			if ((object as THREE.SkinnedMesh).isSkinnedMesh)
				(object as THREE.SkinnedMesh).skeleton.dispose();
		});
		for (const material of this.materials) material.dispose();
		this.barGeometry.dispose();
		this.healthMaterial.dispose();
		this.timerMaterial.dispose();
		this.scene.remove(this.root);
	}
}
