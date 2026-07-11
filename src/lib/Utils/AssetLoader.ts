import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { assetStore } from './AssetStore';
import { get } from 'svelte/store';

export default class AssetLoader {
	gltfLoader!: GLTFLoader;
	textureLoader!: THREE.TextureLoader;
	constructor() {
		this.instantiateLoaders();
		this.startLoading();
	}

	instantiateLoaders() {
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('/draco/');
		this.gltfLoader = new GLTFLoader();
		this.gltfLoader.setDRACOLoader(dracoLoader);
		this.textureLoader = new THREE.TextureLoader();
	}

	startLoading() {
		get(assetStore).assetsToLoad.forEach((asset) => {
			if (asset.type === 'texture') {
				this.textureLoader.load(asset.path, (loadedAsset) => {
					get(assetStore).addLoadedAsset(loadedAsset, asset.id);
				});
			}
			if (asset.type === 'model') {
				this.gltfLoader.load(asset.path, (loadedAsset) => {
					get(assetStore).addLoadedAsset(loadedAsset, asset.id);
				});
			}
		});
	}
}
