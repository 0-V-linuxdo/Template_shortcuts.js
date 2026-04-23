/* -------------------------------------------------------------------------- *
 * Site Entry · [Gemini] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    function gmGetValueLocal(key, fallback) {
        if (typeof GM_getValue !== "function") return fallback;
        try {
            const value = GM_getValue(key, fallback);
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        if (typeof GM_setValue !== "function") return;
        try {
            GM_setValue(key, value);
        } catch { }
    }

    function gmRegisterMenuCommandLocal(label, handler) {
        if (typeof GM_registerMenuCommand !== "function") return null;
        try {
            return GM_registerMenuCommand(label, handler);
        } catch {
            return null;
        }
    }

    function gmUnregisterMenuCommandLocal(commandId) {
        if (typeof GM_unregisterMenuCommand !== "function") return;
        try {
            GM_unregisterMenuCommand(commandId);
        } catch { }
    }

    function getLocalStorageLocal() {
        try {
            return globalThis.localStorage || null;
        } catch {
            return null;
        }
    }

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
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
        topBarConversationActionsButton: [
            "top-bar-actions conversation-actions-icon button[data-test-id='conversation-actions-menu-icon-button']",
            "top-bar-actions button[data-test-id='conversation-actions-menu-icon-button']"
        ].join(", "),
        topBarConversationMenuRoot: [
            ".cdk-overlay-pane .mat-mdc-menu-panel[role='menu']",
            ".cdk-overlay-pane .mat-menu-panel[role='menu']",
            ".mat-mdc-menu-panel[role='menu']",
            ".mat-menu-panel[role='menu']"
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
    const GEMINI_NATIVE_NEW_CHAT_HOTKEY = "CMD+SHIFT+O";
    const GEMINI_NATIVE_NEW_CHAT_LABEL = `${GEMINI_NATIVE_NEW_CHAT_HOTKEY} (原生)`;

    const QUICK_INPUT_STORAGE_KEY = "gemini_quick_input_v1";
    const SIDEBAR_VISIBILITY_STORAGE_KEY = "gemini_keep_sidebar_visible_v1";
    const DEFAULT_KEEP_SIDEBAR_VISIBLE = true;
    const SIDEBAR_AUTO_EXPAND_MAX_VIEWPORT_WIDTH = 1024;
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
        createShortcut({ name: "New Chat", actionType: "simulate", simulateKeys: GEMINI_NATIVE_NEW_CHAT_HOTKEY, hotkey: "CTRL+N" }),
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

    const TemplateUtils = ShortcutTemplate.utils;
    if (!TemplateUtils?.menu?.createMenuController) {
        console.error('[Gemini Shortcut] Template utils.menu not found (update Template core).');
        return;
    }

    function getLocalBooleanFallback(key, fallback) {
        const storage = getLocalStorageLocal();
        const k = String(key ?? "").trim();
        if (!storage || !k) return fallback;
        try {
            const raw = storage.getItem(k);
            if (raw == null) return fallback;
            if (raw === "true" || raw === "1") return true;
            if (raw === "false" || raw === "0") return false;
            const parsed = JSON.parse(raw);
            if (typeof parsed === "boolean") return parsed;
        } catch { }
        return fallback;
    }

    function setLocalBooleanFallback(key, value) {
        const storage = getLocalStorageLocal();
        const k = String(key ?? "").trim();
        if (!storage || !k) return;
        try {
            storage.setItem(k, JSON.stringify(!!value));
        } catch { }
    }

    function getKeepSidebarVisibleSetting() {
        const localFallback = getLocalBooleanFallback(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
        if (typeof GM_getValue !== "function") return localFallback;
        try {
            const value = GM_getValue(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
            if (value && typeof value.then === "function") return localFallback;
            return value === true || value === "true";
        } catch { }
        return localFallback;
    }

    function setKeepSidebarVisibleSetting(value) {
        try {
            gmSetValueLocal(SIDEBAR_VISIBILITY_STORAGE_KEY, !!value);
        } catch { }
        setLocalBooleanFallback(SIDEBAR_VISIBILITY_STORAGE_KEY, !!value);
    }

    function getSidebarVisibilityMenuLabel() {
        return `Gemini - 保持侧边栏显示: ${keepSidebarVisible ? "开" : "关"}`;
    }

    function registerSidebarVisibilityMenuCommand() {
        if (sidebarVisibilityMenuCommandId !== null) {
            try {
                gmUnregisterMenuCommandLocal(sidebarVisibilityMenuCommandId);
            } catch { }
        }

        sidebarVisibilityMenuCommandId = gmRegisterMenuCommandLocal(getSidebarVisibilityMenuLabel(), () => {
            setSidebarVisibilityPreference(!keepSidebarVisible);
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

    function getViewportWidth() {
        const width = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 0;
        return width > 0 ? width : 0;
    }

    function isSidebarAutoExpandSuppressedByViewport() {
        const width = getViewportWidth();
        return width > 0 && width <= SIDEBAR_AUTO_EXPAND_MAX_VIEWPORT_WIDTH;
    }

    function shouldWarmupSidebarInBackground() {
        return keepSidebarVisible && !isSidebarAutoExpandSuppressedByViewport();
    }

    function ensureSidebarVisible() {
        if (!keepSidebarVisible) return false;
        const open = isSidebarOpen();
        if (open === true) return true;
        return clickSidebarToggleButton();
    }

    function setSidebarVisibilityPreference(nextValue) {
        keepSidebarVisible = !!nextValue;
        setKeepSidebarVisibleSetting(keepSidebarVisible);
        if (keepSidebarVisible) {
            if (shouldWarmupSidebarInBackground()) {
                startSidebarWarmup();
            } else {
                stopSidebarWarmup();
            }
        } else {
            stopSidebarWarmup();
        }

        console.info(`${LOG_TAG} 保持侧边栏显示已${keepSidebarVisible ? "启用" : "关闭"}。`);
        registerSidebarVisibilityMenuCommand();
        return keepSidebarVisible;
    }

    function stopSidebarWarmup() {
        if (sidebarWarmupTimer === null) return;
        try { clearInterval(sidebarWarmupTimer); } catch { }
        sidebarWarmupTimer = null;
    }

    function startSidebarWarmup({ attempts = 20, intervalMs = 500 } = {}) {
        stopSidebarWarmup();
        if (!shouldWarmupSidebarInBackground()) return;
        let remaining = Math.max(1, Number(attempts) || 1);
        const interval = Math.max(150, Number(intervalMs) || 500);

        const tick = () => {
            if (!shouldWarmupSidebarInBackground()) {
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
        let wasSidebarAutoExpandSuppressed = isSidebarAutoExpandSuppressedByViewport();

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

        window.addEventListener("resize", () => {
            const suppressed = isSidebarAutoExpandSuppressedByViewport();
            if (suppressed === wasSidebarAutoExpandSuppressed) return;

            wasSidebarAutoExpandSuppressed = suppressed;
            if (suppressed) {
                stopSidebarWarmup();
                return;
            }

            if (keepSidebarVisible) startSidebarWarmup();
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

    const topBarConversationMenuBase = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: SELECTORS.topBarConversationActionsButton
        },
        root: {
            type: "selector",
            selector: SELECTORS.topBarConversationMenuRoot,
            pick: "last"
        },
        timing: MENU_TIMING
    });

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const GEMINI_CONVERSATION_LINK_SELECTOR = "a[data-test-id='conversation']";
    const GEMINI_CONVERSATION_CONTAINER_SELECTOR = ".conversation-items-container";
    const GEMINI_CONVERSATION_ACTION_BUTTON_SELECTOR = [
        "button[data-test-id='actions-menu-button']",
        "button[data-test-id='conversation-actions-menu-icon-button']"
    ].join(", ");

    function normalizePathname(value) {
        if (value === undefined || value === null || value === "") return "";
        try {
            const url = new URL(String(value), location.origin);
            const normalized = String(url.pathname || "").replace(/\/+$/, "");
            return normalized || "/";
        } catch {
            return "";
        }
    }

    function normalizeGeminiConversationPathname(value) {
        const pathname = normalizePathname(value);
        const match = pathname.match(/^\/app\/([^/?#]+)/);
        return match ? `/app/${match[1]}` : "";
    }

    function getCurrentGeminiConversationPathname() {
        try {
            return normalizeGeminiConversationPathname(location.href);
        } catch {
            return "";
        }
    }

    function getConversationMenuButton(container) {
        if (!container || typeof container.querySelectorAll !== "function") return null;
        let buttons = [];
        try {
            buttons = Array.from(container.querySelectorAll(GEMINI_CONVERSATION_ACTION_BUTTON_SELECTOR));
        } catch {
            return null;
        }
        for (const button of buttons) {
            if (isElementVisible(button)) return button;
        }
        return buttons[0] || null;
    }

    function isConversationEntryVisible(entry) {
        if (!entry) return false;
        return !!(
            isElementVisible(entry.button) ||
            isElementVisible(entry.link) ||
            isElementVisible(entry.container)
        );
    }

    function isConversationMenuButtonUsable(button) {
        return !!button && isElementVisible(button);
    }

    function getStringAttr(node, attrName) {
        if (!node || !attrName) return "";
        try {
            return String(node.getAttribute?.(attrName) || "").trim();
        } catch {
            return "";
        }
    }

    function hasTruthyCurrentAttr(node) {
        if (!node) return false;

        const ariaCurrent = getStringAttr(node, "aria-current").toLowerCase();
        if (ariaCurrent && ariaCurrent !== "false") return true;

        const ariaSelected = getStringAttr(node, "aria-selected").toLowerCase();
        if (ariaSelected === "true") return true;

        const dataSelected = getStringAttr(node, "data-selected").toLowerCase();
        if (dataSelected === "true") return true;

        const dataActive = getStringAttr(node, "data-active").toLowerCase();
        if (dataActive === "true" || dataActive === "1") return true;

        const dataCurrent = getStringAttr(node, "data-current").toLowerCase();
        if (dataCurrent === "true" || dataCurrent === "1") return true;

        const dataState = getStringAttr(node, "data-state").toLowerCase();
        if (dataState === "active" || dataState === "selected" || dataState === "current") return true;

        return false;
    }

    function hasCurrentLikeClass(node) {
        if (!node) return false;
        const className = String(node.className || "").trim();
        if (!className) return false;
        return /(?:^|[\s_-])(active|selected|current)(?:$|[\s_-])/i.test(className);
    }

    function hasExplicitCurrentConversationState(entry) {
        if (!entry) return false;
        const nodes = [entry.link, entry.container, entry.button];
        for (const node of nodes) {
            if (!node) continue;
            if (hasTruthyCurrentAttr(node)) return true;
            if (hasCurrentLikeClass(node)) return true;
        }
        return false;
    }

    function parseGeminiConversationJslogMeta(link) {
        if (!link) return null;
        const raw = getStringAttr(link, "jslog");
        if (!raw || !raw.includes("BardVeMetadataKey:")) return null;

        const decoded = raw.replace(/&quot;/g, "\"");
        const marker = "BardVeMetadataKey:";
        const markerIndex = decoded.indexOf(marker);
        if (markerIndex < 0) return null;

        const tail = decoded.slice(markerIndex + marker.length);
        const innerOpen = tail.lastIndexOf("[");
        if (innerOpen < 0) return null;

        const innerClose = tail.indexOf("]", innerOpen);
        if (innerClose < 0) return null;

        const tokens = tail
            .slice(innerOpen + 1, innerClose)
            .split(",")
            .map(part => String(part || "").trim())
            .filter(Boolean);

        if (tokens.length < 3) return null;

        const conversationToken = tokens[0].replace(/^["']|["']$/g, "");
        const conversationId = conversationToken.startsWith("c_")
            ? conversationToken.slice(2)
            : conversationToken;

        return {
            conversationId,
            tokens,
            isCurrent: tokens.length === 3 && tokens[2] === "1"
        };
    }

    function hasJslogCurrentConversationState(entry) {
        return !!entry?.jslogMeta?.isCurrent;
    }

    function collectGeminiConversationEntries() {
        let links = [];
        try {
            links = Array.from(document.querySelectorAll(GEMINI_CONVERSATION_LINK_SELECTOR));
        } catch {
            return [];
        }

        return links
            .map((link) => {
                const container = link.closest?.(GEMINI_CONVERSATION_CONTAINER_SELECTOR) || null;
                const button = getConversationMenuButton(container);
                const pathname = normalizeGeminiConversationPathname(link.getAttribute?.("href") || link.href || "");
                const jslogMeta = parseGeminiConversationJslogMeta(link);

                return {
                    link,
                    container,
                    button,
                    pathname,
                    jslogMeta
                };
            })
            .filter(entry => !!entry.link && !!entry.container);
    }

    function resolveUniqueUsableConversationEntry(entries, predicate) {
        const matched = entries.filter(predicate);
        if (matched.length !== 1) return null;
        return isConversationMenuButtonUsable(matched[0].button) ? matched[0] : null;
    }

    function resolveCurrentConversationMenuTarget() {
        const entries = collectGeminiConversationEntries();
        const visibleEntries = entries.filter(isConversationEntryVisible);
        const pool = visibleEntries.length ? visibleEntries : entries;
        const currentPathname = getCurrentGeminiConversationPathname();

        if (!currentPathname) {
            return {
                entry: null,
                reason: "noCurrentConversationPath",
                currentPathname,
                entriesCount: pool.length
            };
        }

        const pathMatches = pool.filter(entry => entry.pathname === currentPathname);
        if (pathMatches.length === 1) {
            return isConversationMenuButtonUsable(pathMatches[0].button)
                ? {
                    entry: pathMatches[0],
                    reason: "",
                    matchSource: "url",
                    currentPathname,
                    entriesCount: pool.length
                }
                : {
                    entry: null,
                    reason: "matchedUrlButButtonHidden",
                    currentPathname,
                    entriesCount: pool.length
                };
        }
        if (pathMatches.length > 1) {
            return {
                entry: null,
                reason: "multipleUrlMatches",
                currentPathname,
                entriesCount: pool.length
            };
        }

        const explicitEntry = resolveUniqueUsableConversationEntry(pool, hasExplicitCurrentConversationState);
        if (explicitEntry) {
            return {
                entry: explicitEntry,
                reason: "",
                matchSource: "explicitCurrent",
                currentPathname,
                entriesCount: pool.length
            };
        }

        const explicitMatchesCount = pool.filter(hasExplicitCurrentConversationState).length;
        if (explicitMatchesCount > 1) {
            return {
                entry: null,
                reason: "multipleExplicitCurrentMatches",
                currentPathname,
                entriesCount: pool.length
            };
        }

        const jslogEntry = resolveUniqueUsableConversationEntry(pool, hasJslogCurrentConversationState);
        if (jslogEntry) {
            return {
                entry: jslogEntry,
                reason: "",
                matchSource: "jslogCurrent",
                currentPathname,
                entriesCount: pool.length
            };
        }

        const jslogMatchesCount = pool.filter(hasJslogCurrentConversationState).length;
        if (jslogMatchesCount > 1) {
            return {
                entry: null,
                reason: "multipleJslogCurrentMatches",
                currentPathname,
                entriesCount: pool.length
            };
        }

        return {
            entry: null,
            reason: "noCurrentConversationEntry",
            currentPathname,
            entriesCount: pool.length
        };
    }

    async function waitForCurrentConversationMenuTarget({ timeoutMs = MENU_TIMING.waitTimeoutMs, intervalMs = MENU_TIMING.pollIntervalMs } = {}) {
        const timeout = Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(30, Number(intervalMs) || 30);
        const deadline = Date.now() + timeout;
        let lastResult = resolveCurrentConversationMenuTarget();

        if (!lastResult?.currentPathname) return lastResult;

        while (Date.now() <= deadline) {
            ensureSidebarVisible();
            const result = resolveCurrentConversationMenuTarget();
            if (result?.entry?.button) return result;
            lastResult = result;
            await sleep(interval);
        }

        return lastResult;
    }

    function getConversationMenuRootElementFromEntry(entry) {
        const button = entry?.button;
        if (!button) return null;

        const expanded = getStringAttr(button, "aria-expanded").toLowerCase();
        if (expanded && expanded !== "true") return null;

        const controlsId = getStringAttr(button, "aria-controls");
        if (!controlsId) return null;

        let menu = null;
        try {
            menu = document.getElementById(controlsId);
        } catch {
            menu = null;
        }
        if (!menu || !isElementVisible(menu)) return null;
        return menu;
    }

    function logConversationMenuTargetAbort(result) {
        const reason = String(result?.reason || "").trim();
        const currentPathname = String(result?.currentPathname || "").trim() || "/app";

        switch (reason) {
            case "noCurrentConversationPath":
                console.warn(`[Gemini Shortcut] conversationMenu: 未找到当前对话项，已中止操作。当前页面不是已保存对话: ${currentPathname}`);
                return;
            case "matchedUrlButButtonHidden":
                console.warn(`[Gemini Shortcut] conversationMenu: 已定位当前对话，但三个点按钮暂不可用，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "multipleUrlMatches":
                console.warn(`[Gemini Shortcut] conversationMenu: 当前对话匹配到多个侧边栏项，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "multipleExplicitCurrentMatches":
                console.warn(`[Gemini Shortcut] conversationMenu: 检测到多个高亮对话项，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "multipleJslogCurrentMatches":
                console.warn(`[Gemini Shortcut] conversationMenu: 检测到多个当前对话候选，已中止操作。当前对话: ${currentPathname}`);
                return;
            default:
                console.warn(`[Gemini Shortcut] conversationMenu: 未找到当前对话项，已中止操作。当前对话: ${currentPathname}`);
        }
    }

    function simulateGeminiMenuClick(target) {
        if (!target) return false;
        try {
            if (TemplateUtils?.events?.simulateClick?.(target, { nativeFallback: true })) return true;
        } catch { }
        try {
            target.click?.();
            return true;
        } catch {
            return false;
        }
    }

    function resolveSelectorListFromSpec(ctx, spec) {
        if (!spec) return [];
        if (Array.isArray(spec)) {
            return spec.flatMap(item => resolveSelectorListFromSpec(ctx, item));
        }
        if (typeof spec === "string") {
            const trimmed = spec.trim();
            return trimmed ? [trimmed] : [];
        }
        if (typeof spec === "object") {
            if (Array.isArray(spec.selectors)) return resolveSelectorListFromSpec(ctx, spec.selectors);

            const fromId = typeof spec.fromShortcutId === "string" ? spec.fromShortcutId : "";
            const fromKey = typeof spec.fromShortcutKey === "string" ? spec.fromShortcutKey : "";
            const fromName = typeof spec.fromShortcutName === "string" ? spec.fromShortcutName : "";
            const field = typeof spec.field === "string" ? spec.field : "selector";
            const fallback = typeof spec.fallback === "string"
                ? spec.fallback
                : (typeof spec.selector === "string" ? spec.selector : "");

            let selector = fallback;
            const resolveShortcutField = TemplateUtils?.shortcuts?.resolveShortcutField;
            if ((fromId || fromKey || fromName) && typeof resolveShortcutField === "function") {
                selector = resolveShortcutField(ctx?.engine, { id: fromId, key: fromKey, name: fromName }, field, fallback);
            }

            const trimmed = String(selector || "").trim();
            return trimmed ? [trimmed] : [];
        }
        return [];
    }

    function findMenuItemInRoot(rootEl, selector, { textMatch = null, normalize, fallbackToFirst = false } = {}) {
        const findFirst = TemplateUtils?.dom?.findFirst;
        if (typeof findFirst === "function") {
            return findFirst(rootEl, selector, { textMatch, normalize, fallbackToFirst });
        }

        let all = [];
        try {
            all = Array.from(rootEl.querySelectorAll(selector));
        } catch {
            return null;
        }

        const visible = all.filter(isElementVisible);
        const candidates = visible.length ? visible : all;
        if (candidates.length === 0) return null;

        if (!textMatch) return candidates[0] || null;

        const normalizeText = (typeof normalize === "function")
            ? normalize
            : (value) => String(value ?? "").trim().toLowerCase();
        const matchText = TemplateUtils?.dom?.matchText;

        if (textMatch) {
            for (const el of candidates) {
                const text = String(el?.textContent || "");
                const matched = (typeof matchText === "function")
                    ? matchText(text, textMatch, { normalize: normalizeText, element: el })
                    : normalizeText(text).includes(normalizeText(textMatch));
                if (matched) return el;
            }
        }

        if (!fallbackToFirst) return null;
        return candidates[0] || null;
    }

    const topBarConversationMenu = Object.freeze({
        timing: MENU_TIMING,
        submenus: Object.freeze({}),
        getTriggerElement(ctx) {
            return topBarConversationMenuBase.getTriggerElement(ctx) || null;
        },
        activateTrigger(ctx) {
            return !!topBarConversationMenuBase.activateTrigger(ctx);
        },
        getRootElement(ctx) {
            const trigger = this.getTriggerElement(ctx);
            if (!trigger || !isElementVisible(trigger)) return null;

            const expanded = String(trigger.getAttribute?.("aria-expanded") || "").trim().toLowerCase();
            if (expanded !== "true") return null;

            const root = topBarConversationMenuBase.getRootElement(ctx);
            return (root && isElementVisible(root)) ? root : null;
        },
        isOpen(ctx) {
            return !!this.getRootElement(ctx);
        },
        getOpenMenuRoots(ctx) {
            const root = this.getRootElement(ctx);
            return root ? [root] : [];
        },
        async ensureOpen(ctx, opts = {}) {
            const timeoutMs = opts.timeoutMs ?? MENU_TIMING.waitTimeoutMs;
            const intervalMs = opts.intervalMs ?? MENU_TIMING.pollIntervalMs;
            const openDelayMs = opts.openDelayMs ?? MENU_TIMING.openDelayMs;

            if (this.isOpen(ctx)) return true;

            const trigger = this.getTriggerElement(ctx);
            if (!trigger || !isElementVisible(trigger)) return false;
            if (!this.activateTrigger(ctx)) return false;
            if (openDelayMs > 0) await sleep(openDelayMs);

            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (this.isOpen(ctx)) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }

            return this.isOpen(ctx);
        },
        async ensureSubmenuOpen() {
            return false;
        },
        async clickInOpenMenus(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = false
        } = {}) {
            const selectorList = resolveSelectorListFromSpec(ctx, selector);
            if (selectorList.length === 0) return false;

            const tryClickOnce = () => {
                const rootEl = this.getRootElement(ctx);
                if (!rootEl) return false;

                for (const sel of selectorList) {
                    const item = findMenuItemInRoot(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                    if (item && simulateGeminiMenuClick(item)) return true;
                }
                return false;
            };

            if (!waitForItem) return tryClickOnce();

            const timeoutMs = MENU_TIMING.waitTimeoutMs ?? 3000;
            const intervalMs = MENU_TIMING.pollIntervalMs ?? 120;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (tryClickOnce()) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }
            return tryClickOnce();
        },
        async oneStepClick(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = true
        } = {}) {
            if (!selector) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!await this.ensureOpen(ctx)) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!waitForItem) return false;
            return await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
        }
    });

    const conversationMenu = Object.freeze({
        timing: MENU_TIMING,
        submenus: Object.freeze({}),
        getTriggerElement() {
            return resolveCurrentConversationMenuTarget()?.entry?.button || null;
        },
        activateTrigger() {
            return simulateGeminiMenuClick(this.getTriggerElement());
        },
        getRootElement() {
            const entry = resolveCurrentConversationMenuTarget()?.entry || null;
            return entry ? getConversationMenuRootElementFromEntry(entry) : null;
        },
        isOpen() {
            return !!this.getRootElement();
        },
        getOpenMenuRoots() {
            const root = this.getRootElement();
            return root ? [root] : [];
        },
        async ensureOpen(ctx, opts = {}) {
            const timeoutMs = opts.timeoutMs ?? MENU_TIMING.waitTimeoutMs;
            const intervalMs = opts.intervalMs ?? MENU_TIMING.pollIntervalMs;
            const openDelayMs = opts.openDelayMs ?? MENU_TIMING.openDelayMs;

            const target = await waitForCurrentConversationMenuTarget({ timeoutMs, intervalMs });
            const entry = target?.entry || null;
            if (!entry?.button) {
                logConversationMenuTargetAbort(target);
                return false;
            }

            const getActiveRoot = () => {
                const latest = resolveCurrentConversationMenuTarget();
                return latest?.entry
                    ? getConversationMenuRootElementFromEntry(latest.entry)
                    : getConversationMenuRootElementFromEntry(entry);
            };

            const existingRoot = getActiveRoot();
            if (existingRoot) return true;

            if (!simulateGeminiMenuClick(entry.button)) return false;
            if (openDelayMs > 0) await sleep(openDelayMs);

            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (getActiveRoot()) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }

            return !!getActiveRoot();
        },
        async ensureSubmenuOpen() {
            return false;
        },
        async clickInOpenMenus(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = false
        } = {}) {
            const selectorList = resolveSelectorListFromSpec(ctx, selector);
            if (selectorList.length === 0) return false;

            const tryClickOnce = () => {
                const target = resolveCurrentConversationMenuTarget();
                const rootEl = target?.entry ? getConversationMenuRootElementFromEntry(target.entry) : null;
                if (!rootEl) return false;

                for (const sel of selectorList) {
                    const item = findMenuItemInRoot(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                    if (item && simulateGeminiMenuClick(item)) return true;
                }
                return false;
            };

            if (!waitForItem) return tryClickOnce();

            const timeoutMs = MENU_TIMING.waitTimeoutMs ?? 3000;
            const intervalMs = MENU_TIMING.pollIntervalMs ?? 120;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (tryClickOnce()) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }
            return tryClickOnce();
        },
        async oneStepClick(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = true
        } = {}) {
            if (!selector) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!await this.ensureOpen(ctx)) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!waitForItem) return false;
            return await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
        }
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

    function getConversationMenuShortcutTexts(shortcut) {
        const data = (shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data)) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const texts = [];
        if (typeof shortcut?.name === "string") texts.push(shortcut.name);
        if (typeof menu?.keyword === "string") texts.push(menu.keyword);
        if (typeof menu?.textMatch === "string") texts.push(menu.textMatch);
        if (typeof rawMenu === "string") texts.push(rawMenu);

        if (Array.isArray(menu?.path) && menu.path.length) {
            texts.push(menu.path[menu.path.length - 1]);
        }
        if (Array.isArray(data?.path) && data.path.length) {
            texts.push(data.path[data.path.length - 1]);
        }

        return texts
            .map(value => String(value ?? "").trim())
            .filter(Boolean);
    }

    function shortcutLooksLikeDelete(shortcut) {
        return getConversationMenuShortcutTexts(shortcut).some(textLooksLikeDelete);
    }

    function shortcutShouldPreferTopBarConversationMenu(shortcut) {
        return getConversationMenuShortcutTexts(shortcut).some((text) => {
            const token = normalizeMenuKey(text);
            return token === "pin" || token === "delete";
        });
    }

    function getConversationMenuShortcutLabel(shortcut) {
        const first = getConversationMenuShortcutTexts(shortcut)[0] || "";
        if (first) return first;
        const fallback = String(shortcut?.customAction || "").trim();
        return fallback || "conversationMenu";
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

    const topBarConversationMenuActionBase = createGeminiMenuAction({
        actionName: "conversationMenuTopBar",
        menuController: topBarConversationMenu,
        defaultItemSelector: CONVERSATION_ITEM_SELECTOR
    });

    const conversationMenuActionBase = createGeminiMenuAction({
        actionName: "conversationMenu",
        menuController: conversationMenu,
        defaultItemSelector: CONVERSATION_ITEM_SELECTOR
    });

    const conversationMenuAction = async ({ shortcut, engine }) => {
        let ok = false;
        if (shortcutShouldPreferTopBarConversationMenu(shortcut)) {
            ok = await topBarConversationMenuActionBase({ shortcut, engine });
            if (ok) {
                console.info(`${LOG_TAG} conversationMenu: top bar 命中 ${getConversationMenuShortcutLabel(shortcut)}。`);
            } else {
                console.info(`${LOG_TAG} conversationMenu: top bar 不可用，已回退侧边栏处理 ${getConversationMenuShortcutLabel(shortcut)}。`);
            }
        }

        if (!ok) {
            ok = await conversationMenuActionBase({ shortcut, engine });
        }
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
        const QuickInput = ShortcutTemplate?.quickInput;
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
        const waitForObservedState = dom?.waitForObservedState;

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
            typeof trySetFileInputFiles !== "function" ||
            typeof waitForObservedState !== "function"
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

        function getRuntimeNow(runtime = null) {
            if (runtime && typeof runtime.now === "function") {
                try { return Number(runtime.now()) || Date.now(); } catch { }
            }
            return Date.now();
        }

        async function runtimeWaitIfPaused(runtime = null, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return false;
            if (runtime && typeof runtime.waitIfPaused === "function") {
                try {
                    const result = await runtime.waitIfPaused();
                    if (result === false) return false;
                } catch {
                    return false;
                }
            }
            return !(cancelFn && cancelFn());
        }

        async function runtimeSleep(runtime = null, ms = 0, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (!(await runtimeWaitIfPaused(runtime, { shouldCancel: cancelFn }))) return false;
            if (runtime && typeof runtime.sleep === "function") {
                try {
                    const result = await runtime.sleep(ms);
                    return result !== false && !(cancelFn && cancelFn());
                } catch {
                    return false;
                }
            }
            await sleep(ms);
            return runtimeWaitIfPaused(runtime, { shouldCancel: cancelFn });
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

        async function triggerNativeNewChat({ shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return { ok: false, label: GEMINI_NATIVE_NEW_CHAT_LABEL };

            try {
                if (simulateKeystroke(GEMINI_NATIVE_NEW_CHAT_HOTKEY, { target: document.body })) {
                    return { ok: true, label: GEMINI_NATIVE_NEW_CHAT_LABEL };
                }
            } catch { }

            return { ok: false, label: GEMINI_NATIVE_NEW_CHAT_LABEL };
        }

        const GEMINI_ATTACHMENT_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "src",
            "disabled",
            "aria-disabled",
            "aria-busy"
        ]);

        const GEMINI_READY_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "src",
            "disabled",
            "aria-disabled",
            "aria-busy"
        ]);

        function getGeminiAttachmentScope(containerEl) {
            const container = containerEl || document;
            const selectors = [
                ".attachment-preview-wrapper",
                ".uploader-file-preview-container",
                "uploader-file-preview-container",
                ".file-preview-wrapper",
                ".text-input-field.with-file-preview"
            ];

            for (const selector of selectors) {
                try {
                    const candidates = Array.from(container.querySelectorAll(selector))
                        .filter(el => el && !isInsideQuickInputOverlay(el))
                        .filter(el => isElementVisible(el));
                    for (const candidate of candidates) {
                        try {
                            if (candidate.querySelector("button[data-test-id='cancel-button'], button.cancel-button, img[data-test-id='image-preview'], uploader-file-preview, .file-preview-chip, .file-preview-container")) {
                                return candidate;
                            }
                        } catch { }
                    }
                    if (candidates.length) return candidates[0];
                } catch { }
            }

            return container;
        }

        function getGeminiAttachmentPreviewCards(containerEl) {
            const scope = getGeminiAttachmentScope(containerEl);
            const selectors = [
                "uploader-file-preview",
                ".file-preview-chip",
                ".file-preview-container"
            ].join(", ");

            try {
                return Array.from(scope.querySelectorAll(selectors))
                    .filter(card => card && !isInsideQuickInputOverlay(card))
                    .filter(card => isElementVisible(card));
            } catch {
                return [];
            }
        }

        function getGeminiRemoveAttachmentButtons(containerEl) {
            const scope = getGeminiAttachmentScope(containerEl);
            const previewCards = getGeminiAttachmentPreviewCards(scope);
            const ordered = [];
            const seen = new Set();

            const pushButton = (button) => {
                if (!button || seen.has(button)) return;
                if (isInsideQuickInputOverlay(button)) return;
                if (button.disabled) return;
                seen.add(button);
                ordered.push(button);
            };

            for (const card of previewCards) {
                try {
                    pushButton(card.querySelector("button[data-test-id='cancel-button'], button.cancel-button"));
                } catch { }
            }

            try {
                const buttons = Array.from(scope.querySelectorAll("button[data-test-id='cancel-button'], button.cancel-button"));
                for (const button of buttons) pushButton(button);
                return ordered;
            } catch {
                return ordered;
            }
        }

        function getGeminiObservationRoots({ containerEl = null, composerEl = null } = {}) {
            const roots = [];
            const container = containerEl || (composerEl ? findGeminiComposerContainer(composerEl) : null);
            if (container) roots.push(container);

            try {
                const attachmentScope = getGeminiAttachmentScope(container);
                if (attachmentScope) roots.push(attachmentScope);
                const previewContainer = attachmentScope?.querySelector?.(".uploader-file-preview-container, uploader-file-preview-container");
                if (previewContainer) roots.push(previewContainer);
            } catch { }

            try {
                const form = composerEl?.closest?.("form");
                if (form) roots.push(form);
            } catch { }

            const sendBtn = composerEl ? findSendButtonNearComposer(composerEl) : null;
            if (sendBtn) {
                roots.push(sendBtn);
                try {
                    const sendScope = sendBtn.closest?.("form");
                    if (sendScope) roots.push(sendScope);
                } catch { }
                try {
                    const sendParent = sendBtn.parentElement;
                    if (sendParent) roots.push(sendParent);
                } catch { }
            }

            return roots;
        }

        function getGeminiAttachmentSnapshot(containerEl) {
            const container = containerEl || document;
            const scope = getGeminiAttachmentScope(container);
            const urls = new Set();
            let cancelCount = 0;
            let hasFilePreview = false;
            let imageCount = 0;
            let previewChipCount = 0;

            try { hasFilePreview = !!container.classList?.contains?.("with-file-preview"); } catch { }
            if (!hasFilePreview) {
                try {
                    hasFilePreview = !!scope.querySelector(".attachment-preview-wrapper, .uploader-file-preview-container, uploader-file-preview, .file-preview-chip, button[data-test-id='cancel-button'], img[data-test-id='image-preview']");
                } catch { }
            }

            try {
                const selector = [
                    "img[data-test-id='image-preview']",
                    "uploader-file-preview img[aria-label='Image preview']",
                    "button.image-preview img[aria-label='Image preview']"
                ].join(", ");
                const imgs = Array.from(scope.querySelectorAll(selector))
                    .filter(img => img && !isInsideQuickInputOverlay(img))
                    .filter(img => isElementVisible(img));
                imageCount = imgs.length;
                for (const img of imgs) {
                    if (!img) continue;
                    const src = String(img.getAttribute?.("src") || img.currentSrc || img.src || "").trim();
                    if (!src) continue;
                    urls.add(src);
                }
            } catch { }

            try {
                cancelCount = getGeminiRemoveAttachmentButtons(scope).length;
            } catch { }

            try {
                previewChipCount = Array.from(scope.querySelectorAll("uploader-file-preview, .file-preview-chip"))
                    .filter(el => el && !isInsideQuickInputOverlay(el))
                    .filter(el => isElementVisible(el))
                    .length;
            } catch { }

            const attachmentCount = Math.max(imageCount, cancelCount, previewChipCount, hasFilePreview ? 1 : 0);
            return { urls, imageCount, cancelCount, previewChipCount, hasFilePreview, attachmentCount };
        }

        function hasGeminiAttachmentChange(prev, next) {
            if (!prev || !next) return false;
            if ((next.attachmentCount || 0) > (prev.attachmentCount || 0)) return true;
            if (next.hasFilePreview && !prev.hasFilePreview) return true;
            if (next.cancelCount > prev.cancelCount) return true;
            if ((next.previewChipCount || 0) > (prev.previewChipCount || 0)) return true;
            if (next.imageCount > prev.imageCount) return true;
            for (const url of next.urls) {
                if (!prev.urls.has(url)) return true;
            }
            return false;
        }

        async function waitForGeminiAttachmentCount(containerEl, targetCount, { timeoutMs = 6000, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expected = Math.max(0, Number(targetCount) || 0);
            let containerRef = containerEl || document;

            const computeAttachmentCountState = () => {
                containerRef = containerEl || containerRef || document;
                const snapshot = getGeminiAttachmentSnapshot(containerRef);
                return {
                    container: containerRef,
                    snapshot,
                    stateKey: getGeminiAttachmentFingerprint(snapshot)
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiObservationRoots({ containerEl: containerRef }),
                computeState: computeAttachmentCountState,
                isSatisfied: (state) => (state?.snapshot?.attachmentCount || 0) === expected,
                timeoutMs,
                settleMs: 0,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: GEMINI_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const snapshot = observed?.state?.snapshot || getGeminiAttachmentSnapshot(containerRef);
            if (observed?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            return { ok: !!observed?.ok, cancelled: false, snapshot };
        }

        async function trimGeminiUnexpectedAttachments(containerEl, expectedCount, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expected = Math.max(0, Number(expectedCount) || 0);
            let snapshot = getGeminiAttachmentSnapshot(containerEl);

            while ((snapshot?.attachmentCount || 0) > expected) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true, snapshot };
                const buttons = getGeminiRemoveAttachmentButtons(containerEl);
                const extraCount = (snapshot?.attachmentCount || 0) - expected;
                if (!buttons.length || extraCount <= 0) break;

                const removeBtn = buttons[buttons.length - 1];
                let clicked = false;
                try {
                    clicked = !!TemplateUtils?.events?.simulateClick?.(removeBtn, { nativeFallback: true });
                } catch { }
                if (!clicked) {
                    try { removeBtn.click(); clicked = true; } catch { }
                }
                if (!clicked) break;

                const waitResult = await waitForGeminiAttachmentCount(containerEl, (snapshot?.attachmentCount || 0) - 1, {
                    timeoutMs: 5000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime
                });
                snapshot = waitResult?.snapshot || getGeminiAttachmentSnapshot(containerEl);
                if (waitResult?.cancelled) return { ok: false, cancelled: true, snapshot };
                if (!waitResult?.ok && (snapshot?.attachmentCount || 0) >= expected + extraCount) break;
            }

            snapshot = getGeminiAttachmentSnapshot(containerEl);
            return { ok: (snapshot?.attachmentCount || 0) === expected, cancelled: false, snapshot };
        }

        async function clearGeminiAttachments(composerEl, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
            if (!composer) {
                return {
                    ok: false,
                    cancelled: !!(cancelFn && cancelFn()),
                    message: "清空当前图片附件失败：未找到输入框。"
                };
            }

            const container = findGeminiComposerContainer(composer);
            if (!container) {
                return { ok: false, cancelled: false, message: "清空当前图片附件失败：未找到附件容器。" };
            }

            const initialSnapshot = getGeminiAttachmentSnapshot(container);
            if ((initialSnapshot?.attachmentCount || 0) <= 0) {
                return { ok: true, cancelled: false, snapshot: initialSnapshot };
            }

            const clearResult = await trimGeminiUnexpectedAttachments(container, 0, { shouldCancel: cancelFn, runtime });
            const snapshot = clearResult?.snapshot || getGeminiAttachmentSnapshot(container);
            if (clearResult?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            if (clearResult?.ok) {
                return { ok: true, cancelled: false, snapshot };
            }

            const remaining = Math.max(0, Number(snapshot?.attachmentCount) || 0);
            const removeButtons = getGeminiRemoveAttachmentButtons(container);
            const message = remaining > 0
                ? (removeButtons.length
                    ? `清空当前图片附件失败：点击移除后仍识别到 ${remaining} 个附件标记。`
                    : `清空当前图片附件失败：仍识别到 ${remaining} 个附件标记，但未找到可用的移除按钮。`)
                : "清空当前图片附件失败：未能确认附件已全部移除。";
            return { ok: false, cancelled: false, snapshot, message };
        }

        async function waitForGeminiAttachmentChange(containerEl, prevSnapshot, { timeoutMs = 9000, intervalMs = 120, shouldCancel = null, runtime = null, composerEl = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let containerRef = containerEl || (composerEl ? findGeminiComposerContainer(composerEl) : null) || document;

            const computeAttachmentState = () => {
                const nextContainer = containerEl || (composerEl ? findGeminiComposerContainer(composerEl) : null) || containerRef || document;
                if (nextContainer) containerRef = nextContainer;
                const snapshot = getGeminiAttachmentSnapshot(containerRef);
                return {
                    container: containerRef,
                    snapshot,
                    stateKey: getGeminiAttachmentFingerprint(snapshot)
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiObservationRoots({ containerEl: containerRef, composerEl }),
                computeState: computeAttachmentState,
                isSatisfied: (state) => hasGeminiAttachmentChange(prevSnapshot, state?.snapshot),
                timeoutMs,
                settleMs: 0,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: GEMINI_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const snapshot = observed?.state?.snapshot || getGeminiAttachmentSnapshot(containerRef);
            if (observed?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            return { ok: !!observed?.ok, cancelled: false, snapshot };
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

        async function attachImageToComposer(file, composerEl, { onDiagnostics, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;

            if (!file || !(file instanceof File)) return { ok: false, cancelled: false };
            if (!String(file.type || "").startsWith("image/")) return { ok: false, cancelled: false };
            if (cancelFn && cancelFn()) return { ok: false, cancelled: true };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
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
                if (attempt > 0) {
                    const retryWaitOk = await runtimeSleep(runtime, 180, { shouldCancel: cancelFn });
                    if (!retryWaitOk) {
                        diagnostics.finalSnapshot = prev;
                        if (typeof onDiagnostics === "function") {
                            try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                        }
                        return { ok: false, cancelled: true };
                    }
                }
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                const focusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
                if (!focusSettleOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }

                const fired = tryAttachImageViaSimulatedPaste(file, composer);
                if (fired) diagnostics.fired.paste += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, {
                    timeoutMs: 9000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime,
                    composerEl: composer
                });
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
                const dropWaitOk = await runtimeSleep(runtime, 220, { shouldCancel: cancelFn });
                if (!dropWaitOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                const dropFocusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
                if (!dropFocusSettleOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }

                const fired = tryAttachImageViaDropzone(file, composer);
                if (fired) diagnostics.fired.drop += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, {
                    timeoutMs: 9000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime,
                    composerEl: composer
                });
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
                const fileInputWaitOk = await runtimeSleep(runtime, 220, { shouldCancel: cancelFn });
                if (!fileInputWaitOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                const fileInputFocusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
                if (!fileInputFocusSettleOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }

                const fired = tryAttachImageViaFileInput(file, composer, diagnostics);
                if (fired) diagnostics.fired.fileInput += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, {
                    timeoutMs: 9000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime,
                    composerEl: composer
                });
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

        async function attachImagesToComposer(files, composerEl, { onDiagnostics, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const list = Array.from(files || []).filter(file => file && (file instanceof File) && String(file.type || "").startsWith("image/"));
            if (list.length === 0) return { ok: false, cancelled: false, message: "未检测到图片文件。" };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
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
                    shouldCancel: cancelFn,
                    runtime
                });
                if (result?.cancelled) return { ok: false, cancelled: true };
                if (!result?.ok) return { ok: false, cancelled: false, message: "图片粘贴失败：未检测到输入框内出现图片预览。" };
                const betweenFilesWaitOk = await runtimeSleep(runtime, 120, { shouldCancel: cancelFn });
                if (!betweenFilesWaitOk) return { ok: false, cancelled: true };
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
            return `${snapshot.attachmentCount || 0};${snapshot.hasFilePreview ? 1 : 0};${snapshot.cancelCount || 0};${snapshot.previewChipCount || 0};${snapshot.imageCount || 0};${urls}`;
        }

        function hasGeminiUploadInProgress(containerEl) {
            const container = containerEl || document;
            let scope = container;
            try { scope = getGeminiAttachmentScope(container) || container; } catch { }

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

        function getGeminiReadyToSendState(composerEl, { requireImage = false, minAttachments = 0 } = {}) {
            const container = composerEl ? findGeminiComposerContainer(composerEl) : null;
            const snapshot = container ? getGeminiAttachmentSnapshot(container) : null;
            const sendBtn = composerEl ? findSendButtonNearComposer(composerEl) : null;
            const sendReady = !!(sendBtn && !isGeminiSendButtonDisabled(sendBtn));

            const requiredAttachments = Math.max(0, Number(minAttachments) || 0);
            const attachmentCount = snapshot ? (snapshot.attachmentCount || 0) : 0;
            const hasImage = !!(snapshot && (snapshot.hasFilePreview || snapshot.imageCount > 0 || snapshot.cancelCount > 0 || (snapshot.previewChipCount || 0) > 0));
            const hasEnoughAttachments = !requireImage || requiredAttachments <= 0 || attachmentCount >= requiredAttachments;
            const uploadBusy = requireImage && container ? hasGeminiUploadInProgress(container) : false;
            const ok = !!(sendReady && (!requireImage || (hasImage && hasEnoughAttachments && !uploadBusy)));
            const fingerprint = getGeminiAttachmentFingerprint(snapshot);
            const stateKey = `${fingerprint};send=${sendReady ? 1 : 0};busy=${uploadBusy ? 1 : 0};img=${hasImage ? 1 : 0};count=${attachmentCount};min=${requiredAttachments}`;

            return {
                composer: composerEl,
                container,
                snapshot,
                sendBtn,
                sendReady,
                attachmentCount,
                hasImage,
                hasEnoughAttachments,
                uploadBusy,
                requiredAttachments,
                ok,
                stateKey
            };
        }

        async function waitForGeminiReadyToSend(composerEl, { requireImage = false, minAttachments = 0, timeoutMs = 45000, intervalMs = 160, settleMs = 600, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
            if (!composer) return { ok: false, reason: "no-composer", cancelled: !!(cancelFn && cancelFn()) };

            let composerRef = composer;
            let lastState = null;
            const computeReadyState = () => {
                lastState = getGeminiReadyToSendState(composerRef, { requireImage, minAttachments });
                return lastState;
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiObservationRoots({
                    containerEl: lastState?.container || findGeminiComposerContainer(composerRef),
                    composerEl: composerRef
                }),
                computeState: computeReadyState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: GEMINI_READY_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const finalState = observed?.state || computeReadyState();
            if (observed?.cancelled) {
                return { ok: false, reason: "cancelled", cancelled: true, snapshot: finalState?.snapshot || null };
            }

            return {
                ok: !!observed?.ok,
                button: finalState?.sendBtn || null,
                snapshot: finalState?.snapshot || null,
                reason: observed?.ok ? "ok" : "timeout",
                cancelled: false
            };
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
            clearAttachments: clearGeminiAttachments,
            waitForReadyToSend: waitForGeminiReadyToSend,
            triggerNewChat: ({ shouldCancel = null } = {}) => triggerNativeNewChat({ shouldCancel }),
            newChatLabel: GEMINI_NATIVE_NEW_CHAT_LABEL,
            lockNewChatHotkey: true,
            lockedNewChatHotkeyDisplay: GEMINI_NATIVE_NEW_CHAT_LABEL,
            sendMessage: sendGeminiMessage
        });
    }

    let quickInputController = null;

    function ensureQuickInputController(engine) {
        if (quickInputController) return quickInputController;
        const QuickInput = ShortcutTemplate?.quickInput;
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
            defaults: {
                newChatHotkey: GEMINI_NATIVE_NEW_CHAT_HOTKEY
            },
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

    function registerGeminiMenuCommands(engine) {
        gmRegisterMenuCommandLocal("Gemini - 快捷输入", () => {
            ensureQuickInputController(engine)?.open?.();
        });
        registerSidebarVisibilityMenuCommand();
    }

    const engine = ShortcutTemplate.createShortcutEngine({
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

    engine.init();
    setupKeepSidebarVisible();
    registerGeminiMenuCommands(engine);
})();
