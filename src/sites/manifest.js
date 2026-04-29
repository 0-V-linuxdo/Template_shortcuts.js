/* -------------------------------------------------------------------------- *
 * Site Manifest · Legacy userscript build targets
 * -------------------------------------------------------------------------- */

export const RELEASE_PUBLISH_CONFIG = Object.freeze({
    githubOwner: "0-V-linuxdo",
    repository: "Template_shortcuts.js",
    releaseBranch: "release",
    gitUserName: "0-V-linuxdo",
    gitUserEmail: "0_v@linux.do"
});

export const MAIN_RAW_BASE_URL = `https://github.com/${RELEASE_PUBLISH_CONFIG.githubOwner}/${RELEASE_PUBLISH_CONFIG.repository}/raw/refs/heads/main`;
export const RELEASE_RAW_BASE_URL = `https://github.com/${RELEASE_PUBLISH_CONFIG.githubOwner}/${RELEASE_PUBLISH_CONFIG.repository}/raw/refs/heads/${RELEASE_PUBLISH_CONFIG.releaseBranch}`;
export const RELEASE_TEMPLATE_CORE_FILE = "[Template] shortcut core.js";

function normalizeReleaseAssetPath(filePath = "") {
    const normalizedPath = String(filePath || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^(?:\.\/)+/, "")
        .replace(/^\/+/, "");

    if (!normalizedPath) return "";
    if (normalizedPath.split("/").some((segment) => segment === "..")) {
        throw new Error(`Release asset path must not traverse parent directories: ${filePath}`);
    }
    return normalizedPath;
}

