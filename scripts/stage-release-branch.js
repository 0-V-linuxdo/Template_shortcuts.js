#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "./build.js";
import { RELEASE_PUBLISH_CONFIG, RELEASE_SITE_ICON_FILES } from "../src/sites/manifest.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const distEsmDir = path.join(repoRoot, "dist", "esm");
const siteJsDir = path.join(repoRoot, "Site_JS");
const siteIconDir = path.join(repoRoot, "Site_Icon");
const licensePath = path.join(repoRoot, "LICENSE");

function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function ensurePathExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function resetDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(targetPath, { recursive: true });
}

function resetReleaseTargetRoot(targetPath, { preserveGitMetadata = false } = {}) {
  if (!preserveGitMetadata) {
    resetDir(targetPath);
    return;
  }

  fs.mkdirSync(targetPath, { recursive: true });
  for (const entryName of fs.readdirSync(targetPath)) {
    if (entryName === ".git") continue;
    fs.rmSync(path.join(targetPath, entryName), { recursive: true, force: true });
  }
}

function copyFile(sourcePath, targetPath) {
  ensurePathExists(sourcePath, "Source file");
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function copyDir(sourcePath, targetPath) {
  ensurePathExists(sourcePath, "Source directory");
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

function resolveOutDir(rawPath) {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) {
    throw new Error("Missing required --out-dir value");
  }
  return path.resolve(process.cwd(), trimmed);
}

function writeText(targetPath, text) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, ensureTrailingNewline(text), "utf8");
}

function isGitRepository(targetPath) {
  try {
    execFileSync("git", ["-C", targetPath, "rev-parse", "--git-dir"], {
      stdio: ["ignore", "pipe", "ignore"]
    });
    return true;
  } catch {
    return false;
  }
}

function configureGitIdentity(targetPath) {
  const gitUserName = String(RELEASE_PUBLISH_CONFIG.gitUserName || "").trim();
  const gitUserEmail = String(RELEASE_PUBLISH_CONFIG.gitUserEmail || "").trim();
  if (!gitUserName || !gitUserEmail) return false;
  if (!isGitRepository(targetPath)) return false;

  execFileSync("git", ["-C", targetPath, "config", "user.name", gitUserName], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync("git", ["-C", targetPath, "config", "user.email", gitUserEmail], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  return true;
}

function renderReleaseReadme() {
  return `# ${RELEASE_PUBLISH_CONFIG.repository} (${RELEASE_PUBLISH_CONFIG.releaseBranch})

Generated release-branch assets for the Template shortcuts userscript family.

## Contents

- \`dist/esm/\`: ESM core bundle and per-site entry bundles
- \`Site_JS/\`: installable userscript bootstrap files
- \`Site_Icon/\`: icons referenced by release userscript metadata

## Source Of Truth

This directory is staged from the repository's \`main\` branch.
Do not edit these files directly. Update source files on \`main\`, run \`npm run build\`, then stage fresh release assets with:

\`\`\`bash
npm run stage:release -- --out-dir /absolute/path/to/release-branch-worktree
\`\`\`
`;
}

function parseArgs(argv) {
  const options = {
    outDir: "",
    skipBuild: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }
    if (arg.startsWith("--out-dir=")) {
      options.outDir = arg.slice("--out-dir=".length);
      continue;
    }
    if (arg === "--out-dir") {
      options.outDir = String(argv[index + 1] || "");
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/stage-release-branch.js --out-dir /absolute/path/to/release-branch-worktree

Options:
  --skip-build   Reuse existing local build outputs instead of running build first.
`);
}

function stageReleaseBranch(targetRoot) {
  ensurePathExists(distEsmDir, "Built dist/esm output");
  ensurePathExists(siteJsDir, "Built Site_JS output");

  const targetIsGitRepo = isGitRepository(targetRoot);
  resetReleaseTargetRoot(targetRoot, { preserveGitMetadata: targetIsGitRepo });
  copyDir(distEsmDir, path.join(targetRoot, "dist", "esm"));
  copyDir(siteJsDir, path.join(targetRoot, "Site_JS"));

  const targetIconDir = path.join(targetRoot, "Site_Icon");
  resetDir(targetIconDir);
  for (const fileName of RELEASE_SITE_ICON_FILES) {
    copyFile(path.join(siteIconDir, fileName), path.join(targetIconDir, fileName));
  }

  copyFile(licensePath, path.join(targetRoot, "LICENSE"));
  writeText(path.join(targetRoot, "README.md"), renderReleaseReadme());
  const configuredGitIdentity = targetIsGitRepo && configureGitIdentity(targetRoot);

  process.stdout.write(
    `Staged release branch contents: ${targetRoot}\n` +
    `  - dist/esm\n` +
    `  - Site_JS\n` +
    `  - Site_Icon (${RELEASE_SITE_ICON_FILES.length} files)\n` +
    (configuredGitIdentity
      ? `  - git identity: ${RELEASE_PUBLISH_CONFIG.gitUserName} <${RELEASE_PUBLISH_CONFIG.gitUserEmail}>\n`
      : "")
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outDir = resolveOutDir(options.outDir);
  if (!options.skipBuild) {
    await build();
  }
  stageReleaseBranch(outDir);
}

main().catch((error) => {
  process.stderr.write(String(error?.stack || error) + "\n");
  process.exit(1);
});
