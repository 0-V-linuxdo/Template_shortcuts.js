// ==UserScript==
// @name         [Le Chat] 快捷键跳转 20250925
// @namespace    0_V userscripts/[Le Chat] 快捷键跳转
// @version      1.1.1
// @description  为 Le Chat 添加自定义快捷键，依托通用模板实现快捷面板、图标库、统计筛选、暗黑模式、自适应布局、事件隔离、快捷键捕获等功能。
// @match        https://chat.mistral.ai/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://github.com/0-V-linuxdo/-/raw/e17b029d255053ccec15e648156adbcec93924e5/%5BTemplate%5D%20%E5%BF%AB%E6%8D%B7%E9%94%AE%E8%B7%B3%E8%BD%AC%2020250924.js
// @icon         data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2064%2064%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20aria-hidden%3D%22true%22%20role%3D%22img%22%20class%3D%22iconify%20iconify--emojione-monotone%22%20preserveAspectRatio%3D%22xMidYMid%20meet%22%20fill%3D%22%23000000%22%3E%0A%20%20%3Cg%20id%3D%22SVGRepo_bgCarrier%22%20stroke-width%3D%220%22%3E%3C%2Fg%3E%0A%20%20%3Cg%20id%3D%22SVGRepo_tracerCarrier%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3C%2Fg%3E%0A%20%20%3Cg%20id%3D%22SVGRepo_iconCarrier%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M52%202H12C6.478%202%202%206.477%202%2011.999V52c0%205.522%204.478%2010%2010%2010h40c5.522%200%2010-4.478%2010-10V11.999C62%206.477%2057.522%202%2052%202zm5%2043.666A8.333%208.333%200%200%201%2048.667%2054H15.333A8.333%208.333%200%200%201%207%2045.666V12.333A8.332%208.332%200%200%201%2015.333%204h33.334A8.332%208.332%200%200%201%2057%2012.333v33.333z%22%20fill%3D%22%23000000%22%3E%3C%2Fpath%3E%0A%20%20%20%20%3Cg%20transform%3D%22translate(15.2%2C%2013.4)%20scale(1.4)%22%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M3.428%203.4h3.429v3.428H3.428V3.4zm13.714%200h3.43v3.428h-3.43V3.4z%22%20fill%3D%22gold%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M3.428%206.828h6.857v3.429H3.429V6.828zm10.286%200h6.857v3.429h-6.857V6.828z%22%20fill%3D%22%23FFAF00%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M3.428%2010.258h17.144v3.428H3.428v-3.428z%22%20fill%3D%22%23FF8205%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M3.428%2013.686h3.429v3.428H3.428v-3.428zm6.858%200h3.429v3.428h-3.429v-3.428zm6.856%200h3.43v3.428h-3.43v-3.428z%22%20fill%3D%22%23FA500F%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M0%2017.114h10.286v3.429H0v-3.429zm13.714%200H24v3.429H13.714v-3.429z%22%20fill%3D%22%23E10500%22%3E%3C%2Fpath%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A
// ==/UserScript==

