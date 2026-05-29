<script lang="ts">
	import CanvasPortal from '$lib/components/CanvasPortal.svelte';
	import { T } from '@threlte/core';
	import GameScene from '$lib/components/GameScene.svelte';
</script>

<!-- Regular DOM elements for UI -->
<button>Click me</button>

<!-- 3D content -->
<CanvasPortal>
	<GameScene />
</CanvasPortal>
