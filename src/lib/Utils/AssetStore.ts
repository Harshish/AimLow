import { writable } from 'svelte/store';
import * as THREE from 'three/webgpu';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type Asset = {
	path: string;
	id: string;
	type: string;
};

type AssetStore = {
	assetsToLoad: Asset[];
	loadedAssets: Record<string, THREE.Texture | GLTF>;
	addLoadedAsset: (asset: THREE.Texture | GLTF, id: string) => void;
	ready: boolean;
};

const assetsToLoad: Asset[] = [
	{
		path: '/models/urinal.glb',
		id: 'urinal',
		type: 'model'
	},
	{
		path: '/models/wasp.glb',
		id: 'wasp',
		type: 'model'
	},
	{
		path: '/models/spider.glb',
		id: 'spider',
		type: 'model'
	},
	{
		path: '/textures/t_inkpaint.jpg',
		id: 'wall_graffiti',
		type: 'texture'
	},
	{
		path: '/textures/floor.png',
		id: 'floor',
		type: 'texture'
	}
];

export const assetStore = writable<AssetStore>({
	assetsToLoad,
	loadedAssets: {},
	addLoadedAsset: (asset, id) => {
		assetStore.update((state) => {
			let isReady = false;
			if (Object.keys(state.loadedAssets).length + 1 === assetsToLoad.length) {
				isReady = true;
			}

			return {
				...state,
				loadedAssets: {
					...state.loadedAssets,
					[id]: asset
				},
				ready: isReady
			};
		});
	},
	ready: false
});
