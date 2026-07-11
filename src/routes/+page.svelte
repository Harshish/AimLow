<script>
	import { onMount } from 'svelte';
	import App from '$lib/App';

	onMount(() => {
		new App();
	});
</script>

<canvas class="threejs"></canvas>
<div class="overlay"></div>
<h1 class="loading">
	Loading Experience... <span id="progressPercentage"></span>%
</h1>
<button class="start">START</button>

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
		opacity: 0;
		font-family: 'Amatic SC';
		transition: opacity 0.5s;
		cursor: pointer;
		display: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.start:hover {
			color: #9effe7;
		}
	}
</style>
