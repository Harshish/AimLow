<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import App from '$lib/App';
	import { gameStateStore } from '$lib/Utils/Store';
	import {
		DEFAULT_SETTINGS,
		RULES_VERSION,
		BOWL_STREAK_SECONDS,
		WAVE_BREAK,
		QUICK_KILL_WINDOW
	} from '$lib/Game/config';
	import { loadSettings, saveSettings } from '$lib/Game/settings';
	import { assetsToLoad } from '$lib/Utils/Assets';
	import {
		loadScores,
		saveScore,
		rankScores,
		playerName,
		validName,
		resultTitle,
		shareScore,
		type ScoreEntry
	} from '$lib/Game/leaderboard';
	import Hud from '$lib/UI/Hud.svelte';
	import Scoreboard from '$lib/UI/Scoreboard.svelte';

	let canvas: HTMLCanvasElement;
	let app: App | undefined;
	let progress = $state(0),
		ready = $state(false),
		error = $state('');
	let panel = $state<'home' | 'party' | 'board' | 'help' | 'settings'>('home');
	let settings = $state({ ...DEFAULT_SETTINGS });
	let scores = $state<ScoreEntry[]>([]);
	let name = $state('PLAYER'),
		partyNames = $state('PLAYER 1\nPLAYER 2'),
		party = $state<string[]>([]),
		partyIndex = $state(0),
		partyScores = $state<ScoreEntry[]>([]);
	let formError = $state(''),
		storageMessage = $state(''),
		shareMessage = $state('');
	let rank = $state(-1);
	let entry = $state<ScoreEntry | null>(null);
	let run: { id: string; name: string } | null = null;
	let completedId = '';
	let mounted = false;
	let focusPanel = $state<HTMLElement>();
	const phase = $derived($gameStateStore.phase);
	const best = $derived(scores[0]?.score ?? 0);
	const currentName = $derived(party.length ? party[partyIndex] : name);
	const lastTurn = $derived(party.length > 0 && partyIndex === party.length - 1);

	onMount(() => {
		mounted = true;
		settings = loadSettings();
		scores = loadScores();
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
		if (phase === 'results' && run && completedId !== run.id && $gameStateStore.result) {
			completedId = run.id;
			entry = {
				...$gameStateStore.result,
				id: run.id,
				name: run.name,
				timestamp: new Date().toISOString(),
				rulesVersion: RULES_VERSION
			};
			const saved = saveScore(scores, entry);
			scores = saved.scores;
			rank = saved.rank;
			storageMessage = saved.persisted
				? ''
				: 'Storage unavailable. Scores stay here until you close this page.';
			if (party.length) partyScores = [...partyScores, entry];
		}
	});

	$effect(() => {
		if (phase === 'results' || phase === 'paused' || panel !== 'home') {
			void tick().then(() => focusPanel?.focus({ preventScroll: true }));
		}
	});

	function startRound() {
		shareMessage = '';
		entry = null;
		run = { id: crypto.randomUUID(), name: playerName(currentName) };
		app?.start();
	}

	function solo() {
		party = [];
		partyScores = [];
		name = playerName(name);
		startRound();
	}

	function startParty() {
		const names = partyNames
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
		if (names.length < 2 || names.length > 8 || names.some((s) => !validName(s))) {
			formError =
				'Enter 2–8 names, one per line. Use 1–12 letters, numbers, spaces, or . _ - per name.';
			return;
		}
		formError = '';
		party = names;
		partyIndex = 0;
		partyScores = [];
		panel = 'home';
		startRound();
	}

	function nextTurn() {
		partyIndex++;
		startRound();
	}

	function mainMenu() {
		app?.menu();
		panel = 'home';
		run = null;
		entry = null;
	}

	async function share() {
		if (!entry) return;
		try {
			shareMessage =
				(await shareScore(entry)) === 'shared'
					? 'Challenge sent.'
					: 'Score card downloaded. Send it to your group chat.';
		} catch (cause) {
			if (!(cause instanceof Error && cause.name === 'AbortError'))
				shareMessage = 'Sharing failed. Try copying the game link.';
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(location.origin);
			shareMessage = 'Game link copied.';
		} catch {
			shareMessage = `Copy this link: ${location.origin}`;
		}
	}
