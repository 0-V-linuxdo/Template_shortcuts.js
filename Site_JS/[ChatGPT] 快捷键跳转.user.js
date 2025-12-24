// ==UserScript==
// @name         [ChatGPT] 快捷键跳转 [20251224] v1.9.0
// @namespace    0_V userscripts/[ChatGPT] 快捷键跳转
// @version      [20251224] v1.9.0
// @update-log   1.9.0: 数据化生成动作映射；收敛 1step 定时编排；移除冗余 Template 默认配置
// @description  为 ChatGPT 添加自定义快捷键管理功能（依赖 Template 模块）。支持URL跳转、元素点击、按键模拟，提供可视化设置面板、图标库、按类型筛选、暗黑模式适配等功能。
// @match        https://chatgpt.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/ChatGPT_keycap.svg
// @require      https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Template_JS/%5BTemplate%5D%20shortcut%20core.js
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
        popupMenuItemRadio: "div[role='menuitemradio']"
    };

    // ===== ChatGPT 特有功能模块开始：1step Canvas / Web =====

    const POPUP_ACTION_DEFS = [
        {
            actionKey: "canvas",
            textMatch: "Canvas",
            customActionKeys: { click: "clickCanvas", oneStep: "canvas1step" }
        },
        {
            actionKey: "web",
            textMatch: "Web",
            customActionKeys: { oneStep: "web1step" }
        },
        {
            actionKey: "deepResearch",
            textMatch: "Deep research",
            customActionKeys: { oneStep: "deepResearch1step" }
        },
        {
            actionKey: "createImage",
            textMatch: "Create image",
            customActionKeys: { oneStep: "createImage1step" }
        },
        {
            actionKey: "thinking",
            textMatch: "Thinking",
            customActionKeys: { oneStep: "thinking1step" }
        }
    ];

    const TIMING = {
        menuOpenDelay: 250,
        stepDelay: 250
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function runSequence(steps, delay = TIMING.stepDelay) {
        let lastResult = null;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            try {
                const res = step();
                lastResult = (res && typeof res.then === "function") ? await res : res;
            } catch (e) {
                console.warn("[ChatGPT Shortcut] sequence step error:", e);
            }
            if (i < steps.length - 1) await sleep(delay);
        }
        return lastResult;
    }

    // 解析事件需要的 view（在 Firefox userscript 沙箱内需使用页面 window）
    function resolveEventView(element) {
        try {
            if (element?.ownerDocument?.defaultView) return element.ownerDocument.defaultView;
        } catch (e) {}
        try {
            if (typeof unsafeWindow !== "undefined") return unsafeWindow;
        } catch (e) {}
        return typeof window !== "undefined" ? window : null;
    }

    function dispatchSyntheticEvent(element, type, Ctor, optionsBuilder) {
        if (typeof Ctor !== "function") return false;
        try {
            const opts = typeof optionsBuilder === "function" ? optionsBuilder() : optionsBuilder;
            const event = new Ctor(type, opts);
            return element.dispatchEvent(event);
        } catch (e) {
            console.warn(`[ChatGPT Shortcut] dispatch ${type} failed:`, e);
            return false;
        }
    }

    function createEventOptions(element) {
        const view = resolveEventView(element);
        const baseOptions = () => ({ bubbles: true, cancelable: true, composed: true, view: view || null });
        const pointerOptions = () => ({ ...baseOptions(), pointerId: 1, pointerType: "mouse", isPrimary: true });
        return { baseOptions, pointerOptions };
    }

    function dispatchEventPlans(element, plans) {
        let dispatched = false;
        for (const plan of plans) {
            const ok = dispatchSyntheticEvent(element, plan.type, plan.ctor, plan.opts);
            dispatched = dispatched || ok;
        }
        return dispatched;
    }

    // 模拟真实鼠标点击（包含 pointer 事件，适配 React/Radix UI），并在失败时降级为 element.click()
    function simulateClick(element) {
        if (!element) return false;

        const { baseOptions, pointerOptions } = createEventOptions(element);

        const eventPlans = [
            typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerdown", opts: pointerOptions },
            typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mousedown", opts: baseOptions },
            typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerup", opts: pointerOptions },
            typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mouseup", opts: baseOptions },
            typeof MouseEvent === "function" && { ctor: MouseEvent, type: "click", opts: baseOptions }
        ].filter(Boolean);

        let dispatched = dispatchEventPlans(element, eventPlans);

        if (!dispatched) {
            try {
                element.click();
                dispatched = true;
            } catch (e) {
                console.warn("[ChatGPT Shortcut] native click fallback failed:", e);
            }
        }

        return dispatched;
    }

    function findElementInRoot(root, selector, textMatch) {
        if (!root) return null;
        const elements = root.querySelectorAll(selector);
        for (const el of elements) {
            if (!textMatch) return el;
            const text = (el.textContent || "").trim();
            if (text.includes(textMatch)) return el;
        }
        return null;
    }

    function getComposerPlusButton() {
        return document.querySelector(SELECTORS.composerPlusBtn)
            || document.querySelector('button[aria-label="Add files and more"]');
    }

    // 查找并点击元素（支持文本匹配）
    function clickElement(selector, textMatch) {
        try {
            const target = findElementInRoot(document, selector, textMatch)
                || (selector === SELECTORS.composerPlusBtn ? getComposerPlusButton() : null);
            return target ? simulateClick(target) : false;
        } catch (e) {
            console.warn("[ChatGPT Shortcut] clickElement error:", e);
        }
        return false;
    }

    // 模拟 hover，用于触发 Radix 子菜单
    function simulateHover(element) {
        if (!element) return false;

        const { baseOptions, pointerOptions } = createEventOptions(element);

        const eventPlans = [
            typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerover", opts: pointerOptions },
            typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerenter", opts: pointerOptions },
            typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mouseover", opts: baseOptions },
            typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mouseenter", opts: baseOptions },
            typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointermove", opts: pointerOptions },
            typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mousemove", opts: baseOptions }
        ].filter(Boolean);

        return dispatchEventPlans(element, eventPlans);
    }

    // 查找并 hover 元素（支持文本匹配）
    function hoverElement(selector, textMatch) {
        try {
            const target = findElementInRoot(document, selector, textMatch);
            return target ? simulateHover(target) : false;
        } catch (e) {
            console.warn("[ChatGPT Shortcut] hoverElement error:", e);
        }
        return false;
    }

    function getComposerMenuElement() {
        try {
            const btn = getComposerPlusButton();
            const expanded = (btn?.getAttribute("aria-expanded") || "").toLowerCase();
            if (expanded && expanded !== "true") return null;
            const id = btn?.getAttribute("aria-controls");
            if (!id) return null;
            const menu = document.getElementById(id);
            if (!menu || menu.getAttribute("role") !== "menu") return null;
            const state = (menu.getAttribute("data-state") || "").toLowerCase();
            if (state && state !== "open") return null;
            return menu;
        } catch (e) {
            return null;
        }
    }

    function getMoreSubmenuMenuItemElement() {
        const composerMenu = getComposerMenuElement();
        if (!composerMenu) return null;
        try {
            return composerMenu.querySelector("div[role='menuitem'][data-has-submenu][aria-controls][aria-expanded='true']");
        } catch (e) {
            return null;
        }
    }

    function getMoreSubmenuMenuElement() {
        const moreItem = getMoreSubmenuMenuItemElement();
        const id = moreItem?.getAttribute("aria-controls");
        if (!id) return null;
        const menu = document.getElementById(id);
        if (!menu || menu.getAttribute("role") !== "menu") return null;
        const state = (menu.getAttribute("data-state") || "").toLowerCase();
        if (state && state !== "open") return null;
        return menu;
    }

    // 执行 Click 弹窗中的按钮（先主弹窗，未命中再查次级弹窗）
    function execClickPopupMenuItem(textMatch, selector) {
        const roots = [getComposerMenuElement(), getMoreSubmenuMenuElement()];

        for (const root of roots) {
            const target = findElementInRoot(root, selector, textMatch);
            if (target) return simulateClick(target);
        }
        return false;
    }

    const ACTIONS = {
        openMore: () => clickElement(SELECTORS.composerPlusBtn),
        hoverMore: () => {
            const composerMenu = getComposerMenuElement();
            const moreItem = composerMenu?.querySelector("div[role='menuitem'][data-has-submenu]");
            if (moreItem) return simulateHover(moreItem);
            return hoverElement(SELECTORS.moreSubmenuItem, "More");
        }
    };

    for (const def of POPUP_ACTION_DEFS) {
        if (!def?.actionKey) continue;
        ACTIONS[def.actionKey] = () => execClickPopupMenuItem(def.textMatch, SELECTORS.popupMenuItemRadio);
    }

    function execAction(actionKey) {
        const action = ACTIONS[actionKey];
        return typeof action === "function" ? action() : false;
    }

    async function exec1stepPopupMenuAction(clickFn) {
        if (typeof clickFn !== "function") return false;

        const tryClick = async () => {
            try {
                const res = clickFn();
                return (res && typeof res.then === "function") ? await res : res;
            } catch (e) {
                console.warn("[ChatGPT Shortcut] 1step click error:", e);
                return false;
            }
        };

        if (await tryClick()) return true;

        if (!getComposerMenuElement()) {
            execAction("openMore");
            await sleep(TIMING.menuOpenDelay);
            if (await tryClick()) return true;
        }

        const clicked = await runSequence([() => execAction("hoverMore"), tryClick], TIMING.stepDelay);
        return !!clicked;
    }

    function exec1step(actionKey) {
        if (typeof ACTIONS[actionKey] !== "function") return false;
        return exec1stepPopupMenuAction(() => execAction(actionKey));
    }

    const CUSTOM_ACTIONS = {
        openMore: () => execAction("openMore"),
        hoverMore: () => execAction("hoverMore")
    };

    for (const def of POPUP_ACTION_DEFS) {
        const clickKey = def?.customActionKeys?.click;
        const oneStepKey = def?.customActionKeys?.oneStep;

        if (clickKey) CUSTOM_ACTIONS[clickKey] = () => execAction(def.actionKey);
        if (oneStepKey) CUSTOM_ACTIONS[oneStepKey] = () => exec1step(def.actionKey);
    }
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
        // --- 无名称分组 ---
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
        // --- 聊天分组 ---
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
        createShortcut({
            name: "Create image",
            actionType: "custom",
            customAction: "createImage1step",
            hotkey: "CTRL+I"
        }),
        createShortcut({
            name: "Temporary Chat",
            actionType: "selector",
            selector: "button[aria-label*='temporary chat']",
            hotkey: "CTRL+SHIFT+I"
        }),
        // --- 新的URL跳转 ---
        createShortcut({
            name: "Model: o3",
            actionType: "url",
            url: "https://chatgpt.com/g/g-YyyyMT9XH-chatgpt-classic?model=o3",
            urlMethod: "spa",
            urlAdvanced: "pushState",
            hotkey: "CTRL+3"
        }),
        // --- Canvas / Web 功能分组 ---
        createShortcut({
            name: "Open More",
            actionType: "custom",
            customAction: "openMore",
            hotkey: "CTRL+SHIFT+M"
        }),
        createShortcut({
            name: "Hover More",
            actionType: "custom",
            customAction: "hoverMore",
            hotkey: "CTRL+M"
        }),
        createShortcut({
            name: "Click Canvas",
            actionType: "custom",
            customAction: "clickCanvas",
            hotkey: "CTRL+SHIFT+C"
        }),
        createShortcut({
            name: "1step Canvas",
            actionType: "custom",
            customAction: "canvas1step",
            hotkey: "CTRL+C"
        }),
        createShortcut({
            name: "1step Web",
            actionType: "custom",
            customAction: "web1step",
            hotkey: "CTRL+W"
        }),
        createShortcut({
            name: "Deep research",
            actionType: "custom",
            customAction: "deepResearch1step",
            hotkey: "CTRL+R"
        }),
        createShortcut({
            name: "Thinking",
            actionType: "custom",
            customAction: "thinking1step",
            hotkey: "CTRL+T"
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

    // 可选：提供全局访问接口（用于调试或扩展）
    window.ChatGPTShortcutEngine = engine;

})();
