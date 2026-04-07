// ==UserScript==
// @name         [Gemini] 快捷键跳转 [20260407] v1.4.4
// @namespace    https://github.com/0-V-linuxdo/Template_shortcuts.js
// @description  为 Gemini 提供可视化自定义快捷键：快速新建会话、切换模型、打开工具、Pin/Delete 对话与快捷输入发送，支持按键和图标自定义。
//
// @version      [20260407] v1.4.4
// @update-log   1.4.4: 同步 Template v1.4.4 依赖；统一 QuickInput 最终状态文案标点，将“完成 / 已停止 / 失败”结尾调整为感叹号。
//
// @match        https://gemini.google.com/*
//
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
//
// @connect      *
//
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/gemini_keycap.svg
// @require      https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Template_JS/%5BTemplate%5D%20shortcut%20core.js?v=20260407.1.4.4
// ==/UserScript==

(function () {
    'use strict';

    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Gemini Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = "[Gemini Shortcut Script]";
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
        sidebarToggle: [
            "button[data-test-id='side-nav-menu-button']",
            "side-nav-menu-button button[aria-label='Main menu']",
            "side-nav-menu-button button",
            "button[aria-label='Main menu']",
            "button[aria-label='Open main menu']",
            "button[aria-label='Open navigation menu']"
        ].join(", "),
        modelPickerButton: [
            "[data-test-id='bard-mode-menu-button'] button",
            "[data-test-id='bard-mode-menu-button']"
        ],
        toolsButton: "toolbox-drawer button.toolbox-drawer-button",
        conversationActionsButton: [
            "conversation-actions-icon button[data-test-id='conversation-actions-menu-icon-button']",
            "conversation-actions button[data-test-id='actions-menu-button']",
            "button[data-test-id='conversation-actions-menu-icon-button']",
            "button[data-test-id='actions-menu-button']"
        ],
    };

    const MODEL_PICKER_OPTION_SELECTORS = Object.freeze({
        pro: "button[data-test-id='bard-mode-option-pro']",
        thinking: "button[data-test-id='bard-mode-option-thinking']",
        fast: "button[data-test-id='bard-mode-option-fast']"
    });

    function normalizeModelToken(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function inferModelKeyFromText(text) {
        const token = normalizeModelToken(text);
        if (!token) return "";
        if (token === "pro") return "pro";
        if (token === "thinking") return "thinking";
        if (token === "fast") return "fast";
        if (/(^|[^a-z0-9])pro([^a-z0-9]|$)/.test(token)) return "pro";
        if (/(^|[^a-z0-9])thinking([^a-z0-9]|$)/.test(token)) return "thinking";
        if (/(^|[^a-z0-9])fast([^a-z0-9]|$)/.test(token)) return "fast";
        return "";
    }

    function getCurrentModelKey() {
        const readText = () => {
            const span = document.querySelector("[data-test-id='bard-mode-menu-button'] [data-test-id='logo-pill-label-container'] span");
            if (span) return span.textContent || "";

            const container = document.querySelector("[data-test-id='bard-mode-menu-button'] [data-test-id='logo-pill-label-container']");
            if (container) return container.textContent || "";

            const button = document.querySelector("[data-test-id='bard-mode-menu-button']");
            if (button) return button.textContent || "";
            return "";
        };
        return inferModelKeyFromText(readText());
    }

    const MENU_TIMING = {
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120,
        stepDelayMs: 120
    };

    const QUICK_INPUT_STORAGE_KEY = "gemini_quick_input_v1";
    const SIDEBAR_VISIBILITY_STORAGE_KEY = "gemini_keep_sidebar_visible_v1";
    const DEFAULT_KEEP_SIDEBAR_VISIBLE = true;
    const SIDEBAR_OPEN_SELECTORS = [
        "div.sidenav-with-history-container.expanded",
        "div.conversation-items-container.side-nav-opened",
        "div.conversation-actions-container.side-nav-opened",
        "bard-sidenav[style*='--bard-sidenav-open-width']",
        "side-navigation-content side-nav-action-button.is-expanded",
        "side-navigation-content [data-test-id='new-chat-button'].is-expanded"
    ];
    const SIDEBAR_CLOSED_SELECTORS = [
        "div.sidenav-with-history-container:not(.expanded)",
        "bard-sidenav[style*='--bard-sidenav-closed-width']"
    ];
    let keepSidebarVisible = getKeepSidebarVisibleSetting();
    let sidebarVisibilityMenuCommandId = null;
    let sidebarWarmupTimer = null;

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

        createShortcut({
            name: "Model: Pro",
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: "CTRL+SHIFT+P",
            data: { menu: { selector: MODEL_PICKER_OPTION_SELECTORS.pro } }
        }),
        createShortcut({
            name: "Model: Thinking",
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: "CTRL+SHIFT+T",
            data: { menu: { selector: MODEL_PICKER_OPTION_SELECTORS.thinking } }
        }),
        createShortcut({
            name: "Model: Fast",
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: "CTRL+SHIFT+F",
            data: { menu: { selector: MODEL_PICKER_OPTION_SELECTORS.fast } }
        }),

        createShortcut({ name: "Open Tools", actionType: "selector", selector: SELECTORS.toolsButton, hotkey: "CTRL+T" }),
        createShortcut({
            name: "Canvas",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+C",
            data: { path: ["Canvas"] }
        }),
        createShortcut({
            name: "Image",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+I",
            data: { path: ["Image"] }
        }),
        createShortcut({
            name: "Quick Input",
            actionType: "custom",
            customAction: "quickInput",
            hotkey: "CTRL+SHIFT+K",
            data: {}
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

    function getKeepSidebarVisibleSetting() {
        if (typeof GM_getValue !== "function") return DEFAULT_KEEP_SIDEBAR_VISIBLE;
        try {
            const value = GM_getValue(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
            if (value && typeof value.then === "function") return DEFAULT_KEEP_SIDEBAR_VISIBLE;
            return value === true || value === "true";
        } catch { }
        return DEFAULT_KEEP_SIDEBAR_VISIBLE;
    }

    function setKeepSidebarVisibleSetting(value) {
        if (typeof GM_setValue !== "function") return;
        try {
            GM_setValue(SIDEBAR_VISIBILITY_STORAGE_KEY, !!value);
        } catch { }
    }

    function getSidebarVisibilityMenuLabel() {
        return `Gemini - 保持侧边栏显示: ${keepSidebarVisible ? "开" : "关"}`;
    }

    function registerSidebarVisibilityMenuCommand() {
        if (typeof GM_registerMenuCommand !== "function") return;

        if (sidebarVisibilityMenuCommandId !== null) {
            if (typeof GM_unregisterMenuCommand === "function") {
                try {
                    GM_unregisterMenuCommand(sidebarVisibilityMenuCommandId);
                } catch { }
            } else {
                return;
            }
        }

        sidebarVisibilityMenuCommandId = GM_registerMenuCommand(getSidebarVisibilityMenuLabel(), () => {
            keepSidebarVisible = !keepSidebarVisible;
            setKeepSidebarVisibleSetting(keepSidebarVisible);
            console.info(`${LOG_TAG} 保持侧边栏显示已${keepSidebarVisible ? "启用" : "关闭"}。`);
            if (keepSidebarVisible) startSidebarWarmup();
            registerSidebarVisibilityMenuCommand();
        });
    }

    function isElementVisible(el) {
        if (!el) return false;
        if (el.offsetParent !== null) return true;
        try {
            const rect = el.getBoundingClientRect?.();
            return !!rect && rect.width > 0 && rect.height > 0;
        } catch {
            return false;
        }
    }

    function getFirstVisibleBySelector(selector, { fallbackToFirst = false } = {}) {
        if (typeof selector !== "string" || !selector.trim()) return null;
        let all = [];
        try {
            all = Array.from(document.querySelectorAll(selector));
        } catch {
            return null;
        }
        for (const el of all) {
            if (isElementVisible(el)) return el;
        }
        return fallbackToFirst ? (all[0] || null) : null;
    }

    function getSidebarToggleButton() {
        return getFirstVisibleBySelector(SELECTORS.sidebarToggle, { fallbackToFirst: true });
    }

    function parseBooleanAttr(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (token === "true") return true;
        if (token === "false") return false;
        return null;
    }

    function inferSidebarStateFromClassName(value) {
        const token = String(value ?? "").toLowerCase();
        if (!token) return null;
        if (/(sidebar|sidenav)[-_a-z0-9]*(collapsed|closed)/.test(token)) return false;
        if (/(sidebar|sidenav)[-_a-z0-9]*(expanded|opened|open)/.test(token)) return true;
        return null;
    }

    function readSidebarStateFromToggle(button) {
        if (!button) return null;

        const expanded = parseBooleanAttr(button.getAttribute?.("aria-expanded"));
        if (expanded !== null) return expanded;

        const pressed = parseBooleanAttr(button.getAttribute?.("aria-pressed"));
        if (pressed !== null) return pressed;

        const stateAttr = String(button.getAttribute?.("data-state") || "").trim().toLowerCase();
        if (stateAttr === "expanded" || stateAttr === "open" || stateAttr === "opened") return true;
        if (stateAttr === "collapsed" || stateAttr === "close" || stateAttr === "closed") return false;

        const ariaLabel = String(button.getAttribute?.("aria-label") || "").trim().toLowerCase();
        if (/(open|expand).*(menu|navigation|sidebar|side nav)/.test(ariaLabel)) return false;
        if (/(close|collapse|hide).*(menu|navigation|sidebar|side nav)/.test(ariaLabel)) return true;

        const host = button.closest?.("side-nav-menu-button, [class*='side-nav'], [class*='sidebar'], [class*='sidenav']");
        const byHostClass = inferSidebarStateFromClassName(host?.className || "");
        if (byHostClass !== null) return byHostClass;

        return inferSidebarStateFromClassName(button.className || "");
    }

    function isSidebarOpen() {
        for (const selector of SIDEBAR_OPEN_SELECTORS) {
            const el = getFirstVisibleBySelector(selector);
            if (el) return true;
        }

        for (const selector of SIDEBAR_CLOSED_SELECTORS) {
            const el = getFirstVisibleBySelector(selector, { fallbackToFirst: true });
            if (el) return false;
        }

        const button = getSidebarToggleButton();
        const fromToggle = readSidebarStateFromToggle(button);
        if (fromToggle !== null) return fromToggle;
        return button ? false : null;
    }

    function clickSidebarToggleButton() {
        const button = getSidebarToggleButton();
        if (!button) return false;
        try {
            const clicked = TemplateUtils?.events?.simulateClick?.(button, { nativeFallback: true });
            if (clicked) return true;
        } catch { }
        try {
            button.click();
            return true;
        } catch { }
        return false;
    }

    function ensureSidebarVisible() {
        if (!keepSidebarVisible) return false;
        const open = isSidebarOpen();
        if (open === true) return true;
        return clickSidebarToggleButton();
    }

    function stopSidebarWarmup() {
        if (sidebarWarmupTimer === null) return;
        try { clearInterval(sidebarWarmupTimer); } catch { }
        sidebarWarmupTimer = null;
    }

    function startSidebarWarmup({ attempts = 20, intervalMs = 500 } = {}) {
        stopSidebarWarmup();
        let remaining = Math.max(1, Number(attempts) || 1);
        const interval = Math.max(150, Number(intervalMs) || 500);

        const tick = () => {
            if (!keepSidebarVisible) {
                stopSidebarWarmup();
                return;
            }

            const open = isSidebarOpen();
            if (open === true) {
                stopSidebarWarmup();
                return;
            }

            ensureSidebarVisible();
            remaining -= 1;
            if (remaining <= 0) stopSidebarWarmup();
        };

        tick();
        sidebarWarmupTimer = window.setInterval(tick, interval);
    }

    function setupKeepSidebarVisible() {
        window.addEventListener("load", () => {
            setTimeout(() => startSidebarWarmup(), 650);
        }, { once: true });

        if (document.readyState === "complete") {
            setTimeout(() => startSidebarWarmup(), 800);
        }

        let lastUrl = location.href;
        const observer = new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                startSidebarWarmup();
            }
        });
        observer.observe(document.documentElement || document, { subtree: true, childList: true });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") startSidebarWarmup();
        });
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
            selectors: SELECTORS.conversationActionsButton
        },
        root: {
            type: "ariaControls"
        },
        timing: MENU_TIMING
    });

    const modelPickerMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: SELECTORS.modelPickerButton
        },
        root: {
            type: "selector",
            selector: ".gds-mode-switch-menu.mat-mdc-menu-panel",
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
    const MODEL_PICKER_ITEM_SELECTOR = "button[data-test-id^='bard-mode-option-'], button.bard-mode-list-button[role='menuitemradio']";

    function inferModelKeyFromSelectorSpec(selectorSpec) {
        const fromString = (value) => {
            const token = normalizeModelToken(value);
            if (!token) return "";
            if (token.includes("bard-mode-option-pro")) return "pro";
            if (token.includes("bard-mode-option-thinking")) return "thinking";
            if (token.includes("bard-mode-option-fast")) return "fast";
            return "";
        };

        if (typeof selectorSpec === "string") return fromString(selectorSpec);
        if (Array.isArray(selectorSpec)) {
            for (const item of selectorSpec) {
                const found = inferModelKeyFromSelectorSpec(item);
                if (found) return found;
            }
            return "";
        }
        if (selectorSpec && typeof selectorSpec === "object") {
            if (selectorSpec.selector) {
                const found = inferModelKeyFromSelectorSpec(selectorSpec.selector);
                if (found) return found;
            }
            if (selectorSpec.selectors) {
                const found = inferModelKeyFromSelectorSpec(selectorSpec.selectors);
                if (found) return found;
            }
            if (selectorSpec.fallback) {
                const found = inferModelKeyFromSelectorSpec(selectorSpec.fallback);
                if (found) return found;
            }
            return "";
        }
        return "";
    }

    function getTargetModelKey(shortcut) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const fromSelector = inferModelKeyFromSelectorSpec(menu.selector);
        if (fromSelector) return fromSelector;

        const candidates = [];
        if (typeof menu.keyword === "string") candidates.push(menu.keyword);
        if (typeof menu.textMatch === "string") candidates.push(menu.textMatch);
        if (Array.isArray(menu.path) && menu.path.length) candidates.push(menu.path[menu.path.length - 1]);
        if (typeof rawMenu === "string") candidates.push(rawMenu);
        if (typeof shortcut?.name === "string") candidates.push(shortcut.name);

        for (const text of candidates) {
            const found = inferModelKeyFromText(text);
            if (found) return found;
        }
        return "";
    }

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

    function textLooksLikeDelete(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (!token) return false;
        return token.includes("delete") || token.includes("删除");
    }

    function shortcutLooksLikeDelete(shortcut) {
        const data = (shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data)) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        if (textLooksLikeDelete(shortcut?.name)) return true;
        if (textLooksLikeDelete(menu?.keyword)) return true;
        if (textLooksLikeDelete(menu?.textMatch)) return true;
        if (textLooksLikeDelete(rawMenu)) return true;

        if (Array.isArray(menu?.path) && menu.path.some(textLooksLikeDelete)) return true;
        if (Array.isArray(data?.path) && data.path.some(textLooksLikeDelete)) return true;
        return false;
    }

    function findDeleteConfirmButton() {
        let dialogs = [];
        try { dialogs = Array.from(document.querySelectorAll("mat-dialog-container")); } catch { return null; }
        for (const dialog of dialogs) {
            if (!dialog) continue;
            const ariaLabel = String(dialog.getAttribute?.("aria-label") || "");
            const titleText = String(dialog.querySelector?.("[data-test-id='message-dialog-title']")?.textContent || "");
            if (!textLooksLikeDelete(ariaLabel) && !textLooksLikeDelete(titleText)) continue;

            const confirmBtn = dialog.querySelector("button[data-test-id='confirm-button']");
            if (confirmBtn) return confirmBtn;

            let candidates = [];
            try { candidates = Array.from(dialog.querySelectorAll("button")); } catch { candidates = []; }
            for (const btn of candidates) {
                if (textLooksLikeDelete(btn.textContent || "")) return btn;
            }
        }
        return null;
    }

    async function autoFocusDeleteConfirmButton({ timeoutMs = 2500, intervalMs = 80 } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(30, Number(intervalMs) || 80);
        while (Date.now() <= deadline) {
            const confirmBtn = findDeleteConfirmButton();
            if (confirmBtn) {
                try { confirmBtn.focus({ preventScroll: true }); } catch { }
                try { confirmBtn.focus(); } catch { }
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        return false;
    }

    const conversationMenuActionBase = createGeminiMenuAction({
        actionName: "conversationMenu",
        menuController: conversationMenu,
        defaultItemSelector: CONVERSATION_ITEM_SELECTOR
    });

    const conversationMenuAction = async ({ shortcut, engine }) => {
        const ok = await conversationMenuActionBase({ shortcut, engine });
        if (!ok) return false;
        if (!shortcutLooksLikeDelete(shortcut)) return true;
        await autoFocusDeleteConfirmButton();
        return true;
    };

    const modelPickerMenuAction = createGeminiMenuAction({
        actionName: "modelPicker",
        menuController: modelPickerMenu,
        defaultItemSelector: MODEL_PICKER_ITEM_SELECTOR
    });

    async function modelPickerAction({ shortcut, engine }) {
        const target = getTargetModelKey(shortcut);
        const current = getCurrentModelKey();
        if (target && current && target === current) return true;
        return await modelPickerMenuAction({ shortcut, engine });
    }

    function createGeminiQuickInputAdapter({ idPrefix = "gemini" } = {}) {
        const QuickInput = window.ShortcutTemplate?.quickInput;
        const dom = QuickInput?.dom;

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const focusComposer = dom?.focusComposer;
        const simulateKeystroke = dom?.simulateKeystroke;
        const isElementVisible = dom?.isElementVisible;
        const dispatchPasteEvent = dom?.dispatchPasteEvent;
        const dispatchBeforeInputFromPaste = dom?.dispatchBeforeInputFromPaste;
        const dispatchInputFromPaste = dom?.dispatchInputFromPaste;
        const dispatchDragEvent = dom?.dispatchDragEvent;
        const collectFileInputs = dom?.collectFileInputs;
        const collectFileInputsFromOpenShadows = dom?.collectFileInputsFromOpenShadows;
        const trySetFileInputFiles = dom?.trySetFileInputFiles;

        if (
            typeof focusComposer !== "function" ||
            typeof simulateKeystroke !== "function" ||
            typeof isElementVisible !== "function" ||
            typeof dispatchPasteEvent !== "function" ||
            typeof dispatchBeforeInputFromPaste !== "function" ||
            typeof dispatchInputFromPaste !== "function" ||
            typeof dispatchDragEvent !== "function" ||
            typeof collectFileInputs !== "function" ||
            typeof collectFileInputsFromOpenShadows !== "function" ||
            typeof trySetFileInputFiles !== "function"
        ) {
            return null;
        }

        const overlayId = `${String(idPrefix || "").trim() || "gemini"}-quick-input-overlay`;
        const isInsideOverlayTree = typeof dom?.isInsideOverlayTree === "function"
            ? dom.isInsideOverlayTree
            : (target, targetOverlayId) => {
                if (!target || !targetOverlayId) return false;
                let node = target;
                while (node) {
                    if (node.nodeType === 1) {
                        if (node.id === targetOverlayId) return true;
                        try {
                            if (typeof node.closest === "function" && node.closest(`#${targetOverlayId}`)) return true;
                        } catch {}
                    }
                    let next = null;
                    try { next = node.parentNode || null; } catch {}
                    if (!next && typeof node.getRootNode === "function") {
                        try {
                            const root = node.getRootNode();
                            next = root?.host || null;
                        } catch {}
                    }
                    if (!next || next === node) break;
                    node = next;
                }
                return false;
            };

        function isInsideQuickInputOverlay(el) {
            return isInsideOverlayTree(el, overlayId);
        }

        function findGeminiDropzone(composerEl) {
            try {
                const direct = composerEl?.closest?.("[xapfileselectordropzone]");
                if (direct) return direct;
            } catch { }
            try {
                const near = composerEl?.closest?.(".text-input-field");
                if (near) return near;
            } catch { }

            let zones = [];
            try { zones = Array.from(document.querySelectorAll("[xapfileselectordropzone]")); } catch { zones = []; }
            if (!zones.length) return null;
            if (composerEl) {
                const containing = zones.find(z => z && z.contains(composerEl));
                if (containing) return containing;
            }

            let best = null;
            let bestScore = -Infinity;
            for (const zone of zones) {
                if (!zone) continue;
                if (isInsideQuickInputOverlay(zone)) continue;
                if (!isElementVisible(zone)) continue;
                try {
                    const rect = zone.getBoundingClientRect();
                    const score = rect.bottom / Math.max(1, window.innerHeight);
                    if (score > bestScore) {
                        bestScore = score;
                        best = zone;
                    }
                } catch { }
            }
            return best || zones[0] || null;
        }

        function findGeminiComposerContainer(composerEl) {
            if (!composerEl) return null;
            try {
                const field = composerEl.closest?.(".text-input-field");
                if (field) return field;
            } catch { }
            try {
                const zone = composerEl.closest?.("[xapfileselectordropzone]");
                if (zone) return zone;
            } catch { }
            return findGeminiDropzone(composerEl) || null;
        }

        function getGeminiAttachmentSnapshot(containerEl) {
            const container = containerEl || document;
            const urls = new Set();
            let cancelCount = 0;
            let hasFilePreview = false;
            let imageCount = 0;

            try { hasFilePreview = !!container.classList?.contains?.("with-file-preview"); } catch { }

            try {
                const selector = [
                    "img[data-test-id='image-preview']",
                    "uploader-file-preview img[aria-label='Image preview']"
                ].join(", ");
                const imgs = Array.from(container.querySelectorAll(selector));
                imageCount = imgs.length;
                for (const img of imgs) {
                    if (!img) continue;
                    const src = String(img.getAttribute?.("src") || img.currentSrc || img.src || "").trim();
                    if (!src) continue;
                    urls.add(src);
                }
            } catch { }

            try {
                cancelCount = container.querySelectorAll("button[data-test-id='cancel-button']").length;
            } catch { }

            const attachmentCount = Math.max(imageCount, cancelCount, hasFilePreview ? 1 : 0);
            return { urls, imageCount, cancelCount, hasFilePreview, attachmentCount };
        }

        function hasGeminiAttachmentChange(prev, next) {
            if (!prev || !next) return false;
            if ((next.attachmentCount || 0) > (prev.attachmentCount || 0)) return true;
            if (next.hasFilePreview && !prev.hasFilePreview) return true;
            if (next.cancelCount > prev.cancelCount) return true;
            if (next.imageCount > prev.imageCount) return true;
            for (const url of next.urls) {
                if (!prev.urls.has(url)) return true;
            }
            return false;
        }

        async function waitForGeminiAttachmentChange(containerEl, prevSnapshot, { timeoutMs = 9000, intervalMs = 120, shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() < deadline) {
                if (cancelFn && cancelFn()) {
                    const snapshot = getGeminiAttachmentSnapshot(containerEl);
                    return { ok: false, cancelled: true, snapshot };
                }
                const next = getGeminiAttachmentSnapshot(containerEl);
                if (hasGeminiAttachmentChange(prevSnapshot, next)) return { ok: true, snapshot: next };
                await sleep(intervalMs);
            }
            const final = getGeminiAttachmentSnapshot(containerEl);
            return { ok: hasGeminiAttachmentChange(prevSnapshot, final), snapshot: final };
        }

        function tryAttachImageViaSimulatedPaste(file, composerEl) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            let dt;
            try {
                dt = new DataTransfer();
                dt.items.add(file);
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
            } catch {
                return false;
            }

            const targets = [];
            const dropzone = findGeminiDropzone(composerEl);
            if (dropzone) targets.push(dropzone);
            targets.push(composerEl);
            try {
                const rich = composerEl.closest?.("rich-textarea");
                if (rich) {
                    targets.push(rich);
                    try {
                        const clipboard = rich.querySelector?.(".ql-clipboard");
                        if (clipboard) targets.push(clipboard);
                    } catch { }
                }
            } catch { }
            try {
                const field = composerEl.closest?.(".text-input-field");
                if (field) targets.push(field);
            } catch { }
            try {
                if (document.activeElement) targets.push(document.activeElement);
            } catch { }
            targets.push(document);
            targets.push(window);

            const uniq = [];
            const seen = new Set();
            for (const t of targets) {
                if (!t || seen.has(t)) continue;
                if (isInsideQuickInputOverlay(t)) continue;
                seen.add(t);
                uniq.push(t);
            }

            let fired = false;
            for (const target of uniq) {
                fired = dispatchBeforeInputFromPaste(target, dt) || fired;
                fired = dispatchPasteEvent(target, dt) || fired;
                fired = dispatchInputFromPaste(target, dt) || fired;
            }
            return fired;
        }

        function tryAttachImageViaDropzone(file, composerEl) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            let dt;
            try {
                dt = new DataTransfer();
                dt.items.add(file);
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
            } catch {
                return false;
            }

            const targets = [];
            const dropzone = findGeminiDropzone(composerEl);
            if (dropzone) targets.push(dropzone);
            try {
                const field = composerEl.closest?.(".text-input-field");
                if (field) targets.push(field);
            } catch { }
            targets.push(composerEl);
            targets.push(document);
            targets.push(window);

            const uniq = [];
            const seen = new Set();
            for (const t of targets) {
                if (!t || seen.has(t)) continue;
                if (isInsideQuickInputOverlay(t)) continue;
                seen.add(t);
                uniq.push(t);
            }

            let fired = false;
            for (const target of uniq) {
                fired = dispatchDragEvent(target, "dragenter", dt) || fired;
                fired = dispatchDragEvent(target, "dragover", dt) || fired;
                fired = dispatchDragEvent(target, "drop", dt) || fired;
            }
            return fired;
        }

        function tryAttachImageViaFileInput(file, composerEl, diagnostics) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            const container = findGeminiComposerContainer(composerEl);
            const candidates = [];

            if (container) candidates.push(...collectFileInputs(container, { shouldIgnore: isInsideQuickInputOverlay }));
            candidates.push(...collectFileInputs(document, { shouldIgnore: isInsideQuickInputOverlay }));

            if (candidates.length === 0) {
                if (container) candidates.push(...collectFileInputsFromOpenShadows(container, { maxHosts: 1200, shouldIgnore: isInsideQuickInputOverlay }));
                candidates.push(...collectFileInputsFromOpenShadows(document, { maxHosts: 3500, shouldIgnore: isInsideQuickInputOverlay }));
            }

            const uniq = [];
            const seen = new Set();
            for (const input of candidates) {
                if (!input || seen.has(input)) continue;
                seen.add(input);
                if (isInsideQuickInputOverlay(input)) continue;
                uniq.push(input);
            }

            if (diagnostics && typeof diagnostics === "object") diagnostics.fileInputCandidates = uniq.length;

            const accepted = [];
            const fallback = [];
            for (const input of uniq) {
                const accept = String(input.getAttribute?.("accept") || input.accept || "").toLowerCase();
                if (!accept || accept.includes("image") || accept.includes(".png") || accept.includes(".jpg") || accept.includes(".jpeg") || accept.includes(".webp")) {
                    accepted.push(input);
                } else {
                    fallback.push(input);
                }
            }

            for (const input of [...accepted, ...fallback]) {
                if (trySetFileInputFiles(input, file)) return true;
            }

            return false;
        }

        async function attachImageToComposer(file, composerEl, { onDiagnostics, shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;

            if (!file || !(file instanceof File)) return { ok: false, cancelled: false };
            if (!String(file.type || "").startsWith("image/")) return { ok: false, cancelled: false };
            if (cancelFn && cancelFn()) return { ok: false, cancelled: true };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay }));
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };
            const container = findGeminiComposerContainer(composer);
            if (!container) return { ok: false, cancelled: false };

            const diagnostics = {
                attempts: { paste: 0, drop: 0, fileInput: 0 },
                fired: { paste: 0, drop: 0, fileInput: 0 },
                fileInputCandidates: 0,
                finalSnapshot: null
            };

            const maxAttempts = 3;
            let prev = getGeminiAttachmentSnapshot(container);

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                if (cancelFn && cancelFn()) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                diagnostics.attempts.paste += 1;
                if (attempt > 0) await sleep(180);
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                await sleep(30);

                const fired = tryAttachImageViaSimulatedPaste(file, composer);
                if (fired) diagnostics.fired.paste += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, { timeoutMs: 9000, intervalMs: 120, shouldCancel: cancelFn });
                if (cancelled) {
                    diagnostics.finalSnapshot = snapshot;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                if (ok) return { ok: true, cancelled: false };
                prev = snapshot;
            }

            for (let attempt = 0; attempt < 2; attempt++) {
                if (cancelFn && cancelFn()) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                diagnostics.attempts.drop += 1;
                await sleep(220);
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                await sleep(30);

                const fired = tryAttachImageViaDropzone(file, composer);
                if (fired) diagnostics.fired.drop += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, { timeoutMs: 9000, intervalMs: 120, shouldCancel: cancelFn });
                if (cancelled) {
                    diagnostics.finalSnapshot = snapshot;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                if (ok) return { ok: true, cancelled: false };
                prev = snapshot;
            }

            for (let attempt = 0; attempt < 2; attempt++) {
                if (cancelFn && cancelFn()) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                diagnostics.attempts.fileInput += 1;
                await sleep(220);
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                await sleep(30);

                const fired = tryAttachImageViaFileInput(file, composer, diagnostics);
                if (fired) diagnostics.fired.fileInput += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, { timeoutMs: 9000, intervalMs: 120, shouldCancel: cancelFn });
                if (cancelled) {
                    diagnostics.finalSnapshot = snapshot;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                if (ok) return { ok: true, cancelled: false };
                prev = snapshot;
            }

            diagnostics.finalSnapshot = prev;
            if (typeof onDiagnostics === "function") {
                try { onDiagnostics(diagnostics); } catch { }
            }
            return { ok: false, cancelled: false };
        }

        async function attachImagesToComposer(files, composerEl, { onDiagnostics, shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const list = Array.from(files || []).filter(file => file && (file instanceof File) && String(file.type || "").startsWith("image/"));
            if (list.length === 0) return { ok: false, cancelled: false, message: "未检测到图片文件。" };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay }));
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };

            for (let i = 0; i < list.length; i++) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
                const file = list[i];
                const result = await attachImageToComposer(file, composer, {
                    onDiagnostics: (diag) => {
                        if (typeof onDiagnostics !== "function") return;
                        try {
                            onDiagnostics({
                                fileIndex: i,
                                fileName: file?.name || "",
                                fileSize: Number(file?.size) || 0,
                                ...diag
                            });
                        } catch { }
                    },
                    shouldCancel: cancelFn
                });
                if (result?.cancelled) return { ok: false, cancelled: true };
                if (!result?.ok) return { ok: false, cancelled: false, message: "图片粘贴失败：未检测到输入框内出现图片预览。" };
                await sleep(120);
            }

            return { ok: true, cancelled: false };
        }

        function findSendButtonNearComposer(composerEl) {
            const candidates = [];
            const scopes = [];
            try {
                const form = composerEl?.closest?.("form");
                if (form) scopes.push(form);
            } catch { }
            scopes.push(document);

            const selectors = [
                "button[type='submit']",
                "button[aria-label*='Send']",
                "button[aria-label*='发送']",
                "button[data-test-id*='send']"
            ];

            for (const scope of scopes) {
                for (const sel of selectors) {
                    try {
                        candidates.push(...Array.from(scope.querySelectorAll(sel)));
                    } catch { }
                }
            }

            for (const btn of candidates) {
                if (!btn) continue;
                if (!isElementVisible(btn)) continue;
                if (isInsideQuickInputOverlay(btn)) continue;
                return btn;
            }
            return null;
        }

        function isAriaDisabled(el) {
            if (!el || typeof el.getAttribute !== "function") return false;
            const value = String(el.getAttribute("aria-disabled") || "").trim().toLowerCase();
            return value === "true";
        }

        function isGeminiSendButtonDisabled(btn) {
            if (!btn) return true;
            if (btn.disabled) return true;
            if (isAriaDisabled(btn)) return true;
            return false;
        }

        function getGeminiAttachmentFingerprint(snapshot) {
            if (!snapshot) return "";
            const urls = Array.from(snapshot.urls || []).slice(0, 6).sort().join("|");
            return `${snapshot.attachmentCount || 0};${snapshot.hasFilePreview ? 1 : 0};${snapshot.cancelCount || 0};${snapshot.imageCount || 0};${urls}`;
        }

        function hasGeminiUploadInProgress(containerEl) {
            const container = containerEl || document;
            let scope = container;
            try { scope = container.querySelector?.(".file-preview-wrapper") || container; } catch { }

            const selectors = [
                "[aria-busy='true']",
                "[role='progressbar']",
                "mat-progress-spinner",
                "mat-mdc-progress-spinner",
                ".mat-progress-spinner",
                ".mat-mdc-progress-spinner",
                "mat-progress-bar",
                "mat-mdc-progress-bar",
                ".mat-progress-bar",
                ".mat-mdc-progress-bar",
                "progress"
            ].join(", ");

            try { return !!scope.querySelector(selectors); } catch { return false; }
        }

        async function waitForGeminiReadyToSend(composerEl, { requireImage = false, minAttachments = 0, timeoutMs = 45000, intervalMs = 160, settleMs = 600, shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay }));
            if (!composer) return { ok: false, reason: "no-composer", cancelled: !!(cancelFn && cancelFn()) };

            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            const settle = Math.max(0, Number(settleMs) || 0);
            let stableSince = Date.now();
            let lastStateKey = "";

            while (Date.now() < deadline) {
                if (cancelFn && cancelFn()) {
                    const container = findGeminiComposerContainer(composer);
                    const snapshot = container ? getGeminiAttachmentSnapshot(container) : null;
                    return { ok: false, reason: "cancelled", cancelled: true, snapshot };
                }
                const container = findGeminiComposerContainer(composer);
                const snapshot = container ? getGeminiAttachmentSnapshot(container) : null;
                const sendBtn = findSendButtonNearComposer(composer);
                const sendReady = sendBtn && !isGeminiSendButtonDisabled(sendBtn);

                const attachmentCount = snapshot ? (snapshot.attachmentCount || 0) : 0;
                const hasImage = !!(snapshot && (snapshot.hasFilePreview || snapshot.imageCount > 0 || snapshot.cancelCount > 0));
                const hasEnoughAttachments = !requireImage || !(Number(minAttachments) > 0) || attachmentCount >= Number(minAttachments);
                const uploadBusy = requireImage && container ? hasGeminiUploadInProgress(container) : false;

                const fingerprint = getGeminiAttachmentFingerprint(snapshot);
                const stateKey = `${fingerprint};send=${sendReady ? 1 : 0};busy=${uploadBusy ? 1 : 0};img=${hasImage ? 1 : 0};count=${attachmentCount};min=${Number(minAttachments) || 0}`;
                if (stateKey !== lastStateKey) {
                    lastStateKey = stateKey;
                    stableSince = Date.now();
                }

                const okNow = sendReady && (!requireImage || (hasImage && hasEnoughAttachments && !uploadBusy));
                if (okNow && (Date.now() - stableSince >= settle)) {
                    return { ok: true, button: sendBtn, snapshot };
                }

                await sleep(intervalMs);
            }

            const container = findGeminiComposerContainer(composer);
            const snapshot = container ? getGeminiAttachmentSnapshot(container) : null;
            const sendBtn = findSendButtonNearComposer(composer);
            const sendReady = sendBtn && !isGeminiSendButtonDisabled(sendBtn);
            const attachmentCount = snapshot ? (snapshot.attachmentCount || 0) : 0;
            const hasImage = !!(snapshot && (snapshot.hasFilePreview || snapshot.imageCount > 0 || snapshot.cancelCount > 0));
            const hasEnoughAttachments = !requireImage || !(Number(minAttachments) > 0) || attachmentCount >= Number(minAttachments);
            const uploadBusy = requireImage && container ? hasGeminiUploadInProgress(container) : false;
            const ok = sendReady && (!requireImage || (hasImage && hasEnoughAttachments && !uploadBusy));

            return { ok, button: sendBtn, snapshot, reason: ok ? "ok" : "timeout", cancelled: false };
        }

        async function sendGeminiMessage(composerEl) {
            const composer = composerEl || (await focusComposer({ shouldIgnore: isInsideQuickInputOverlay }));
            if (!composer) return false;

            const btn = findSendButtonNearComposer(composer);
            if (btn) {
                if (isGeminiSendButtonDisabled(btn)) return false;
                try {
                    return !!TemplateUtils?.events?.simulateClick?.(btn, { nativeFallback: true });
                } catch { }
                try { btn.click(); return true; } catch { }
                return false;
            }

            return simulateKeystroke("ENTER", { target: composer });
        }

        return Object.freeze({
            attachImages: attachImagesToComposer,
            waitForReadyToSend: waitForGeminiReadyToSend,
            sendMessage: sendGeminiMessage
        });
    }

    let quickInputController = null;

    function ensureQuickInputController(engine) {
        if (quickInputController) return quickInputController;
        const QuickInput = window.ShortcutTemplate?.quickInput;
        if (!QuickInput || typeof QuickInput.createController !== "function") {
            console.error("[Gemini Shortcut] Template quickInput module not found (update Template core).");
            return null;
        }
        const adapter = createGeminiQuickInputAdapter({ idPrefix: "gemini" });
        if (!adapter) {
            console.error("[Gemini Shortcut] Gemini quickInput adapter init failed (update Template core).");
            return null;
        }
        quickInputController = QuickInput.createController({
            engine,
            idPrefix: "gemini",
            storageKey: QUICK_INPUT_STORAGE_KEY,
            title: "Gemini - 快捷输入",
            primaryColor: "#4285F4",
            themeMode: "system",
            adapter
        });
        return quickInputController;
    }

    const CUSTOM_ACTIONS = {
        toolsDrawer: toolsDrawerMenuAction,
        conversationMenu: conversationMenuAction,
        modelPicker: modelPickerAction,
        quickInput: ({ engine }) => {
            ensureQuickInputController(engine)?.open?.();
        }
    };

    function formatMenuDataAdapter(data) {
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
    }

    function parseMenuDataAdapter(text) {
        const trimmed = String(text ?? "").trim();
        if (!trimmed) return {};
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            const parsed = JSON.parse(trimmed);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
            return parsed;
        }
        return { menu: trimmed };
    }

    function createMenuDataAdapter({ label, placeholder } = {}) {
        return {
            label,
            placeholder,
            format: formatMenuDataAdapter,
            parse: parseMenuDataAdapter
        };
    }

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
            toolsDrawer: createMenuDataAdapter({
                label: "菜单关键词（或粘贴 JSON，高级用法）:",
                placeholder: "例如: Canvas / Learning / Research"
            }),
            conversationMenu: createMenuDataAdapter({
                label: "菜单关键词（或粘贴 JSON，高级用法）:",
                placeholder: "例如: Pin / Delete"
            }),
            modelPicker: createMenuDataAdapter({
                label: "模型关键词（或粘贴 JSON，高级用法）:",
                placeholder: "例如: Pro / Thinking / Fast"
            })
        },
        colors: {
            primary: "#4285F4"
        },
        consoleTag: LOG_TAG,
        shouldBypassIconCache: (url) => {
            return url && url.startsWith("https://gemini.google.com/");
        }
    });

    if (typeof GM_registerMenuCommand === "function") {
        GM_registerMenuCommand("Gemini - 快捷输入", () => {
            ensureQuickInputController(engine)?.open?.();
        });
    }

    engine.init();
    setupKeepSidebarVisible();
    registerSidebarVisibilityMenuCommand();
})();
