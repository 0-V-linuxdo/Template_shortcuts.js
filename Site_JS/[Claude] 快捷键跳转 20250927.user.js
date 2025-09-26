// ==UserScript==
// @name         [Claude] 快捷键跳转 20250927
// @namespace    0_V userscripts/[Claude] 快捷键跳转
// @version      2.0.0
// @description  为 Claude AI 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)。功能包括: 侧边栏切换、新建话题、历史记录等快捷操作。基于Template模块重构。
// @match        https://claude.ai/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/claude_keycap.svg
// @require      https://github.com/0-V-linuxdo/-/raw/e17b029d255053ccec15e648156adbcec93924e5/%5BTemplate%5D%20%E5%BF%AB%E6%8D%B7%E9%94%AE%E8%B7%B3%E8%BD%AC%2020250924.js
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

    // Claude默认快捷键配置
    const defaultShortcuts = [
        // --- Claude 核心功能 ---
        {
            name: "Toggle Sidebar",
            actionType: "simulate",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "META+.",
            hotkey: "CTRL+B",
            icon: "https://claude.ai/favicon.ico"
        },
        {
            name: "New Conversation",
            actionType: "url",
            url: "https://claude.ai/new",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+N",
            icon: "https://claude.ai/favicon.ico"
        },
        {
            name: "Recent Conversations",
            actionType: "url",
            url: "https://claude.ai/recents",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+H",
            icon: "https://claude.ai/favicon.ico"
        },
        {
            name: "Incognito Chat",
            actionType: "simulate",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "SHIFT+META+I",
            hotkey: "CTRL+I",
            icon: "https://claude.ai/favicon.ico"
        },
        {
            name: "Stop Claude's Response",
            actionType: "simulate",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "ESC",
            hotkey: "CTRL+SHIFT+S",
            icon: "https://claude.ai/favicon.ico"
        },
        // --- 其他常用功能 ---
        {
            name: "Profile",
            actionType: "url",
            url: "https://claude.ai/settings/profile",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+P",
            icon: "https://claude.ai/favicon.ico"
        },
        {
            name: "Features",
            actionType: "url",
            url: "https://claude.ai/settings/features",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+F",
            icon: "https://claude.ai/favicon.ico"
        },
    ];

    // 创建快捷键引擎
    const engine = window.ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "Claude - 设置快捷键",
        panelTitle: "Claude - 自定义快捷键",

        // 存储键配置
        storageKeys: {
            shortcuts: "claude_shortcuts_v1",
            iconCachePrefix: "claude_icon_cache_v1::",
            userIcons: "claude_user_icons_v1"
        },

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

        // 控制台标签
        consoleTag: "[Claude Shortcut Script]",

        // 主题色配置
        colors: {
            primary: "#5D5CDE"  // Claude的主色调
        },

        // Claude特定的图标缓存绕过规则
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://claude.ai/');
        },

        // 搜索词获取函数（Claude通常不需要，但保留以备用）
        getCurrentSearchTerm: () => {
            try {
                const urlParams = new URL(location.href).searchParams;
                return urlParams.get("q");
            } catch (err) {
                console.warn("[Claude Shortcut Script] getCurrentSearchTerm error", err);
                return null;
            }
        },

        // URL模板解析函数
        resolveUrlTemplate: (targetUrl, { getCurrentSearchTerm, placeholderToken }) => {
            const placeholder = placeholderToken || '%s';
            if (!targetUrl.includes(placeholder)) return targetUrl;

            let currentKeyword = null;
            try {
                currentKeyword = typeof getCurrentSearchTerm === 'function'
                    ? getCurrentSearchTerm()
                    : (new URL(location.href).searchParams.get("q"));
            } catch (err) {
                console.warn("[Claude Shortcut Script] resolveUrlTemplate error", err);
            }

            if (currentKeyword !== null && currentKeyword !== undefined) {
                return targetUrl.replaceAll(placeholder, encodeURIComponent(currentKeyword));
            }

            // 如果是搜索模板但没有关键词，返回基础URL
            if (placeholder === '%s' && targetUrl.includes('?')) {
                return targetUrl.substring(0, targetUrl.indexOf('?'));
            }

            return targetUrl.replaceAll(placeholder, '');
        },

        // 文本配置（中文界面）
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
            },
            menuLabelFallback: "打开Claude快捷键设置"
        }
    });

    // 初始化引擎
    engine.init();

    // 为了兼容性，暴露一些方法到全局（如果需要的话）
    window.ClaudeShortcutEngine = {
        openSettings: engine.openSettingsPanel,
        getShortcuts: engine.getShortcuts,
        setShortcuts: engine.setShortcuts
    };

})();
