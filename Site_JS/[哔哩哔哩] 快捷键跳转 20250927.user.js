// ==UserScript==
// @name         [哔哩哔哩] 快捷键跳转 20250927
// @namespace    0_V userscripts/bilibiliSearch Shortcuts
// @version      4.0.0
// @description  在 Bilibili 搜索页面，通过快捷键快速切换到对应的搜索分类，支持多种操作类型（URL跳转/元素点击/按键模拟），包含图标库管理、完善暗黑模式支持、智能事件隔离、滚动锁定等高级功能。基于模版架构全面升级。
// @match        https://*.bilibili.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/bilibili_keycap.svg
// @require      https://github.com/0-V-linuxdo/-/raw/e17b029d255053ccec15e648156adbcec93924e5/%5BTemplate%5D%20%E5%BF%AB%E6%8D%B7%E9%94%AE%E8%B7%B3%E8%BD%AC%2020250924.js
// ==/UserScript==

(function () {
    'use strict';

    // 检查模版是否正确加载
    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[哔哩哔哩快捷键脚本] 模版模块未找到。');
        return;
    }

    // 默认图标URL
    const defaultIconURL = "https://www.bilibili.com/favicon.ico";

    // 默认图标库
    const defaultIcons = [
        { name: "哔哩哔哩", url: "https://www.bilibili.com/favicon.ico" },
        { name: "哔哩哔哩搜索", url: "https://search.bilibili.com/favicon.ico" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "百度", url: "https://www.baidu.com/favicon.ico" },
        { name: "知乎", url: "https://static.zhihu.com/heifetz/favicon.ico" },
        { name: "微博", url: "https://weibo.com/favicon.ico" },
        { name: "贴吧", url: "https://tieba.baidu.com/favicon.ico" },
        { name: "豆瓣", url: "https://www.douban.com/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
    ];

    // 受保护的核心B站图标（不可删除）
    const protectedIconUrls = [
        "https://www.bilibili.com/favicon.ico",
        "https://search.bilibili.com/favicon.ico"
    ];

    // 默认快捷键配置
    const defaultShortcuts = [
        // --- 基本搜索跳转 ---
        {
            name: "综合搜索",
            actionType: "url",
            url: "https://search.bilibili.com/all?keyword=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+H",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        {
            name: "视频搜索",
            actionType: "url",
            url: "https://search.bilibili.com/video?keyword=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+J",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        {
            name: "直播搜索",
            actionType: "url",
            url: "https://search.bilibili.com/live?keyword=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+L",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        {
            name: "番剧搜索",
            actionType: "url",
            url: "https://search.bilibili.com/bangumi?keyword=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+B",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        {
            name: "UP主搜索",
            actionType: "url",
            url: "https://search.bilibili.com/upuser?keyword=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+U",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        {
            name: "专栏搜索",
            actionType: "url",
            url: "https://search.bilibili.com/article?keyword=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+A",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        // --- 快捷功能 ---
        {
            name: "回到首页",
            actionType: "url",
            url: "https://www.bilibili.com/",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+1",
            icon: "https://www.bilibili.com/favicon.ico"
        },
        {
            name: "打开搜索",
            actionType: "url",
            url: "https://search.bilibili.com/",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+2",
            icon: "https://www.bilibili.com/favicon.ico"
        }
    ];

    // 创建快捷键引擎
    const engine = window.ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "Bilibili - 设置快捷键",
        panelTitle: "Bilibili - 自定义快捷键",
        storageKeys: {
            shortcuts: "bilibili_search_shortcuts_v3",
            iconCachePrefix: "bilibili_icon_cache_v2::",
            userIcons: "bilibili_user_icons_v2"
        },
        ui: {
            idPrefix: "bilibili",
            cssPrefix: "bilibili",
            compactBreakpoint: 800
        },

        // 图标配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,

        // 样式配置
        colors: {
            primary: "#5D5CDE"  // 哔哩哔哩主色调
        },

        // 控制台标签
        consoleTag: "[哔哩哔哩快捷键脚本]",

        // 图标缓存策略：B站图标绕过缓存直接加载
        shouldBypassIconCache: (url) => {
            return url && (
                url.startsWith('https://www.bilibili.com/') ||
                url.startsWith('https://search.bilibili.com/')
            );
        },

        // 获取当前搜索关键词的函数
        getCurrentSearchTerm: () => {
            try {
                const urlParams = new URL(location.href).searchParams;
                return urlParams.get("keyword") || urlParams.get("q") || "";
            } catch (err) {
                console.warn("[哔哩哔哩快捷键脚本] 获取搜索关键词失败", err);
                return "";
            }
        },

        // URL模版解析函数
        resolveUrlTemplate: (targetUrl, { getCurrentSearchTerm, placeholderToken }) => {
            const placeholder = placeholderToken || '%s';
            if (!targetUrl.includes(placeholder)) return targetUrl;

            let currentKeyword = null;
            try {
                currentKeyword = typeof getCurrentSearchTerm === 'function'
                    ? getCurrentSearchTerm()
                    : (() => {
                        const urlParams = new URL(location.href).searchParams;
                        return urlParams.get("keyword") || urlParams.get("q") || "";
                    })();
            } catch (err) {
                console.warn("[哔哩哔哩快捷键脚本] URL模版解析错误", err);
            }

            if (currentKeyword !== null && currentKeyword !== undefined && currentKeyword !== "") {
                return targetUrl.replaceAll(placeholder, encodeURIComponent(currentKeyword));
            }

            // 如果没有关键词，对于搜索类URL移除查询参数
            if (placeholder === '%s' && targetUrl.includes('?')) {
                return targetUrl.substring(0, targetUrl.indexOf('?'));
            }
            return targetUrl.replaceAll(placeholder, '');
        },

        // 占位符token
        placeholderToken: '%s',

        // 中文文本配置
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

    // 可选：暴露引擎到全局作用域以供调试
    if (typeof window !== 'undefined') {
        window.bilibiliShortcutEngine = engine;
    }

})();
