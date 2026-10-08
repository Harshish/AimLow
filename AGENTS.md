# AimLow agent instructions

## Use graph first

- For codebase navigation, architecture questions, call tracing, and "where is X" work, check `graphify-out/graph.json` first.
- Prefer graph tools before raw search:
  - `graphify_query` for broad questions
  - `graphify_path` for tracing relationships between files, symbols, or concepts
  - `graphify_explain` for understanding one file or symbol and its neighbors
- Use raw `read`/`bash` only after graph results narrow target files.
- When graph cites a node or `source_location`, open that file and verify exact code before editing.

## Focus areas

- Main app code lives in `src/lib/` and `src/routes/`.
- Good entry points:
  - `src/routes/+page.svelte`
  - `src/lib/App.ts`
  - `src/lib/World/World.ts`
  - `src/lib/World/Physics.ts`
  - `src/lib/Utils/AssetLoader.ts`
- Ignore `node_modules/` and `.svelte-kit/` unless task explicitly targets build tooling or generated output.

## Search policy

- Do not start with blind repo-wide grep when graph already answers structure question.
- For impact analysis, use graph relationships first, then confirm with file reads.

## After edits

- After changing source code, refresh graph with `graphify_update` so later navigation stays accurate.