</script>

<svelte:head>
	<title>Aim Low - Low aim. High scores.</title>
	<meta
		name="description"
		content="Keep it in the bowl. Blast the bugs. Don’t run dry. A ridiculous, free arcade party game."
	/>
	<meta name="theme-color" content="#101c28" />

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
			<span class="brand">↙ AIM LOW.</span>
			{#if error}
				<h1>TECHNICAL<br />DIFFICULTIES.</h1>
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
			<span class="edition">BATHROOM ARCADE <b>VOL. 01</b></span>
		</header>

		{#if panel === 'home'}
			<section class="home">
				<h1>
					AIM
					<br />
					<span>LOW.</span>
					<svg viewBox="0 0 64 64" aria-hidden="true">
						<path d="M54 10 10 54M10 20v34h34" />
					</svg>
				</h1>
				<p class="tagline">Low aim. <b>High scores.</b></p>
				<p class="intro">
					Keep it in the bowl. Blast the bugs.<br />Don’t run dry. Your dignity is optional.
				</p>

				<label class="player-field">
					<span class="eyebrow">YOUR ARCADE NAME</span>
					<input
						maxlength="12"
						bind:value={name}
						aria-label="Your arcade name"
						autocomplete="nickname"
					/>
				</label>

				<button class="primary play" onclick={solo}>LET IT FLOW <span>↗</span></button>
				<div class="menu-actions">
					<button class="secondary" onclick={() => (panel = 'party')}
						>PARTY PLAY <span>2–8</span></button
					><button class="secondary" onclick={() => (panel = 'board')}>HIGH SCORES ↗</button>
				</div>
				<div class="minor-actions">
					<button class="text-button" onclick={() => (panel = 'help')}>HOW TO PLAY</button><span>
						/
					</span><button class="text-button" onclick={() => (panel = 'settings')}>SETTINGS</button>
				</div>
			</section>
			<div class="arena-note">
				<span class="note-arrow">↙</span>
				<p>THE ORIGINAL<br /><b>SPLASH ZONE.</b></p>
				<span class="eyebrow">EST. RIGHT NOW</span>
			</div>
			<footer class="home-footer">
				<span><i>01</i> AIM INSIDE</span><span><i>02</i> BLAST BUGS</span><span
					><i>03</i> WATCH PRESSURE</span
				><small>NO DOWNLOAD. NO EXCUSES.</small>
			</footer>
		{:else}
			<div class="modal-wrap">
				<section
					class="panel"
					bind:this={focusPanel}
					tabindex="-1"
					aria-label={panel === 'board'
						? 'Leaderboard'
						: panel === 'party'
							? 'Party setup'
							: panel === 'settings'
								? 'Settings'
								: 'How to play'}
				>
					<button
						class="back text-button"
						onclick={() => {
							panel = 'home';
						}}>← BACK TO THE BATHROOM</button
					>
					{#if panel === 'party'}
						<span class="eyebrow">ONE DEVICE. ZERO DIGNITY.</span>
						<h2>PASS THE<br /><em>PRESSURE.</em></h2>
						<p>2–8 players. One round each. Highest score gets bragging rights.</p>
						<label class="field"
							>PLAYER NAMES <span>ONE PER LINE · 12 CHARACTERS MAX</span><textarea
								bind:value={partyNames}
								rows="5"
								maxlength="103"
								aria-describedby="party-error"
							></textarea></label
						>
						{#if formError}<p id="party-error" class="error" role="alert">
								{formError}
							</p>{/if}<button class="primary full" onclick={startParty}>START THE PARTY ↗</button>
					{:else if panel === 'board'}
						<span class="eyebrow">THE WALL OF FAME</span>
						<h2>HIGH<br /><em>SCORES.</em></h2>
						<Scoreboard {scores} />
						<p class="fine-print">Top 10 only. A run that misses the board is not recorded.</p>
					{:else if panel === 'help'}
						<span class="eyebrow">THE SHORT VERSION</span>
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
						<span class="eyebrow">YOUR BATHROOM. YOUR RULES.</span>
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
										>High adds god rays and shadows. Never changes gameplay or score.</small
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
		<Hud state={$gameStateStore} name={currentName} {best} onpause={() => app?.pause()} />
		{#if phase === 'countdown'}<div class="countdown" aria-live="polite">
				<span class="eyebrow"
					>{party.length
						? `TURN ${partyIndex + 1} OF ${party.length} · ${currentName}`
						: 'GET YOUR AIM TOGETHER'}</span
				><b>{Math.ceil($gameStateStore.countdown)}</b><span
					>AIM INSIDE. BLAST BUGS. DON’T RUN DRY.</span
				>
			</div>{/if}
	{:else if phase === 'paused'}
		<div class="modal-wrap scrim">
			<section class="panel compact" bind:this={focusPanel} tabindex="-1" aria-label="Game paused">
				<span class="eyebrow">TAKE YOUR TIME. WE’LL HOLD IT.</span>
				<h2>HOLD<br /><em>IT.</em></h2>
				<p>Pressure, bugs, and drinks are paused.</p>
				<button class="primary full" onclick={() => app?.resume()}>BACK TO BUSINESS ↗</button
				><button class="text-button full" onclick={mainMenu}>END RUN & RETURN TO MENU</button>
			</section>
		</div>
	{:else if phase === 'gameover'}
		<div class="countdown">
			<span class="eyebrow">THE TANK HAS SPOKEN</span>
			<h2>OUT OF<br /><em>JUICE.</em></h2>
		</div>
	{:else if phase === 'results' && entry}
		<div class="modal-wrap scrim">
			<section
				class="panel results"
				bind:this={focusPanel}
				tabindex="-1"
				aria-label="Round results"
			>
				<div class="result-top">
					<span class="eyebrow">{entry.name} / ROUND COMPLETE</span><span class="stamp"
						>{scores[0]?.id === entry.id ? 'DEVICE BEST ↗' : resultTitle(entry)}</span
					>
				</div>
				<h2>OUT OF JUICE.<br /><em>FULL OF GLORY.</em></h2>
				<div class="final-score">{entry.score.toLocaleString()}<span>POINTS</span></div>
				<div class="result-stats">
					<div>
						<b>{entry.accuracy === null ? '—' : `${Math.round(entry.accuracy * 100)}%`}</b><span
							>ACCURACY</span
						>
					</div>
					<div><b>{entry.kills}</b><span>BUGS BLASTED</span></div>
					<div>
						<b
							>{$gameStateStore.fastestKill === null
								? '—'
								: `${$gameStateStore.fastestKill.toFixed(2)}s`}</b
						><span>FASTEST KILL</span>
					</div>
					<div><b>{entry.duration.toFixed(1)}s</b><span>LASTED</span></div>
				</div>
				{#if party.length}<div class="party-standings">
						<span class="eyebrow"
							>{lastTurn
								? `PARTY WINNER: ${rankScores(partyScores)[0]?.name}`
								: `PARTY STANDINGS · ${partyIndex + 1}/${party.length}`}</span
						><Scoreboard scores={rankScores(partyScores)} highlight={entry.id} />
					</div>{/if}
				<div class="result-actions">
					{#if party.length && !lastTurn}<button class="primary" onclick={nextTurn}
							>NEXT: {party[partyIndex + 1]} ↗</button
						>{:else if lastTurn}<button
							class="primary"
							onclick={() => {
								partyIndex = 0;
								partyScores = [];
								startRound();
							}}>REMATCH ↗</button
						>{:else}<button class="primary" onclick={startRound}>ONE MORE ROUND ↗</button
						>{/if}<button class="secondary" onclick={() => void share()}>SHARE SCORE</button>
				</div>
				<div class="minor-actions">
					<button class="text-button" onclick={() => void copyLink()}>COPY LINK</button><span
						>/</span
					><button class="text-button" onclick={mainMenu}>MENU</button>
				</div>
				<p class="fine-print" role="status">
					{shareMessage ||
						(rank < 0
							? `Missed the top 10. Beat ${scores.at(-1)?.score.toLocaleString()} to get on the board.`
							: `#${rank + 1} on the high scores.`)}
					{storageMessage}
				</p>
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
		padding: 1.8rem 3.5rem 0.8rem;
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
	.menu-shade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, #101c28fa 5%, #101c28ea 32%, #101c2840 64%, #101c2810),
			linear-gradient(0deg, #101c28 0%, transparent 30%);
		pointer-events: none;
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
		text-decoration: none;
		font: 900 1.3rem var(--display);
		letter-spacing: -0.05em;
	}
	.edition {
		font: 0.6rem var(--mono);
		letter-spacing: 0.12em;
		color: var(--muted);
		display: flex;
		gap: 0.8rem;
		align-items: center;
	}
	.edition b {
		font-weight: 500;
		border: 1px solid var(--line);
		padding: 0.4rem 0.55rem;
		border-radius: 4px;
		color: var(--paper);
	}
	.home {
		position: relative;
		align-self: center;
		margin-left: max(0px, calc(7vw - 3.5rem));
		width: min(430px, 42vw);
	}
	h1 {
		font: 1000 clamp(5rem, 10vw, 9rem)/0.82 var(--display);
		letter-spacing: -0.075em;
		margin: 1.5rem 0 1.15rem;
		position: relative;
		width: max-content;
	}
	h1 > span {
		color: var(--lime);
	}
	h1 svg {
		width: 48px;
		height: 48px;
		position: absolute;
		right: -65px;
		bottom: 8px;
		fill: none;
		stroke: var(--lime);
		stroke-width: 7;
	}
	.tagline {
		margin: 0;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
	}
	.tagline b {
		color: var(--lime);
	}
	.intro {
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.65;
		margin: 0.8rem 0 1.15rem;
	}
	.player-field {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0.5rem 0 0.75rem;
	}
	.player-field .eyebrow {
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.player-field input {
		padding: 0.45rem 0.65rem;
		font: 700 0.8rem var(--mono);
		min-width: 0;
	}
	.play {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 57px;
	}
	.play > span {
		font-size: 1.8rem;
		line-height: 1;
	}
	.menu-actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
	}
	.menu-actions button {
		flex: 1;
		padding: 0.65rem 0.6rem;
		font-size: 0.65rem;
	}
	.menu-actions span {
		color: var(--mint);
		margin-left: 0.4rem;
		font: 0.6rem var(--mono);
	}
	.minor-actions {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.8rem;
		margin-top: 0.85rem;
	}
	.minor-actions button:first-child {
		justify-self: end;
	}
	.minor-actions button:last-child {
		justify-self: start;
	}
	.minor-actions > span {
		color: #ffffff30;
		font-size: 0.7rem;
	}
	.minor-actions button {
		font-size: 0.75rem;
	}
	.arena-note {
		position: absolute;
		right: 7%;
		top: 37%;
		transform: rotate(7deg);
	}
	.arena-note p {
		font: 600 1rem/1.4 var(--mono);
		margin: 0 0 0.4rem;
	}
	.arena-note b {
		color: var(--mint);
	}
	.note-arrow {
		display: block;
		color: var(--mint);
		font-size: 4rem;
		transform: rotate(-15deg);
	}
	.arena-note .eyebrow {
		font-size: 0.8rem;
	}
	.home-footer {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1.75rem;
		border-top: 1px solid var(--line);
		padding-top: 0.5rem;
		font: 600 0.75rem var(--mono);
		letter-spacing: 0.05em;
	}
	.home-footer i {
		color: var(--lime);
		font-style: normal;
		margin-right: 0.5rem;
	}
	.home-footer small {
		margin-left: auto;
		font-size: 0.65rem;
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
	.scrim {
		padding-top: 1.5rem;
		background: #09141b9c;
		backdrop-filter: blur(8px);
	}
	.panel {
		width: min(100%, 570px);
		padding: 2rem 2.5rem;
		background: #14222ff5;
		border: 1px solid #ffffff26;
		border-radius: 16px;
		box-shadow: 0 20px 90px #0005;
		outline: none;
	}
	.panel > .eyebrow {
		display: block;
		margin-top: 0.6rem;
		color: var(--mint);
	}
	.back {
		font-size: 0.55rem;
		padding-top: 0;
		min-height: 35px;
	}
	h2 {
		font: 900 clamp(2rem, 4.5vw, 3rem)/1 var(--display);
		letter-spacing: -0.065em;
		margin: 1rem 0;
	}
	em {
		font-style: normal;
		color: var(--lime);
	}
	.panel > p {
		font-size: 0.85rem;
		line-height: 1.65;
		color: var(--muted);
	}
	.full {
		width: 100%;
		margin-top: 1rem;
	}
	.field {
		display: block;
		font: 600 0.6rem var(--mono);
		color: var(--mint);
		margin-top: 1.5rem;
	}
	.field span {
		display: block;
		color: var(--muted);
		margin: 0.5rem 0;
		font-size: 0.55rem;
	}
	textarea {
		width: 100%;
		background: #0c1822;
		color: var(--paper);
		border: 1px solid #ffffff36;
		border-radius: 8px;
		resize: vertical;
		font: 0.9rem/1.8 var(--mono);
		padding: 0.75rem;
	}
	.panel .error {
		color: var(--coral);
	}
	.panel .fine-print {
		font: 0.62rem/1.6 var(--mono);
		color: var(--muted);
		margin-bottom: 0;
	}
	.instructions {
		list-style: none;
		padding: 0;
		margin: 2rem 0;
		display: grid;
		gap: 1.5rem;
	}
	.instructions li {
		display: flex;
		gap: 1rem;
	}
	.instructions li > span {
		font: 700 0.7rem var(--mono);
		padding: 0.55rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		height: min-content;
		color: var(--mint);
	}
	.instructions b {
		font-size: 0.9rem;
	}
	.instructions p {
		margin: 0.3rem 0 0;
		font-size: 0.8rem;
		line-height: 1.7;
		color: var(--muted);
	}
	.controls-note {
		font: 0.6rem/2 var(--mono);
		color: var(--mint);
		border-top: 1px solid var(--line);
		padding-top: 0.8rem;
	}
	.controls-note span {
		display: block;
		color: var(--muted);
	}
	.settings-list {
		margin-top: 1rem;
	}
	.settings-list > label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		border-bottom: 1px solid var(--line);
		padding: 1rem 0;
		font-size: 0.85rem;
	}
	.settings-list small {
		display: block;
		color: var(--muted);
		font-size: 0.65rem;
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
		background: #101c285e;
		pointer-events: none;
		text-align: center;
	}
	.countdown > b {
		font: 900 10rem/1.4 var(--display);
		color: var(--lime);
	}
	.countdown > span:last-child {
		font: 600 0.6rem var(--mono);
		letter-spacing: 0.1em;
	}
	.countdown .eyebrow {
		color: var(--paper);
	}
	.compact {
		max-width: 430px;
	}
	.result-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.result-top .eyebrow {
		font-size: 0.55rem;
	}
	.stamp {
		color: var(--mint);
		font: 700 0.55rem var(--mono);
		text-align: right;
	}
	.results h2 {
		font-size: clamp(1.7rem, 4vw, 2.5rem);
		margin: 1.4rem 0 0.5rem;
	}
	.final-score {
		font: 900 clamp(3.5rem, 8vw, 5rem)/1.3 var(--display);
		letter-spacing: -0.05em;
	}
	.final-score span {
		margin-left: 0.7rem;
		font: 0.6rem var(--mono);
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.result-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		padding: 1rem 0 1.5rem;
		border-bottom: 1px solid var(--line);
	}
	.result-stats b {
		display: block;
		font: 800 1.4rem var(--display);
		color: var(--mint);
	}
	.result-stats span {
		display: block;
		font: 0.5rem var(--mono);
		color: var(--muted);
		margin-top: 0.3rem;
	}
	.result-actions {
		display: flex;
		gap: 0.65rem;
		margin-top: 1.5rem;
	}
	.result-actions button {
		flex: 1;
		font-size: 0.7rem;
		padding: 0.8rem 0.6rem;
	}
	.party-standings {
		margin-top: 1.5rem;
	}
	.loading-screen {
		position: absolute;
		inset: 0;
		background: var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		padding: 2rem;
		text-align: center;
	}
	.loading-screen .brand {
		margin-bottom: 3rem;
		color: var(--lime);
		font-size: 2rem;
	}
	.loading-screen h1 {
		font-size: 2.5rem;
		line-height: 1.1;
	}
	.loading-screen p {
		color: var(--muted);
		font-size: 0.75rem;
		max-width: 450px;
		line-height: 1.6;
	}
	.loading-track {
		width: min(250px, 70vw);
		height: 5px;
		background: #ffffff15;
		margin: 1.5rem 0 0.5rem;
		border-radius: 5px;
		overflow: hidden;
	}
	.loading-track > div {
		height: 100%;
		background: var(--lime);
		transition: width 0.3s;
	}
	@media (max-width: 800px) {
		.menu-home,
		.site-header {
			padding: 1.25rem 1.5rem;
		}
		.home {
			margin-left: max(0px, calc(6vw - 1.5rem));
			width: min(370px, 48vw);
		}
		.arena-note {
			right: 5%;
			font-size: 0.6rem;
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
		.menu-shade {
			background: #101c28d9;
		}
		.edition {
			font-size: 0.5rem;
		}
		.edition b {
			display: none;
		}
		.home {
			width: min(370px, 100%);
			margin: 0 auto;
		}
		h1 {
			font-size: clamp(5rem, 19vw, 7.5rem);
			margin-top: 1.1rem;
		}
		.arena-note {
			display: none;
		}
		.home-footer {
			justify-content: space-between;
			font-size: 0.7rem;
			gap: 0.25rem;
		}
		.panel {
			padding: 1.6rem;
		}
		.modal-wrap {
			padding: 5rem 0.75rem 1rem;
		}
		.scrim {
			padding-top: 1rem;
		}
		.minor-actions {
			gap: 0.7rem;
		}
	}
	@media (max-height: 740px) {
		.home h1 {
			font-size: clamp(4rem, 9vw, 7rem);
			margin: 0.7rem 0;
		}
		.intro {
			line-height: 1.4;
			margin: 0.4rem 0 0.6rem;
		}
		.menu-actions {
			margin-top: 0.4rem;
		}
		.minor-actions button {
			min-height: 32px;
		}
		.home-footer {
			padding-top: 0.35rem;
		}
	}
	@media (max-height: 740px) and (max-width: 600px) {
		.home h1 {
			font-size: clamp(4rem, 16vw, 6rem);
		}
	}
	@media (max-width: 380px) {
		.home-footer {
			font-size: 0.62rem;
		}
	}
	@media (max-height: 520px) {
		.home {
			width: min(600px, 90vw);
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.6rem 1.5rem;
		}
		.home h1 {
			grid-column: 1;
			grid-row: 1 / 5;
			font-size: 5.5rem;
			margin: 0.5rem 0;
		}
		.intro,
		.tagline,
		.arena-note,
		.home-footer {
			display: none;
		}
		.player-field,
		.play,
		.menu-actions,
		.minor-actions {
			grid-column: 2;
			margin: 0;
		}
		.menu-actions {
			margin-top: 0.5rem;
		}
	}
	@media (max-height: 520px) and (max-width: 600px) {
		.home {
			display: block;
			width: 100%;
		}
		.home h1 {
			font-size: clamp(3.5rem, 13vh, 5rem);
			margin: 0.3rem 0;
		}
		.player-field {
			margin: 0.3rem 0;
		}
		.play {
			min-height: 48px;
		}
		.menu-actions {
			margin-top: 0.35rem;
		}
	}
</style>
