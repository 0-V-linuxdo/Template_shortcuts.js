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
});

test("X metadata is registered for x.com and twitter.com", () => {
    assert.match(manifest, /siteId: "x"/);
    assert.match(manifest, /name: "\[X\] 快捷键跳转 \[20260817\] v1\.1\.1"/);
    assert.match(manifest, /"https:\/\/x\.com\/\*"/);
    assert.match(manifest, /"https:\/\/twitter\.com\/\*"/);
});
