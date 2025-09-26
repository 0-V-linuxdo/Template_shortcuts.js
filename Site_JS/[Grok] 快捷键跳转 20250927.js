// ==UserScript==
// @name         [Grok] 快捷键跳转 20250927
// @namespace    0_V userscripts/[Grok] 快捷键跳转
// @version      4.0.0
// @description  为Grok网站添加快捷键功能，支持自定义按键和图标，以及自动选择，完美适配暗黑模式。新增: 动作类型系统(URL跳转/元素点击/按键模拟)、预设图标库(可折叠/自定义添加/长按删除)、图标缓存机制。使用Template模块重构。
// @match        https://grok.dairoot.cn/*
// @match        https://grok.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://github.com/0-V-linuxdo/-/raw/e17b029d255053ccec15e648156adbcec93924e5/%5BTemplate%5D%20%E5%BF%AB%E6%8D%B7%E9%94%AE%E8%B7%B3%E8%BD%AC%2020250924.js
// @icon         https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/grok_keycap.svg
// ==/UserScript==

(function () {
    'use strict';

    // 检查模版模块是否加载
    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Grok Shortcut] Template module not found.');
        return;
    }

    // 默认图标URL
    const defaultIconURL = "https://grok.com/images/favicon-light.png";

    // 默认图标库
    const defaultIcons = [
        { name: "Grok", url: "https://grok.com/images/favicon-light.png" },
        { name: "Grok Dark", url: "https://grok.com/images/favicon-dark.png" },
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

    // 核心Grok图标（受保护图标）
    const protectedIconUrls = [
        "https://grok.com/images/favicon-light.png",
        "https://grok.com/images/favicon-dark.png"
    ];

    // 默认快捷键配置
    const defaultShortcuts = [
        {
            name: "用户切换",
            actionType: "selector",
            selector: "#floatingBall",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+U",
            icon: "data:image/svg+xml,%3Csvg%20t%3D%221731915779816%22%20class%3D%22icon%22%20viewBox%3D%220%200%201024%201024%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20p-id%3D%222446%22%20width%3D%2225%22%20height%3D%2225%22%3E%3Cpath%20d%3D%22M759.04%20334.976a247.936%20247.936%200%201%200-393.024%20201.216l-0.896%200.384a372.608%20372.608%200%200%200-119.296%2080.64c-34.56%2034.496-61.504%2074.688-80.448%20119.488A373.632%20373.632%200%200%200%20136%20874.816a8%208%200%200%200%208%208.192h59.904a8.064%208.064%200%200%200%208-7.808%20298.368%20298.368%200%200%201%2087.616-204.288%20296.384%20296.384%200%200%201%20211.456-87.936%20247.936%20247.936%200%200%200%20248-248zM510.912%20507.008a171.968%20171.968%200%201%201%200-344%20171.968%20171.968%200%200%201%200%20344zM615.936%20728h264a8%208%200%200%200%208-8v-56a8%208%200%200%200-8-8H703.424l47.232-60.16a8%208%200%200%200-6.272-12.928l-72.64%200.064a16.32%2016.32%200%200%200-12.608%206.144l-68.48%2087.04a32.064%2032.064%200%200%200%2025.28%2051.84z%20m240%2064H592a8%208%200%200%200-8%208v56c0%204.416%203.584%208%208%208h176.512l-47.232%2060.16a8%208%200%200%200%206.272%2012.928l72.64-0.064a16.32%2016.32%200%200%200%2012.608-6.144l68.48-87.04A32.064%2032.064%200%200%200%20856%20792z%22%20p-id%3D%222447%22%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
        },
        {
            name: "Private",
            actionType: "selector",
            selector: 'a[aria-label*="Switch to "]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+I",
            icon: 'data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20class%3D%22stroke-%5B2%5D%20%22%20stroke-width%3D%222%22%20data-testid%3D%22pi-ghost%22%3E%3Cellipse%20cx%3D%2210%22%20cy%3D%2210.25%22%20rx%3D%221.25%22%20ry%3D%221.75%22%20fill%3D%22currentColor%22%3E%3C%2Fellipse%3E%3Cellipse%20cx%3D%2214%22%20cy%3D%2210.25%22%20rx%3D%221.25%22%20ry%3D%221.75%22%20fill%3D%22currentColor%22%3E%3C%2Fellipse%3E%3Cpath%20d%3D%22M12%204C4%204%208.07627%2010.7212%203%2013C3%2014.6491%204.40343%2014.5%204.93%2015.77C5.37046%2016.8323%204.27588%2018.9597%204%2020H8L12%2021L16%2020H20C19.6222%2018.7198%2018.8092%2017.1437%2019.075%2015.7742C19.3479%2014.3681%2021%2014.742%2021%2013C15.9237%2010.7212%2020%204%2012%204Z%22%20stroke%3D%22currentColor%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E'
        },
        {
            name: "New Chat",
            actionType: "selector",
            selector: '[aria-label="Home page"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+N",
            icon: "data:image/svg+xml,%3Csvg%20width%3D%2218%22%20height%3D%2218%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20class%3D%22stroke-%5B2%5D%20%22%3E%3Cpath%20d%3D%22M10%204V4C8.13623%204%207.20435%204%206.46927%204.30448C5.48915%204.71046%204.71046%205.48915%204.30448%206.46927C4%207.20435%204%208.13623%204%2010V13.6C4%2015.8402%204%2016.9603%204.43597%2017.816C4.81947%2018.5686%205.43139%2019.1805%206.18404%2019.564C7.03968%2020%208.15979%2020%2010.4%2020H14C15.8638%2020%2016.7956%2020%2017.5307%2019.6955C18.5108%2019.2895%2019.2895%2018.5108%2019.6955%2017.5307C20%2016.7956%2020%2015.8638%2020%2014V14%22%20stroke%3D%22currentColor%22%20stroke-linecap%3D%22square%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M12.4393%2014.5607L19.5%207.5C20.3284%206.67157%2020.3284%205.32843%2019.5%204.5C18.6716%203.67157%2017.3284%203.67157%2016.5%204.5L9.43934%2011.5607C9.15804%2011.842%209%2012.2235%209%2012.6213V15H11.3787C11.7765%2015%2012.158%2014.842%2012.4393%2014.5607Z%22%20stroke%3D%22currentColor%22%20stroke-linecap%3D%22square%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
        },
        {
            name: "Sidebar",
            actionType: "selector",
            selector: 'button[data-sidebar="trigger"][type="button"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+B",
            icon: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2218%22%20height%3D%2218%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-chevrons-right%20rotate-180%20transition-transform%20duration-200%22%3E%3Cpath%20d%3D%22m6%2017%205-5-5-5%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22m13%2017%205-5-5-5%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
        },
        {
            name: "Project",
            actionType: "url",
            url: "https://grok.com/project",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+P",
            icon: "data:image/svg+xml,%3Csvg%20width%3D%2218%22%20height%3D%2218%22%20viewBox%3D%22-1%20-1%2025%2025%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20class%3D%22stroke-%5B2%5D%20%22%3E%3Cpath%20d%3D%22M3.33965%2017L11.9999%2022L20.6602%2017V7L11.9999%202L3.33965%207V17Z%22%20stroke%3D%22currentColor%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M11.9999%2012L3.4999%207M11.9999%2012L12%2021.5M11.9999%2012L20.5%207%22%20stroke%3D%22currentColor%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
        }
    ];

    // 创建快捷键引擎实例
    const engine = window.ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "Grok - 设置快捷键",
        panelTitle: "Grok - 自定义快捷键",

        // 存储配置（保持与原脚本一致）
        storageKeys: {
            shortcuts: 'grok_shortcuts',
            iconCachePrefix: 'grok_icon_cache_v1::',
            userIcons: 'grok_user_icons_v1'
        },

        // UI 配置
        ui: {
            idPrefix: 'grok',
            cssPrefix: 'grok',
            compactBreakpoint: 800
        },

        // 图标配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,

        // 默认快捷键
        defaultShortcuts,

        // 主题颜色（Grok主题色）
        colors: {
            primary: '#5D5CDE'
        },

        // 日志标签
        consoleTag: '[Grok Shortcut Script]',

        // 图标缓存绕过规则（对Grok图标不使用缓存）
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://grok.com/');
        },

        // 智能导航配置（支持SPA路由）
        resolveUrlTemplate: (targetUrl, { getCurrentSearchTerm, placeholderToken }) => {
            // Grok不使用搜索词替换，直接返回原URL
            return targetUrl;
        },

        // 文本配置
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

})();
