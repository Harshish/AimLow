export type Target = { kind: 'enemy'; id: number } | { kind: 'capture' | 'spill' | 'shell' };
export type ColliderEntity = Target | { kind: 'particle'; id: number };
export type ParticleHit = { particleId: number; target: Target };
const priority = { enemy: 0, spill: 1, capture: 2, shell: 3 };

/** Stable ordering makes a droplet's terminal outcome independent of Rapier event order. */
export function orderHits(hits: ParticleHit[]) {
	return hits.sort(
		(a, b) =>
			a.particleId - b.particleId ||
			priority[a.target.kind] - priority[b.target.kind] ||
			('id' in a.target ? a.target.id : 0) - ('id' in b.target ? b.target.id : 0)
	);
}
