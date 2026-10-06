import * as THREE from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { assetsToLoad, type LoadedAssets } from './Assets';
import { disposeResources } from './disposeResources';

export default class AssetLoader {
	private readonly draco = new DRACOLoader().setDecoderPath('/draco/');
	private readonly models = new GLTFLoader().setDRACOLoader(this.draco);
	private readonly textures = new THREE.TextureLoader();
	private readonly resources: (THREE.Object3D | THREE.Texture)[] = [];
	private disposed = false;
	private pending = 0;

	async load(onProgress: (progress: number) => void): Promise<LoadedAssets> {
		let loaded = 0;
		this.pending = assetsToLoad.length;
		const entries = await Promise.all(
			assetsToLoad.map(async (asset) => {
				try {
					const value =
						asset.type === 'model'
							? await this.models.loadAsync(asset.path)
							: await this.textures.loadAsync(asset.path);
					const resources = value instanceof THREE.Texture ? [value] : (value as GLTF).scenes;
					if (this.disposed) {
						disposeResources(resources);
						throw new Error('Asset loading cancelled');
					}
					this.resources.push(...resources);
					onProgress(++loaded / assetsToLoad.length);
					return [asset.id, value];
				} catch (error) {
					throw new Error(`Failed to load ${asset.path}`, { cause: error });
				} finally {
					this.pending--;
					if (this.disposed && this.pending === 0) this.draco.dispose();
				}
			})
		);
		// Every manifest entry has resolved; IDs and loader types match LoadedAssets.
		return Object.fromEntries(entries) as LoadedAssets;
	}

	dispose(scene: THREE.Scene) {
		if (this.disposed) return;
		this.disposed = true;
		disposeResources([scene, ...this.resources]);
		this.resources.length = 0;
		// Do not terminate Draco workers while a pending decode still needs them.
		if (this.pending === 0) this.draco.dispose();
	}
}
