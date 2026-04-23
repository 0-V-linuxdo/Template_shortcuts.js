# Template_shortcuts.js (release)

Generated legacy release assets for the Template shortcuts userscript family.

## Contents

- `Template_JS/`: shared Template core referenced by site userscripts via `@require`
- `Site_JS/`: installable site userscripts
- `Site_Icon/`: icons referenced by release userscript metadata

## Source Of Truth

This directory is staged from the repository's `main` branch.
Do not edit these files directly. Update source files on `main`, run `npm run build`, then stage fresh release assets with:

```bash
npm run stage:release -- --out-dir /absolute/path/to/release-branch-worktree
```
