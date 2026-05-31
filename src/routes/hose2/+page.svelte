<script lang="ts">
	import { onMount } from 'svelte';
	import { HoseSceneBuilder } from './main';

	let container: HTMLDivElement;

	onMount(() => {
		const sceneCreator = new HoseSceneBuilder(container);
		sceneCreator.debugMode();
		sceneCreator.animate();

		return () => {
			sceneCreator.cleanup();
		};
	});
</script>

<div bind:this={container}></div>
