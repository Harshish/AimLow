<script lang="ts">
	import type { GameState } from '$lib/Game/Session';
	import { DRINKS, BOWL_STREAK_SECONDS } from '$lib/Game/config';
	let {
		state,
		name,
		best,
		onpause
	}: { state: GameState; name: string; best: number; onpause: () => void } = $props();
</script>

<div class="hud">
	<div class="score-block">
		<span class="eyebrow">{name} / SCORE</span><strong
			>{Math.floor(state.score).toLocaleString().padStart(4, '0')}</strong
		><small>BEST {best.toLocaleString()}</small>
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
	<div class="pressure" class:low={state.pressure <= 20}>
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
	{#if state.drink}<div class="drink-badge">
			<span aria-hidden="true">{state.drink.kind === 'beer' ? '◉' : '☕'}</span>
			<div>
				<b>{DRINKS[state.drink.kind].name}</b><small
					>{state.drink.remaining.toFixed(1)}s · {state.drink.kind === 'beer'
						? '+25% FLOW · WIDE & WILD'
						: '+50% FLOW · LASER PRECISION'}</small
				>
			</div>
		</div>{:else}<div class="streak-meter">
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

<style>
	.hud {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
		padding: 1.8rem 2.4rem;
		pointer-events: none;
		background: linear-gradient(#101c2bd9, transparent);
	}
	.score-block {
		display: grid;
		gap: 0.2rem;
		margin-right: auto;
	}
	.score-block strong {
		font: 800 clamp(2rem, 5vw, 4rem)/1 var(--display);
		letter-spacing: 0.02em;
	}
	.score-block small,
	.pressure-caption {
		color: var(--muted);
		font: 700 0.65rem var(--mono);
		letter-spacing: 0.1em;
	}
	.wave-status {
		margin-top: 0.45rem;
		color: var(--mint);
		font: 800 0.8rem var(--mono);
		text-shadow: 0 1px 5px #101c28;
	}
	.wave-status small {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.55rem;
	}
	.pressure {
		width: min(29vw, 280px);
		padding-top: 0.1rem;
	}
	.pressure-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.65rem;
	}
	.pressure-label b {
		font: 800 1.7rem var(--display);
		color: var(--lime);
	}
	.pressure-label b small {
		font-size: 0.9rem;
	}
	.gauge {
		height: 15px;
		background: #07131dcc;
		padding: 3px;
		border: 1px solid #ffffff26;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}
	.gauge > div {
		height: 100%;
		background: repeating-linear-gradient(90deg, var(--lime) 0 12px, transparent 12px 15px);
		transition: width 0.1s linear;
	}
	.low .gauge > div {
		background: var(--coral);
	}
	.low .pressure-label b {
		color: var(--coral);
	}
	.pause-button {
		pointer-events: auto;
		width: 48px;
		height: 48px;
		border: 1px solid #ffffff4a;
		border-radius: 50%;
		background: #132332b3;
		color: var(--paper);
		font-size: 1.3rem;
	}
	.game-bottom {
		position: absolute;
		bottom: max(1.6rem, env(safe-area-inset-bottom));
		left: 2.4rem;
		right: 2.4rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		pointer-events: none;
	}
	.hint,
	.kill-count {
		font: 700 0.65rem var(--mono);
		letter-spacing: 0.08em;
		text-shadow: 0 1px 8px #000;
	}
	.hint span {
		color: var(--lime);
		padding: 0 0.6rem;
	}
	.kill-count b {
		font: 800 2rem var(--display);
		display: block;
		color: var(--mint);
	}
	.streak-meter {
		width: min(320px, 62vw);
		padding: 0.7rem 0.9rem;
		border: 1px solid #ffffff36;
		border-radius: 10px;
		background: #101e2ae8;
	}
	.streak-label {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		margin: 0.6rem 0 0.4rem;
		font: 700 0.6rem var(--mono);
		color: var(--mint);
	}
	.streak-meter .gauge {
		margin-bottom: 0;
	}
	.drink-badge {
		display: flex;
		gap: 0.7rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--lime);
		border-radius: 10px;
		background: #101e2ae8;
	}
	.drink-badge > span {
		color: var(--lime);
		font-size: 1.8rem;
	}
	.drink-badge b {
		display: block;
		font-size: 0.9rem;
	}
	.drink-badge small {
		font: 600 0.6rem var(--mono);
		color: var(--lime);
	}
	.notice {
		position: absolute;
		top: 27%;
		left: 50%;
		transform: translateX(-50%);
		pointer-events: none;
		padding: 0.75rem 1.2rem;
		border-radius: 8px;
		background: var(--mint);
		color: var(--ink);
		font: 800 0.8rem var(--mono);
		text-align: center;
		animation: announce 1.8s both;
	}
	.notice.bad {
		background: var(--coral);
	}
	.notice.quick {
		background: var(--lime);
	}
	@keyframes announce {
		0% {
			opacity: 0;
			translate: 0 8px;
		}
		12%,
		75% {
			opacity: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}
	@media (max-width: 600px) {
		.hud {
			padding: 1rem;
			gap: 0.75rem;
		}
		.pressure {
			width: 43vw;
		}
		.pressure .eyebrow {
			font-size: 0.55rem;
		}
		.pressure-caption {
			font-size: 0.5rem;
		}
		.pressure-label {
			gap: 0.2rem;
		}
		.game-bottom {
			left: 1rem;
			right: 1rem;
			bottom: 1rem;
		}
		.hint {
			max-width: 190px;
			line-height: 1.7;
		}
		.kill-count {
			text-align: right;
			font-size: 0.55rem;
		}
		.notice {
			width: max-content;
			max-width: 85vw;
			top: 24%;
			font-size: 0.65rem;
		}
	}
</style>
