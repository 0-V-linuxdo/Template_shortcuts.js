#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

import { SITE_MANIFEST, releaseTemplateCore } from "../src/sites/manifest.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const modulesDir = path.join(repoRoot, "src", "modules");
const sitesDir = path.join(repoRoot, "src", "sites");
const userscriptDir = path.join(repoRoot, "src", "userscript");
const scriptsDir = path.join(repoRoot, "scripts");
const headerTemplatePath = path.join(userscriptDir, "header.txt");
const templateArchiveEntryPath = path.join(userscriptDir, "template-archive-entry.js");
const notesPath = path.join(repoRoot, "notes.md");
const templateJsDir = path.join(repoRoot, "Template_JS");
const templateCorePath = path.join(templateJsDir, "[Template] shortcut core.js");
const siteJsDir = path.join(repoRoot, "Site_JS");
const distEsmDir = path.join(repoRoot, "dist", "esm");

const BROWSER_BUILD_OPTIONS = Object.freeze({
  bundle: true,
  platform: "browser",
  write: false,
  splitting: false,
  minify: false,
  legalComments: "none",
  charset: "utf8",
  target: ["es2022"],
  logLevel: "silent"
});

function normalizeNewlines(text) {
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readUtf8(filePath) {
  return normalizeNewlines(fs.readFileSync(filePath, "utf8"));
}

function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function formatDateYYYYMMDD(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function extractBuildDate(headerText) {
  const nameMatch = String(headerText).match(/^\/\/\s*@name\s+(.+)$/m);
  const versionMatch = String(headerText).match(/^\/\/\s*@version\s+(.+)$/m);
  const rawName = nameMatch ? nameMatch[1].trim() : "[Template] 快捷键跳转";
  const dateMatch =
    rawName.match(/\[(\d{8})\]/) ||
    (versionMatch ? versionMatch[1].match(/\[(\d{8})\]/) : null);
  return dateMatch ? dateMatch[1] : formatDateYYYYMMDD();
}

function extractRequireVersionToken(headerText) {
  const versionMatch = String(headerText).match(/^\/\/\s*@version\s+(.+)$/m);
  const rawVersion = versionMatch ? versionMatch[1].trim() : "";
  const dateMatch = rawVersion.match(/\[(\d{8})\]/);
  const semverMatch = rawVersion.match(/\bv([0-9][0-9A-Za-z.\-_]*)\b/i);
  if (dateMatch && semverMatch) return `${dateMatch[1]}.${semverMatch[1]}`;
  if (dateMatch) return dateMatch[1];
  if (semverMatch) return semverMatch[1];
  return extractBuildDate(headerText);
}

function applyBuildReplacements(text, { version } = {}) {
  let out = String(text);
  if (version) {
    out = out.replace(/__TEMPLATE_VERSION__/g, version);
  }
  return out;
}

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const absPath = path.join(dir, name);
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      walkJsFiles(absPath, out);
      continue;
    }
    if (name.endsWith(".js")) out.push(absPath);
  }
  return out;
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function getPrimaryUserscriptName(siteEntry) {
  const metadataName = typeof siteEntry?.metadata?.name === "string" ? siteEntry.metadata.name.trim() : "";
  if (metadataName) return metadataName;

  const displayName = typeof siteEntry?.displayName === "string" ? siteEntry.displayName.trim() : "";
  if (displayName) return displayName;

  return typeof siteEntry?.siteId === "string" ? siteEntry.siteId.trim() : "";
}

function getUserscriptOutputFileName(siteEntry) {
  const scriptName = getPrimaryUserscriptName(siteEntry);
  return scriptName ? `${scriptName}.user.js` : "";
}

function getUserscriptOutputRelativePath(siteEntry) {
  const fileName = getUserscriptOutputFileName(siteEntry);
  return fileName ? `Site_JS/${fileName}` : "";
}

function assertSafeUserscriptOutputFileName(fileName, siteId) {
  if (!fileName) throw new Error(`Missing userscript @name for site "${siteId}"`);
  if (!fileName.endsWith(".user.js")) {
    throw new Error(`Userscript output must end with .user.js for site "${siteId}": ${fileName}`);
  }
  if (fileName === ".user.js" || fileName.startsWith(".")) {
    throw new Error(`Userscript output file name must not be hidden for site "${siteId}": ${fileName}`);
  }
  if (/[<>:"/\\|?*\0]/.test(fileName)) {
    throw new Error(`Userscript @name contains characters that are unsafe for a file name: ${siteId} -> ${fileName}`);
  }
}

function findLineNumbers(text, needleRegex) {
  const lines = String(text).split("\n");
  const hits = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (needleRegex.test(lines[index])) hits.push(index + 1);
  }
  return hits;
}

function enforcePathExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function scanImportSpecifiers(sourceText) {
  const text = String(sourceText || "");
  const specs = [];
  const pattern = /\b(?:import|export)\s+(?:[^'"`]*?\s+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(text))) {
    specs.push(match[1]);
  }
  return specs;
}

function resolveImportTarget(importerPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(importerPath), specifier);
  const directCandidates = [resolved, `${resolved}.js`, path.join(resolved, "index.js")];
  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function buildImportGraph(filePaths) {
  const graph = new Map();
  const fileSet = new Set(filePaths.map((filePath) => path.resolve(filePath)));

  for (const filePath of filePaths) {
    const absPath = path.resolve(filePath);
    const specs = scanImportSpecifiers(readUtf8(absPath));
    const targets = [];
    for (const specifier of specs) {
      const targetPath = resolveImportTarget(absPath, specifier);
      if (targetPath && fileSet.has(path.resolve(targetPath))) {
        targets.push(path.resolve(targetPath));
      }
    }
    graph.set(absPath, targets);
  }

  return graph;
}

function enforceNoDirectInnerHTML(filePaths) {
  const offenders = [];
  const allowedFiles = new Set(["src/modules/core/utils/dom.js"]);
  const needle = /\binnerHTML\b/;

  for (const filePath of filePaths) {
    const relPath = toRepoRelative(filePath);
    if (allowedFiles.has(relPath)) continue;
    const content = readUtf8(filePath);
    const lines = findLineNumbers(content, needle);
    if (lines.length > 0) offenders.push({ relPath, lines });
  }

  if (offenders.length > 0) {
    const formatted = offenders
      .map((item) => `- ${item.relPath}:${item.lines.join(",")}`)
      .join("\n");
    throw new Error(
      `Forbidden direct innerHTML usage found (use setTrustedHTML instead):\n${formatted}\n`
    );
  }
}

function enforceNoCommonJsPatterns(filePaths) {
  const offenders = [];
  const patterns = [
    { label: "require()", regex: /(^|[^A-Za-z0-9_$"'`/])require\s*\(/ },
    { label: "module.exports", regex: /(^|[^A-Za-z0-9_$"'`/])module\.exports\b/ },
    { label: "exports.*", regex: /(^|[^A-Za-z0-9_$"'`/])exports\.[A-Za-z_$]/ }
  ];

  for (const filePath of filePaths) {
    const content = readUtf8(filePath);
    const matches = [];
    for (const pattern of patterns) {
      const lines = findLineNumbers(content, pattern.regex);
      if (lines.length > 0) {
        matches.push(`${pattern.label}@${lines.join(",")}`);
      }
    }
    if (matches.length > 0) {
      offenders.push(`${toRepoRelative(filePath)} -> ${matches.join(" | ")}`);
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Forbidden CommonJS patterns found:\n- ${offenders.join("\n- ")}\n`);
  }
}

async function enforceStandaloneModuleSyntax(filePaths) {
  const failures = [];

  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await esbuild.transform(readUtf8(filePath), {
          loader: "js",
          format: "esm",
          sourcemap: false
        });
      } catch (error) {
        failures.push({ filePath, error });
      }
    })
  );

  if (failures.length > 0) {
    const formatted = failures
      .map(({ filePath, error }) => `- ${toRepoRelative(filePath)}: ${error.message || error}`)
      .join("\n");
    throw new Error(`Standalone ESM syntax check failed:\n${formatted}\n`);
  }
}

function enforceFacadeImportRules(moduleFiles, extraFiles = []) {
  const bannedTargets = new Map([
    [path.resolve(modulesDir, "index.js"), new Set([path.resolve(templateArchiveEntryPath)])],
    [path.resolve(modulesDir, "core", "utils", "index.js"), new Set([path.resolve(modulesDir, "index.js")])],
    [path.resolve(modulesDir, "quick-input", "index.js"), new Set([path.resolve(modulesDir, "index.js")])]
  ]);

  const offenders = [];
  const filesToScan = [...moduleFiles, ...extraFiles];

  for (const importerPath of filesToScan) {
    const specs = scanImportSpecifiers(readUtf8(importerPath));
    for (const specifier of specs) {
      const targetPath = resolveImportTarget(importerPath, specifier);
      if (!targetPath) continue;
      const allowedImporters = bannedTargets.get(path.resolve(targetPath));
      if (!allowedImporters) continue;
      if (!allowedImporters.has(path.resolve(importerPath))) {
        offenders.push(`${toRepoRelative(importerPath)} -> ${toRepoRelative(targetPath)}`);
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Facade import rule violation found:\n- ${offenders.join("\n- ")}\n`);
  }
}

function enforceSharedLayerRules(moduleFiles) {
  const offenders = [];
  const sharedDir = path.resolve(modulesDir, "shared");

  for (const importerPath of moduleFiles) {
    const absImporter = path.resolve(importerPath);
    if (!absImporter.startsWith(sharedDir)) continue;
    const specs = scanImportSpecifiers(readUtf8(absImporter));
    for (const specifier of specs) {
      const targetPath = resolveImportTarget(absImporter, specifier);
      if (!targetPath) continue;
      if (!path.resolve(targetPath).startsWith(sharedDir)) {
        offenders.push(`${toRepoRelative(absImporter)} -> ${toRepoRelative(targetPath)}`);
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Shared layer may not import business modules:\n- ${offenders.join("\n- ")}\n`);
  }
}

function enforceNoImportCycles(filePaths) {
  const graph = buildImportGraph(filePaths);
  const visitState = new Map();
  const stack = [];
  const cycles = [];

  function dfs(node) {
    const state = visitState.get(node);
    if (state === "visiting") {
      const cycleStart = stack.indexOf(node);
      cycles.push([...stack.slice(cycleStart), node]);
      return;
    }
    if (state === "done") return;

    visitState.set(node, "visiting");
    stack.push(node);
    const targets = graph.get(node) || [];
    for (const target of targets) {
      dfs(target);
    }
    stack.pop();
    visitState.set(node, "done");
  }

  for (const node of graph.keys()) {
    if (!visitState.has(node)) dfs(node);
  }

  if (cycles.length > 0) {
    const formatted = cycles
      .map((cycle) => cycle.map((item) => toRepoRelative(item)).join(" -> "))
      .join("\n");
    throw new Error(`Import cycles detected:\n${formatted}\n`);
  }
}

function ensureManifestIntegrity(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("SITE_MANIFEST must contain at least one site entry");
  }

  const seenSiteIds = new Set();
  const seenSourceEntries = new Set();
  const seenUserscriptOutputs = new Set();

  for (const entry of entries) {
    const siteId = typeof entry?.siteId === "string" ? entry.siteId.trim() : "";
    const sourceEntry = typeof entry?.sourceEntry === "string" ? entry.sourceEntry.trim() : "";
    const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : null;
    const userscriptOutputFileName = getUserscriptOutputFileName(entry);
    const userscriptOutput = getUserscriptOutputRelativePath(entry);

    if (!siteId) throw new Error(`Invalid siteId in SITE_MANIFEST entry: ${JSON.stringify(entry)}`);
    if (!sourceEntry) throw new Error(`Missing sourceEntry for site "${siteId}"`);
    if (!metadata) throw new Error(`Missing metadata object for site "${siteId}"`);
    assertSafeUserscriptOutputFileName(userscriptOutputFileName, siteId);

    if (seenSiteIds.has(siteId)) throw new Error(`Duplicate siteId in SITE_MANIFEST: ${siteId}`);
    if (seenSourceEntries.has(sourceEntry)) throw new Error(`Duplicate sourceEntry in SITE_MANIFEST: ${sourceEntry}`);
    if (seenUserscriptOutputs.has(userscriptOutput)) {
      throw new Error(`Duplicate derived userscript output in SITE_MANIFEST: ${userscriptOutput}`);
    }

    seenSiteIds.add(siteId);
    seenSourceEntries.add(sourceEntry);
    seenUserscriptOutputs.add(userscriptOutput);

    enforcePathExists(path.join(repoRoot, sourceEntry), `Site source entry for "${siteId}"`);

    if (!Array.isArray(metadata.match) || metadata.match.length === 0) {
      throw new Error(`Site "${siteId}" must declare at least one @match rule`);
    }
    if (!Array.isArray(metadata.grant) || metadata.grant.length === 0) {
      throw new Error(`Site "${siteId}" must declare at least one @grant rule`);
    }
  }
}

async function bundleJavaScript(entryPath, format = "esm") {
  const result = await esbuild.build({
    entryPoints: [entryPath],
    format,
    ...BROWSER_BUILD_OPTIONS
  });

  const outputFile = Array.isArray(result.outputFiles) ? result.outputFiles[0] : null;
  if (!outputFile || typeof outputFile.text !== "string") {
    throw new Error(`esbuild did not return bundled output for ${entryPath}`);
  }
  return outputFile.text;
}

function formatMetadataLine(name, value) {
  const key = String(name);
  return `// @${key.padEnd(Math.max(13, key.length + 1), " ")}${value}`;
}

function getLocalizedMetadataEntries(metadata, fieldName) {
  const localized = metadata?.localized && typeof metadata.localized === "object" ? metadata.localized : {};
  const entries = [];
  for (const [locale, values] of Object.entries(localized)) {
    const localeToken = String(locale || "").trim().split(/[-_]/)[0].toLowerCase();
    if (!localeToken || !values || typeof values !== "object") continue;
    const value = values[fieldName];
    if (typeof value === "string" && value.trim()) {
      entries.push([`${fieldName}:${localeToken}`, value.trim()]);
    }
  }
  return entries;
}

function renderUserscriptHeader(siteEntry, templateCoreRequireUrl) {
  const metadata = siteEntry.metadata || {};
  const matches = Array.isArray(metadata.match) ? metadata.match : [];
  const grantSet = new Set(Array.isArray(metadata.grant) ? metadata.grant : []);
  if (grantSet.has("GM_registerMenuCommand")) grantSet.add("GM_unregisterMenuCommand");
  const grants = Array.from(grantSet);
  const connects = Array.isArray(metadata.connect) ? metadata.connect : [];
  const lines = [
    "// ==UserScript==",
    formatMetadataLine("name", getPrimaryUserscriptName(siteEntry)),
    formatMetadataLine("namespace", metadata.namespace || "https://github.com/0-V-linuxdo/Template_shortcuts.js")
  ];

  for (const [name, value] of getLocalizedMetadataEntries(metadata, "name")) {
    lines.splice(2, 0, formatMetadataLine(name, value));
  }

  if (metadata.description) {
    lines.push(formatMetadataLine("description", metadata.description));
    for (const [name, value] of getLocalizedMetadataEntries(metadata, "description")) {
      lines.push(formatMetadataLine(name, value));
    }
    lines.push("");
  }

  if (metadata.version) lines.push(formatMetadataLine("version", metadata.version));
  if (metadata.updateLog) {
    lines.push(formatMetadataLine("update-log", metadata.updateLog));
    for (const [name, value] of getLocalizedMetadataEntries(metadata, "updateLog")) {
      lines.push(formatMetadataLine(name.replace(/^updateLog/, "update-log"), value));
    }
  }
  if (metadata.version || metadata.updateLog) lines.push("");

  for (const match of matches) {
    lines.push(formatMetadataLine("match", match));
  }
  lines.push("");

  if (metadata.injectInto) {
    lines.push(formatMetadataLine("inject-into", metadata.injectInto), "");
  }

  for (const grant of grants) {
    lines.push(formatMetadataLine("grant", grant));
  }
  lines.push("");

  for (const connect of connects) {
    lines.push(formatMetadataLine("connect", connect));
  }
  if (connects.length > 0) lines.push("");

  if (metadata.icon) lines.push(formatMetadataLine("icon", metadata.icon));
  lines.push(formatMetadataLine("require", templateCoreRequireUrl));
  lines.push("// ==/UserScript==");
  return lines.join("\n");
}

function assertBuiltTemplateCore(coreText) {
  if (!/\b(?:window|globalThis)\.ShortcutTemplate\b/.test(coreText)) {
    throw new Error("Built template core must expose global ShortcutTemplate");
  }
}

function assertBuiltUserscript(siteEntry, userscriptText, templateCoreRequireUrl, userscriptOutputPath) {
  const userscriptOutput = toRepoRelative(userscriptOutputPath);
  if (!/^\/\/\s*@require\b/m.test(userscriptText)) {
    throw new Error(`Generated userscript is missing @require: ${userscriptOutput}`);
  }
  if (/^\/\/\s*@resource\b/m.test(userscriptText)) {
    throw new Error(`Generated userscript still contains @resource: ${userscriptOutput}`);
  }
  if (/\bGM_getResourceURL\b/.test(userscriptText)) {
    throw new Error(`Generated userscript still references GM_getResourceURL: ${userscriptOutput}`);
  }

  const bodyText = userscriptText.includes("// ==/UserScript==")
    ? userscriptText.split("// ==/UserScript==").slice(1).join("// ==/UserScript==")
    : userscriptText;
  const forbiddenPatterns = [
    { label: "startSite()", regex: /\bstartSite\s*\(/ },
    { label: "resolveShortcutTemplate()", regex: /\bresolveShortcutTemplate\s*\(/ },
    { label: "bootstrapMenuManaged", regex: /\bbootstrapMenuManaged\b/ },
    { label: "menuBridge", regex: /\bmenuBridge\b/ },
    { label: "bootstrap userscript resolver", regex: /__TEMPLATE_SHORTCUTS_GET_USERSCRIPT_API__/ }
  ];

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.regex.test(bodyText)) {
      throw new Error(
        `Generated userscript still contains forbidden ${forbidden.label}: ${userscriptOutput}`
      );
    }
  }

  const expectedRequire = formatMetadataLine("require", templateCoreRequireUrl);
  if (!userscriptText.includes(expectedRequire)) {
    throw new Error(`Generated userscript is missing expected core require URL: ${userscriptOutput}`);
  }
}

export async function build() {
  ensureManifestIntegrity(SITE_MANIFEST);
  enforcePathExists(modulesDir, "Modules directory");
  enforcePathExists(sitesDir, "Sites directory");
  enforcePathExists(userscriptDir, "Userscript directory");
  enforcePathExists(headerTemplatePath, "Template archive header");
  enforcePathExists(templateArchiveEntryPath, "Template archive entry");
  enforcePathExists(notesPath, "notes.md");

  const moduleFiles = walkJsFiles(modulesDir).sort();
  const siteEntryFiles = SITE_MANIFEST.map((entry) => path.join(repoRoot, entry.sourceEntry)).sort();
  const allSiteFiles = walkJsFiles(sitesDir).sort();
  const userscriptFiles = walkJsFiles(userscriptDir).sort();
  const scriptFiles = walkJsFiles(scriptsDir).sort();
  const syntaxCheckFiles = [...moduleFiles, ...allSiteFiles, ...userscriptFiles, ...scriptFiles];

  await enforceStandaloneModuleSyntax(syntaxCheckFiles);
  enforceNoCommonJsPatterns(syntaxCheckFiles);
  enforceNoDirectInnerHTML(moduleFiles);
  enforceFacadeImportRules(moduleFiles, userscriptFiles);
  enforceSharedLayerRules(moduleFiles);
  enforceNoImportCycles([...moduleFiles, ...allSiteFiles, ...userscriptFiles]);

  const templateHeader = ensureTrailingNewline(readUtf8(headerTemplatePath).trimEnd());
  const notice = readUtf8(notesPath).trimEnd();
  const buildVersion = extractBuildDate(templateHeader);
  const templateRequireVersion = extractRequireVersionToken(templateHeader);
  const templateCoreRequireUrl = `${releaseTemplateCore()}?v=${encodeURIComponent(templateRequireVersion)}`;
  const builtTemplateCore = applyBuildReplacements(
    await bundleJavaScript(templateArchiveEntryPath, "iife"),
    { version: buildVersion }
  );
  assertBuiltTemplateCore(builtTemplateCore);

  fs.rmSync(distEsmDir, { recursive: true, force: true });
  fs.mkdirSync(templateJsDir, { recursive: true });
  fs.rmSync(siteJsDir, { recursive: true, force: true });
  fs.mkdirSync(siteJsDir, { recursive: true });

  fs.writeFileSync(
    templateCorePath,
    [templateHeader.trimEnd(), notice, builtTemplateCore.trimEnd()].join("\n\n") + "\n",
    "utf8"
  );

  const builtSiteOutputs = [];

  for (const siteEntry of SITE_MANIFEST) {
    const sourceEntryPath = path.join(repoRoot, siteEntry.sourceEntry);
    const userscriptOutputPath = path.join(siteJsDir, getUserscriptOutputFileName(siteEntry));
    const siteScriptText = await bundleJavaScript(sourceEntryPath, "iife");
    const userscriptText = [
      renderUserscriptHeader(siteEntry, templateCoreRequireUrl).trimEnd(),
      notice,
      siteScriptText.trimEnd()
    ].join("\n\n") + "\n";

    assertBuiltUserscript(siteEntry, userscriptText, templateCoreRequireUrl, userscriptOutputPath);
    fs.mkdirSync(path.dirname(userscriptOutputPath), { recursive: true });
    fs.writeFileSync(userscriptOutputPath, userscriptText, "utf8");
    builtSiteOutputs.push({ siteId: siteEntry.siteId, userscriptOutputPath });
  }

  process.stdout.write(`Built template core: ${toRepoRelative(templateCorePath)}\n`);
  for (const builtSite of builtSiteOutputs) {
    process.stdout.write(`Built site: ${builtSite.siteId} -> ${toRepoRelative(builtSite.userscriptOutputPath)}\n`);
  }
}

function isExecutedDirectly() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isExecutedDirectly()) {
  build().catch((error) => {
    process.stderr.write(String(error?.stack || error) + "\n");
    process.exit(1);
  });
}
