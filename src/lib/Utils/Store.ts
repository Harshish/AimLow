import { writable } from 'svelte/store';

export const sizesStore = writable({
	width: 0,
	height: 0,
	pixelRatio: 1
});

export const appStateStore = writable({
	physicsReady: false
});

export const appStatusStore = writable({
	started: false
});

export const inputStore = writable({
	forward: false,
	backward: false,
	left: false,
	right: false
});
