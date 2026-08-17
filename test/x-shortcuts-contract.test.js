import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/sites/x/index.js", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../src/sites/manifest.js", import.meta.url), "utf8");

test("X default shortcuts jump to the requested pages", () => {
    assert.match(source, /hotkey: 'CTRL\+H'/);
    assert.match(source, /url: 'https:\/\/x\.com\/home'/);
    assert.match(source, /hotkey: 'CTRL\+B'/);
    assert.match(source, /url: 'https:\/\/x\.com\/i\/history'/);
    assert.match(source, /hotkey: 'CTRL\+G'/);
    assert.match(source, /url: 'https:\/\/x\.com\/i\/grok'/);
    assert.match(source, /hotkey: 'CTRL\+R'/);
    assert.match(source, /X_REPLY_SORT_RELEVANT_URL/);
    assert.match(source, /hotkey: 'CTRL\+N'/);
    assert.match(source, /X_REPLY_SORT_RECENCY_URL/);
    assert.match(source, /urlMethod: 'spa'/);
    assert.match(source, /urlAdvanced: 'pushState'/);
    assert.match(source, /X_NATIVE_HOME_ICON/);
    assert.match(source, /M21\.591 7\.146/);
    assert.match(source, /X_OFFICIAL_GROK_LOGOMARK/);
    assert.match(source, /M395\.479 633\.828/);
    assert.match(source, /viewBox: '0 0 1024 1024'/);
});

test("X metadata is registered for x.com and twitter.com", () => {
    assert.match(manifest, /siteId: "x"/);
    assert.match(manifest, /name: "\[X\] 快捷键跳转 \[20260818\] v1\.1\.3"/);
    assert.match(manifest, /"https:\/\/x\.com\/\*"/);
    assert.match(manifest, /"https:\/\/twitter\.com\/\*"/);
});
