import { writable } from 'svelte/store';

export const inputStore = writable({
	forward: false,
	backward: false,
	left: false,
	right: false
});

export const gameStateStore = writable({
	score: 0
});
