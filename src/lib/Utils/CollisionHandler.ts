import type { Object3D } from 'three/webgpu';

type CollisionHandlerFn = (
	objectA: Object3D | undefined,
	objectB: Object3D | undefined,
	started: boolean
) => void;

export class CollisionHandler {
	private readonly handlers = new Map<string, CollisionHandlerFn>();

	addCollisionHandler(
		key1: string | undefined,
		key2: string | undefined,
		handler: CollisionHandlerFn
	) {
		const key = this.resolveKeyOrder(key1, key2);
		if (!key) return () => {};
		this.handlers.set(key, handler);
		return () => {
			if (this.handlers.get(key) === handler) this.handlers.delete(key);
		};
	}

	resolveKeyOrder(key1: string | undefined, key2: string | undefined): string | null {
		if (!key1 && !key2) return null;
		// JSON encoding avoids collisions when a name itself contains ':'.
		return JSON.stringify([key1 ?? '', key2 ?? ''].sort());
	}

	resolveCollision(object1: Object3D | undefined, object2: Object3D | undefined, started: boolean) {
		const key = this.resolveKeyOrder(object1?.userData.name, object2?.userData.name);
		if (key) this.handlers.get(key)?.(object1, object2, started);
	}

	clear() {
		this.handlers.clear();
	}
}
