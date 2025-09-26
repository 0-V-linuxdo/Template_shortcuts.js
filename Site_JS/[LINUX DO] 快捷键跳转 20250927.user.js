// ==UserScript==
// @name         [LINUX DO] 快捷键跳转 20250927
// @namespace    0_V userscripts/[LINUX DO] 快捷键跳转
// @version      4.0.0
// @description  为 Linux Do (Discourse) 提供自定义快捷键、可视化设置面板、图标库、按类型筛选、深色模式适配等增强功能（基于 Template 模块重构）。#refactor2025
// @match        https://linux.do/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/linux.do_keycap.svg
// @require      https://github.com/0-V-linuxdo/-/raw/e17b029d255053ccec15e648156adbcec93924e5/%5BTemplate%5D%20%E5%BF%AB%E6%8D%B7%E9%94%AE%E8%B7%B3%E8%BD%AC%2020250924.js
// ==/UserScript==

(function () {
    'use strict';

    // 检查模版是否加载成功
    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Linux Do Shortcut] Template module not found.');
        return;
    }

    // Linux Do 默认图标URL
    const defaultIconURL = "https://linux.do/logo-1024.svg";

    // 默认图标库（主要使用 LLM 和常用网站相关图标）
    const defaultIcons = [
        { name: "Linux Do", url: "https://linux.do/logo-1024.svg" },
        { name: "ChatGPT", url: "https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico" },
        { name: "Claude", url: "https://claude.ai/images/claude_app_icon.png" },
        { name: "Gemini", url: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" },
        { name: "Perplexity", url: "https://www.perplexity.ai/favicon.svg" },
        { name: "Copilot", url: "https://copilot.microsoft.com/favicon.ico" },
        { name: "Poe", url: "https://psc2.cf2.poecdn.net/assets/favicon.svg" },
        { name: "Kimi", url: "https://statics.moonshot.cn/kimi-chat/favicon.ico" },
        { name: "Doubao", url: "https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" }
    ];

    // 受保护的核心图标URL列表
    const protectedIconUrls = [
        "https://linux.do/logo-1024.svg"
    ];

    // 默认快捷键配置
    const defaultShortcuts = [
        {
            name: "New created",
            actionType: "url",
            url: "https://linux.do/latest?order=created",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+N",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "My Topic",
            actionType: "url",
            url: "https://linux.do/u/0_v/activity/topics",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+M",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "书签",
            actionType: "url",
            url: "https://linux.do/u/0_v/activity/bookmarks",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+B",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "Views",
            actionType: "url",
            url: "https://linux.do/top?ascending=false&order=views",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+V",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "Search: latest_topic",
            actionType: "url",
            url: "https://linux.do/search?q=%s+order:latest_topic",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+U",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "最新帖子",
            actionType: "url",
            url: "https://linux.do/latest",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+L",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "热门帖子",
            actionType: "url",
            url: "https://linux.do/top",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+T",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "分类 页",
            actionType: "url",
            url: "https://linux.do/categories",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+C",
            icon: "https://linux.do/logo-1024.svg"
        },
        {
            name: "标签 页",
            actionType: "url",
            url: "https://linux.do/tags",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+T",
            icon: "https://linux.do/logo-1024.svg"
        }
    ];

    // 创建快捷键引擎实例
    const engine = window.ShortcutTemplate.createShortcutEngine({
        // 菜单和面板配置
        menuCommandLabel: "Linux Do - 设置快捷键",
        panelTitle: "Linux Do - 自定义快捷键",

        // 存储键配置
        storageKeys: {
            shortcuts: "linuxdo_shortcuts_v3",
            iconCachePrefix: "linuxdo_icon_cache_v2::",
            userIcons: "linuxdo_user_icons_v2"
        },

        // UI配置
        ui: {
            idPrefix: "linuxdo",
            cssPrefix: "linuxdo",
            compactBreakpoint: 800
        },

        // 图标配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,

        // 日志标签
        consoleTag: "[Linux Do Shortcut Script]",

        // 主题颜色
        colors: {
            primary: "#5D5CDE"  // Linux Do 主题色
        },

        // Linux Do 图标绕过缓存（直接使用，因为是本站资源）
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://linux.do/');
        },

        // 获取当前搜索关键词（从URL参数或页面状态获取）
        getCurrentSearchTerm: () => {
            try {
                // 尝试从URL参数获取
                const urlParams = new URL(location.href).searchParams;
                let searchTerm = urlParams.get("q");

                if (!searchTerm) {
                    // 尝试从搜索框获取
                    const searchInput = document.querySelector('#search-term') ||
                                       document.querySelector('input[type="search"]') ||
                                       document.querySelector('.search-query');
                    if (searchInput && searchInput.value.trim()) {
                        searchTerm = searchInput.value.trim();
                    }
                }

                if (!searchTerm) {
                    // 如果在搜索页面，尝试从页面标题获取
                    if (location.pathname.includes('/search')) {
                        const titleMatch = document.title.match(/搜索.*?[""](.+?)[""]/) ||
                                         document.title.match(/Search.*?[""](.+?)[""]/) ||
                                         document.title.match(/搜索\s*(.+?)\s*-/);
                        if (titleMatch && titleMatch[1]) {
                            searchTerm = titleMatch[1].trim();
                        }
                    }
                }

                return searchTerm;
            } catch (err) {
                console.warn("[Linux Do Shortcut Script] getCurrentSearchTerm error", err);
                return null;
            }
        },

        // URL模板解析器
        resolveUrlTemplate: (targetUrl, { getCurrentSearchTerm, placeholderToken }) => {
            const placeholder = placeholderToken || '%s';
            if (!targetUrl.includes(placeholder)) return targetUrl;

            let currentKeyword = null;
            try {
                currentKeyword = typeof getCurrentSearchTerm === 'function'
                    ? getCurrentSearchTerm()
                    : null;
            } catch (err) {
                console.warn("[Linux Do Shortcut Script] resolveUrlTemplate error", err);
            }

            if (currentKeyword !== null && currentKeyword !== undefined && currentKeyword.trim()) {
                return targetUrl.replaceAll(placeholder, encodeURIComponent(currentKeyword.trim()));
            }

            // 如果没有搜索词，对于搜索类URL返回基础URL
            if (placeholder === '%s' && targetUrl.includes('/search?q=')) {
                return targetUrl.substring(0, targetUrl.indexOf('?'));
            }

            // 否则移除占位符
            return targetUrl.replaceAll(placeholder, '');
        },

        // 占位符标记
        placeholderToken: '%s',

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
            menuLabelFallback: "打开快捷键设置"
        }
    });

    // 初始化引擎
    engine.init();

    // 导出引擎实例以供调试（可选）
    if (typeof window !== 'undefined') {
        window.LinuxDoShortcutEngine = engine;
    }

    console.log("[Linux Do Shortcut Script] 快捷键引擎已启动，基于 Template 模块 v" + window.ShortcutTemplate.VERSION);
})();
