import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Rapier's compat build initializes embedded WASM explicitly; no transform plugins needed.
export default defineConfig({ plugins: [tailwindcss(), sveltekit()] });
