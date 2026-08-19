import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/sites/grok/index.js", import.meta.url), "utf8");

test("Grok official model icons keep explicit paint so adaptive fill cannot blob them", () => {
    assert.match(source, /auto: createGrokOfficialIcon/);
    assert.match(source, /fast: createGrokOfficialIcon/);
    assert.match(source, /expert: createGrokOfficialIcon/);
    assert.match(source, /heavy: createGrokOfficialIcon/);
    assert.match(source, /M6\.5 12\.5L11\.5 17\.5/);
    assert.match(source, /M5 14\.25L14 4L13 9\.75H19L10 20L11 14\.25H5Z/);
    assert.match(source, /M12 16V12/);
    assert.match(source, /M3 5\.5C3 4\.83696/);
});

test("Grok chrome shortcuts use official grok.com icons and copy", () => {
    assert.match(source, /"Sidebar": "左侧边栏"/);
    assert.match(source, /"Right Sidebar": "右侧边栏"/);
    assert.match(source, /"Sidebar": "Left Sidebar"/);
    assert.match(source, /hotkey: "CTRL\+SHIFT\+B"/);
    assert.match(source, /SELECTORS\.rightPanelToggle/);
    assert.match(source, /m11 17-5-5 5-5/);
    assert.match(source, /M2\.99561 7H20\.9956/);
    assert.match(source, /M3\.33965 17L11\.9999 22L20\.6602 17V7/);
});

test("Grok official icon markup paints every path before adaptive processing", () => {
    assert.match(source, /d="M6\.5 12\.5L11\.5 17\.5[\s\S]*?stroke="currentColor"/);
    assert.match(source, /M2\.99561 7H20\.9956" stroke="currentColor" stroke-width="2" fill="none"/);
    assert.match(source, /M3\.33965 17L11\.9999 22L20\.6602 17V7L11\.9999 2L3\.33965 7V17Z" stroke="currentColor"/);
});

test("Grok migrates saved default shortcuts onto the official icon set and inserts Right Sidebar", () => {
    assert.match(source, /GROK_OFFICIAL_ICONS_MIGRATION_KEY/);
    assert.match(source, /applyGrokOfficialIconTemplate/);
    assert.match(source, /isRightSidebarShortcutRecord/);
    assert.match(source, /GROK_RIGHT_SIDEBAR_SHORTCUT_TEMPLATE/);
});
