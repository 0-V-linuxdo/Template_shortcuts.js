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

function svgDataUrl(svgText) {
    const normalizedSvg = String(svgText || "").trim().replace(/\s+/g, " ");
    return normalizedSvg ? `data:image/svg+xml,${encodeURIComponent(normalizedSvg)}` : "";
}

const KEYCAP_OUTLINE_PATH = "M52 2H12C6.478 2 2 6.477 2 11.999V52c0 5.522 4.478 10 10 10h40c5.522 0 10-4.478 10-10V11.999C62 6.477 57.522 2 52 2z";
const KEYCAP_FRAME_MARKUP = `<path d="${KEYCAP_OUTLINE_PATH}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"></path>`;

const CHATGPT_KEYCAP_ICON = svgDataUrl(`
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet" class="chatgpt-keycap-icon">
  <style>
    :root { color-scheme: light dark; }
    .chatgpt-keycap-icon { color: #000000; }
    @media (prefers-color-scheme: dark) { .chatgpt-keycap-icon { color: #FFFFFF; } }
  </style>
  ${KEYCAP_FRAME_MARKUP}
  <svg x="11.5" y="9" width="41" height="41" fill="currentColor" fill-rule="evenodd" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>OpenAI</title><path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h-.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z"></path></svg>
</svg>
`);

function themeAdaptiveKeycapIcon(className, innerMarkup) {
    const safeClassName = String(className || "theme-keycap-icon").trim() || "theme-keycap-icon";
    return svgDataUrl(`
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet" class="${safeClassName}">
  <style>
    :root { color-scheme: light dark; }
    .${safeClassName} { color: #000000; }
    @media (prefers-color-scheme: dark) { .${safeClassName} { color: #FFFFFF; } }
  </style>
  ${KEYCAP_FRAME_MARKUP}
  ${innerMarkup}
</svg>
`);
}

const GROK_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "grok-keycap-icon",
    `<g transform="translate(13,10) scale(0.16)" fill="currentColor" fill-rule="evenodd"><path d="m92.7 152.9 79.78 -58.97c3.91 -2.9 9.5 -1.77 11.37 2.72 9.8 23.69 5.42 52.15 -14.1 71.69s-46.67 23.82 -71.49 14.06l-27.11 12.57c38.89 26.61 86.11 20.03 115.62 -9.53 23.41 -23.44 30.66 -55.39 23.88 -84.2l0.06 0.07c-9.83 -42.32 2.42 -59.24 27.5 -93.83Q239.11 6.25 240 5l-33.01 33.05v-0.1L92.67 152.92m-16.44 14.31c-27.92 -26.7 -23.1 -68.01 0.71 -91.84 17.61 -17.63 46.47 -24.83 71.66 -14.25l27.05 -12.5a78 78 0 0 0 -18.29 -10A89.75 89.75 0 0 0 59.84 58.3c-25.33 25.36 -33.3 64.36 -19.62 97.64 10.22 24.87 -6.53 42.46 -23.4 60.22 -5.99 6.3 -11.99 12.59 -16.82 19.25l76.2 -68.15"></path></g>`
);

const PERPLEXITY_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "perplexity-keycap-icon",
    `<path d="m42.78 14.56-10.791 9.131h10.79zm-10.791 9.131-9.961-9.13v9.13zm0-10.791v34.032m9.96-13.28-9.96-9.961v12.7l9.96 8.881zm-19.921 0 9.96-9.961v12.444l-9.96 9.137zm-4.15-9.961v13.281h4.15v-3.32l9.96-9.961zm14.11 0 9.962 9.96v3.32h4.15v-13.28z" stroke="currentColor" stroke-width="1.66" stroke-miterlimit="10" fill="none"></path>`
);

const BILIBILI_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "bilibili-keycap-icon",
    `<g transform="translate(12, 12) scale(1.666)"><path fill="none" d="M0 0h24v24H0z"></path><path d="M7.172 2.757L10.414 6h3.171l3.243-3.242a1 1 0 0 1 1.415 1.415l-1.829 1.827L18.5 6A3.5 3.5 0 0 1 22 9.5v8a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 17.5v-8A3.5 3.5 0 0 1 5.5 6h2.085L5.757 4.171a1 1 0 0 1 1.415-1.415zM18.5 8h-13a1.5 1.5 0 0 0-1.493 1.356L4 9.5v8a1.5 1.5 0 0 0 1.356 1.493L5.5 19h13a1.5 1.5 0 0 0 1.493-1.356L20 17.5v-8A1.5 1.5 0 0 0 18.5 8zM8 11a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm8 0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1z" fill="currentColor"></path></g>`
);

