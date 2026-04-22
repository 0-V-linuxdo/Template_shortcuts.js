# Template_shortcuts.js (release)

Generated release-branch assets for the Template shortcuts userscript family.

## Contents

- `dist/esm/`: ESM core bundle and per-site entry bundles
- `Site_JS/`: installable userscript bootstrap files
- `Site_Icon/`: icons referenced by release userscript metadata

## Source Of Truth

This directory is staged from the repository's `main` branch.
Do not edit these files directly. Update source files on `main`, run `npm run build`, then stage fresh release assets with:

```bash
npm run stage:release -- --out-dir /absolute/path/to/release-branch-worktree
```
