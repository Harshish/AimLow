import * as THREE from 'three/webgpu';
import type { BugKind } from '../Game/config';

export const MAX_SPARKS = 768;
const GRAVITY = 22;
const POPUP_LIFE = 0.9;
// HDR tints: values above 1 feed the bloom pass so impacts glow briefly.
const GORE: Record<BugKind, number[]> = {
	wasp: [0xffc640, 0xfff3a0],
	spider: [0x8cff4a, 0xd6ff9c]
};
const FAST = 0xff6a3d;

type Point = { x: number; y: number; z: number };
type Burst = {
	speed?: number;
	up?: number;
	life?: number;
	size?: number;
	gravity?: number;
	glow?: number;
};

/** Cosmetic feedback only: pooled sparks and score popups. Never touches physics or rules. */
export default class Effects {
	readonly sparks: THREE.InstancedMesh;
	private count = 0;
	private readonly position = new Float32Array(MAX_SPARKS * 3);
	private readonly velocity = new Float32Array(MAX_SPARKS * 3);
	private readonly life = new Float32Array(MAX_SPARKS);
	private readonly maxLife = new Float32Array(MAX_SPARKS);
	private readonly size = new Float32Array(MAX_SPARKS);
	private readonly gravity = new Float32Array(MAX_SPARKS);
	private readonly colors = new Float32Array(MAX_SPARKS * 3);
	private readonly popups: { sprite: THREE.Sprite; material: THREE.SpriteMaterial; age: number }[] =
		[];
	private readonly matrix = new THREE.Matrix4();
	private readonly color = new THREE.Color();

