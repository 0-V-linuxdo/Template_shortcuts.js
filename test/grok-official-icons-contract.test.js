import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/sites/grok/index.js", import.meta.url), "utf8");

test("Grok official model icons keep explicit paint so adaptive fill cannot blob them", () => {
    assert.match(source, /auto: createGrokOfficialIcon/);
    assert.match(source, /fast: createGrokOfficialIcon/);
    assert.match(source, /expert: createGrokOfficialIcon/);
    assert.match(source, /build: createGrokOfficialIcon/);
    assert.match(source, /heavy: createGrokOfficialIcon/);
    assert.match(source, /M6\.5 12\.5L11\.5 17\.5/);
    assert.match(source, /M5 14\.25L14 4L13 9\.75H19L10 20L11 14\.25H5Z/);
    assert.match(source, /M12 16V12/);
    assert.match(source, /m15 12-8\.373 8\.373/);
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
    assert.match(source, /m15 12-8\.373 8\.373a1 1 0 1 1-3-3L12 9" stroke="currentColor"/);
});

test("Grok migrates saved default shortcuts onto the official icon set and inserts Right Sidebar", () => {
    assert.match(source, /GROK_OFFICIAL_ICONS_MIGRATION_KEY/);
    assert.match(source, /applyGrokOfficialIconTemplate/);
    assert.match(source, /isRightSidebarShortcutRecord/);
    assert.match(source, /GROK_RIGHT_SIDEBAR_SHORTCUT_TEMPLATE/);
});

test("Grok replaces the outdated Grok 4.3 shortcut with official Build", () => {
    assert.match(source, /id: "build"/);
    assert.match(source, /key: "model-build"/);
    assert.match(source, /"modelBuild": "模型：Build"/);
    assert.match(source, /"modelBuild": "Model: Build"/);
    assert.match(source, /hotkey: "CTRL\+SHIFT\+4"/);
    assert.match(source, /isLegacyGrok43ShortcutRecord/);
    assert.match(source, /\^\(model\)\?grok43\(beta\)\?\$/);
    assert.doesNotMatch(source, /id: "grok43"/);
    assert.doesNotMatch(source, /Model: Grok 4\.3 \(beta\)/);
});

test("Grok Imagine uses official image icon and remaps Private off Ctrl+I", () => {
    assert.match(source, /name: "Imagine"/);
    assert.match(source, /url: "https:\/\/grok\.com\/imagine"/);
    assert.match(source, /hotkey: "CTRL\+I"/);
    assert.match(source, /hotkey: "CTRL\+SHIFT\+P"/);
    assert.match(source, /privateHotkey === "CTRL\+I" \|\| privateHotkey === "CTRL\+SHIFT\+I"/);
    assert.match(source, /imagine: createGrokOfficialIcon/);
    assert.match(source, /width="16" height="16" x="4" y="4" rx="4"/);
    assert.match(source, /isImagineShortcutRecord/);
    assert.match(source, /isPrivateShortcutRecord/);
    assert.match(source, /GROK_IMAGINE_SHORTCUT_TEMPLATE/);
});

test("Grok Private uses official incognito icon and 无痕模式 copy", () => {
    assert.match(source, /"Private": "无痕模式"/);
    assert.match(source, /"Private": "Private"/);
    assert.match(source, /private: createGrokOfficialIcon/);
    assert.match(source, /GROK_PRIVATE_SHORTCUT_TEMPLATE/);
    assert.match(source, /M15 10C17\.2091 10 19 11\.7909 19 14/);
    assert.match(source, /M13\.0107 0C14\.6405 0 16\.0554 1\.12485/);
    assert.doesNotMatch(source, /data-testid="pi-ghost"/);
});

test("Grok New Chat, Private, Search, and Settings simulate official grok.com hotkeys", () => {
    assert.match(source, /newChat: "CMD\+J"/);
    assert.match(source, /search: "CMD\+K"/);
    assert.match(source, /private: "CMD\+SHIFT\+J"/);
    assert.match(source, /settings: "CMD\+,?"/);
    assert.match(source, /hotkey: "CTRL\+F"/);
    assert.match(source, /hotkey: "CTRL\+,?"/);
    assert.match(source, /GROK_NEW_CHAT_SHORTCUT_TEMPLATE/);
    assert.match(source, /GROK_SEARCH_SHORTCUT_TEMPLATE/);
    assert.match(source, /GROK_SETTINGS_SHORTCUT_TEMPLATE/);
    assert.match(source, /isNewChatShortcutRecord/);
    assert.match(source, /isSearchShortcutRecord/);
    assert.match(source, /actionType: "simulate"/);
    assert.match(source, /simulateKeys: GROK_NATIVE_HOTKEYS\.newChat/);
    assert.match(source, /simulateKeys: GROK_NATIVE_HOTKEYS\.private/);
    assert.match(source, /simulateKeys: GROK_NATIVE_HOTKEYS\.search/);
    assert.match(source, /simulateKeys: GROK_NATIVE_HOTKEYS\.settings/);
});

test("Grok adds Plugins, Automations, and Skills and Connectors URL shortcuts", () => {
    assert.match(source, /url: "https:\/\/grok\.com\/\?_s=void_plugins_tab"/);
    assert.match(source, /hotkey: "CTRL\+O"/);
    assert.match(source, /url: "https:\/\/grok\.com\/automations"/);
    assert.match(source, /url: "https:\/\/grok\.com\/skills-and-connectors"/);
    assert.match(source, /"Plugins": "插件"/);
    assert.match(source, /"Automations": "自动化"/);
    assert.match(source, /"Skills and Connectors": "技能与连接器"/);
    assert.match(source, /GROK_PLUGINS_SHORTCUT_TEMPLATE/);
    assert.match(source, /GROK_AUTOMATIONS_SHORTCUT_TEMPLATE/);
    assert.match(source, /GROK_SKILLS_SHORTCUT_TEMPLATE/);
    assert.match(source, /plugins: createGrokOfficialIcon/);
    assert.match(source, /automations: createGrokOfficialIcon/);
    assert.match(source, /skills: createGrokOfficialIcon/);
});

test("Grok same-origin URL shortcuts default to SPA pushState", () => {
    assert.match(source, /url: "https:\/\/grok\.com\/imagine"[\s\S]{0,80}urlMethod: "spa"[\s\S]{0,40}urlAdvanced: "pushState"/);
    assert.match(source, /url: "https:\/\/grok\.com\/project"[\s\S]{0,80}urlMethod: "spa"[\s\S]{0,40}urlAdvanced: "pushState"/);
    assert.match(source, /url: "https:\/\/grok\.com\/automations"[\s\S]{0,80}urlMethod: "spa"[\s\S]{0,40}urlAdvanced: "pushState"/);
    assert.match(source, /url: "https:\/\/grok\.com\/skills-and-connectors"[\s\S]{0,80}urlMethod: "spa"[\s\S]{0,40}urlAdvanced: "pushState"/);
    assert.match(source, /url: "https:\/\/grok\.com\/\?_s=void_plugins_tab"[\s\S]{0,80}urlMethod: "spa"[\s\S]{0,40}urlAdvanced: "pushState"/);
    assert.match(source, /shouldUseGrokSpaUrlNavigation/);
    assert.match(source, /defaults: \{\s*urlMethod: "spa",\s*urlAdvanced: "pushState"/);
    assert.match(source, /url: GROK_ADMIN_URL,\s*urlMethod: "current"/);
});
