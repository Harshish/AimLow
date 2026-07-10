<script>
	import { onMount } from 'svelte';
	import App from '$lib/App';
	import { sizesStore } from '$lib/Utils/Store';

	onMount(() => {
		sizesStore.set({
			width: window.innerWidth,
			height: window.innerHeight,
			pixelRatio: Math.min(window.devicePixelRatio, 2)
		});
		new App();
	});
</script>

<canvas class="threejs"></canvas>
