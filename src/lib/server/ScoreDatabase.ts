import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { RULES_VERSION } from '../Game/config';
import type { ScoreEntry } from '../Game/leaderboard';

const columns = `id, name, score, accuracy, kills, missed, duration,
  rules_version AS rulesVersion, created_at AS timestamp`;

/** One local SQLite file. No accounts, cloud clients, or database service to run. */
export default class ScoreDatabase {
	private readonly database: DatabaseSync;

	constructor(filename: string) {
		if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
		this.database = new DatabaseSync(filename);
		this.database.exec('PRAGMA busy_timeout = 3000; PRAGMA journal_mode = WAL;');
		const schema = `CREATE TABLE IF NOT EXISTS scores (
				id TEXT PRIMARY KEY NOT NULL,
				name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 12),
				score INTEGER NOT NULL CHECK(score >= 0),
				accuracy REAL CHECK(accuracy BETWEEN 0 AND 1),
				kills INTEGER NOT NULL CHECK(kills >= 0),
				missed INTEGER NOT NULL CHECK(missed >= 0),
				duration REAL NOT NULL CHECK(duration > 0),
				rules_version TEXT NOT NULL,
				created_at TEXT NOT NULL
			) STRICT;`;
		const version = this.database.prepare('PRAGMA user_version').get()!.user_version as number;
		if (version < 1) {
			// SQLite cannot alter CHECK constraints. Rebuild atomically, retaining all prior scores.
			this.database.exec('BEGIN IMMEDIATE;');
			try {
				const existing = this.database
					.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'scores'")
					.get();
				if (existing) this.database.exec('ALTER TABLE scores RENAME TO scores_legacy;');
				this.database.exec(schema);
				if (existing)
					this.database.exec(
						'INSERT INTO scores SELECT * FROM scores_legacy; DROP TABLE scores_legacy;'
					);
				this.database.exec('PRAGMA user_version = 1; COMMIT;');
			} catch (error) {
				this.database.exec('ROLLBACK;');
				this.database.close();
				throw error;
			}
		} else this.database.exec(schema);
		this.database.exec(`CREATE INDEX IF NOT EXISTS scores_ranking
			ON scores(rules_version, score DESC, accuracy DESC, created_at, id);`);
	}

	/** The unique run ID makes retries safe. A changed retry returns null, never overwrites. */
	save(entry: ScoreEntry): ScoreEntry | null {
		this.database
			.prepare(
				`INSERT INTO scores
			(id, name, score, accuracy, kills, missed, duration, rules_version, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
			)
			.run(
				entry.id,
				entry.name,
				entry.score,
				entry.accuracy,
				entry.kills,
				entry.missed,
				entry.duration,
				entry.rulesVersion,
				new Date().toISOString()
			);
		const saved = this.database
			.prepare(`SELECT ${columns} FROM scores WHERE id = ?`)
			.get(entry.id) as unknown as ScoreEntry;
		const same =
			saved.name === entry.name &&
			saved.score === entry.score &&
			saved.accuracy === entry.accuracy &&
			saved.kills === entry.kills &&
			saved.missed === entry.missed &&
			saved.duration === entry.duration &&
			saved.rulesVersion === entry.rulesVersion;
		return same ? saved : null;
	}

	list(period: 'daily' | 'all-time'): ScoreEntry[] {
		return this.database
			.prepare(
				`SELECT ${columns} FROM scores
			WHERE rules_version = ? AND (? = 'all-time' OR created_at >= strftime('%Y-%m-%dT00:00:00.000Z', 'now'))
			ORDER BY score DESC, accuracy DESC, created_at, id LIMIT 50`
			)
			.all(RULES_VERSION, period) as unknown as ScoreEntry[];
	}
	close() {
		this.database.close();
	}
}
