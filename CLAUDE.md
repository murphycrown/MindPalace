# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mind Palace is a personal knowledge base of Obsidian-flavored markdown notes. The source of truth is the `notes/` directory; everything else is tooling to view or extend it. **This is not a git repository** — there is no VCS, so regenerated artifacts are not gitignored.

## Commands

- `npm install` — installs dependencies; **required before `npm run graph`** (the graph builder inlines `node_modules/d3/dist/d3.min.js` into the output, so d3 must be present).
- `npm run graph` — recursively scans `notes/**.md`, resolves links, and writes a single self-contained `graph/index.html`, then opens it in the browser. Run it again any time notes change to refresh the view.

## Notes format (`notes/`)

Notes follow Obsidian conventions. The graph view and any note-processing code rely on these, so keep them consistent:

- **Frontmatter**: leading `---\n…\n---` YAML block. Recognized keys: `tags` (list), `date`. Other keys are tolerated and surfaced as metadata where relevant.
- **Wikilinks**: `[[Target]]` or `[[Target|alias]]`. Crucially, links resolve by **normalized filename OR normalized top-level (`#`) heading**, not filename alone — e.g. `framer.md` links to `[[Framer Motion Skill Rules]]`, which matches the H1 in `rules.md`. "Normalized" ≈ lowercase, whitespace-collapsed, punctuation optionally stripped. A link that resolves to no existing note becomes a faded **orphan/virtual node**.
- **Inline tags**: `#tag` and `#nested/tag` in body text, plus frontmatter `tags`.
- **Headings**: `#`/`##`/`###`. The first H1 doubles as a display title and an alias target.
- **Other supported markdown**: fenced code blocks, ordered/unordered lists, `[text](url)`, `**bold**`/`*italic*`, inline `` `code` ``.

## Architecture

- `notes/` → **source of truth** (markdown). Add notes freely in any subfolder; they are auto-discovered — never registered by hand.
- `scripts/build-graph.mjs` → **builder**. Node ESM, built-ins only at runtime (`fs`, `path`); reads notes, parses frontmatter + links, builds an alias index, resolves links (real file or orphan node), assigns a stable color per folder, inlines d3, and emits `graph/index.html`.
- `graph/index.html` → **generated artifact**. Fully self-contained (d3 inlined, embedded `GRAPH` JSON, embedded app JS). **Do not hand-edit** — regenerate with `npm run graph`. Opens offline with no server.

Graph rendering (in `graph/index.html`): a d3 force-directed SVG with drag-to-pin, scroll-zoom, background-pan, hover-to-highlight, and click-to-focus-and-open a side panel that renders the note's markdown with clickable `[[wikilinks]]`.

## Installed skills (`.claude/skills/`)

Two project skills are installed and pinned via `skills-lock.json` (which records `source`, `sourceType`, `skillPath`, and a content hash per skill):

- `framer-motion` — Disney's 12 animation principles with Framer Motion (source: `dylantarre/animation-principles`).
- `ui-ux-pro-max` — searchable UI/UX design database with Python query scripts under `.claude/skills/ui-ux-pro-max/scripts/` (source: `nextlevelbuilder/ui-ux-pro-max-skill`).

Do not hand-edit files under `.claude/skills/` — it will desync the recorded hashes in `skills-lock.json`. Reinstall or update skills through the skill manager rather than editing in place.
