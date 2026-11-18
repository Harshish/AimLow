<script lang="ts">
	import { onMount, tick } from 'svelte';
	import App from '$lib/App';
	import { gameStateStore } from '$lib/Utils/Store';
	import {
		DEFAULT_SETTINGS,
		BOWL_STREAK_SECONDS,
		WAVE_BREAK,
		QUICK_KILL_WINDOW
	} from '$lib/Game/config';
	import { loadSettings, saveSettings } from '$lib/Game/settings';
	import { assetsToLoad } from '$lib/Utils/Assets';
	import Hud from '$lib/UI/Hud.svelte';

	let canvas: HTMLCanvasElement;
	let app: App | undefined;
	let progress = $state(0),
		ready = $state(false),
		error = $state('');
	let panel = $state<'home' | 'help' | 'settings'>('home');
	let settings = $state({ ...DEFAULT_SETTINGS });
	let mounted = false;
	let focusPanel = $state<HTMLElement>();
	const phase = $derived($gameStateStore.phase);
	const result = $derived($gameStateStore.result);

	onMount(() => {
		mounted = true;
		settings = loadSettings();
		const initialize = async () => {
			try {
				app = new App(canvas);
				app.setSettings(settings);
				await app.init((value) => {
					if (mounted) progress = Math.round(value * 100);
				});
				if (mounted) ready = true;
			} catch (cause) {
				if (mounted)
					error =
						cause instanceof Error
							? cause.message
							: 'Unable to start. Try another browser with WebGL2 or WebGPU support.';
			}
		};
		void initialize();
		return () => {
			mounted = false;
			app?.dispose();
		};
	});

	$effect(() => {
		if (ready) {
			app?.setSettings(settings);
			saveSettings(settings);
		}
	});

	$effect(() => {
		if (phase === 'results' || phase === 'paused' || panel !== 'home') {
			void tick().then(() => focusPanel?.focus({ preventScroll: true }));
		}
	});

	function mainMenu() {
		app?.menu();
		panel = 'home';
	}
</script>

