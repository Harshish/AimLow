import { sizesStore } from '$lib/Utils/Store';

export default class Resize {
	constructor() {
		window.addEventListener('resize', () => {
			console.log('resized');

			sizesStore.set({
				width: window.innerWidth,
				height: window.innerHeight,
				pixelRatio: Math.min(window.devicePixelRatio, 2)
			});
		});
	}
}
