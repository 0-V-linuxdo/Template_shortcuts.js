import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/sites/grok/index.js", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../src/sites/manifest.js", import.meta.url), "utf8");

test("Grok delete shortcut uses the native page flow instead of a delete API", () => {
    assert.ok(source.includes("deleteCurrentGrokConversationViaPage"));
    assert.ok(source.includes("findGrokConversationMenuTriggerElement"));
    assert.ok(source.includes("getGrokDeleteConfirmationOwnership"));
    assert.ok(source.includes("finishGrokDeleteConfirmation"));
    assert.ok(source.includes("return deleteCurrentGrokConversationViaPage(spec);"));
    assert.doesNotMatch(source, /GM_xmlhttpRequest|rest\/app-chat\/conversations|deleteCurrentGrokConversationViaApi/);
});

test("Grok metadata carries the requested release version and update log", () => {
    assert.match(manifest, /name: "\[Grok\] 快捷键跳转 \[20260821\] v1\.0\.11"/);
    assert.match(manifest, /version: "\[20260821\] v1\.0\.11"/);
    assert.match(manifest, /updateLog: "1\.0\.11: 将 Heavy 模型图标替换为 grok\.com 官方/);
});

test("Grok keep-sidebar-visible skips toggle clicks while settings/modals are open", () => {
    assert.match(source, /function isGrokBlockingOverlayOpen\(/);
    assert.match(source, /function requestSidebarWarmup\(/);
    assert.match(source, /SIDEBAR_WARMUP_URL_DELAY_MS/);
    assert.match(source, /GROK_BLOCKING_OVERLAY_SELECTORS/);
    assert.match(source, /\[role='dialog'\]/);
    assert.match(source, /\[data-radix-dialog-content\]/);
    assert.match(source, /if \(isGrokBlockingOverlayOpen\(\)\) return false;/);
    assert.match(source, /delayMs: SIDEBAR_WARMUP_URL_DELAY_MS/);
});
