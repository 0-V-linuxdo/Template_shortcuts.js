/* ===================== IMPORTANT · NOTICE · START =====================
 *
 * 1. [编辑指引 | Edit Guidance]
 *    • ⚠️ 这是一个自动生成的项目产物说明：请在 `src/modules/` 与 `src/sites/` 目录下修改源码，然后运行 `npm run build` 重新生成 `Template_JS/` 与 `Site_JS/`。
 *    • ⚠️ This project now treats `src/modules/` and `src/sites/` as the source of truth. Run `npm run build` to regenerate `Template_JS/` and `Site_JS/`.
 *
 * ----------------------------------------------------------------------
 *
 * 2. [安全提示 | Safety Reminder]
 *    • ✅ 必须使用 `setTrustedHTML`，不得使用 `innerHTML`。
 *    • ✅ Always call `setTrustedHTML`; never rely on `innerHTML`.
 *
 * ====================== IMPORTANT · NOTICE · END ======================
 */

# Release Flow

## Branch Model

- `main` is the source of truth for source code, build scripts, docs, and active assets.
- `release` is a separate publish branch that stores generated release assets only.
- Pushing `main` does **not** update `release` automatically.
- The GitHub `release` branch is **not** the same thing as the GitHub Releases/tags page.

## Source Of Truth

- Never treat `Template_JS/` or `Site_JS/` on `main` as hand-edited source.
- Make all code changes in `src/modules/`, `src/sites/`, `src/sites/manifest.js`, and `src/userscript/header.txt`.
- After source edits on `main`, run:

```bash
npm run build
```

## Main Branch Publish Step

- Build locally on `main`.
- Review the changed source files.
- Commit and push `main` first.
- Do not assume the publish flow is complete after pushing `main`.

## Release Worktree

- Always check the existing worktree first:

```bash
git worktree list
```

- Reuse the existing `release` worktree when present.
- Current local release worktree usually lives at:

```bash
/private/tmp/template_shortcuts_release
```

- If the local `release` worktree is missing, recreate it from the local `release` branch:

```bash
git fetch origin release:release
git worktree add /private/tmp/template_shortcuts_release release
```

## Stage Release Assets

- From the repository root on `main`, run:

```bash
npm run stage:release -- --out-dir /private/tmp/template_shortcuts_release
```

- This command rebuilds and stages the full release-branch payload into the release worktree:
  - `Template_JS/`
  - `Site_JS/`
  - referenced files from `Site_Icon/`
  - release `README.md`
  - `LICENSE`
- The staging script also configures the release worktree git identity from `src/sites/manifest.js`.
- If the staging step fails while writing git config, rerun with sufficient filesystem/git permissions instead of bypassing the script.

## Publish Release Branch

- After staging, publish from the `release` worktree:

```bash
git -C /private/tmp/template_shortcuts_release status -sb
git -C /private/tmp/template_shortcuts_release add -- .
git -C /private/tmp/template_shortcuts_release commit -m "Publish legacy userscript release assets"
git -C /private/tmp/template_shortcuts_release push origin release
```

- The release worktree should normally only contain generated release asset changes.
- Do not manually edit release worktree files unless you are debugging the release pipeline itself.

## Required Verification

- Confirm `main` is already pushed before publishing `release`.
- Confirm `release` worktree is clean before staging, or understand every existing diff.
- Confirm `git -C /private/tmp/template_shortcuts_release status -sb` is clean again after commit/push.
- If users say "release 没更新", check `origin/release`, not just `origin/main`.

## Agent Rules

- When asked to "publish", "release", or "push release", complete both halves of the flow:
  1. source changes on `main`
  2. generated asset publish on `release`
- Do not stop after pushing `main` unless the user explicitly says to skip the `release` branch update.
- If the user specifically asks for the GitHub Releases/tags page, treat that as a separate task from updating the `release` branch.
