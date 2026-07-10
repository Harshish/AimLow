import { writable } from 'svelte/store';

export const sizesStore = writable({
	width: 0,
	height: 0,
	pixelRatio: 1
});