export const SITE_MANIFEST = Object.freeze([
    {
        siteId: "chatgpt",
        displayName: "[ChatGPT] 快捷键跳转",
        sourceEntry: "src/sites/chatgpt/index.js",
        metadata: {
            name: "[ChatGPT] 快捷键跳转 [20260508] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 ChatGPT 提供可视化自定义快捷键：支持 URL/按钮/按键动作、工具菜单（Web/Canvas/Thinking/Deep research/Create image）一键触发，以及快捷输入（文本+图片、循环发送、自动新建对话）。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 改用无填充描边键帽，确保脚本图标键帽区域透明，并保持普通模式黑色、黑暗模式白色。",
            localized: {
                "en-US": {
                    name: "[ChatGPT] Shortcut Jump [20260508] v1.0.0",
                    description: "Visual custom shortcuts for ChatGPT: URL/button/key actions, one-step tool menu triggers, and Quick Input for text, images, loops, and automatic new chats.",
                    updateLog: "1.0.0: Switched the script icon keycap to a no-fill stroke so the keycap area stays transparent while using black in light mode and white in dark mode."
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
            icon: CHATGPT_KEYCAP_ICON
        }
    },
    {
        siteId: "claude",
        displayName: "[Claude] 快捷键跳转",
        sourceEntry: "src/sites/claude/index.js",
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
        metadata: {
            name: "[Gemini] 快捷键跳转 [20260430] v1.0.1",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Gemini 提供可视化自定义快捷键：快速新建会话、切换模型、打开工具、Pin/Delete 对话与快捷输入发送，支持按键和图标自定义。",
            version: "[20260430] v1.0.1",
            updateLog: "1.0.1: 同步 Template v1.0.1，修复快捷输入初次打开时草稿图片恢复后高度未重测，避免弹窗过矮和内容被截断。",
            localized: {
                "en-US": {
                    name: "[Gemini] Shortcut Jump [20260430] v1.0.1",
                    description: "Visual custom shortcuts for Gemini: new chats, model switching, tools, pin/delete conversation actions, Quick Input, and customizable keys and icons.",
                    updateLog: "1.0.1: Synced Template v1.0.1; fixed Quick Input first-open height remeasurement after draft images restore, preventing a too-short panel and clipped content."
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
        metadata: {
            name: "[Grok] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/[Grok] 快捷键跳转",
            description: "为Grok网站添加快捷键功能，支持自定义按键和图标，以及自动选择，完美适配暗黑模式。新增: 动作类型系统(URL跳转/元素点击/按键模拟)、预设图标库(可折叠/自定义添加/长按删除)、图标缓存机制。使用Template模块重构。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 改用无填充描边键帽，确保脚本图标键帽区域透明，并保持普通模式黑色、黑暗模式白色。",
            localized: {
                "en-US": {
                    name: "[Grok] Shortcut Jump [20260508] v1.0.0",
                    description: "Adds custom shortcuts for Grok with configurable keys and icons, dark mode support, action types, a preset icon library, and icon caching.",
                    updateLog: "1.0.0: Switched the script icon keycap to a no-fill stroke so the keycap area stays transparent while using black in light mode and white in dark mode."
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
            icon: GROK_KEYCAP_ICON
        }
    },
    {
        siteId: "kagi",
        displayName: "[Kagi] 快捷键跳转",
        sourceEntry: "src/sites/kagi/index.js",
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
        metadata: {
            name: "[Perplexity] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/[Perplexity] shortcut",
            description: "为 Perplexity.ai 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)、图标缓存、用户体验优化等功能。（基于 Template 模块重构）",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 改用无填充描边键帽，确保脚本图标键帽区域透明，并保持普通模式黑色、黑暗模式白色。",
            localized: {
                "en-US": {
                    name: "[Perplexity] Shortcut Jump [20260508] v1.0.0",
                    description: "Adds custom shortcuts for Perplexity.ai with URL jumps, clicks, simulated keys, custom icons, selectors, dark mode, an icon library, icon caching, and UX improvements.",
                    updateLog: "1.0.0: Switched the script icon keycap to a no-fill stroke so the keycap area stays transparent while using black in light mode and white in dark mode."
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
            icon: PERPLEXITY_KEYCAP_ICON
        }
    },
    {
        siteId: "poe",
        displayName: "[Poe] 快捷键跳转",
        sourceEntry: "src/sites/poe/index.js",
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
        metadata: {
            name: "[哔哩哔哩] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/bilibiliSearch Shortcuts",
            description: "在 Bilibili 搜索页面，通过快捷键快速切换到对应的搜索分类，支持多种操作类型（URL跳转/元素点击/按键模拟），包含图标库管理、完善暗黑模式支持、智能事件隔离、滚动锁定等高级功能。基于模版架构全面升级。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 改用无填充描边键帽，确保脚本图标键帽区域透明，并保持普通模式黑色、黑暗模式白色。",
            localized: {
                "en-US": {
                    name: "[Bilibili] Shortcut Jump [20260508] v1.0.0",
                    description: "Quickly switch Bilibili search categories with shortcuts. Supports URL jumps, element clicks, key simulation, icon library management, dark mode, event isolation, and scroll lock.",
                    updateLog: "1.0.0: Switched the script icon keycap to a no-fill stroke so the keycap area stays transparent while using black in light mode and white in dark mode."
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
            icon: BILIBILI_KEYCAP_ICON
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
