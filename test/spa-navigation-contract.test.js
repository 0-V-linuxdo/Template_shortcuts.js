import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/modules/core/engine/builtin-actions.js", import.meta.url), "utf8");
const header = fs.readFileSync(new URL("../src/userscript/header.txt", import.meta.url), "utf8");

test("SPA navigation clicks in-page same-origin links before history API", () => {
    assert.match(source, /function findSameOriginSpaLink/);
    assert.match(source, /function clickSpaLink/);
    assert.match(source, /const link = findSameOriginSpaLink\(urlObj\)/);
    assert.match(source, /if \(link && clickSpaLink\(link\)\) return/);
    assert.match(source, /link\.click\(\)/);
});

test("SPA navigation clones Next.js history state instead of a foreign {url} payload", () => {
    assert.match(source, /function isNextJsHistoryState/);
    assert.match(source, /state\.__NA === true/);
    assert.match(source, /__PRIVATE_NEXTJS_INTERNALS_TREE/);
    assert.match(source, /\? \{ \.\.\.prevState \}/);
    assert.match(source, /window\.dispatchEvent\(new PopStateEvent\("popstate", \{ state \}\)\)/);
    assert.doesNotMatch(
        source,
        /window\.history\.pushState\(\{ url: url \}, title, urlObj\.pathname \+ urlObj\.search \+ urlObj\.hash\);\s*window\.dispatchEvent\(new PopStateEvent\('popstate'/
    );
});

test("Template core version is bumped for the SPA navigation fix", () => {
    assert.match(header, /@version\s+\[20260819\] v1\.1\.3/);
    assert.match(header, /SPA 跳转优先点击站内同域链接/);
});
