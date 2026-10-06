import * as THREE from 'three/webgpu';

/** Release shared GPU resources once, including textures attached to loaded materials. */
export function disposeResources(resources: (THREE.Object3D | THREE.Texture)[]) {
	const geometries = new Set<THREE.BufferGeometry>();
	const materials = new Set<THREE.Material>();
	const textures = new Set<THREE.Texture>();
	const objects = new Set<THREE.Object3D>();

	for (const resource of resources) {
		if (resource instanceof THREE.Texture) {
			textures.add(resource);
			continue;
		}
		resource.traverse((object) => {
			if (objects.has(object)) return;
			objects.add(object);
			const mesh = object as THREE.Mesh;
			if (mesh.geometry) geometries.add(mesh.geometry);
			if (mesh.material) {
				for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
					materials.add(material);
					for (const value of Object.values(material)) {
						if (value instanceof THREE.Texture) textures.add(value);
					}
				}
			}
			if (object instanceof THREE.InstancedMesh) object.dispose();
			if (
				object instanceof THREE.DirectionalLight ||
				object instanceof THREE.SpotLight ||
				object instanceof THREE.PointLight
			)
				object.shadow.dispose();
		});
	}
	for (const geometry of geometries) geometry.dispose();
	for (const material of materials) material.dispose();
	const bitmaps = new Set<ImageBitmap>();
	for (const texture of textures) {
		texture.dispose();
		if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) {
			bitmaps.add(texture.image);
		}
	}
	// Texture.dispose releases GPU memory, but GLTF ImageBitmaps also own CPU memory.
	for (const bitmap of bitmaps) bitmap.close();
}
