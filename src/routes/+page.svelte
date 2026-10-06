<script lang="ts">
	import { onMount } from 'svelte';
	import App from '$lib/App';
	import { gameStateStore } from '$lib/Utils/Store';

	let canvas: HTMLCanvasElement;
	let app: App | undefined;
	let progress = $state(0);
	let ready = $state(false);
	let started = $state(false);
	let error = $state('');

	onMount(() => {
		let active = true;
		const initialize = async () => {
			try {
				app = new App(canvas);
				await app.init((value) => {
					if (active) progress = Math.trunc(value * 100);
				});
				if (active) ready = true;
			} catch (cause) {
				if (active) error = cause instanceof Error ? cause.message : 'Unable to start experience';
			}
		};
		void initialize();
		return () => {
			active = false;
			app?.dispose();
		};
	});

	function start() {
		app?.start();
		started = true;
	}
</script>

<canvas class="threejs" bind:this={canvas}></canvas>
<div class="overlay" class:hidden={started}></div>
{#if error}
	<p class="loading" role="alert">{error}</p>
{:else if !ready}
	<h1 class="loading" aria-live="polite">Loading Experience... {progress}%</h1>
{:else if !started}
	<button type="button" class="start" onclick={start}>START</button>
{/if}
{#if started}
	<h2 class="score">Score : {$gameStateStore.score}</h2>
{/if}

<style>
	.overlay {
		opacity: 1;
		background-color: rgb(0, 0, 0);
		position: fixed;
		width: 100%;
		height: 100%;
		top: 0px;
		left: 0px;
		pointer-events: none;
		transition: opacity 1s;
	}

	.overlay.hidden {
		opacity: 0;
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: white;
		background-color: transparent;
		font-size: 2rem;
		font-family: 'Amatic SC';
		opacity: 1;
		transition: opacity 1s;
	}

	.start {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		border: none;
		color: white;
		background-color: transparent;
		font-size: 4rem;
		opacity: 1;
		font-family: 'Amatic SC';
		transition: opacity 0.5s;
		cursor: pointer;
	}

	.score {
		position: absolute;
		top: 5%;
		left: 80%;
		transform: translate(-50%, -50%);
		color: black;
		background-color: transparent;
		font-size: 3rem;
		font-family: 'Amatic SC';
		opacity: 1;
		transition: opacity 1s;
	}

	@media (hover: hover) and (pointer: fine) {
		.start:hover {
			color: #9effe7;
		}
	}
</style>