<svelte:head>
	<title>Aim Low - Low aim. High scores.</title>
	<meta
		name="description"
		content="Keep it in the bowl. Blast the bugs. Don’t run dry. A free single-player browser game."
	/>
	<meta name="theme-color" content="#101c28" />
	<link
		rel="preload"
		href="/fonts/bangers-latin.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>

	<!-- Start downloads with the HTML, not after the engine bundle boots. Matches loader requests. -->
	{#each assetsToLoad as asset (asset.id)}
		<link
			rel="preload"
			href={asset.path}
			as={asset.type === 'model' ? 'fetch' : 'image'}
			crossorigin="anonymous"
		/>
	{/each}
</svelte:head>

<main
	class:reduced-motion={settings.reducedMotion}
	class:in-game={phase === 'playing' || phase === 'countdown'}
	class:menu-home={phase === 'menu' && panel === 'home'}
>
	<canvas
		class="threejs"
		class:aiming={phase === 'playing'}
		bind:this={canvas}
		aria-label="Aim Low game arena. Move your pointer, drag, or use arrow keys to aim."
	></canvas>

	{#if !ready}
		<div class="screen loading-screen">
			<span class="brand lettering">AIM LOW.</span>
			{#if error}
				<h1 class="lettering">TECHNICAL<br />DIFFICULTIES.</h1>
				<p role="alert">{error}</p>
				<button class="primary" onclick={() => location.reload()}>TRY AGAIN ↗</button>
			{:else}
				<span class="eyebrow">GETTING THE PLUMBING READY</span>
				<div class="loading-track"><div style:width="{progress}%"></div></div>
				<p role="status">Loading the bathroom… {progress}%</p>{/if}
		</div>
	{:else if phase === 'menu'}
		<div class="menu-shade"></div>
		<header class="site-header">
			<span class="edition">BATHROOM ARCADE <b class="caption">VOL. 01</b></span>
		</header>

		{#if panel === 'home'}
			<section class="home">
				<h1 class="lettering">
					AIM
					<br />
					<span>LOW.</span>
					<svg viewBox="0 0 64 64" aria-hidden="true">
						<path d="M54 10 10 54M10 20v34h34" />
					</svg>
				</h1>
				<p class="tagline caption">LOW AIM. <b>HIGH SCORES.</b></p>
				<div class="home-card comic-panel">
					<p class="intro">
						Keep it in the bowl. Blast the bugs.<br />Don’t run dry. Your dignity is optional.
					</p>

					<button class="primary play" onclick={() => app?.start()}>PLAY <span>↗</span></button>
					<div class="minor-actions">
						<button class="text-button" onclick={() => (panel = 'help')}>HOW TO PLAY</button><span>
							/
						</span><button class="text-button" onclick={() => (panel = 'settings')}>SETTINGS</button
						>
					</div>
				</div>
			</section>
			<div class="arena-note comic-panel" aria-hidden="true">
				<p>THE ORIGINAL<br /><b>SPLASH ZONE!</b></p>
				<span class="eyebrow">EST. RIGHT NOW</span>
			</div>
			<footer class="home-footer">
				<span><i>1</i> AIM INSIDE</span><span><i>2</i> BLAST BUGS</span><span
					><i>3</i> WATCH PRESSURE</span
				><small>NO DOWNLOAD. NO EXCUSES.</small>
			</footer>
		{:else}
			<div class="modal-wrap">
				<section
					class="panel comic-panel"
					bind:this={focusPanel}
					tabindex="-1"
					aria-label={panel === 'settings' ? 'Settings' : 'How to play'}
				>
					<button
						class="back text-button"
						onclick={() => {
							panel = 'home';
						}}>← BACK TO THE BATHROOM</button
					>
					{#if panel === 'help'}
						<span class="caption">THE SHORT VERSION</span>
						<h2>MAKE EVERY<br /><em>DROP COUNT.</em></h2>
						<ol class="instructions">
							<li>
								<span>01</span>
								<div>
									<b>Build a clean streak.</b>
									<p>
										Keep the stream inside the bowl for {BOWL_STREAK_SECONDS} seconds to earn a power-up.
										Watch the streak meter: spills, shooting bugs, or leaving the bowl reset it.
									</p>
								</div>
							</li>
							<li>
								<span>02</span>
								<div>
									<b>React fast.</b>
									<p>
										Kill a bug within {QUICK_KILL_WINDOW} seconds of it appearing for bonus points, up
										to double. Every bug moves at its own pace; from wave 2, glowing red bugs are fast:
										they escape sooner but pay more. From wave 3, wasps pause then dart. Wave 4 adds depth-crawling
										spiders; wave 7 adds ceiling drops. Aim at the bug—the stream follows its depth. Kills
										restore 8% pressure. Use the {WAVE_BREAK}-second breaks to charge a bowl reward.
									</p>
								</div>
							</li>
							<li>
								<span>03</span>
								<div>
									<b>Use your reward.</b>
									<p>
										Foam Party brings 25% more flow. Coffee Laser fires 60% faster with 50% more
										flow and pinpoint aim: more damage and bowl points. Rewards alternate, last 8
										seconds, and restore 15% pressure. Build another streak after expiry. Empty
										tank, game over.
									</p>
								</div>
							</li>
						</ol>
						<div class="controls-note">MOUSE / TOUCH / ARROW KEYS <span>ESC TO PAUSE</span></div>
					{:else if panel === 'settings'}
						<span class="caption">YOUR BATHROOM. YOUR RULES.</span>
						<h2>FINE<br /><em>TUNING.</em></h2>
						<div class="settings-list">
							<label
								><span>Sound effects<small>Tiny synths. Big satisfaction.</small></span><input
									type="checkbox"
									bind:checked={settings.sound}
								/></label
							><label
								><span>Arcade beat<small>A little rhythm for your stream.</small></span><input
									type="checkbox"
									bind:checked={settings.music}
								/></label
							><label
								><span>Haptics<small>Buzz on kills and escapes. Phones only.</small></span><input
									type="checkbox"
									bind:checked={settings.haptics}
								/></label
							><label
								><span>Reduced motion<small>Less spin and pulsing.</small></span><input
									type="checkbox"
									bind:checked={settings.reducedMotion}
								/></label
							><label
								><span
									>Keyboard aim speed<small
										>{settings.sensitivity.toFixed(1)}× · Pointer aim stays direct.</small
									></span
								><input
									type="range"
									min="0.5"
									max="2"
									step="0.1"
									bind:value={settings.sensitivity}
								/></label
							><label
								><span
									>Visual quality<small
										>High adds crisp shadows and sharper pixels. Never changes gameplay or score.</small
									></span
								><select bind:value={settings.quality}
									><option value="high">High</option><option value="low">Low</option></select
								></label
							>
						</div>
					{/if}
				</section>
			</div>
		{/if}
	{:else if phase === 'playing' || phase === 'countdown'}
		<Hud state={$gameStateStore} onpause={() => app?.pause()} />
		{#if phase === 'countdown'}<div class="countdown" aria-live="polite">
				<span class="caption">GET YOUR AIM TOGETHER</span>
				{#key Math.ceil($gameStateStore.countdown)}<b class="lettering"
						>{Math.ceil($gameStateStore.countdown)}</b
					>{/key}<span>AIM INSIDE. BLAST BUGS. DON’T RUN DRY.</span>
			</div>{/if}
	{:else if phase === 'paused'}
		<div class="modal-wrap scrim">
			<section
				class="panel comic-panel compact"
				bind:this={focusPanel}
				tabindex="-1"
				aria-label="Game paused"
			>
				<span class="caption">TAKE YOUR TIME. WE’LL HOLD IT.</span>
				<h2>HOLD<br /><em>IT.</em></h2>
				<p>Pressure, bugs, and drinks are paused.</p>
				<button class="primary full" onclick={() => app?.resume()}>BACK TO BUSINESS ↗</button
				><button class="text-button full" onclick={mainMenu}>END RUN & RETURN TO MENU</button>
			</section>
		</div>
	{:else if phase === 'gameover'}
		<div class="countdown">
			<span class="caption">THE TANK HAS SPOKEN</span>
			<h2 class="lettering">OUT OF<br /><em>JUICE.</em></h2>
		</div>
	{:else if phase === 'results' && result}
		<div class="modal-wrap scrim">
			<section
				class="panel comic-panel results"
				bind:this={focusPanel}
				tabindex="-1"
				aria-label="Round results"
			>
				<span class="eyebrow">ROUND COMPLETE</span>
				<h2>OUT OF JUICE.<br /><em>FULL OF GLORY.</em></h2>
				<div class="final-score">{result.score.toLocaleString()}<span>POINTS</span></div>
				<div class="result-stats">
					<div>
						<b>{result.accuracy === null ? '—' : `${Math.round(result.accuracy * 100)}%`}</b><span
							>ACCURACY</span
						>
					</div>
					<div><b>{result.kills}</b><span>BUGS BLASTED</span></div>
					<div>
						<b
							>{$gameStateStore.fastestKill === null
								? '—'
								: `${$gameStateStore.fastestKill.toFixed(2)}s`}</b
						><span>FASTEST KILL</span>
					</div>
					<div><b>{result.duration.toFixed(1)}s</b><span>LASTED</span></div>
				</div>
				<div class="result-actions">
					<button class="primary" onclick={() => app?.start()}>ONE MORE ROUND ↗</button>
					<button class="secondary" onclick={mainMenu}>MENU</button>
				</div>
			</section>
		</div>
	{/if}
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		isolation: isolate;
	}
	.menu-home {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		row-gap: 1rem;
		padding: 1.8rem 3.5rem 0.9rem;
	}
	.menu-home .threejs {
		position: absolute;
		inset: 0;
	}
	.threejs {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
	}
	.threejs.aiming {
		cursor: crosshair;
	}
	/* Darker on the menu side so the spotlit bowl stays clear and the hero of the frame. */
	.menu-shade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, #101c28f0 6%, #101c28a0 30%, transparent 42%),
			linear-gradient(0deg, #101c28 0%, transparent 22%);
		pointer-events: none;
	}
	/* Print dots fade out before they reach the bowl. */
	.menu-shade::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(circle, #0b0d1477 1.3px, transparent 1.8px) 0 0 / 7px 7px;
		mask-image: linear-gradient(90deg, #000 20%, transparent 40%);
	}
	.site-header {
		position: absolute;
		inset: 0 0 auto;
		padding: 1.8rem 3.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.menu-home .site-header {
		position: relative;
		inset: auto;
		padding: 0;
	}
	.brand {
		font-size: 1.3rem;
	}
	.edition {
		font: 0.6rem var(--mono);
		letter-spacing: 0.12em;
		color: var(--muted);
		display: flex;
		gap: 0.9rem;
		align-items: center;
	}
	.home {
		position: relative;
		align-self: center;
		margin-left: max(0px, calc(6vw - 3.5rem));
		width: min(440px, 40vw);
	}
	h1 {
		/* Height-capped too: browsers with tall toolbars (Firefox) leave less room for the column. */
		font-size: clamp(3.5rem, min(11vw, 14vh), 10rem);
		line-height: 0.86;
		color: var(--paper);
		margin: 0 0 0.9rem;
		position: relative;
		width: max-content;
		rotate: -4deg;
	}
	h1 > span {
		color: var(--lime);
	}
	h1 svg {
		width: 52px;
		height: 52px;
		position: absolute;
		right: -70px;
		bottom: 10px;
		fill: none;
		stroke: var(--lime);
		stroke-width: 7;
		filter: drop-shadow(4px 4px 0 var(--outline));
	}
	.tagline {
		margin: 0 0 1.4rem 0.3rem;
		font: 1.25rem var(--display);
		letter-spacing: 0.06em;
		rotate: -3deg;
	}
	.tagline b {
		font-weight: 400;
		color: #c2185b;
	}
	.home-card {
		--shadow: var(--mint);
		padding: 1.15rem 1.3rem 0.5rem;
	}
	.intro {
		color: var(--muted);
		font-size: 0.92rem;
		line-height: 1.5;
		margin: 0 0 0.9rem;
	}
	.play {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 60px;
		font-size: 1.55rem;
	}
	.play > span {
		font-size: 1.6rem;
		line-height: 1;
	}
	.minor-actions {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.8rem;
		margin-top: 0.5rem;
	}
	.minor-actions button:first-child {
		justify-self: end;
	}
	.minor-actions button:last-child {
		justify-self: start;
	}
	.minor-actions > span {
		color: var(--muted);
	}
	/* Speech bubble that points at the spotlit bowl. */
	.arena-note {
		position: absolute;
		right: 8%;
		top: 24%;
		padding: 1rem 1.4rem 0.8rem;
		border-radius: 22px;
		rotate: 5deg;
		text-align: center;
	}
	.arena-note::after {
		content: '';
		position: absolute;
		left: -15px;
		top: 58%;
		width: 26px;
		height: 26px;
		background: var(--paper);
		border: solid var(--outline);
		border-width: 0 0 3px 3px;
		transform: rotate(45deg) skew(12deg, 12deg);
	}
	.arena-note p {
		font: 1.6rem/1 var(--display);
		letter-spacing: 0.04em;
		margin: 0 0 0.35rem;
	}
	.arena-note b {
		font-weight: 400;
		color: var(--lime);
		-webkit-text-stroke: 0.14em var(--outline);
		paint-order: stroke fill;
	}
	.arena-note .eyebrow {
		font-size: 0.62rem;
	}
	.home-footer {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1.75rem;
		padding-top: 0.5rem;
		border-top: 2px solid #ffffff1c;
		font: 1.05rem var(--display);
		letter-spacing: 0.07em;
	}
	.home-footer span {
		white-space: nowrap;
	}
	.home-footer i {
		display: inline-grid;
		place-items: center;
		width: 1.7em;
		height: 1.7em;
		margin-right: 0.45rem;
		border: 2px solid var(--outline);
		border-radius: 50%;
		background: var(--lime);
		color: var(--outline);
		font: 700 0.6rem var(--mono);
	}
	.home-footer small {
		margin-left: auto;
		font: 0.62rem var(--mono);
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.modal-wrap {
		position: absolute;
		inset: 0;
		padding: 5.5rem 1rem 1.5rem;
		overflow: auto;
		display: flex;
		align-items: safe center;
		justify-content: center;
	}
	/* Print dots instead of blur: the paused scene reads as a comic backdrop, not a haze. */
	.scrim {
		padding-top: 1.5rem;
		background:
			radial-gradient(circle, #0b0d14cc 1.5px, transparent 2px) 0 0 / 6px 6px,
			#09141b99;
	}
	.panel {
		--shadow: var(--mint);
		width: min(100%, 570px);
		padding: 1.8rem 2.4rem 2rem;
		outline: none;
	}
	.back {
		font-size: 0.85rem;
		padding-top: 0;
		min-height: 35px;
	}
	.panel > .caption {
		display: block;
		margin-top: 0.4rem;
	}
	h2 {
		font: 400 clamp(2.5rem, 5vw, 3.4rem) / 0.95 var(--display);
		letter-spacing: 0.02em;
		margin: 1rem 0;
	}
	em {
		font-style: normal;
		color: var(--lime);
		-webkit-text-stroke: 0.1em var(--outline);
		paint-order: stroke fill;
		text-shadow: 0.06em 0.06em 0 var(--outline);
	}
	.panel > p {
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--muted);
	}
	.full {
		width: 100%;
		margin-top: 1rem;
	}
	.instructions {
		list-style: none;
		padding: 0;
		margin: 1.6rem 0;
		display: grid;
		gap: 1.4rem;
	}
	.instructions li {
		display: flex;
		gap: 1rem;
	}
	.instructions li > span {
		font: 1.1rem var(--display);
		padding: 0.25rem 0.5rem;
		border: 2px solid var(--outline);
		box-shadow: 2px 2px 0 var(--outline);
		background: var(--lime);
		height: min-content;
	}
	.instructions b {
		font: 400 1.2rem var(--display);
		letter-spacing: 0.04em;
	}
	.instructions p {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
		line-height: 1.65;
		color: var(--muted);
	}
	.controls-note {
		font: 700 0.6rem/2 var(--mono);
		border-top: 2px solid var(--outline);
		padding-top: 0.8rem;
	}
	.controls-note span {
		display: block;
		color: var(--muted);
	}
	.settings-list {
		margin-top: 0.6rem;
	}
	.settings-list > label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		border-bottom: 2px dashed var(--line);
		padding: 0.7rem 0;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.settings-list small {
		display: block;
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 400;
		margin-top: 0.3rem;
	}
	.settings-list select,
	.settings-list input[type='range'] {
		max-width: 100px;
		font-size: 0.8rem;
	}
	.countdown {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 0.4rem;
		background: #101c2850;
		pointer-events: none;
		text-align: center;
	}
	.countdown > b {
		font-size: 11rem;
		line-height: 1.1;
		color: var(--lime);
		rotate: -4deg;
		animation: pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1) both;
	}
	.countdown > span:last-child {
		font: 1.25rem var(--display);
		letter-spacing: 0.08em;
		text-shadow: 2px 2px 0 var(--outline);
	}
	.countdown h2 {
		font-size: clamp(3.5rem, 9vw, 6rem);
		color: var(--paper);
		rotate: -3deg;
	}
	@keyframes pop {
		from {
			scale: 1.7;
			opacity: 0;
		}
	}
	.reduced-motion .countdown > b {
		animation: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.countdown > b {
			animation: none;
		}
	}
	.compact {
		--shadow: var(--coral);
		max-width: 430px;
	}
	.results {
		--shadow: var(--lime);
	}
	.results h2 {
		font-size: clamp(2rem, 4vw, 2.7rem);
		margin: 1.2rem 0 0.4rem;
	}
	.final-score {
		font: 400 clamp(4rem, 9vw, 6rem) / 1.15 var(--display);
		letter-spacing: 0.02em;
	}
	.final-score span {
		margin-left: 0.7rem;
		font: 700 0.6rem var(--mono);
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.result-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.6rem;
		padding: 0.4rem 0 0.6rem;
	}
	.result-stats > div {
		background: #fff;
		border: 2px solid var(--outline);
		box-shadow: 3px 3px 0 var(--outline);
		padding: 0.45rem 0.55rem;
	}
	.result-stats b {
		display: block;
		font: 400 1.6rem var(--display);
		letter-spacing: 0.03em;
	}
	.result-stats span {
		display: block;
		font: 700 0.5rem var(--mono);
		color: var(--muted);
		margin-top: 0.2rem;
	}
	.result-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	.result-actions button {
		flex: 1;
		padding: 0.75rem 0.6rem;
	}
	.loading-screen {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle, #ffffff0d 1.3px, transparent 1.8px) 0 0 / 8px 8px,
			var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		padding: 2rem;
		text-align: center;
	}
	.loading-screen .brand {
		margin-bottom: 2.5rem;
		color: var(--lime);
		font-size: 3.5rem;
		rotate: -4deg;
	}
	.loading-screen h1 {
		font-size: 2.8rem;
		line-height: 1.05;
		width: auto;
	}
	.loading-screen p {
		color: var(--muted);
		font-size: 0.75rem;
		max-width: 450px;
		line-height: 1.6;
	}
	.loading-track {
		width: min(260px, 70vw);
		height: 20px;
		padding: 3px;
		border: 3px solid var(--paper);
		border-radius: 3px;
		margin: 1.2rem 0 0.5rem;
	}
	.loading-track > div {
		height: 100%;
		background: repeating-linear-gradient(90deg, var(--lime) 0 12px, transparent 12px 15px);
		transition: width 0.3s;
	}
	@media (max-width: 800px) {
		.menu-home,
		.site-header {
			padding: 1.25rem 1.5rem;
		}
		.home {
			margin-left: 0;
			width: min(380px, 46vw);
		}
		.arena-note {
			right: 3%;
		}
		.arena-note p {
			font-size: 1.2rem;
		}
		.home-footer {
			gap: 1rem;
		}
		.home-footer small {
			display: none;
		}
		h1 svg {
			display: none;
		}
	}
	@media (max-width: 600px) {
		/* Portrait: title up top, controls at the bottom, the spotlit bowl in between. */
		.menu-shade {
			background: linear-gradient(0deg, #101c28 30%, transparent 46%, transparent 68%, #101c28c0);
		}
		.menu-shade::before {
			mask-image: linear-gradient(0deg, #000 30%, transparent 46%);
		}
		.menu-home {
			padding-bottom: 0.9rem;
		}
		.edition {
			font-size: 0.5rem;
		}
		.home {
			width: min(400px, 100%);
			margin: 0 auto;
			align-self: stretch;
			display: flex;
			flex-direction: column;
		}
		h1 {
			font-size: clamp(4.5rem, 22vw, 7rem);
			margin-top: 0.5rem;
		}
		.home-card {
			margin-top: auto;
		}
		.arena-note {
			display: none;
		}
		.home-footer {
			justify-content: space-between;
			font-size: 0.85rem;
			gap: 0.25rem;
		}
		.panel {
			padding: 1.5rem 1.4rem;
		}
		.modal-wrap {
			padding: 5rem 1rem 1.2rem 0.75rem;
		}
		.scrim {
			padding-top: 1rem;
		}
		.result-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-height: 740px) {
		.tagline {
			margin-bottom: 1rem;
		}
		.intro {
			line-height: 1.4;
			margin-bottom: 0.6rem;
		}
		.minor-actions button {
			min-height: 34px;
		}
		.home-footer {
			padding-top: 0.35rem;
		}
	}
	@media (max-height: 740px) and (max-width: 600px) {
		.home h1 {
			font-size: clamp(4rem, 17vw, 6rem);
		}
		.intro {
			display: none;
		}
	}
	@media (max-width: 380px) {
		.home-footer {
			font-size: 0.75rem;
		}
	}
	@media (max-height: 700px) {
		.intro {
			display: none;
		}
	}
	@media (max-height: 620px) {
		/* Short screens (landscape phones, small windows): title left, controls right,
		   the bowl framed between them. */
		.home {
			width: 100%;
			margin: 0;
			display: grid;
			grid-template-columns: auto 1fr min(300px, 38vw);
			align-items: center;
		}
		.home h1 {
			font-size: clamp(3.5rem, 16vh, 6rem);
			margin: 0;
		}
		h1 svg {
			display: none;
		}
		.home-card {
			grid-column: 3;
			grid-row: 1;
			margin: 0;
			padding: 0.8rem 1rem 0.3rem;
		}
		.intro,
		.tagline,
		.arena-note,
		.home-footer {
			display: none;
		}
	}
	@media (max-height: 620px) and (max-width: 600px) {
		.home {
			display: block;
			width: 100%;
		}
		.home h1 {
			font-size: clamp(3.5rem, 13vh, 5rem);
			margin: 0.3rem 0;
		}
		.play {
			min-height: 48px;
		}
	}
</style>