	constructor(private readonly scene: THREE.Scene) {
		this.sparks = new THREE.InstancedMesh(
			new THREE.IcosahedronGeometry(1, 0),
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }),
			MAX_SPARKS
		);
		this.sparks.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
		this.sparks.instanceColor.setUsage(THREE.DynamicDrawUsage);
		this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.sparks.frustumCulled = false;
		this.sparks.count = 0;
		scene.add(this.sparks);
	}
	get active() {
		return this.count;
	}

	burst(origin: Point, count: number, hex: number, options: Burst = {}) {
		const { speed = 6, up = 0.4, life = 0.5, size = 0.1, gravity = GRAVITY, glow = 2 } = options;
		this.color.set(hex).multiplyScalar(glow);
		for (let n = 0; n < count && this.count < MAX_SPARKS; n++) {
			const i = this.count++;
			// Random direction biased upward: splashes rise before gravity pulls them down.
			const theta = Math.random() * Math.PI * 2,
				y = Math.random() * 2 - 1,
				r = Math.sqrt(1 - y * y),
				v = speed * (0.45 + Math.random() * 0.55);
			this.position.set([origin.x, origin.y, origin.z], i * 3);
			this.velocity.set([r * Math.cos(theta) * v, (y + up) * v, r * Math.sin(theta) * v], i * 3);
			this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.4);
			this.size[i] = size * (0.6 + Math.random() * 0.8);
			this.gravity[i] = gravity;
			this.colors.set([this.color.r, this.color.g, this.color.b], i * 3);
		}
	}
	/** One droplet's terminal contact: a tiny splash sized to the surface it hit. */
	splash(at: Point, kind: 'capture' | 'spill' | 'enemy', hex: number) {
		if (kind === 'capture') {
			if (Math.random() < 0.6)
				this.burst(at, 1, 0xdff8ff, { speed: 4, up: 1.2, life: 0.28, size: 0.06, glow: 2.4 });
		} else if (kind === 'enemy')
			this.burst(at, 2, 0xffffff, { speed: 7, up: 0.3, life: 0.22, size: 0.06, glow: 3 });
		else this.burst(at, 1, hex, { speed: 3.5, up: 1, life: 0.4, size: 0.08, glow: 1.6 });
	}
	spawn(at: Point, fast: boolean) {
		this.burst(at, fast ? 16 : 10, fast ? FAST : 0xb8c6d6, {
			speed: 3,
			up: 0.2,
			life: 0.45,
			size: 0.12,
			gravity: -2,
			glow: fast ? 2.5 : 0.9
		});
	}
	kill(at: Point, kind: BugKind, fast: boolean, points: number, quick: boolean) {
		const [goo, spark] = GORE[kind];
		this.burst(at, 22, goo, { speed: 10, up: 0.5, life: 0.75, size: 0.18, glow: 1.8 });
		this.burst(at, 10, fast ? FAST : spark, {
			speed: 14,
			up: 0.3,
			life: 0.35,
			size: 0.08,
			gravity: 6,
			glow: 3
		});
		this.popup(at, `+${points}`, quick ? '#dfff6a' : fast ? '#ff8a5c' : '#f3f3e8');
	}
	escape(at: Point) {
		this.burst(at, 14, 0x7f6a9a, {
			speed: 2.5,
			up: 0.6,
			life: 0.7,
			size: 0.16,
			gravity: -3,
			glow: 0.8
		});
	}

	update(dt: number) {
		for (let i = 0; i < this.count; i++) {
			this.life[i] -= dt;
			if (this.life[i] <= 0) {
				this.remove(i--);
				continue;
			}
			const p = i * 3;
			this.velocity[p + 1] -= this.gravity[i] * dt;
			for (let axis = 0; axis < 3; axis++) this.position[p + axis] += this.velocity[p + axis] * dt;
			if (this.position[p + 1] < 0.03) {
				// Skid across wet tiles instead of sinking through them.
				this.position[p + 1] = 0.03;
				this.velocity[p + 1] *= -0.3;
				this.velocity[p] *= 0.6;
				this.velocity[p + 2] *= 0.6;
			}
			const s = this.size[i] * Math.min(1, (this.life[i] / this.maxLife[i]) * 2.5);
			this.matrix
				.makeScale(s, s, s)
				.setPosition(this.position[p], this.position[p + 1], this.position[p + 2]);
			this.sparks.setMatrixAt(i, this.matrix);
		}
		this.sparks.count = this.count;
		this.sparks.instanceMatrix.needsUpdate = true;
		this.sparks.instanceColor!.needsUpdate = true;
		for (let i = this.popups.length - 1; i >= 0; i--) {
			const popup = this.popups[i];
			popup.age += dt;
			const t = popup.age / POPUP_LIFE;
			if (t >= 1) {
				this.dropPopup(i);
				continue;
			}
			// Overshoot in, drift up, fade out: readable at a glance, gone before the next kill.
			const pop = t < 0.15 ? (t / 0.15) * 1.25 : 1.25 - Math.min(0.25, (t - 0.15) * 1.5);
			popup.sprite.scale.set(3.2 * pop, 1.2 * pop, 1);
			popup.sprite.position.y += dt * 2.4 * (1 - t);
			popup.material.opacity = Math.min(1, (1 - t) / 0.35);
		}
	}
	reset() {
		this.count = this.sparks.count = 0;
		while (this.popups.length) this.dropPopup(this.popups.length - 1);
	}
	dispose() {
		this.reset();
		this.scene.remove(this.sparks);
		this.sparks.geometry.dispose();
		(this.sparks.material as THREE.Material).dispose();
		this.sparks.dispose();
	}

	private remove(i: number) {
		// Swap-remove keeps live sparks packed at the front of the instance buffer.
		const last = --this.count;
		if (i === last) return;
		this.position.copyWithin(i * 3, last * 3, last * 3 + 3);
		this.velocity.copyWithin(i * 3, last * 3, last * 3 + 3);
		this.colors.copyWithin(i * 3, last * 3, last * 3 + 3);
		this.life[i] = this.life[last];
		this.maxLife[i] = this.maxLife[last];
		this.size[i] = this.size[last];
		this.gravity[i] = this.gravity[last];
	}
	private popup(at: Point, text: string, fill: string) {
		// Canvas text needs a DOM; headless runs simply skip the popup.
		if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 96;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.font = '900 62px "Arial Black", "Avenir Next", sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';
		ctx.lineWidth = 12;
		ctx.strokeStyle = '#101c28';
		ctx.strokeText(text, 128, 50);
		ctx.fillStyle = fill;
		ctx.fillText(text, 128, 50);
		const map = new THREE.CanvasTexture(canvas);
		map.colorSpace = THREE.SRGBColorSpace;
		const material = new THREE.SpriteMaterial({
			map,
			transparent: true,
			depthTest: false,
			depthWrite: false
		});
		const sprite = new THREE.Sprite(material);
		sprite.renderOrder = 6;
		sprite.position.set(at.x, at.y + 1.6, at.z);
		this.scene.add(sprite);
		this.popups.push({ sprite, material, age: 0 });
	}
	private dropPopup(i: number) {
		const [{ sprite, material }] = this.popups.splice(i, 1);
		this.scene.remove(sprite);
		material.map?.dispose();
		material.dispose();
	}
}