function encodeAssetPath(normalizedPath = "") {
    const pathValue = String(normalizedPath || "").trim();
    if (!pathValue) return "";
    return pathValue.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function releaseAsset(relativePath = "") {
    const normalizedPath = normalizeReleaseAssetPath(relativePath);
    const encodedPath = encodeAssetPath(normalizedPath);
    return encodedPath ? `${RELEASE_RAW_BASE_URL}/${encodedPath}` : RELEASE_RAW_BASE_URL;
}

function mainAsset(relativePath = "") {
    const normalizedPath = normalizeReleaseAssetPath(relativePath);
    const encodedPath = encodeAssetPath(normalizedPath);
    return encodedPath ? `${MAIN_RAW_BASE_URL}/${encodedPath}` : MAIN_RAW_BASE_URL;
}

const RELEASE_ICON_BASE_URL = releaseAsset("Site_Icon");

export function releaseTemplateJs(relativePath = "") {
    const normalizedPath = normalizeReleaseAssetPath(relativePath);
    return normalizedPath ? releaseAsset(`Template_JS/${normalizedPath}`) : releaseAsset("Template_JS");
}

export function releaseTemplateCore() {
    return releaseTemplateJs(RELEASE_TEMPLATE_CORE_FILE);
}

function releaseIcon(fileName) {
    return releaseAsset(`Site_Icon/${fileName}`);
}

function mainIcon(fileName) {
    return mainAsset(`Site_Icon/${fileName}`);
}

export const SITE_MANIFEST = Object.freeze([
    {
        siteId: "chatgpt",
        displayName: "[ChatGPT] 快捷键跳转",
        sourceEntry: "src/sites/chatgpt/index.js",
        userscriptOutput: "Site_JS/[ChatGPT] 快捷键跳转 20250927.user.js",
        metadata: {
            name: "[ChatGPT] 快捷键跳转 [20260425] v1.0.7",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 ChatGPT 提供可视化自定义快捷键：支持 URL/按钮/按键动作、工具菜单（Web/Canvas/Thinking/Deep research/Create image）一键触发，以及快捷输入（文本+图片、循环发送、自动新建对话）。",
            version: "[20260425] v1.0.7",
            updateLog: "1.0.7: 新增 Set custom instructions 原生快捷键；新增 General、Account、Data Controls、Schedules、Security 设置页快捷跳转，并为旧配置自动补齐这些默认项。",
            localized: {
                "en-US": {
                    name: "[ChatGPT] Shortcut Jump [20260425] v1.0.7",
                    description: "Visual custom shortcuts for ChatGPT: URL/button/key actions, one-step tool menu triggers, and Quick Input for text, images, loops, and automatic new chats.",
                    updateLog: "1.0.7: Added native Set custom instructions shortcut and General, Account, Data Controls, Schedules, and Security settings links; old configs are auto-filled."
                }
            },
            match: [
                "https://chatgpt.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("ChatGPT_keycap.svg")
        }
    },
    {
        siteId: "claude",
        displayName: "[Claude] 快捷键跳转",
        sourceEntry: "src/sites/claude/index.js",
        userscriptOutput: "Site_JS/[Claude] 快捷键跳转 20250927.user.js",
        metadata: {
            name: "[Claude] 快捷键跳转 [20260423] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Claude AI 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)。功能包括: 侧边栏切换、新建话题、历史记录等快捷操作。基于Template模块重构。",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[Claude] Shortcut Jump [20260423] v1.0.0",
                    description: "Adds visual custom shortcuts for Claude AI, including URL jumps, clicks, simulated keys, custom icons, dark mode, and a reusable icon library.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://claude.ai/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("claude_keycap.svg")
        }
    },
    {
        siteId: "deepseek",
        displayName: "[DeepSeek] 快捷键跳转",
        sourceEntry: "src/sites/deepseek/index.js",
        userscriptOutput: "Site_JS/[DeepSeek] 快捷键跳转 20250926.user.js",
        metadata: {
            name: "[DeepSeek] 快捷键跳转 [20260423] v1.0.0",
            namespace: "0_V userscripts/[DeepSeek] shortcut",
            description: "为 DeepSeek Chat 添加自定义快捷键(跳转/点击/模拟按键、可视化设置面板、按类型筛选、深色模式、自适应布局、图标缓存、快捷键捕获等功能)，基于模版重构。#refactor2025",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[DeepSeek] Shortcut Jump [20260423] v1.0.0",
                    description: "Adds custom shortcuts for DeepSeek Chat with URL jumps, clicks, simulated keys, a visual settings panel, filters, dark mode, responsive layout, icon cache, and shortcut capture.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://chat.deepseek.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("deepseek_keycap.svg")
        }
    },
    {
        siteId: "gemini",
        displayName: "[Gemini] 快捷键跳转",
        sourceEntry: "src/sites/gemini/index.js",
        userscriptOutput: "Site_JS/[Gemini] 快捷键跳转 20251213.user.js",
        metadata: {
            name: "[Gemini] 快捷键跳转 [20260425] v1.0.2",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Gemini 提供可视化自定义快捷键：快速新建会话、切换模型、打开工具、Pin/Delete 对话与快捷输入发送，支持按键和图标自定义。",
            version: "[20260425] v1.0.2",
            updateLog: "1.0.2: 脚本图标改为黑底原生 Gemini 星芒，并将默认快捷键迁移到 Gemini UI 左侧原生图标。",
            localized: {
                "en-US": {
                    name: "[Gemini] Shortcut Jump [20260425] v1.0.2",
                    description: "Visual custom shortcuts for Gemini: new chats, model switching, tools, pin/delete conversation actions, Quick Input, and customizable keys and icons.",
                    updateLog: "1.0.2: Switched the script icon to a black Gemini sparkle and migrated default shortcuts to native Gemini-style icons."
                }
            },
            match: [
                "https://gemini.google.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: mainIcon("gemini_keycap.svg")
        }
    },
    {
        siteId: "grok",
        displayName: "[Grok] 快捷键跳转",
        sourceEntry: "src/sites/grok/index.js",
        userscriptOutput: "Site_JS/[Grok] 快捷键跳转 20250927.user.js",
        metadata: {
            name: "[Grok] 快捷键跳转 [20260424] v1.0.2",
            namespace: "0_V userscripts/[Grok] 快捷键跳转",
            description: "为Grok网站添加快捷键功能，支持自定义按键和图标，以及自动选择，完美适配暗黑模式。新增: 动作类型系统(URL跳转/元素点击/按键模拟)、预设图标库(可折叠/自定义添加/长按删除)、图标缓存机制。使用Template模块重构。",
            version: "[20260424] v1.0.2",
            updateLog: "1.0.2: 修复 Grok 侧边栏状态误判导致的展开/折叠来回横跳；继续保留 viewport 宽度 <= 1024px 的后台自动展开抑制。",
            localized: {
                "en-US": {
                    name: "[Grok] Shortcut Jump [20260424] v1.0.2",
                    description: "Adds custom shortcuts for Grok with configurable keys and icons, dark mode support, action types, a preset icon library, and icon caching.",
                    updateLog: "1.0.2: Fixed Grok sidebar state detection loops and kept background auto-expand suppressed for viewports <= 1024px."
                }
            },
            match: [
                "https://grok.dairoot.cn/*",
                "https://grok.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("grok_keycap.svg")
        }
    },
    {
        siteId: "kagi",
        displayName: "[Kagi] 快捷键跳转",
        sourceEntry: "src/sites/kagi/index.js",
        userscriptOutput: "Site_JS/[Kagi] 快捷键跳转 20250924.user.js",
        metadata: {
            name: "[Kagi] 快捷键跳转 [20260423] v1.0.0",
            namespace: "0_V userscripts/[Kagi] shortcut",
            description: "为 Kagi Assistant 与 Kagi Search 提供自定义快捷键、可视化设置面板、图标库、按类型筛选、深色模式适配等增强功能（依赖 Template 模块）。#refactor2025",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[Kagi] Shortcut Jump [20260423] v1.0.0",
                    description: "Custom shortcuts for Kagi Assistant and Kagi Search with a visual settings panel, icon library, type filters, and dark mode support.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://*.kagi.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("Kagi_keycap.svg")
        }
    },
    {
        siteId: "linux-do",
        displayName: "[LINUX DO] 快捷键跳转",
        sourceEntry: "src/sites/linux-do/index.js",
        userscriptOutput: "Site_JS/[LINUX DO] 快捷键跳转 20250927.user.js",
        metadata: {
            name: "[LINUX DO] 快捷键跳转 [20260423] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Linux Do 提供可视化快捷键中心：支持 URL 跳转、元素点击、按键模拟、搜索模板变量与图标库管理，并适配 Discourse 的 SPA 导航场景。",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[LINUX DO] Shortcut Jump [20260423] v1.0.0",
                    description: "A visual shortcut center for Linux Do with URL jumps, element clicks, key simulation, search template variables, icon library management, and Discourse SPA navigation support.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://linux.do/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("linux.do_keycap.svg")
        }
    },
    {
        siteId: "le-chat",
        displayName: "[Le Chat] 快捷键跳转",
        sourceEntry: "src/sites/le-chat/index.js",
        userscriptOutput: "Site_JS/[Le Chat] 快捷键跳转 20250925.user.js",
        metadata: {
            name: "[Le Chat] 快捷键跳转 [20260423] v1.0.0",
            namespace: "0_V userscripts/[Le Chat] 快捷键跳转",
            description: "为 Le Chat 添加自定义快捷键，依托通用模板实现快捷面板、图标库、统计筛选、暗黑模式、自适应布局、事件隔离、快捷键捕获等功能。",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[Le Chat] Shortcut Jump [20260423] v1.0.0",
                    description: "Adds custom shortcuts for Le Chat with a shortcut panel, icon library, stats filters, dark mode, responsive layout, event isolation, and shortcut capture.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://chat.mistral.ai/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("Le_Chat_keycap.svg")
        }
    },
    {
        siteId: "perplexity",
        displayName: "[Perplexity] 快捷键跳转",
        sourceEntry: "src/sites/perplexity/index.js",
        userscriptOutput: "Site_JS/[Perplexity] 快捷键跳转 20250927.user.js",
        metadata: {
            name: "[Perplexity] 快捷键跳转 [20260423] v1.0.0",
            namespace: "0_V userscripts/[Perplexity] shortcut",
            description: "为 Perplexity.ai 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)、图标缓存、用户体验优化等功能。（基于 Template 模块重构）",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[Perplexity] Shortcut Jump [20260423] v1.0.0",
                    description: "Adds custom shortcuts for Perplexity.ai with URL jumps, clicks, simulated keys, custom icons, selectors, dark mode, an icon library, icon caching, and UX improvements.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://www.perplexity.ai/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("Perplexity_keycap.svg")
        }
    },
    {
        siteId: "poe",
        displayName: "[Poe] 快捷键跳转",
        sourceEntry: "src/sites/poe/index.js",
        userscriptOutput: "Site_JS/[Poe] 快捷键跳转 20260213.user.js",
        metadata: {
            name: "[Poe] 快捷键跳转 [20260423] v1.0.5",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Poe 提供可视化快捷键中心：支持 URL 跳转、元素点击、按键模拟、自定义动作，并内置消息复制/编辑、重命名保存与侧边栏切换等站点专属操作。",
            version: "[20260423] v1.0.5",
            updateLog: "1.0.5: 恢复 legacy require 架构，移除桥接式启动链。",
            localized: {
                "en-US": {
                    name: "[Poe] Shortcut Jump [20260423] v1.0.5",
                    description: "A visual shortcut center for Poe with URL jumps, element clicks, key simulation, custom actions, message copy/edit, rename save, and sidebar toggles.",
                    updateLog: "1.0.5: Restored the legacy require architecture and removed the bridged startup chain."
                }
            },
            match: [
                "https://poe.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: "https://psc2.cf2.poecdn.net/assets/favicon.svg"
        }
    },
    {
        siteId: "telegram",
        displayName: "[Telegram] 快捷键跳转",
        sourceEntry: "src/sites/telegram/index.js",
        userscriptOutput: "Site_JS/[Telegram] 快捷键跳转 20260215.user.js",
        metadata: {
            name: "[Telegram] 快捷键跳转 [20260423] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Telegram 网页客户端提供 Template 架构的可视化快捷键中心。支持 URL 跳转、元素点击、按键模拟与图标库管理，并兼容旧版存储键与 Telegram 哈希路由跳转。",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[Telegram] Shortcut Jump [20260423] v1.0.0",
                    description: "A Template-based visual shortcut center for Telegram Web with URL jumps, element clicks, key simulation, icon library management, legacy storage compatibility, and hash-route navigation.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://web.telegram.org/a/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2064%2064%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20aria-hidden%3D%22true%22%20role%3D%22img%22%20class%3D%22iconify%20iconify--emojione-monotone%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3Cfilter%20id%3D%22telegram-shadow%22%20x%3D%22-50%25%22%20y%3D%22-50%25%22%20width%3D%22200%25%22%20height%3D%22200%25%22%3E%0A%20%20%20%20%20%20%3CfeDropShadow%20dx%3D%222%22%20dy%3D%222%22%20stdDeviation%3D%223%22%20flood-color%3D%22%23000000%22%20flood-opacity%3D%220.4%22%2F%3E%0A%20%20%20%20%3C%2Ffilter%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3Cg%20id%3D%22SVGRepo_iconCarrier%22%3E%0A%20%20%20%20%3C!--%20Keycap%20background%20changed%20to%20Telegram's%20light%20blue%20--%3E%0A%20%20%20%20%3Cpath%20d%3D%22M52%202H12C6.478%202%202%206.477%202%2011.999V52c0%205.522%204.478%2010%2010%2010h40c5.522%200%2010-4.478%2010-10V11.999C62%206.477%2057.522%202%2052%202zm5%2043.666A8.333%208.333%200%200%201%2048.667%2054H15.333A8.333%208.333%200%200%201%207%2045.666V12.333A8.332%208.332%200%200%201%2015.333%204h33.334A8.332%208.332%200%200%201%2057%2012.333v33.333z%22%20fill%3D%22%2337aee2%22%3E%3C%2Fpath%3E%0A%0A%20%20%20%20%3C!--%20Telegram%20paper%20plane%20scaled%2C%20centered%2C%20and%20with%20shadow%20--%3E%0A%20%20%20%20%3Cg%20transform%3D%22translate(7.168%204.168)%20scale(0.097)%22%20filter%3D%22url(%23telegram-shadow)%22%3E%0A%20%20%20%20%20%20%3Cpath%20fill%3D%22%23c8daea%22%20d%3D%22M199%20404c-11%200-10-4-13-14l-32-105%20245-144%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20fill%3D%22%23a9c9dd%22%20d%3D%22M199%20404c7%200%2011-4%2016-8l45-43-56-34%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20fill%3D%22%23f6fbfe%22%20d%3D%22M204%20319l135%2099c14%209%2026%204%2030-14l55-258c5-22-9-32-24-25L79%20245c-21%208-21%2021-4%2026l83%2026%20190-121c9-5%2017-3%2011%204%22%3E%3C%2Fpath%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E"
        }
    },
    {
        siteId: "bilibili",
        displayName: "[哔哩哔哩] 快捷键跳转",
        sourceEntry: "src/sites/bilibili/index.js",
        userscriptOutput: "Site_JS/[哔哩哔哩] 快捷键跳转 20250927.user.js",
        metadata: {
            name: "[哔哩哔哩] 快捷键跳转 [20260423] v1.0.0",
            namespace: "0_V userscripts/bilibiliSearch Shortcuts",
            description: "在 Bilibili 搜索页面，通过快捷键快速切换到对应的搜索分类，支持多种操作类型（URL跳转/元素点击/按键模拟），包含图标库管理、完善暗黑模式支持、智能事件隔离、滚动锁定等高级功能。基于模版架构全面升级。",
            version: "[20260423] v1.0.0",
            updateLog: "1.0.0: 恢复 legacy require 架构，移除资源化启动链。",
            localized: {
                "en-US": {
                    name: "[Bilibili] Shortcut Jump [20260423] v1.0.0",
                    description: "Quickly switch Bilibili search categories with shortcuts. Supports URL jumps, element clicks, key simulation, icon library management, dark mode, event isolation, and scroll lock.",
                    updateLog: "1.0.0: Restored the legacy require architecture and removed the resource-based startup chain."
                }
            },
            match: [
                "https://*.bilibili.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: releaseIcon("bilibili_keycap.svg")
        }
    }
]);

export const RELEASE_SITE_ICON_FILES = Object.freeze(
    Array.from(
        new Set(
            SITE_MANIFEST.map((entry) => String(entry?.metadata?.icon || ""))
                .filter((icon) => icon.startsWith(`${RELEASE_ICON_BASE_URL}/`))
                .map((icon) => icon.slice(`${RELEASE_ICON_BASE_URL}/`.length))
        )
    ).sort()
);
