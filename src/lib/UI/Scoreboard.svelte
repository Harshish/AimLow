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
		border-bottom: 2px solid var(--outline);
	}
	tbody td,
	tbody th {
		padding: 0.9rem 0.7rem;
		border-bottom: 2px dashed var(--line);
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
		font: 400 1.3rem var(--display);
		letter-spacing: 0.04em;
	}
	.gold {
		padding: 0.1rem 0.35rem;
		background: var(--lime);
		color: var(--outline);
		border: 2px solid var(--outline);
	}
	.highlight {
		background: var(--caption);
	}
	.empty {
		padding: 2.5rem 0;
		text-align: center;
		font: 1.5rem var(--display);
		letter-spacing: 0.04em;
	}
	.empty span {
		display: inline-block;
		margin-top: 0.5rem;
		color: var(--muted);
		font:
			0.85rem 'Avenir Next',
			'Segoe UI',
			sans-serif;
		letter-spacing: 0;
	}
</style>
