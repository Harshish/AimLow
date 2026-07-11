import { writable } from 'svelte/store';
import * as THREE from 'three';
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
};

const assetsToLoad: Asset[] = [
	{
		path: '/models/fly.glb',
		id: 'fly',
		type: 'model'
	}
];

export const assetStore = writable<AssetStore>({
	assetsToLoad,
	loadedAssets: {},
	addLoadedAsset: (asset, id) => {
		assetStore.update((state) => ({
			...state,
			loadedAssets: {
				...state.loadedAssets,
				[id]: asset
			}
		}));
	}
});
