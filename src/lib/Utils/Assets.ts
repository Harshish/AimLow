import type { Texture } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export type LoadedAssets = {
	urinal: GLTF;
	wasp: GLTF;
	spider: GLTF;
	floor: Texture;
	wall: Texture;
	graffiti: Texture;
};

export const assetsToLoad = [
	{ path: '/models/urinal.glb', id: 'urinal', type: 'model' },
	{ path: '/models/wasp.glb', id: 'wasp', type: 'model' },
	{ path: '/models/spider.glb', id: 'spider', type: 'model' },
	{ path: '/textures/t_floor.png', id: 'floor', type: 'texture' },
	{ path: '/textures/t_bricks.png', id: 'wall', type: 'texture' },
	{ path: '/textures/t_graffiti.png', id: 'graffiti', type: 'texture' }
] as const;
