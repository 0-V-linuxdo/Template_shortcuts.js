// ==UserScript==
// @name         [ChatGPT] 快捷键跳转 [20251226] v1.2.0
// @namespace    https://github.com/0-V-linuxdo/Template_shortcuts.js
// @version      [20251226] v1.2.0
// @update-log   1.2.0: 精简 normalizeMenuAction token（不再兼容旧 action 别名）
// @update-log   1.1.2: chatgptMenu action 归一化，减少条件分支冗余
// @description  为 ChatGPT 添加自定义快捷键管理功能（依赖 Template 模块）。支持URL跳转、元素点击、按键模拟，提供可视化设置面板、图标库、按类型筛选、暗黑模式适配等功能。
// @match        https://chatgpt.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/ChatGPT_keycap.svg
// @require      https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Template_JS/%5BTemplate%5D%20shortcut%20core.js?v=1.21
// ==/UserScript==

(function() {
    'use strict';

    // 检查模板是否正确加载
    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[ChatGPT Shortcut] Template module not found.');
        return;
    }

    // ChatGPT 默认图标
    const defaultIconURL = "https://chatgpt.com/favicon.ico";

    // ChatGPT 图标库
    const defaultIcons = [
        { name: "ChatGPT", url: "https://chatgpt.com/favicon.ico" },
        { name: "OpenAI", url: "https://openai.com/favicon.ico" },
        { name: "Claude", url: "https://claude.ai/favicon.ico" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
        { name: "Perplexity", url: "https://www.perplexity.ai/favicon.ico" },
        { name: "Gemini", url: "https://gemini.google.com/favicon.ico" },
    ];

    // 受保护的核心图标URL
    const protectedIconUrls = [
        "https://chatgpt.com/favicon.ico",
        "https://openai.com/favicon.ico"
    ];

    // ChatGPT 元素选择器
    const SELECTORS = {
        composerPlusBtn: "button[data-testid='composer-plus-btn']",
        moreSubmenuItem: "div[role='menuitem']",
        popupMenuItem: "[role='menuitem'], [role='menuitemradio']"
    };

    // ===== ChatGPT 特有功能模块开始：1step Canvas / Web =====

    const TemplateUtils = window.ShortcutTemplate.utils;
    if (!TemplateUtils?.menu?.createMenuController) {
        console.error('[ChatGPT Shortcut] Template utils.menu not found (update Template core).');
        return;
    }

    const popupMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: [
                SELECTORS.composerPlusBtn,
                'button[aria-label="Add files and more"]'
            ]
        },
        root: {
            type: "ariaControls",
            requireRole: "menu",
            requireDataState: "open"
        },
        timing: {
            openDelayMs: 250,
            stepDelayMs: 250
        },
        submenus: {
            more: {
                trigger: {
                    searchRoot: "parentRoot",
                    action: "hover",
                    candidates: [
                        { selector: "div[role='menuitem'][data-has-submenu]" },
                        { selector: SELECTORS.moreSubmenuItem, textMatch: "More" }
                    ]
                },
                root: {
                    type: "ariaControls",
                    requireRole: "menu",
                    requireDataState: "open"
                }
            }
        }
    });

    function normalizeMenuToken(value) {
        return String(value ?? "").trim();
    }

    function normalizeSubmenuKey(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        if (!token) return "";
        return token;
    }

    function normalizeMenuAction(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        return token || "onestep";
    }

    function getPopupMenuActionSpec(shortcut) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const menu = data.menu && typeof data.menu === "object" && !Array.isArray(data.menu) ? data.menu : data;

        const selector = typeof menu.selector === "string" && menu.selector.trim()
            ? menu.selector.trim()
            : SELECTORS.popupMenuItem;

        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = (menu.waitForItem !== undefined) ? !!menu.waitForItem : true;
        const allowFirstItem = !!menu.allowFirstItem;

        let textMatch = menu.textMatch;

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

        const normalizedOpenSubmenus = Array.from(new Set(openSubmenus.map(normalizeSubmenuKey).filter(Boolean)));

        const action = normalizeMenuAction(menu.action);

        const submenuKey = normalizeSubmenuKey(menu.submenuKey || (normalizedOpenSubmenus[0] || ""));

        return {
            action,
            selector,
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

    function ensureMenuTextMatch(spec) {
        if (spec.allowFirstItem || hasValidTextMatch(spec.textMatch)) return true;
        console.warn("[ChatGPT Shortcut] chatgptMenu: missing menu.textMatch; set data.menu.textMatch (or data.menu.path), or set data.menu.allowFirstItem=true to click the first item.");
        return false;
    }

    const CUSTOM_ACTIONS = {
        chatgptMenu: ({ shortcut, engine }) => {
            const spec = getPopupMenuActionSpec(shortcut);
            switch (spec.action) {
                case "open": {
                    return popupMenu.ensureOpen({ engine });
                }
                case "submenu": {
                    if (!spec.submenuKey) return false;
                    return popupMenu.ensureSubmenuOpen({ engine }, spec.submenuKey);
                }
                case "click": {
                    if (!ensureMenuTextMatch(spec)) return false;
                    return popupMenu.clickInOpenMenus(
                        { engine },
                        { selector: spec.selector, textMatch: spec.textMatch, fallbackToFirst: spec.fallbackToFirst, waitForItem: spec.waitForItem }
                    );
                }
                default: {
                    if (!ensureMenuTextMatch(spec)) return false;
                    return popupMenu.oneStepClick(
                        { engine },
                        {
                            selector: spec.selector,
                            textMatch: spec.textMatch,
                            openSubmenus: spec.openSubmenus,
                            fallbackToFirst: spec.fallbackToFirst,
                            waitForItem: spec.waitForItem
                        }
                    );
                }
            }
        }
    };
    // ===== ChatGPT 特有功能模块结束 =====

    // ===== 模版模块配置与初始化（ShortcutTemplate） =====

    const baseShortcut = {
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        icon: defaultIconURL
    };

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    // ChatGPT 默认快捷键配置
    const defaultShortcuts = [
        // === ChatGPT 原生快捷键（simulate）===
        createShortcut({
            name: "New Chat",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+O",
            hotkey: "CTRL+N"
        }),
        createShortcut({
            name: "Toggle Sidebar",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+S",
            hotkey: "CTRL+B"
        }),
        createShortcut({
            name: "Copy Last Code Block",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+;",
            hotkey: "CTRL+1"
        }),
        createShortcut({
            name: "Delete Chat",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+BACKSPACE",
            hotkey: "SHIFT+BACKSPACE"
        }),
        createShortcut({
            name: "Focus chat input",
            actionType: "simulate",
            simulateKeys: "SHIFT+ESC",
            hotkey: "CTRL+/"
        }),
        createShortcut({
            name: "Add photos & files",
            actionType: "simulate",
            simulateKeys: "CMD+U",
            hotkey: "CTRL+F"
        }),

        // === ChatGPT 页面按钮（selector）===
        createShortcut({
            name: "Temporary Chat",
            actionType: "selector",
            selector: "button[aria-label*='temporary chat']",
            hotkey: "CTRL+SHIFT+I"
        }),

        // === URL 跳转（url）===
        createShortcut({
            name: "Model: o3",
            actionType: "url",
            url: "https://chatgpt.com/g/g-YyyyMT9XH-chatgpt-classic?model=o3",
            urlMethod: "spa",
            urlAdvanced: "pushState",
            hotkey: "CTRL+3"
        }),

        // === customAction: "chatgptMenu" ===
        // --- 顶层项：path = ["..."] ---
        createShortcut({
            name: "Create image",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: { path: ["Create image"] } },
            hotkey: "CTRL+I"
        }),
        createShortcut({
            name: "Deep research",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: { path: ["Deep research"] } },
            hotkey: "CTRL+R"
        }),
        createShortcut({
            name: "Thinking",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: { path: ["Thinking"] } },
            hotkey: "CTRL+T"
        }),

        // --- More 子菜单：path = ["More", "..."] ---
        createShortcut({
            name: "Canvas",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: { path: ["More", "Canvas"] } },
            hotkey: "CTRL+C"
        }),
        createShortcut({
            name: "Web",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: { path: ["More", "Web"] } },
            hotkey: "CTRL+W"
        })
    ];

    // 创建快捷键引擎实例
    const engine = window.ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "ChatGPT - 设置快捷键",
        panelTitle: "ChatGPT - 自定义快捷键",

        // 存储键配置
        storageKeys: {
            shortcuts: "chatgpt_shortcuts_v1",
            iconCachePrefix: "chatgpt_icon_cache_v1::",
            userIcons: "chatgpt_user_icons_v1"
        },

        // UI配置
        ui: {
            idPrefix: "chatgpt"
        },

        // 图标相关配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,

        // 默认快捷键
        defaultShortcuts,

        // 自定义动作表：将 1step/复杂点击动作纳入引擎
        customActions: CUSTOM_ACTIONS,

        // 主题颜色 - 使用ChatGPT的主题色
        colors: {
            primary: "#5D5CDE"
        },

        // 控制台标签
        consoleTag: "[ChatGPT Shortcut Script]",

        // 图标缓存策略 - ChatGPT域名绕过缓存
        shouldBypassIconCache: (url) => {
            return url && (url.startsWith('https://chatgpt.com/') || url.startsWith('https://openai.com/'));
        },

        // 其余参数保持默认（Template 内置：URL模版解析、中文文案、响应式断点等）
    });

    // 初始化引擎
    engine.init();

    // ===== 模版模块配置与初始化结束 =====

})();
