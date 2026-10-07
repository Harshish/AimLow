import { writable } from 'svelte/store';
import { initialState } from '../Game/Session';

/** Read-only UI projection in practice; Session owns all gameplay mutations. */
export const gameStateStore = writable(initialState());
