// ==UserScript==
// @name         [Claude] 快捷键跳转 [20251229] v1.0.1
// @namespace    https://github.com/0-V-linuxdo/Template_shortcuts.js
// @description  为 Claude AI 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)。功能包括: 侧边栏切换、新建话题、历史记录等快捷操作。基于Template模块重构。
//
// @version      [20251229] v1.0.1
// @update-log   1.0.1: 移除 clickWeb/web1step，统一为 web；删除旧版兼容代码
//
// @match        https://claude.ai/*
//
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
//
// @connect      *
//
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/claude_keycap.svg
// @require      https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Template_JS/%5BTemplate%5D%20shortcut%20core.js?refresh=1
// ==/UserScript==

(function () {
    'use strict';

    // 检查模版模块是否加载
    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Claude Shortcut] Template module not found.');
        return;
    }

    // Claude默认图标URL
    const defaultIconURL = "https://claude.ai/favicon.ico";

    const STORAGE_KEYS = {
        shortcuts: "claude_shortcuts_v1",
        iconCachePrefix: "claude_icon_cache_v1::",
        userIcons: "claude_user_icons_v1"
    };

    // Claude相关图标库
    const defaultIcons = [
        { name: "Claude AI", url: "https://claude.ai/favicon.ico" },
        { name: "Claude Icon Alt", url: "https://claude.ai/images/claude_app_icon.png" },
        { name: "OpenAI", url: "https://cdn.openai.com/API/favicon-32x32.png" },
        { name: "ChatGPT", url: "https://chat.openai.com/favicon-32x32.png" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "Baidu", url: "https://www.baidu.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "Bilibili", url: "https://www.bilibili.com/favicon.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
    ];

    // 受保护的图标URLs（不能在图标库中删除）
    const protectedIconUrls = [
        "https://claude.ai/favicon.ico",
        "https://claude.ai/images/claude_app_icon.png"
    ];

    // ===== Claude 特有功能模块开始：1step Web =====

    const TIMING = {
        menuOpenDelay: 250,
        stepDelay: 250
    };

    const CLAUDE_WEB_SELECTORS = {
        moreButton: "button[aria-haspopup='menu'][aria-label='Toggle menu']",
        dropdownMenu: "div.z-dropdown [role='menu']",
        menuItem: "[role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio']"
    };

    const TemplateUtils = window.ShortcutTemplate.utils;
    if (!TemplateUtils?.menu?.createMenuController) {
        console.error('[Claude Shortcut] Template utils.menu not found (update Template core).');
        return;
    }

    const moreMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selector: CLAUDE_WEB_SELECTORS.moreButton,
            pick: "preferSvgPath",
            preferSvgPathDIncludes: ["V9.5H16.5", "H3.5"]
        },
        root: {
            type: "ariaLabelledBy",
            selector: CLAUDE_WEB_SELECTORS.dropdownMenu
        },
        timing: {
            openDelayMs: TIMING.menuOpenDelay,
            stepDelayMs: TIMING.stepDelay
        }
    });

    const DEFAULT_WEB_TEXT_MATCH = ["web search", "web 搜索", "网页搜索", "联网搜索"];
    const DEFAULT_WEB_FALLBACK_TO_FIRST = true;

    function normalizeMenuToken(value) {
        return String(value ?? "").trim();
    }

    function normalizeMenuAction(value, fallback = "onestep") {
        const token = normalizeMenuToken(value).toLowerCase();
        return token || fallback;
    }

    function hasValidTextMatch(textMatch) {
        if (typeof textMatch === "string") return !!textMatch.trim();
        if (textMatch instanceof RegExp) return true;
        if (typeof textMatch === "function") return true;
        if (Array.isArray(textMatch)) return textMatch.some(v => hasValidTextMatch(v));
        return false;
    }

    function getClaudeMenuActionSpec(shortcut, {
        defaultTextMatch = null,
        defaultAction = "onestep",
        defaultSelector = CLAUDE_WEB_SELECTORS.menuItem,
        defaultFallbackToFirst = false,
        defaultWaitForItem = true
    } = {}) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const selector = typeof menu.selector === "string" && menu.selector.trim()
            ? menu.selector.trim()
            : (defaultSelector || "");

        const allowFirstItem = !!menu.allowFirstItem;
        const fallbackToFirst = (menu.fallbackToFirst !== undefined) ? !!menu.fallbackToFirst : !!defaultFallbackToFirst;
        const waitForItem = (menu.waitForItem !== undefined) ? !!menu.waitForItem : !!defaultWaitForItem;
        const action = normalizeMenuAction(menu.action, defaultAction);

        let textMatch = (menu.keyword !== undefined) ? menu.keyword : menu.textMatch;
        if (textMatch === undefined || textMatch === null || textMatch === "") textMatch = defaultTextMatch;

        if (action !== "open" && !allowFirstItem && !hasValidTextMatch(textMatch)) {
            console.warn("[Claude Shortcut] menu: missing keyword; set data.menu = \"Web search\" (or set data.menu.textMatch / data.menu.keyword), or set data.menu.allowFirstItem=true to click the first item.");
            return null;
        }

        return {
            action,
            selector,
            textMatch: allowFirstItem ? null : textMatch,
            fallbackToFirst,
            waitForItem
        };
    }

    function createClaudeMenuAction({
        defaultTextMatch = null,
        defaultAction = "onestep",
        defaultSelector = CLAUDE_WEB_SELECTORS.menuItem,
        defaultFallbackToFirst = false
    } = {}) {
        return async function claudeMenuAction({ shortcut, engine }) {
            const spec = getClaudeMenuActionSpec(shortcut, { defaultTextMatch, defaultAction, defaultSelector, defaultFallbackToFirst });
            if (!spec) return false;

            switch (spec.action) {
                case "open": {
                    return await moreMenu.ensureOpen({ engine });
                }
                case "click": {
                    return await moreMenu.clickInOpenMenus(
                        { engine },
                        { selector: spec.selector, textMatch: spec.textMatch, fallbackToFirst: spec.fallbackToFirst, waitForItem: spec.waitForItem }
                    );
                }
                default: {
                    return await moreMenu.oneStepClick(
                        { engine },
                        { selector: spec.selector, textMatch: spec.textMatch, fallbackToFirst: spec.fallbackToFirst, waitForItem: spec.waitForItem }
                    );
                }
            }
        };
    }

    const CLAUDE_MENU_DATA_ADAPTER = {
        label: "菜单关键词（或粘贴 JSON，高级用法）:",
        placeholder: "例如: Web search / 网页搜索 / 联网搜索",
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
    };

    const CUSTOM_ACTIONS = {
        openMore: ({ engine }) => moreMenu.activateTrigger({ engine }),
        claudeMenu: createClaudeMenuAction(),
        web: createClaudeMenuAction({
            defaultTextMatch: DEFAULT_WEB_TEXT_MATCH,
            defaultAction: "onestep",
            defaultFallbackToFirst: DEFAULT_WEB_FALLBACK_TO_FIRST
        })
    };

    // ===== Claude 特有功能模块结束 =====

    // Claude默认快捷键配置
    const baseShortcut = {
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        icon: defaultIconURL
    };

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    const defaultShortcuts = [
        createShortcut({ name: "Toggle Sidebar", actionType: "simulate", simulateKeys: "META+.", hotkey: "CTRL+B" }),
        createShortcut({ name: "New Conversation", actionType: "url", url: "https://claude.ai/new", hotkey: "CTRL+N" }),
        createShortcut({ name: "Recent Conversations", actionType: "url", url: "https://claude.ai/recents", hotkey: "CTRL+H" }),
        createShortcut({ name: "Incognito Chat", actionType: "simulate", simulateKeys: "SHIFT+META+I", hotkey: "CTRL+I" }),
        createShortcut({ name: "Stop Claude's Response", actionType: "simulate", simulateKeys: "ESC", hotkey: "CTRL+SHIFT+S" }),
        createShortcut({ name: "Extended thinking", actionType: "simulate", simulateKeys: "SHIFT+META+E", hotkey: "CTRL+T" }),
        createShortcut({ name: "Open More", actionType: "custom", customAction: "openMore", hotkey: "CTRL+SHIFT+M" }),
        createShortcut({ name: "web", actionType: "custom", customAction: "web", hotkey: "CTRL+W" }),
        createShortcut({ name: "Profile", actionType: "url", url: "https://claude.ai/settings/profile", hotkey: "CTRL+SHIFT+P" }),
        createShortcut({ name: "Features", actionType: "url", url: "https://claude.ai/settings/features", hotkey: "CTRL+SHIFT+F" })
    ];

    // 创建快捷键引擎
    const engine = window.ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "Claude - 设置快捷键",
        panelTitle: "Claude - 自定义快捷键",

        // 存储键配置
        storageKeys: STORAGE_KEYS,

        // UI配置
        ui: {
            idPrefix: "claude",
            cssPrefix: "claude",
            compactBreakpoint: 800
        },

        // 图标配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,

        // 默认快捷键
        defaultShortcuts,

	        // 自定义动作表：将 1step/复杂点击动作纳入引擎
	        customActions: CUSTOM_ACTIONS,

	        // 自定义动作 data 编辑器适配：让用户直接输入关键词（无需 JSON）
	        customActionDataAdapters: {
	            claudeMenu: CLAUDE_MENU_DATA_ADAPTER,
	            web: CLAUDE_MENU_DATA_ADAPTER
	        },

	        // 控制台标签
	        consoleTag: "[Claude Shortcut Script]",

        // 主题色配置
        colors: {
            primary: "#5D5CDE"  // Claude的主色调
        },

        // Claude特定的图标缓存绕过规则
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://claude.ai/');
        }
    });

    // 初始化引擎
    engine.init();

})();