(function () {
    'use strict';

    if (!window.ShortcutTemplate || typeof window.ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Le Chat Shortcut] Template module not found.');
        return;
    }

    const defaultIconURL = 'https://chat.mistral.ai/favicon.ico';

    const defaultIcons = [
        { name: 'Le Chat', url: 'https://chat.mistral.ai/favicon.ico' },
        { name: 'Mistral AI', url: 'https://mistral.ai/favicon.ico' },
        { name: 'Google', url: 'https://www.google.com/favicon.ico' },
        { name: 'Bing', url: 'https://www.bing.com/favicon.ico' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/favicon.ico' },
        { name: 'Wikipedia', url: 'https://www.wikipedia.org/static/favicon/wikipedia.ico' },
        { name: 'Reddit', url: 'https://www.reddit.com/favicon.ico' },
        { name: 'Stack Overflow', url: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' },
        { name: 'Twitter / X', url: 'https://abs.twimg.com/favicons/twitter.3.ico' },
        { name: 'YouTube', url: 'https://www.youtube.com/favicon.ico' }
    ];

    const protectedIconUrls = [
        'https://chat.mistral.ai/favicon.ico',
        'https://mistral.ai/favicon.ico'
    ];

    const defaultShortcuts = [
        {
            name: 'New Chat',
            actionType: 'selector',
            selector: 'button[aria-label*="New"], button[aria-label*="new"], a[href="/chat"]',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+N',
            icon: 'https://chat.mistral.ai/favicon.ico'
        },
        {
            name: 'Toggle Think Mode',
            actionType: 'selector',
            selector: 'button:has(.lucide-lightbulb)',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+T',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M15%2014c.2-1%20.7-1.7%201.5-2.5%201-.9%201.5-2.2%201.5-3.5A6%206%200%200%200%206%208c0%201%20.2%202.2%201.5%203.5.7.7%201.3%201.5%201.5%202.5%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M9%2018h6%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M10%2022h4%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E'
        },
        {
            name: 'Toggle Research Mode',
            actionType: 'selector',
            selector: 'button:has(.lucide-infinity)',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+R',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%2016c5%200%207-8%2012-8a4%204%200%200%201%200%208c-5%200-7-8-12-8a4%204%200%201%200%200%208%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E'
        },
        {
            name: 'Toggle Sidebar',
            actionType: 'selector',
            selector: 'button[aria-label*="sidebar" i], button[aria-label*="panel" i], div[role="button"][aria-label*="sidebar" i], button:has(svg.lucide-panel-left)',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+B',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20width%3D%2218%22%20height%3D%2218%22%20x%3D%223%22%20y%3D%223%22%20rx%3D%222%22%3E%3C%2Frect%3E%3Cpath%20d%3D%22M9%203v18%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E'
        },
        {
            name: 'Upload Files',
            actionType: 'selector',
            selector: 'button[aria-label*="file"]',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+F',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M5%2012h14%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M12%205v14%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E'
        },
        {
            name: 'Voice Mode',
            actionType: 'selector',
            selector: 'button[aria-label*="Voice"]',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+V',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M12%2019v3%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M19%2010v2a7%207%200%200%201-14%200v-2%22%3E%3C%2Fpath%3E%3Crect%20x%3D%229%22%20y%3D%222%22%20width%3D%226%22%20height%3D%2213%22%20rx%3D%223%22%3E%3C%2Frect%3E%3C%2Fsvg%3E'
        },
        {
            name: 'Agent Selection',
            actionType: 'selector',
            selector: 'div.click-focus-input button:first-child',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+G',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20298.24155%20298.24154%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22currentColor%22%3E%3Cpolygon%20points%3D%22242.424%2C90.909%20242.424%2C121.212%20212.121%2C121.212%20212.121%2C151.515%20181.818%2C151.515%20181.818%2C121.212%20151.515%2C121.212%20151.515%2C90.909%20121.212%2C90.909%20121.212%2C212.121%2090.909%2C212.121%2090.909%2C242.424%20181.818%2C242.424%20181.818%2C212.121%20151.515%2C212.121%20151.515%2C181.818%20181.818%2C181.818%20181.818%2C212.121%20212.121%2C212.121%20212.121%2C181.818%20242.424%2C181.818%20242.424%2C212.121%20212.121%2C212.121%20212.121%2C242.424%20303.03%2C242.424%20303.03%2C212.121%20272.727%2C212.121%20272.727%2C90.909%22%20transform%3D%22translate(-47.848728%2C-17.545727)%22%3E%3C%2Fpolygon%3E%3C%2Fsvg%3E'
        },
        {
            name: 'Tools Selection',
            actionType: 'selector',
            selector: 'button[data-testid="tools-selection-button"]',
            url: '',
            urlMethod: 'current',
            urlAdvanced: 'href',
            simulateKeys: '',
            hotkey: 'CTRL+SHIFT+T',
            icon: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20width%3D%227%22%20height%3D%227%22%20x%3D%223%22%20y%3D%223%22%20rx%3D%221%22%3E%3C%2Frect%3E%3Crect%20width%3D%227%22%20height%3D%227%22%20x%3D%2214%22%20y%3D%223%22%20rx%3D%221%22%3E%3C%2Frect%3E%3Crect%20width%3D%227%22%20height%3D%227%22%20x%3D%2214%22%20y%3D%2214%22%20rx%3D%221%22%3E%3C%2Frect%3E%3Crect%20width%3D%227%22%20height%3D%227%22%20x%3D%223%22%20y%3D%2214%22%20rx%3D%221%22%3E%3C%2Frect%3E%3C%2Fsvg%3E'
        }
    ];

    const engine = window.ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: 'Le Chat - 设置快捷键',
        panelTitle: 'Le Chat - 自定义快捷键',
        storageKeys: {
            shortcuts: 'lechat_shortcuts_v1',
            iconCachePrefix: 'lechat_icon_cache_v1::',
            userIcons: 'lechat_user_icons_v1'
        },
        ui: {
            idPrefix: 'lechat',
            cssPrefix: 'lechat',
            compactBreakpoint: 800
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        consoleTag: '[Le Chat Shortcut Script]',
        colors: {
            primary: '#0066cc'
        },
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://chat.mistral.ai/');
        },
        text: {
            stats: {
                total: '总计',
                url: 'URL跳转',
                selector: '元素点击',
                simulate: '按键模拟'
            },
            buttons: {
                addShortcut: '添加新快捷键',
                saveAndClose: '保存并关闭',
                confirm: '确定',
                cancel: '取消',
                delete: '删除',
                edit: '编辑',
                clear: '清除'
            },
            dialogs: {
                alert: '提示',
                confirm: '确认',
                prompt: '输入'
            },
            hints: {
                hotkey: '点击此处，然后按下快捷键组合',
                simulate: '点击此处，然后按下要模拟的按键组合',
                hotkeyHelp: '💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合',
                simulateHelp: '⚡ 将模拟这个按键组合发送到网页'
            },
            menuLabelFallback: '打开快捷键设置'
        }
    });

    engine.init();
})();
