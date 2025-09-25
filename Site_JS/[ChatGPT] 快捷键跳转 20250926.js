// ==UserScript==
// @name         [ChatGPT] 快捷键跳转 20250926
// @namespace    0_V userscripts/[ChatGPT] 快捷键跳转
// @version      4.0.0
// @description  为 ChatGPT 添加自定义快捷键管理功能（依赖 Template 模块）。支持URL跳转、元素点击、按键模拟，提供可视化设置面板、图标库、按类型筛选、暗黑模式适配等功能。
// @match        https://chatgpt.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/ChatGPT_keycap.svg
// @require      https://github.com/0-V-linuxdo/-/raw/e17b029d255053ccec15e648156adbcec93924e5/%5BTemplate%5D%20%E5%BF%AB%E6%8D%B7%E9%94%AE%E8%B7%B3%E8%BD%AC%2020250924.js
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

    // ChatGPT 默认快捷键配置
    const defaultShortcuts = [
        // --- 无名称分组 ---
        {
            name: "New Chat",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+O",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            hotkey: "CTRL+N",
            icon: "https://chatgpt.com/favicon.ico"
        },
        {
            name: "Toggle Sidebar",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+S",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            hotkey: "CTRL+B",
            icon: "https://chatgpt.com/favicon.ico"
        },
        // --- 聊天分组 ---
        {
            name: "Copy Last Code Block",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+;",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            hotkey: "CTRL+C",
            icon: "https://chatgpt.com/favicon.ico"
        },
        {
            name: "Delete Chat",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+BACKSPACE",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            hotkey: "SHIFT+BACKSPACE",
            icon: "https://chatgpt.com/favicon.ico"
        },
        {
            name: "Focus chat input",
            actionType: "simulate",
            simulateKeys: "SHIFT+ESC",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            hotkey: "CTRL+/",
            icon: "https://chatgpt.com/favicon.ico"
        },
        {
            name: "Add photos & files",
            actionType: "simulate",
            simulateKeys: "CMD+U",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            hotkey: "CTRL+F",
            icon: "https://chatgpt.com/favicon.ico"
        },
        // --- 新的URL跳转 ---
        {
            name: "Model: o3",
            actionType: "url",
            url: "https://chatgpt.com/?model=o3",
            urlMethod: "spa",
            urlAdvanced: "pushState",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+3",
            icon: "https://chatgpt.com/favicon.ico"
        },
        {
            name: "Model: GPT-4o",
            actionType: "url",
            url: "https://chatgpt.com/?model=gpt-4o",
            urlMethod: "spa",
            urlAdvanced: "pushState",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+4",
            icon: "https://chatgpt.com/favicon.ico"
        },
        {
            name: "ChatGPT Home",
            actionType: "url",
            url: "https://chatgpt.com/",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+H",
            icon: "https://chatgpt.com/favicon.ico"
        }
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
            idPrefix: "chatgpt",
            cssPrefix: "chatgpt",
            compactBreakpoint: 800
        },

        // 图标相关配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,

        // 默认快捷键
        defaultShortcuts,

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

        // URL模板解析 - ChatGPT通常不需要搜索词替换
        getCurrentSearchTerm: () => {
            // ChatGPT 没有标准的搜索参数，返回null
            return null;
        },

        // 自定义URL解析函数
        resolveUrlTemplate: (targetUrl, { getCurrentSearchTerm, placeholderToken }) => {
            const placeholder = placeholderToken || '%s';
            if (!targetUrl.includes(placeholder)) return targetUrl;

            // ChatGPT 场景下，如果包含占位符但没有搜索词，通常移除查询参数
            if (placeholder === '%s' && targetUrl.includes('?')) {
                return targetUrl.substring(0, targetUrl.indexOf('?'));
            }
            return targetUrl.replaceAll(placeholder, '');
        },

        // 文本配置 - 中文界面
        text: {
            stats: {
                total: "总计",
                url: "URL跳转",
                selector: "元素点击",
                simulate: "按键模拟"
            },
            buttons: {
                addShortcut: "添加新快捷键",
                saveAndClose: "保存并关闭",
                confirm: "确定",
                cancel: "取消",
                delete: "删除",
                edit: "编辑",
                clear: "清除"
            },
            dialogs: {
                alert: "提示",
                confirm: "确认",
                prompt: "输入"
            },
            hints: {
                hotkey: "点击此处，然后按下快捷键组合",
                simulate: "点击此处，然后按下要模拟的按键组合",
                hotkeyHelp: "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
                simulateHelp: "⚡ 将模拟这个按键组合发送到网页"
            }
        }
    });

    // 初始化引擎
    engine.init();

    // 可选：提供全局访问接口（用于调试或扩展）
    window.ChatGPTShortcutEngine = engine;

})();
