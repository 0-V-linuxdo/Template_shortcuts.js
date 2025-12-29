// ==UserScript==
// @name         [Gemini] 快捷键跳转 [20251229] v1.0.0
// @namespace    https://github.com/0-V-linuxdo/Template_shortcuts.js
// @description  为 Gemini 添加自定义快捷键管理功能（依赖 Template 模块）。支持 URL 跳转、元素点击、按键模拟，可视化设置面板、暗色模式、自适应布局、图标缓存等功能。
//
// @version      [20251229] v1.0.0
// @update-log   1.0.0: 移除调试导出 window.GeminiShortcutEngine
//
// @match        https://gemini.google.com/*
//
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
//
// @connect      *
//
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/gemini_keycap.svg
// @require      https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Template_JS/%5BTemplate%5D%20shortcut%20core.js?version=1
// ==/UserScript==

(function () {
    'use strict';

    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Gemini Shortcut] Template module not found.');
        return;
    }

    const defaultIconURL = "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg";

    const defaultIcons = [
        { name: "Gemini", url: "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "ChatGPT", url: "https://chatgpt.com/favicon.ico" },
        { name: "Claude", url: "https://claude.ai/favicon.ico" },
        { name: "Perplexity", url: "https://www.perplexity.ai/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" }
    ];

    const protectedIconUrls = [
        "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg"
    ];

    const SELECTORS = {
        sidebarToggle: "button[data-test-id='side-nav-menu-button'], side-nav-menu-button button[aria-label='Main menu']",
        toolsButton: "toolbox-drawer button.toolbox-drawer-button",
        conversationActionsButton: "button[data-test-id='actions-menu-button']",
    };

    const MENU_TIMING = {
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120,
        stepDelayMs: 120
    };

    const baseShortcut = Object.freeze({
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        customAction: "",
        data: {},
        icon: defaultIconURL
    });

    function deriveShortcutKeyFromName(name) {
        const raw = String(name ?? "").trim();
        if (!raw) return "";
        const words = raw.split(/[\s_-]+/g).filter(Boolean);
        const cleaned = words
            .map(word => word.replace(/[^a-zA-Z0-9]/g, ""))
            .filter(Boolean);
        if (cleaned.length === 0) return "";

        const [first, ...rest] = cleaned;
        const head = first.toLowerCase();
        const tail = rest
            .map(word => word.toLowerCase())
            .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
            .filter(Boolean)
            .join("");
        return head + tail;
    }

    const createShortcut = (overrides) => {
        const shortcut = { ...baseShortcut, ...(overrides || {}) };
        const existingKey = (typeof shortcut.key === "string") ? shortcut.key.trim() : "";
        if (!existingKey && typeof shortcut.name === "string") {
            const derived = deriveShortcutKeyFromName(shortcut.name);
            if (derived) shortcut.key = derived;
        }
        return shortcut;
    };

    const defaultShortcuts = [
        createShortcut({ name: "New Chat", actionType: "simulate", simulateKeys: "CMD+SHIFT+O", hotkey: "CTRL+N" }),
        createShortcut({ name: "Toggle Sidebar", actionType: "selector", selector: SELECTORS.sidebarToggle, hotkey: "CTRL+B" }),

        createShortcut({ name: "Open Tools", actionType: "selector", selector: SELECTORS.toolsButton, hotkey: "CTRL+T" }),
        createShortcut({
            name: "Canvas",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+C",
            data: { path: ["Canvas"] }
        }),
        createShortcut({
            name: "Learning",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+L",
            data: { path: ["Learning"] }
        }),
        createShortcut({
            name: "Research",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+R",
            data: { path: ["Research"] }
        }),
        createShortcut({
            name: "Delete",
            actionType: "custom",
            customAction: "conversationMenu",
            hotkey: "CTRL+BACKSPACE",
            data: { path: ["Delete"] }
        }),
        createShortcut({
            name: "Pin",
            actionType: "custom",
            customAction: "conversationMenu",
            hotkey: "CTRL+P",
            data: { path: ["Pin"] }
        })
    ];

    const TemplateUtils = window.ShortcutTemplate.utils;
    if (!TemplateUtils?.menu?.createMenuController) {
        console.error('[Gemini Shortcut] Template utils.menu not found (update Template core).');
        return;
    }

    const toolsDrawerMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selector: { fromShortcutKey: "openTools", fallback: SELECTORS.toolsButton }
        },
        root: {
            type: "selector",
            selector: "mat-card.toolbox-drawer-card",
            pick: "last"
        },
        timing: MENU_TIMING
    });

    const conversationMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selector: SELECTORS.conversationActionsButton
        },
        root: {
            type: "selector",
            selector: ".conversation-actions-menu.mat-mdc-menu-panel",
            pick: "last"
        },
        timing: MENU_TIMING
    });

    function normalizeMenuToken(value) {
        return String(value ?? "").trim();
    }

    function normalizeMenuKey(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        return token.replace(/[\s_-]+/g, "");
    }

    function normalizeMenuAction(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        return token || "onestep";
    }

    const TOOLS_DRAWER_ITEM_SELECTOR = "button[mat-list-item], button.mat-mdc-list-item, [role='menuitem'], [role='menuitemradio']";
    const CONVERSATION_ITEM_SELECTOR = "button[mat-menu-item], button.mat-mdc-menu-item, [role='menuitem'], [role='menuitemradio']";

    function describeSelectorSpec(value) {
        if (typeof value === "string") {
            const trimmed = value.trim();
            return { provided: !!trimmed, hasLiteral: !!trimmed };
        }
        if (Array.isArray(value)) {
            return {
                provided: value.some(item => describeSelectorSpec(item).provided),
                hasLiteral: value.some(item => describeSelectorSpec(item).hasLiteral)
            };
        }
        if (value && typeof value === "object") {
            const hasLiteral = (
                (typeof value.selector === "string" && !!value.selector.trim()) ||
                (typeof value.fallback === "string" && !!value.fallback.trim()) ||
                (Array.isArray(value.selectors) && value.selectors.some(item => describeSelectorSpec(item).hasLiteral))
            );
            return { provided: true, hasLiteral };
        }
        return { provided: false, hasLiteral: false };
    }

    function getGeminiMenuActionSpec(shortcut, { menuController, defaultItemSelector } = {}) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = (menu.waitForItem !== undefined) ? !!menu.waitForItem : true;
        const allowFirstItem = !!menu.allowFirstItem;

        let textMatch = (menu.keyword !== undefined) ? menu.keyword : menu.textMatch;

        const openSubmenus = [];
        if (Array.isArray(menu.openSubmenus)) openSubmenus.push(...menu.openSubmenus);

        const path = Array.isArray(menu.path) ? menu.path : null;
        if (path && path.length) {
            const parts = path.map(normalizeMenuToken).filter(Boolean);
            if (parts.length) {
                const last = parts[parts.length - 1];
                if ((textMatch === undefined || textMatch === null || textMatch === "") && last) textMatch = last;
                for (const label of parts.slice(0, -1)) openSubmenus.push(label);
            }
        }

        const normalizedOpenSubmenus = Array.from(new Set(openSubmenus.map(normalizeMenuKey).filter(Boolean)));

        const action = normalizeMenuAction(menu.action);
        const submenuKey = normalizeMenuKey(menu.submenuKey || (normalizedOpenSubmenus[0] || ""));

        const rawSelector = menu.selector;
        const { provided: selectorProvided, hasLiteral: selectorHasLiteral } = describeSelectorSpec(rawSelector);

        const selector = selectorProvided
            ? ((typeof rawSelector === "string") ? rawSelector.trim() : rawSelector)
            : defaultItemSelector;

        const selectorMaybeEmpty = selectorProvided && !selectorHasLiteral && action !== "open" && action !== "submenu";

        return {
            menu: menuController,
            defaultItemSelector,
            action,
            selector,
            selectorProvided,
            selectorMaybeEmpty,
            textMatch,
            fallbackToFirst,
            waitForItem,
            allowFirstItem,
            openSubmenus: normalizedOpenSubmenus,
            submenuKey
        };
    }

    function hasValidTextMatch(textMatch) {
        if (typeof textMatch === "string") return !!textMatch.trim();
        if (textMatch instanceof RegExp) return true;
        if (typeof textMatch === "function") return true;
        if (Array.isArray(textMatch)) return textMatch.some(v => hasValidTextMatch(v));
        return false;
    }

    function ensureMenuTarget(spec, actionName) {
        if (spec.allowFirstItem || hasValidTextMatch(spec.textMatch) || spec.selectorProvided) return true;
        console.warn(`[Gemini Shortcut] ${actionName || "geminiMenu"}: missing menu target; set data.menu = "Canvas" (or data.menu.textMatch / data.menu.keyword / data.menu.path), or set data.textMatch / data.keyword / data.path, or set data.menu.allowFirstItem=true (or data.allowFirstItem=true) to click the first item.`);
        return false;
    }

    async function runMenuSelection(spec, engine, mode, actionName) {
        const common = {
            textMatch: spec.textMatch,
            fallbackToFirst: spec.fallbackToFirst,
            waitForItem: spec.waitForItem
        };

        const run = (selector) => {
            if (mode === "click") {
                return spec.menu.clickInOpenMenus({ engine }, { selector, ...common });
            }
            return spec.menu.oneStepClick(
                { engine },
                { selector, openSubmenus: spec.openSubmenus, ...common }
            );
        };

        let ok = await run(spec.selector);
        if (ok || !spec.selectorMaybeEmpty || !hasValidTextMatch(spec.textMatch)) return ok;

        console.warn(`[Gemini Shortcut] ${actionName || "geminiMenu"}: menu.selector resolved to empty; fallback to default item selector.`);
        ok = await run(spec.defaultItemSelector);
        return ok;
    }

    function createGeminiMenuAction({ actionName, menuController, defaultItemSelector } = {}) {
        return async function geminiMenuAction({ shortcut, engine }) {
            const spec = getGeminiMenuActionSpec(shortcut, { menuController, defaultItemSelector });
            if (!spec?.menu) return false;

            switch (spec.action) {
                case "open": {
                    return await spec.menu.ensureOpen({ engine });
                }
                case "submenu": {
                    if (!spec.submenuKey) return false;
                    return await spec.menu.ensureSubmenuOpen({ engine }, spec.submenuKey);
                }
                case "click": {
                    if (!ensureMenuTarget(spec, actionName)) return false;
                    return await runMenuSelection(spec, engine, "click", actionName);
                }
                default: {
                    if (!ensureMenuTarget(spec, actionName)) return false;
                    return await runMenuSelection(spec, engine, "oneStep", actionName);
                }
            }
        };
    }

    const toolsDrawerMenuAction = createGeminiMenuAction({
        actionName: "toolsDrawer",
        menuController: toolsDrawerMenu,
        defaultItemSelector: TOOLS_DRAWER_ITEM_SELECTOR
    });

    const conversationMenuAction = createGeminiMenuAction({
        actionName: "conversationMenu",
        menuController: conversationMenu,
        defaultItemSelector: CONVERSATION_ITEM_SELECTOR
    });

    const CUSTOM_ACTIONS = {
        toolsDrawer: toolsDrawerMenuAction,
        conversationMenu: conversationMenuAction
    };

    const engine = window.ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "Gemini - 设置快捷键",
        panelTitle: "Gemini - 自定义快捷键",
        storageKeys: {
            shortcuts: "gemini_shortcuts_v2",
            iconCachePrefix: "gemini_icon_cache_v2::",
            userIcons: "gemini_user_icons_v2"
        },
        ui: {
            idPrefix: "gemini"
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        customActions: CUSTOM_ACTIONS,
        customActionDataAdapters: {
            toolsDrawer: {
                label: "菜单关键词（或粘贴 JSON，高级用法）:",
                placeholder: "例如: Canvas / Learning / Research",
                format: (data) => {
                    const raw = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
                    const keys = Object.keys(raw);
                    if (keys.length === 0) return "";

                    const menu = raw.menu;
                    if (typeof menu === "string" && menu.trim()) return menu.trim();

                    if (menu && typeof menu === "object" && !Array.isArray(menu)) {
                        const menuKeys = Object.keys(menu);
                        const keyword = (typeof menu.keyword === "string" && menu.keyword.trim())
                            ? menu.keyword.trim()
                            : ((typeof menu.textMatch === "string" && menu.textMatch.trim()) ? menu.textMatch.trim() : "");
                        if (keyword && menuKeys.every(k => ["keyword", "textMatch"].includes(k))) return keyword;
                    }

                    if (keys.length === 1 && keys[0] === "keyword" && typeof raw.keyword === "string" && raw.keyword.trim()) {
                        return raw.keyword.trim();
                    }

                    if (keys.length === 1 && keys[0] === "textMatch" && typeof raw.textMatch === "string" && raw.textMatch.trim()) {
                        return raw.textMatch.trim();
                    }

                    if (keys.length === 1 && keys[0] === "path" && Array.isArray(raw.path)) {
                        const parts = raw.path.map(value => String(value ?? "").trim()).filter(Boolean);
                        if (parts.length === 1) return parts[0];
                    }

                    try {
                        return JSON.stringify(raw, null, 2);
                    } catch {
                        return "";
                    }
                },
                parse: (text) => {
                    const trimmed = String(text ?? "").trim();
                    if (!trimmed) return {};
                    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                        const parsed = JSON.parse(trimmed);
                        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
                        return parsed;
                    }
                    return { menu: trimmed };
                }
            },
            conversationMenu: {
                label: "菜单关键词（或粘贴 JSON，高级用法）:",
                placeholder: "例如: Pin / Delete",
                format: (data) => {
                    const raw = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
                    const keys = Object.keys(raw);
                    if (keys.length === 0) return "";

                    const menu = raw.menu;
                    if (typeof menu === "string" && menu.trim()) return menu.trim();

                    if (menu && typeof menu === "object" && !Array.isArray(menu)) {
                        const menuKeys = Object.keys(menu);
                        const keyword = (typeof menu.keyword === "string" && menu.keyword.trim())
                            ? menu.keyword.trim()
                            : ((typeof menu.textMatch === "string" && menu.textMatch.trim()) ? menu.textMatch.trim() : "");
                        if (keyword && menuKeys.every(k => ["keyword", "textMatch"].includes(k))) return keyword;
                    }

                    if (keys.length === 1 && keys[0] === "keyword" && typeof raw.keyword === "string" && raw.keyword.trim()) {
                        return raw.keyword.trim();
                    }

                    if (keys.length === 1 && keys[0] === "textMatch" && typeof raw.textMatch === "string" && raw.textMatch.trim()) {
                        return raw.textMatch.trim();
                    }

                    if (keys.length === 1 && keys[0] === "path" && Array.isArray(raw.path)) {
                        const parts = raw.path.map(value => String(value ?? "").trim()).filter(Boolean);
                        if (parts.length === 1) return parts[0];
                    }

                    try {
                        return JSON.stringify(raw, null, 2);
                    } catch {
                        return "";
                    }
                },
                parse: (text) => {
                    const trimmed = String(text ?? "").trim();
                    if (!trimmed) return {};
                    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                        const parsed = JSON.parse(trimmed);
                        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
                        return parsed;
                    }
                    return { menu: trimmed };
                }
            }
        },
        colors: {
            primary: "#4285F4"
        },
        consoleTag: "[Gemini Shortcut Script]",
        shouldBypassIconCache: (url) => {
            return url && url.startsWith("https://gemini.google.com/");
        }
    });

    engine.init();
})();
