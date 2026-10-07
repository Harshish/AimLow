<script lang="ts">
	import type { ScoreEntry } from '$lib/Game/leaderboard';
	let { scores, highlight = '' }: { scores: ScoreEntry[]; highlight?: string } = $props();
</script>

<div class="board-scroll">
	<table>
		<thead
			><tr
				><th scope="col">RANK</th><th scope="col">PLAYER</th><th scope="col">ACCURACY</th><th
					scope="col">SCORE</th
				></tr
			></thead
		>
		<tbody
			>{#each scores as score, index (score.id)}<tr class:highlight={score.id === highlight}
					><td><span class:gold={index === 0}>{String(index + 1).padStart(2, '0')}</span></td><th
						scope="row">{score.name}</th
					><td>{score.accuracy === null ? '—' : `${Math.round(score.accuracy * 100)}%`}</td><td
						>{score.score.toLocaleString()}</td
					></tr
				>{/each}</tbody
		>
	</table>
	{#if !scores.length}<p class="empty">
			A spotless record.<br /><span>Play a round and leave your mark.</span>
		</p>{/if}
</div>

<style>
	.board-scroll {
		width: 100%;
		overflow: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		white-space: nowrap;
	}
	thead th {
		color: var(--muted);
		font: 500 0.6rem var(--mono);
		padding: 1rem 0.7rem;
		letter-spacing: 0.08em;
		border-bottom: 1px solid var(--line);
	}
	tbody td,
	tbody th {
		padding: 0.9rem 0.7rem;
		border-bottom: 1px solid #ffffff0a;
		font-size: 0.85rem;
	}
	tbody th {
		font-weight: 700;
	}
	td:first-child {
		font-family: var(--mono);
		color: var(--muted);
	}
	td:nth-child(3) {
		color: var(--muted);
		font: 0.75rem var(--mono);
	}
	td:last-child,
	th:last-child {
		text-align: right;
	}
	td:last-child {
		font: 800 1.1rem var(--display);
		letter-spacing: 0.04em;
	}
	.gold {
		color: var(--lime);
	}
	.highlight {
		background: #dfff6a0a;
		color: var(--lime);
	}
	.empty {
		padding: 2.5rem 0;
		text-align: center;
		font-weight: 700;
	}
	.empty span {
		display: inline-block;
		margin-top: 0.5rem;
		color: var(--muted);
		font-weight: 400;
		font-size: 0.85rem;
	}
</style>
