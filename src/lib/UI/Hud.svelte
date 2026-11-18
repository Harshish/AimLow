<script lang="ts">
	import type { GameState } from '$lib/Game/Session';
	import { DRINKS, BOWL_STREAK_SECONDS, multiplier } from '$lib/Game/config';
	let { state, onpause }: { state: GameState; onpause: () => void } = $props();
</script>

<div class="hud">
	<div class="score-block">
		<div class="score-card">
			<span class="eyebrow">SCORE</span>
			<strong>{Math.floor(state.score).toLocaleString().padStart(4, '0')}</strong>
		</div>
		{#if state.combo > 0}
			{#key state.combo}<span class="combo">×{multiplier(state.combo)} COMBO</span>{/key}
		{/if}
		<span class="wave-status"
			>{state.wave === 0 ? 'GET READY!' : `WAVE ${state.wave}`}<small
				>{state.waveRemaining > 0
					? `${state.waveRemaining} BUGS LEFT`
					: state.wave > 0
						? 'NEXT WAVE INCOMING'
						: 'BUGS INCOMING'}</small
			></span
		>
	</div>
	<!-- Call-outs live in the HUD's empty top-centre gap, clear of the bowl and bug lanes. -->
	<div class="notice-slot">
		{#if state.notice}
			{#key state.notice.id}<div
					class="notice"
					class:bad={state.notice.tone === 'bad'}
					class:quick={state.notice.tone === 'quick'}
					role="status"
				>
					{state.notice.text}
				</div>{/key}
		{/if}
	</div>
	<div class="pressure comic-panel" class:low={state.pressure <= 20}>
		<div class="pressure-label">
			<span class="eyebrow">{state.pressure <= 20 ? '⚠ RUNNING ON EMPTY' : 'TANK PRESSURE'}</span><b
				>{Math.ceil(state.pressure)}<small>%</small></b
			>
		</div>
		<div
			class="gauge"
			role="progressbar"
			aria-label="Pressure"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.ceil(state.pressure)}
		>
			<div style:width="{state.pressure}%"></div>
		</div>
		<span class="pressure-caption">KEEP IT IN THE BOWL.</span>
	</div>
	<button type="button" class="pause-button" onclick={onpause} aria-label="Pause game">Ⅱ</button>
</div>
<div class="game-bottom">
	{#if state.drink}<div class="drink-badge comic-panel">
			<span aria-hidden="true">{state.drink.kind === 'beer' ? '◉' : '☕'}</span>
			<div>
				<b>{DRINKS[state.drink.kind].name}</b><small
					>{state.drink.remaining.toFixed(1)}s · {state.drink.kind === 'beer'
						? '+25% FLOW · WIDE & WILD'
						: '+50% FLOW · LASER PRECISION'}</small
				>
			</div>
		</div>{:else}<div class="streak-meter comic-panel">
			<div class="hint">HOLD THE BOWL <span>·</span> EARN A POWER-UP</div>
			<div class="streak-label">
				<b>CLEAN STREAK</b><span
					>{state.bowlStreak.toFixed(1)} / {BOWL_STREAK_SECONDS.toFixed(1)}s</span
				>
			</div>
			<div
				class="gauge"
				role="progressbar"
				aria-label="Clean bowl streak"
				aria-valuemin={0}
				aria-valuemax={BOWL_STREAK_SECONDS}
				aria-valuenow={state.bowlStreak}
				aria-valuetext={`${state.bowlStreak.toFixed(1)} of ${BOWL_STREAK_SECONDS} seconds`}
			>
				<div style:width="{Math.min(100, (state.bowlStreak / BOWL_STREAK_SECONDS) * 100)}%"></div>
			</div>
		</div>{/if}
	<div class="kill-count"><b>{state.kills}</b> BUGS BLASTED</div>
</div>

<style>
	.hud {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
		padding: 1.6rem 2.2rem;
		pointer-events: none;
	}
	.score-block {
		display: grid;
		justify-items: start;
		gap: 0.7rem;
		margin-right: auto;
	}
	/* Narration caption box: the classic yellow comic panel. */
	.score-card {
		display: grid;
		gap: 0.15rem;
		padding: 0.5rem 0.9rem 0.45rem;
		background: var(--caption);
		color: var(--outline);
		border: 3px solid var(--outline);
		box-shadow: 5px 5px 0 var(--outline);
		rotate: -1.5deg;
	}
	.score-card .eyebrow {
		color: var(--outline);
		font-size: 0.58rem;
	}
	.score-card strong {
		font: 400 clamp(2.4rem, 5vw, 3.8rem) / 0.95 var(--display);
		letter-spacing: 0.04em;
	}
	.combo {
		padding: 0.2rem 0.55rem;
		background: var(--lime);
		color: var(--outline);
		border: 2px solid var(--outline);
		box-shadow: 3px 3px 0 var(--outline);
		font: 1.1rem var(--display);
		letter-spacing: 0.06em;
		rotate: -2deg;
		animation: combo-pop 0.25s ease-out;
	}
	@keyframes combo-pop {
		from {
			scale: 1.35;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.combo {
			animation: none;
		}
	}
	.wave-status {
		padding: 0.25rem 0.55rem;
		background: var(--mint);
		color: var(--outline);
		border: 2px solid var(--outline);
		box-shadow: 3px 3px 0 var(--outline);
		font: 1rem var(--display);
		letter-spacing: 0.06em;
		rotate: 1.5deg;
	}
	.wave-status small {
		margin-left: 0.5rem;
		font: 700 0.55rem var(--mono);
		letter-spacing: 0.08em;
	}
	.pressure {
		width: min(29vw, 290px);
		padding: 0.6rem 0.8rem 0.55rem;
		box-shadow: 5px 5px 0 var(--outline);
	}
	.pressure-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}
	.pressure-label .eyebrow {
		color: var(--outline);
	}
	.pressure-label b {
		font: 400 1.9rem/1 var(--display);
		letter-spacing: 0.03em;
	}
	.pressure-label b small {
		font-size: 1rem;
	}
	.gauge {
		height: 18px;
		background: var(--outline);
		padding: 3px;
		border: 2px solid var(--outline);
		margin-bottom: 0.4rem;
	}
	.gauge > div {
		height: 100%;
		background: repeating-linear-gradient(90deg, var(--lime) 0 12px, transparent 12px 15px);
		transition: width 0.1s linear;
	}
	.low {
		background: var(--halftone), #ffd9d9;
	}
	.low .gauge > div {
		background: repeating-linear-gradient(90deg, var(--coral) 0 12px, transparent 12px 15px);
	}
	.low .pressure-label b {
		color: #c8102e;
	}
	.pressure-caption {
		font: 700 0.58rem var(--mono);
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.pause-button {
		pointer-events: auto;
		width: 48px;
		height: 48px;
		border: 3px solid var(--outline);
		border-radius: 4px;
		background: var(--paper);
		color: var(--outline);
		box-shadow: 4px 4px 0 var(--outline);
		font: 1.4rem var(--display);
	}
	.pause-button:active {
		translate: 3px 3px;
		box-shadow: 1px 1px 0 var(--outline);
	}
	.game-bottom {
		position: absolute;
		bottom: max(1.6rem, env(safe-area-inset-bottom));
		left: 2.2rem;
		right: 2.2rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		pointer-events: none;
	}
	.hint {
		font: 700 0.6rem var(--mono);
		letter-spacing: 0.08em;
		color: var(--muted);
	}
	.hint span {
		padding: 0 0.4rem;
	}
	.kill-count {
		padding: 0.35rem 0.8rem 0.45rem;
		background: var(--mint);
		color: var(--outline);
		border: 3px solid var(--outline);
		box-shadow: 5px 5px 0 var(--outline);
		font: 700 0.58rem var(--mono);
		letter-spacing: 0.08em;
		text-align: center;
		rotate: 2deg;
	}
	.kill-count b {
		font: 400 2.2rem/1 var(--display);
		display: block;
	}
	.streak-meter {
		width: min(320px, 62vw);
		padding: 0.6rem 0.85rem 0.7rem;
		box-shadow: 5px 5px 0 var(--outline);
	}
	.streak-label {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		margin: 0.35rem 0 0.35rem;
		font: 700 0.6rem var(--mono);
	}
	.streak-label b {
		font: 400 1.1rem var(--display);
		letter-spacing: 0.06em;
	}
	.streak-meter .gauge {
		margin-bottom: 0;
	}
	.drink-badge {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.6rem 1rem;
		background: var(--halftone), var(--lime);
		box-shadow: 5px 5px 0 var(--outline);
		rotate: -1.5deg;
	}
	.drink-badge > span {
		font-size: 1.8rem;
	}
	.drink-badge b {
		display: block;
		font: 400 1.4rem/1 var(--display);
		letter-spacing: 0.05em;
	}
	.drink-badge small {
		display: block;
		margin-top: 0.2rem;
		font: 700 0.6rem/1.4 var(--mono);
	}
	/* Burst-style call-out: inked box, comic lettering, a quick pop. */
	.notice-slot {
		flex: 1;
		min-width: 0;
		display: flex;
		justify-content: center;
		padding-top: 0.4rem;
	}
	.notice {
		padding: 0.5rem 1.1rem;
		border: 3px solid var(--outline);
		box-shadow: 5px 5px 0 var(--outline);
		background: var(--mint);
		color: var(--outline);
		font: 1.4rem var(--display);
		letter-spacing: 0.06em;
		text-align: center;
		rotate: -3deg;
		animation: announce 1.8s both;
	}
	.notice.bad {
		background: var(--coral);
		rotate: 3deg;
	}
	.notice.quick {
		background: var(--lime);
	}
	@keyframes announce {
		0% {
			opacity: 0;
			scale: 1.5;
		}
		10% {
			opacity: 1;
			scale: 0.94;
		}
		16%,
		75% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes fade {
		0%,
		100% {
			opacity: 0;
		}
		12%,
		75% {
			opacity: 1;
		}
	}
	:global(.reduced-motion) .notice {
		animation-name: fade;
	}
	@media (prefers-reduced-motion: reduce) {
		.notice {
			animation-name: fade;
		}
	}
	@media (max-width: 600px) {
		.hud {
			padding: 0.9rem;
			gap: 0.7rem;
		}
		.score-card {
			padding: 0.35rem 0.6rem;
		}
		.score-card strong {
			font-size: 2.2rem;
		}
		.wave-status {
			font-size: 0.85rem;
		}
		.wave-status small {
			display: block;
			margin: 0;
		}
		.pressure {
			width: 44vw;
			padding: 0.45rem 0.55rem;
		}
		.pressure .eyebrow {
			font-size: 0.5rem;
		}
		.pressure-label b {
			font-size: 1.5rem;
		}
		.pressure-caption {
			display: none;
		}
		.pause-button {
			width: 42px;
			height: 42px;
		}
		.game-bottom {
			left: 0.9rem;
			right: 0.9rem;
			bottom: max(0.9rem, env(safe-area-inset-bottom));
		}
		.hint {
			display: none;
		}
		.kill-count {
			font-size: 0.5rem;
		}
		.kill-count b {
			font-size: 1.8rem;
		}
		/* No room between the panels on phones: hang the call-out just under the HUD row. */
		.notice-slot {
			position: absolute;
			top: 100%;
			left: 0.9rem;
			right: 0.9rem;
			padding-top: 0;
		}
		.notice {
			font-size: 1.1rem;
		}
	}
	@media (max-height: 520px) {
		.hud {
			padding: 0.8rem 1rem;
		}
		.score-card strong {
			font-size: 2rem;
		}
		.pressure {
			width: min(34vw, 260px);
			padding: 0.4rem 0.6rem;
		}
		.pressure-caption {
			display: none;
		}
		.notice {
			font-size: 1.1rem;
		}
		.game-bottom {
			bottom: max(0.8rem, env(safe-area-inset-bottom));
		}
		.drink-badge,
		.streak-meter {
			padding: 0.4rem 0.7rem;
		}
		.kill-count b {
			font-size: 1.6rem;
		}
	}
</style>
