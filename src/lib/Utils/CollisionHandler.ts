import * as THREE from 'three/webgpu';

type CollisionHandlerFn = (
	meshA: THREE.Mesh | undefined,
	meshB: THREE.Mesh | undefined,
	started: boolean
) => void;

type CollisionHandlerMapType = Map<string, CollisionHandlerFn>;

export class CollisionHandler {
	private collisionHandlerMap: CollisionHandlerMapType;

	constructor() {
		this.collisionHandlerMap = new Map();
	}

	addCollisionHandler(
		key1: string | undefined,
		key2: string | undefined,
		handler: CollisionHandlerFn
	) {
		if (!key1 && !key2) return;
		const keys = this.resolveKeyOrder(key1, key2);
		if (!keys) return;
		this.collisionHandlerMap.set(keys, handler);
	}

	resolveKeyOrder(key1: string | undefined, key2: string | undefined): string | null {
		if (!key1 && !key2) return null;
		if (!key1) key1 = '';
		if (!key2) key2 = '';
		return key1 < key2 ? `${key1}:${key2}` : `${key2}:${key1}`;
	}

	resolveCollision(mesh1: THREE.Mesh | undefined, mesh2: THREE.Mesh | undefined, started: boolean) {
		const name1 = mesh1?.userData.name;
		const name2 = mesh2?.userData.name;
		const keys = this.resolveKeyOrder(name1, name2);
		if (!keys) return;
		const handler = this.collisionHandlerMap.get(keys);
		if (!handler) return;
		handler(mesh1, mesh2, started);
	}
}
