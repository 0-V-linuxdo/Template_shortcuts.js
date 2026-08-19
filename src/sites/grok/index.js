/* -------------------------------------------------------------------------- *
 * Site Entry · [Grok] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    function gmGetValueLocal(key, fallback) {
        if (typeof GM_getValue !== "function") return fallback;
        try {
            const value = GM_getValue(key, fallback);
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        if (typeof GM_setValue !== "function") return;
        try {
            GM_setValue(key, value);
        } catch { }
    }

    function gmRegisterMenuCommandLocal(label, handler) {
        if (typeof GM_registerMenuCommand !== "function") return null;
        try {
            return GM_registerMenuCommand(label, handler);
        } catch {
            return null;
        }
    }

    function gmUnregisterMenuCommandLocal(commandId) {
        if (typeof GM_unregisterMenuCommand !== "function") return;
        try {
            GM_unregisterMenuCommand(commandId);
        } catch { }
    }

    function getLocalStorageLocal() {
        try {
            return globalThis.localStorage || null;
        } catch {
            return null;
        }
    }

    const ShortcutTemplate = window.ShortcutTemplate;

    // 检查模版模块是否加载
    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Grok Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = "[Grok Shortcut Script]";
    const TemplateUtils = ShortcutTemplate?.utils || {};

    function svgDataUrlLocal(svgText) {
        const source = String(svgText || "").trim().replace(/\s+/g, " ");
        return source ? `data:image/svg+xml,${encodeURIComponent(source)}` : "";
    }

    const GROK_ADMIN_URL = "https://gk.dairoot.cn/admin";
    const GROK_LEGACY_SWITCH_USER_NAME_ZH = "用户切换";
    const GROK_LEGACY_SWITCH_USER_NAME_EN = ["Switch", "user"].join(" ");
    const GROK_LEGACY_SWITCH_USER_SELECTOR = ["#", "floatingBall"].join("");
    const GROK_ADMIN_ICON = svgDataUrlLocal(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" role="img">
            <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"></path>
            <path d="M9 12l2 2 4-4"></path>
        </svg>
    `);

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

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "Grok - 设置快捷键",
            panelTitle: "Grok - 自定义快捷键",
            keepSidebarVisibleLabel: "Grok - 保持侧边栏显示: {state}",
            on: "开",
            off: "关",
            shortcuts: {
                "Admin": "Admin",
                "modelAuto": "模型：Auto",
                "modelFast": "模型：Fast",
                "modelExpert": "模型：Expert",
                "modelBuild": "模型：Build",
                "modelHeavy": "模型：Heavy",
                "deleteChat": "删除聊天",
                "Private": "无痕模式",
                "Imagine": "Imagine",
                "New Chat": "新建聊天",
                "Search": "搜索",
                "Settings": "设置",
                "Plugins": "插件",
                "Automations": "自动化",
                "Skills and Connectors": "技能与连接器",
                "Sidebar": "左侧边栏",
                "Right Sidebar": "右侧边栏",
                "Project": "项目"
            },
            dataAdapters: {
                modelPicker: {
                    label: "模型关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: Auto / Fast / Expert / Build / Heavy"
                },
                conversationMenu: {
                    label: "菜单关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: Delete Chat / Delete / {\"menu\":{\"id\":\"delete\"}}"
                }
            }
        },
        "en-US": {
            menuCommandLabel: "Grok - Shortcut settings",
            panelTitle: "Grok - Custom shortcuts",
            keepSidebarVisibleLabel: "Grok - Keep sidebar visible: {state}",
            on: "On",
            off: "Off",
            shortcuts: {
                "Admin": "Admin",
                "modelAuto": "Model: Auto",
                "modelFast": "Model: Fast",
                "modelExpert": "Model: Expert",
                "modelBuild": "Model: Build",
                "modelHeavy": "Model: Heavy",
                "deleteChat": "Delete Chat",
                "Private": "Private",
                "Imagine": "Imagine",
                "New Chat": "New Chat",
                "Search": "Search",
                "Settings": "Settings",
                "Plugins": "Plugins",
                "Automations": "Automations",
                "Skills and Connectors": "Skills and Connectors",
                "Sidebar": "Left Sidebar",
                "Right Sidebar": "Right Sidebar",
                "Project": "Project"
            },
            dataAdapters: {
                modelPicker: {
                    label: "Model keyword (or paste JSON, advanced):",
                    placeholder: "Example: Auto / Fast / Expert / Build / Heavy"
                },
                conversationMenu: {
                    label: "Menu keyword (or paste JSON, advanced):",
                    placeholder: "Example: Delete Chat / Delete / {\"menu\":{\"id\":\"delete\"}}"
                }
            }
        }
    });

    const siteText = (key, fallback) => ({ ctx } = {}) => ctx?.i18n?.t?.(key, {}, fallback) || fallback;

    const SELECTORS = Object.freeze({
        sidebarToggle: 'button[data-sidebar="trigger"][type="button"]',
        sidebarProvider: '[data-variant="sidebar"][data-side]',
        sidebarRoot: '[data-sidebar="sidebar"]',
        rightPanelToggle: 'button[aria-label="Toggle Right Panel"], button[aria-label="切换右侧面板"], button[aria-label*="Right Panel"], button[aria-label*="右侧面板"]'
    });

    const GROK_NATIVE_HOTKEYS = Object.freeze({
        newChat: "CMD+J",
        search: "CMD+K",
        private: "CMD+SHIFT+J",
        settings: "CMD+,"
    });

    function isPlainObjectLocal(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function normalizeGrokModelToken(value) {
        return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    }

    function normalizeGrokMenuToken(value) {
        return String(value ?? "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^\w\u4e00-\u9fff]+/g, "");
    }

    function createGrokAdaptiveIcon(svgBody, { width = 24, height = 24, viewBox = "0 0 24 24" } = {}) {
        return svgDataUrlLocal(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" role="img">
                ${svgBody}
            </svg>
        `);
    }

    function createGrokOfficialIcon(svgBody, { width = 18, height = 18, viewBox = "0 0 24 24", extraSvgAttrs = "" } = {}) {
        return svgDataUrlLocal(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none" ${extraSvgAttrs} aria-hidden="true" role="img">
                ${svgBody}
            </svg>
        `);
    }

    const GROK_OFFICIAL_ICONS = Object.freeze({
        auto: createGrokOfficialIcon(`
            <path d="M6.5 12.5L11.5 17.5M6.5 12.5L11.8349 6.83172C13.5356 5.02464 15.9071 4 18.3887 4H20V5.61135C20 8.09292 18.9754 10.4644 17.1683 12.1651L11.5 17.5M6.5 12.5L2 11L5.12132 7.87868C5.68393 7.31607 6.44699 7 7.24264 7H11M11.5 17.5L13 22L16.1213 18.8787C16.6839 18.3161 17 17.553 17 16.7574V13" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path>
            <path d="M4.5 16.5C4.5 16.5 4 18 4 20C6 20 7.5 19.5 7.5 19.5" stroke="currentColor" stroke-width="2" fill="none"></path>
        `),
        fast: createGrokOfficialIcon(`
            <path d="M5 14.25L14 4L13 9.75H19L10 20L11 14.25H5Z" stroke="currentColor" stroke-width="2" fill="none"></path>
        `),
        expert: createGrokOfficialIcon(`
            <path d="M15 16.1378L14.487 15.2794L14 15.5705V16.1378H15ZM8.99997 16.1378H9.99997V15.5705L9.51293 15.2794L8.99997 16.1378ZM18 9C18 11.4496 16.5421 14.0513 14.487 15.2794L15.5129 16.9963C18.1877 15.3979 20 12.1352 20 9H18ZM12 4C13.7598 4 15.2728 4.48657 16.3238 5.33011C17.3509 6.15455 18 7.36618 18 9H20C20 6.76783 19.082 4.97946 17.5757 3.77039C16.0931 2.58044 14.1061 2 12 2V4ZM5.99997 9C5.99997 7.36618 6.64903 6.15455 7.67617 5.33011C8.72714 4.48657 10.2401 4 12 4V2C9.89382 2 7.90681 2.58044 6.42427 3.77039C4.91791 4.97946 3.99997 6.76783 3.99997 9H5.99997ZM9.51293 15.2794C7.4578 14.0513 5.99997 11.4496 5.99997 9H3.99997C3.99997 12.1352 5.81225 15.3979 8.48701 16.9963L9.51293 15.2794ZM9.99997 19.5001V16.1378H7.99997V19.5001H9.99997ZM10.5 20.0001C10.2238 20.0001 9.99997 19.7763 9.99997 19.5001H7.99997C7.99997 20.8808 9.11926 22.0001 10.5 22.0001V20.0001ZM13.5 20.0001H10.5V22.0001H13.5V20.0001ZM14 19.5001C14 19.7763 13.7761 20.0001 13.5 20.0001V22.0001C14.8807 22.0001 16 20.8808 16 19.5001H14ZM14 16.1378V19.5001H16V16.1378H14Z" fill="currentColor"></path>
            <path d="M9 16.0001H15" stroke="currentColor" fill="none"></path>
            <path d="M12 16V12" stroke="currentColor" stroke-linecap="square" fill="none"></path>
        `),
        build: createGrokOfficialIcon(`
            <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="m18 15 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        `),
        heavy: createGrokOfficialIcon(`
            <path fill="currentColor" d="M3 5.5C3 4.83696 3.26339 4.20107 3.73223 3.73223C4.20107 3.26339 4.83696 3 5.5 3H8.5C9.16304 3 9.79893 3.26339 10.2678 3.73223C10.7366 4.20107 11 4.83696 11 5.5V8.5C11 9.16304 10.7366 9.79893 10.2678 10.2678C9.79893 10.7366 9.16304 11 8.5 11H5.5C4.83696 11 4.20107 10.7366 3.73223 10.2678C3.26339 9.79893 3 9.16304 3 8.5V5.5ZM5.5 5C5.36739 5 5.24021 5.05268 5.14645 5.14645C5.05268 5.24021 5 5.36739 5 5.5V8.5C5 8.63261 5.05268 8.75979 5.14645 8.85355C5.24021 8.94732 5.36739 9 5.5 9H8.5C8.63261 9 8.75979 8.94732 8.85355 8.85355C8.94732 8.75979 9 8.63261 9 8.5V5.5C9 5.36739 8.94732 5.24021 8.85355 5.14645C8.75979 5.05268 8.63261 5 8.5 5H5.5ZM13 5.5C13 4.83696 13.2634 4.20107 13.7322 3.73223C14.2011 3.26339 14.837 3 15.5 3H18.5C19.163 3 19.7989 3.26339 20.2678 3.73223C20.7366 4.20107 21 4.83696 21 5.5V8.5C21 9.16304 20.7366 9.79893 20.2678 10.2678C19.7989 10.7366 19.163 11 18.5 11H15.5C14.837 11 14.2011 10.7366 13.7322 10.2678C13.2634 9.79893 13 9.16304 13 8.5V5.5ZM15.5 5C15.3674 5 15.2402 5.05268 15.1464 5.14645C15.0527 5.24021 15 5.36739 15 5.5V8.5C15 8.63261 15.0527 8.75979 15.1464 8.85355C15.2402 8.94732 15.3674 9 15.5 9H18.5C18.6326 9 18.7598 8.94732 18.8536 8.85355C18.9473 8.75979 19 8.63261 19 8.5V5.5C19 5.36739 18.9473 5.24021 18.8536 5.14645C18.7598 5.05268 18.6326 5 18.5 5H15.5ZM3 15.5C3 14.837 3.26339 14.2011 3.73223 13.7322C4.20107 13.2634 4.83696 13 5.5 13H8.5C9.16304 13 9.79893 13.2634 10.2678 13.7322C10.7366 14.2011 11 14.837 11 15.5V18.5C11 19.163 10.7366 19.7989 10.2678 20.2678C9.79893 20.7366 9.16304 21 8.5 21H5.5C4.83696 21 4.20107 20.7366 3.73223 20.2678C3.26339 19.7989 3 19.163 3 18.5V15.5ZM5.5 15C5.36739 15 5.24021 15.0527 5.14645 15.1464C5.05268 15.2402 5 15.3674 5 15.5V18.5C5 18.6326 5.05268 18.7598 5.14645 18.8536C5.24021 18.9473 5.36739 19 5.5 19H8.5C8.63261 19 8.75979 18.9473 8.85355 18.8536C8.94732 18.7598 9 18.6326 9 18.5V15.5C9 15.3674 8.94732 15.2402 8.85355 15.1464C8.75979 15.0527 8.63261 15 8.5 15H5.5ZM13 15.5C13 14.837 13.2634 14.2011 13.7322 13.7322C14.2011 13.2634 14.837 13 15.5 13H18.5C19.163 13 19.7989 13.2634 20.2678 13.7322C20.7366 14.2011 21 14.837 21 15.5V18.5C21 19.163 20.7366 19.7989 20.2678 20.2678C19.7989 20.7366 19.163 21 18.5 21H15.5C14.837 21 14.2011 20.7366 13.7322 20.2678C13.2634 19.7989 13 19.163 13 18.5V15.5ZM15.5 15C15.3674 15 15.2402 15.0527 15.1464 15.1464C15.0527 15.2402 15 15.3674 15 15.5V18.5C15 18.6326 15.0527 18.7598 15.1464 18.8536C15.2402 18.9473 15.3674 19 15.5 19H18.5C18.6326 19 18.7598 18.9473 18.8536 18.8536C18.9473 18.7598 19 18.6326 19 18.5V15.5C19 15.3674 18.9473 15.2402 18.8536 15.1464C18.7598 15.0527 18.6326 15 18.5 15H15.5Z"></path>
        `),
        imagine: createGrokOfficialIcon(`
            <rect width="16" height="16" x="4" y="4" rx="4" stroke="currentColor" stroke-width="2" fill="none"></rect>
            <path d="M4 12a5 5 0 0 1 6 8" stroke="currentColor" stroke-width="2" fill="none"></path>
            <circle cx="15.25" cy="8.75" r="1.75" fill="currentColor"></circle>
            <path d="M4 16.5c2.333-.5 8-.5 9-2S11 13 11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        `),
        private: createGrokOfficialIcon(`
            <g transform="translate(2 3)" fill="currentColor">
                <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M15 10C17.2091 10 19 11.7909 19 14C19 16.2091 17.2091 18 15 18C12.8606 18 11.1131 16.3205 11.0049 14.208C10.3187 14.0166 9.6804 14.0164 8.99414 14.208C8.88591 16.3205 7.13936 18 5 18C2.79086 18 1 16.2091 1 14C1 11.7909 2.79086 10 5 10C6.58028 10 7.94592 10.9167 8.5957 12.2471C9.54071 12.0061 10.4583 12.0063 11.4033 12.2471C12.053 10.9165 13.4196 10 15 10ZM5 12C3.89543 12 3 12.8954 3 14C3 15.1046 3.89543 16 5 16C6.10457 16 7 15.1046 7 14C7 12.8954 6.10457 12 5 12ZM15 12C13.8954 12 13 12.8954 13 14C13 15.1046 13.8954 16 15 16C16.1046 16 17 15.1046 17 14C17 12.8954 16.1046 12 15 12Z"></path>
                <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M13.0107 0C14.6405 0 16.0554 1.12485 16.4219 2.71289L17.2959 6.5H20V8.5H0V6.5H2.7041L3.57812 2.71289C3.94461 1.12485 5.35947 0 6.98926 0H13.0107ZM6.98926 2C6.29077 2 5.6844 2.48249 5.52734 3.16309L4.75684 6.5H15.2432L14.4727 3.16309C14.3156 2.48249 13.7092 2 13.0107 2H6.98926Z"></path>
            </g>
        `),
        newChat: createGrokOfficialIcon(`
            <path d="M10 4V4C8.13623 4 7.20435 4 6.46927 4.30448C5.48915 4.71046 4.71046 5.48915 4.30448 6.46927C4 7.20435 4 8.13623 4 10V13.6C4 15.8402 4 16.9603 4.43597 17.816C4.81947 18.5686 5.43139 19.1805 6.18404 19.564C7.03968 20 8.15979 20 10.4 20H14C15.8638 20 16.7956 20 17.5307 19.6955C18.5108 19.2895 19.2895 18.5108 19.6955 17.5307C20 16.7956 20 15.8638 20 14V14" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path>
            <path d="M12.4393 14.5607L19.5 7.5C20.3284 6.67157 20.3284 5.32843 19.5 4.5C18.6716 3.67157 17.3284 3.67157 16.5 4.5L9.43934 11.5607C9.15804 11.842 9 12.2235 9 12.6213V15H11.3787C11.7765 15 12.158 14.842 12.4393 14.5607Z" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path>
        `),
        search: createGrokOfficialIcon(`
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"></circle>
            <path d="m21 21-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path>
        `),
        settings: createGrokOfficialIcon(`
            <path fill="currentColor" d="M13.4556 1.75L13.7524 2.19531C14.5837 3.44222 14.9502 3.84862 15.3101 4.0127C15.6313 4.15902 16.13 4.18467 17.5522 3.85645L18.0923 3.73242L20.2632 5.90332L20.1392 6.44336C19.8109 7.86565 19.8366 8.36431 19.9829 8.68555C20.147 9.04543 20.5534 9.41189 21.8003 10.2432L22.2456 10.54V13.46L21.8003 13.7568C20.5534 14.5881 20.147 14.9546 19.9829 15.3145C19.8366 15.6357 19.8109 16.1344 20.1392 17.5566L20.2632 18.0967L18.0923 20.2676L17.5522 20.1436C16.13 19.8153 15.6313 19.841 15.3101 19.9873C14.9502 20.1514 14.5837 20.5578 13.7524 21.8047L13.4556 22.25H10.5356L10.2388 21.8047C9.4075 20.5578 9.04104 20.1514 8.68115 19.9873C8.35992 19.841 7.86125 19.8153 6.43896 20.1436L5.89893 20.2676L3.72803 18.0967L3.85205 17.5566C4.18027 16.1344 4.15462 15.6357 4.0083 15.3145C3.84423 14.9546 3.43782 14.5881 2.19092 13.7568L1.74561 13.46V10.54L2.19092 10.2432C3.43782 9.41189 3.84423 9.04543 4.0083 8.68555C4.15462 8.36431 4.18027 7.86565 3.85205 6.44336L3.72803 5.90332L5.89893 3.73242L6.43896 3.85645C7.86125 4.18467 8.35991 4.15902 8.68115 4.0127C9.04104 3.84862 9.4075 3.44222 10.2388 2.19531L10.5356 1.75H13.4556ZM11.603 3.75C10.9664 4.68045 10.3543 5.44866 9.51123 5.83301C8.63554 6.23218 7.66598 6.15682 6.53369 5.9248L5.92041 6.53809C6.15242 7.67037 6.22778 8.63994 5.82861 9.51562C5.44433 10.3585 4.67585 10.97 3.74561 11.6064V12.3926C4.67605 13.0292 5.44427 13.6413 5.82861 14.4844C6.22767 15.3598 6.15227 16.3291 5.92041 17.4609L6.53369 18.0742C7.66589 17.8422 8.63559 17.7678 9.51123 18.167C10.3543 18.5513 10.9664 19.3196 11.603 20.25H12.3882C13.0248 19.3196 13.6369 18.5513 14.48 18.167C15.3554 17.768 16.3247 17.8424 17.4565 18.0742L18.0698 17.4609C17.838 16.3291 17.7636 15.3598 18.1626 14.4844C18.5469 13.6413 19.3152 13.0292 20.2456 12.3926V11.6064C19.3154 10.97 18.5469 10.3585 18.1626 9.51562C17.7635 8.63999 17.8378 7.67029 18.0698 6.53809L17.4565 5.9248C16.3247 6.15667 15.3554 6.23207 14.48 5.83301C13.6369 5.44866 13.0248 4.68045 12.3882 3.75H11.603ZM14.0005 12C14.0005 10.8956 13.1048 10.0003 12.0005 10C10.8959 10 10.0005 10.8954 10.0005 12C10.0005 13.1046 10.8959 14 12.0005 14C13.1048 13.9997 14.0005 13.1044 14.0005 12ZM16.0005 12C16.0005 14.209 14.2094 15.9997 12.0005 16C9.79135 16 8.00049 14.2091 8.00049 12C8.00049 9.79086 9.79135 8 12.0005 8C14.2094 8.00026 16.0005 9.79102 16.0005 12Z"></path>
        `),
        plugins: createGrokOfficialIcon(`
            <path fill="currentColor" d="M7.0483 9.87862L5.63424 11.2927C3.68162 13.2453 3.68162 16.4114 5.63424 18.364C7.58681 20.3163 10.752 20.3163 12.7045 18.364L14.1196 16.9499L15.5337 18.364L14.1196 19.778C11.3859 22.5117 6.95287 22.5117 4.2192 19.778C1.48589 17.0444 1.48581 12.6122 4.2192 9.87862L5.63424 8.46456L7.0483 9.87862ZM16.2417 9.16964L9.17135 16.2409L7.75631 14.8269L14.8276 7.75558L16.2417 9.16964ZM9.87642 4.2214C12.61 1.48801 17.0422 1.48809 19.7758 4.2214C22.5095 6.95506 22.5095 11.3881 19.7758 14.1218L18.3618 15.5358L16.9477 14.1218L18.3618 12.7067C20.3141 10.7542 20.3141 7.58901 18.3618 5.63643C16.4092 3.68381 13.2431 3.68381 11.2905 5.63643L9.87642 7.0505L8.46236 5.63643L9.87642 4.2214Z"></path>
        `),
        automations: createGrokOfficialIcon(`
            <path fill="currentColor" d="M12.001 2.09961C17.4682 2.10008 21.9004 6.53365 21.9004 12.001C21.8999 17.4679 17.4679 21.8999 12.001 21.9004C11.2458 21.9004 10.5084 21.8152 9.7998 21.6543L10.2422 19.7041C10.8065 19.8322 11.3958 19.9004 12.001 19.9004C16.3633 19.8999 19.8999 16.3633 19.9004 12.001C19.9004 7.63822 16.3636 4.10106 12.001 4.10059C7.63793 4.10059 4.10059 7.63793 4.10059 12.001H2.09961C2.09961 6.53336 6.53336 2.09961 12.001 2.09961ZM6.86426 12.252C7.05563 12.0258 7.42432 12.1841 7.3916 12.4785L7 16H9.35352C9.6087 16.0003 9.74694 16.2993 9.58203 16.4941L5.13574 21.748C4.94437 21.9742 4.57568 21.8159 4.6084 21.5215L5 18H2.64648C2.3913 17.9997 2.25306 17.7007 2.41797 17.5059L6.86426 12.252ZM13 11.3223L17.3711 13.0713L16.6289 14.9287L11 12.6768V6.5H13V11.3223Z"></path>
        `),
        skills: createGrokOfficialIcon(`
            <path d="M20.5 17C20.5 18.7949 19.0449 20.25 17.25 20.25C15.4551 20.25 14 18.7949 14 17C14 15.2051 15.4551 13.75 17.25 13.75C19.0449 13.75 20.5 15.2051 20.5 17Z" stroke="currentColor" stroke-width="2" fill="none"></path>
            <path d="M10 7C10 8.79493 8.54493 10.25 6.75 10.25C4.95507 10.25 3.5 8.79493 3.5 7C3.5 5.20507 4.95507 3.75 6.75 3.75C8.54493 3.75 10 5.20507 10 7Z" stroke="currentColor" stroke-width="2" fill="none"></path>
            <rect x="3.64844" y="13.75" width="6.2" height="6.2" rx="2" stroke="currentColor" stroke-width="2" fill="none"></rect>
            <path d="M16.3732 4.34855C16.7528 3.65641 17.7472 3.65641 18.1268 4.34855L20.5514 8.7691C20.9169 9.43553 20.4347 10.25 19.6746 10.25H14.8254C14.0653 10.25 13.5831 9.43553 13.9486 8.7691L16.3732 4.34855Z" stroke="currentColor" stroke-width="2" fill="none"></path>
        `),
        sidebar: createGrokOfficialIcon(`
            <path d="m11 17-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
            <path d="m18 17-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        `),
        rightSidebar: createGrokOfficialIcon(`
            <g transform="translate(24 0) scale(-1 1)">
                <rect x="3.5" y="4" width="17" height="16" rx="4" stroke="currentColor" stroke-width="2" fill="none"></rect>
                <path d="M9 4V20" stroke="currentColor" stroke-width="2" fill="none"></path>
            </g>
        `),
        project: createGrokOfficialIcon(`
            <path d="M3.33965 17L11.9999 22L20.6602 17V7L11.9999 2L3.33965 7V17Z" stroke="currentColor" stroke-width="2" fill="none"></path>
            <path d="M11.9999 12L3.4999 7M11.9999 12L12 21.5M11.9999 12L20.5 7" stroke="currentColor" stroke-width="2" fill="none"></path>
        `, { viewBox: "-1 -1 25 25" }),
        deleteChat: createGrokOfficialIcon(`
            <path d="M2.99561 7H20.9956" stroke="currentColor" stroke-width="2" fill="none"></path>
            <path d="M9.99561 11V17M13.9956 11V17" stroke="currentColor" stroke-width="2" fill="none"></path>
            <path d="M8 6.5L8.68917 4.08792C8.87315 3.44397 9.46173 3 10.1315 3H13.8685C14.5383 3 15.1268 3.44397 15.3108 4.08792L16 6.5" stroke="currentColor" stroke-width="2" fill="none"></path>
            <path d="M5 7L5.80098 18.2137C5.91312 19.7837 7.21944 21 8.79336 21H15.2066C16.7806 21 18.0869 19.7837 18.199 18.2137L19 7" stroke="currentColor" stroke-width="2" fill="none"></path>
        `)
    });


    const GROK_MODEL_TARGET_IDS = Object.freeze(["auto", "fast", "expert", "build", "heavy"]);
    const GROK_MODEL_TARGETS = Object.freeze({
        auto: Object.freeze({
            id: "auto",
            key: "model-auto",
            labelKey: "shortcuts.modelAuto",
            name: "Model: Auto",
            hotkey: "CTRL+SHIFT+1",
            aliases: Object.freeze(["auto", "modelauto"]),
            icon: GROK_OFFICIAL_ICONS.auto
        }),
        fast: Object.freeze({
            id: "fast",
            key: "model-fast",
            labelKey: "shortcuts.modelFast",
            name: "Model: Fast",
            hotkey: "CTRL+SHIFT+2",
            aliases: Object.freeze(["fast", "modelfast"]),
            icon: GROK_OFFICIAL_ICONS.fast
        }),
        expert: Object.freeze({
            id: "expert",
            key: "model-expert",
            labelKey: "shortcuts.modelExpert",
            name: "Model: Expert",
            hotkey: "CTRL+SHIFT+3",
            aliases: Object.freeze(["expert", "modelexpert"]),
            icon: GROK_OFFICIAL_ICONS.expert
        }),
        build: Object.freeze({
            id: "build",
            key: "model-build",
            labelKey: "shortcuts.modelBuild",
            name: "Model: Build",
            hotkey: "CTRL+SHIFT+4",
            aliases: Object.freeze(["build", "modelbuild"]),
            icon: GROK_OFFICIAL_ICONS.build
        }),
        heavy: Object.freeze({
            id: "heavy",
            key: "model-heavy",
            labelKey: "shortcuts.modelHeavy",
            name: "Model: Heavy",
            hotkey: "CTRL+SHIFT+5",
            aliases: Object.freeze(["heavy", "modelheavy"]),
            icon: GROK_OFFICIAL_ICONS.heavy
        })
    });

    const GROK_CONVERSATION_TARGET_IDS = Object.freeze(["delete"]);
    const GROK_CONVERSATION_TARGETS = Object.freeze({
        delete: Object.freeze({
            id: "delete",
            key: "conversation-delete",
            labelKey: "shortcuts.deleteChat",
            name: "Delete Chat",
            hotkey: "CTRL+BACKSPACE",
            aliases: Object.freeze(["deletechat", "delete", "删除聊天", "删除"]),
            icon: GROK_OFFICIAL_ICONS.deleteChat
        })
    });

    const GROK_SHORTCUTS_STORAGE_KEY = "grok_shortcuts";
    const GROK_MODEL_SHORTCUTS_MIGRATION_KEY = "grok_model_shortcuts_added_v1";
    const GROK_CONVERSATION_SHORTCUTS_MIGRATION_KEY = "grok_conversation_shortcuts_added_v1";
    const GROK_OFFICIAL_ICONS_MIGRATION_KEY = "grok_official_icons_v20260819";
    const SIDEBAR_VISIBILITY_STORAGE_KEY = "grok_keep_sidebar_visible_v1";
    const DEFAULT_KEEP_SIDEBAR_VISIBLE = true;
    const SIDEBAR_AUTO_EXPAND_MAX_VIEWPORT_WIDTH = 1024;
    const SIDEBAR_OPEN_SELECTORS = [
        `${SELECTORS.sidebarProvider}[data-state="expanded"]`,
        `${SELECTORS.sidebarProvider}[data-state="open"]`,
        `${SELECTORS.sidebarProvider}[data-state="opened"]`,
        `${SELECTORS.sidebarProvider}[aria-expanded="true"]`
    ];
    const SIDEBAR_CLOSED_SELECTORS = [
        `${SELECTORS.sidebarProvider}[data-state="collapsed"]`,
        `${SELECTORS.sidebarProvider}[data-state="closed"]`,
        `${SELECTORS.sidebarProvider}[data-state="close"]`,
        `${SELECTORS.sidebarProvider}[aria-expanded="false"]`,
        `${SELECTORS.sidebarProvider}[data-collapsible="offcanvas"]`,
        `${SELECTORS.sidebarProvider}[data-collapsible="icon"]`
    ];
    let keepSidebarVisible = getKeepSidebarVisibleSetting();
    let sidebarVisibilityMenuCommandId = null;
    let sidebarWarmupTimer = null;

    function createGrokModelShortcutTemplate(targetId) {
        const target = GROK_MODEL_TARGETS[targetId] || null;
        if (!target) return null;
        return {
            key: target.key,
            labelKey: target.labelKey,
            name: target.name,
            actionType: "custom",
            customAction: "modelPicker",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: target.hotkey,
            icon: target.icon,
            iconAdaptive: true,
            data: {
                menu: {
                    id: target.id
                }
            }
        };
    }

    const GROK_MODEL_SHORTCUT_TEMPLATES = Object.freeze(GROK_MODEL_TARGET_IDS.map((targetId) => createGrokModelShortcutTemplate(targetId)).filter(Boolean));

    function createGrokConversationShortcutTemplate(targetId) {
        const target = GROK_CONVERSATION_TARGETS[targetId] || null;
        if (!target) return null;
        return {
            key: target.key,
            labelKey: target.labelKey,
            name: target.name,
            actionType: "custom",
            customAction: "conversationMenu",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: target.hotkey,
            icon: target.icon,
            iconAdaptive: true,
            data: {
                menu: {
                    id: target.id
                }
            }
        };
    }

    const GROK_CONVERSATION_SHORTCUT_TEMPLATES = Object.freeze(GROK_CONVERSATION_TARGET_IDS.map((targetId) => createGrokConversationShortcutTemplate(targetId)).filter(Boolean));

    // 默认快捷键配置
    const defaultShortcuts = [
        {
            key: "admin",
            labelKey: "shortcuts.Admin",
            name: "Admin",
            actionType: "url",
            selector: "",
            url: GROK_ADMIN_URL,
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+U",
            icon: GROK_ADMIN_ICON,
            iconAdaptive: true
        },
        ...GROK_MODEL_SHORTCUT_TEMPLATES.map((shortcut) => ({ ...shortcut, data: isPlainObjectLocal(shortcut.data) ? { ...shortcut.data, menu: isPlainObjectLocal(shortcut.data.menu) ? { ...shortcut.data.menu } : shortcut.data.menu } : shortcut.data })),
        {
            name: "Private",
            labelKey: "shortcuts.Private",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: GROK_NATIVE_HOTKEYS.private,
            hotkey: "CTRL+SHIFT+P",
            icon: GROK_OFFICIAL_ICONS.private,
            iconAdaptive: true
        },
        {
            name: "Imagine",
            labelKey: "shortcuts.Imagine",
            actionType: "url",
            url: "https://grok.com/imagine",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+I",
            icon: GROK_OFFICIAL_ICONS.imagine,
            iconAdaptive: true
        },
        {
            name: "New Chat",
            labelKey: "shortcuts.New Chat",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: GROK_NATIVE_HOTKEYS.newChat,
            hotkey: "CTRL+N",
            icon: GROK_OFFICIAL_ICONS.newChat,
            iconAdaptive: true
        },
        {
            name: "Search",
            labelKey: "shortcuts.Search",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: GROK_NATIVE_HOTKEYS.search,
            hotkey: "CTRL+F",
            icon: GROK_OFFICIAL_ICONS.search,
            iconAdaptive: true
        },
        {
            name: "Sidebar",
            labelKey: "shortcuts.Sidebar",
            actionType: "selector",
            selector: SELECTORS.sidebarToggle,
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+B",
            icon: GROK_OFFICIAL_ICONS.sidebar,
            iconAdaptive: true
        },
        {
            name: "Right Sidebar",
            labelKey: "shortcuts.Right Sidebar",
            actionType: "selector",
            selector: SELECTORS.rightPanelToggle,
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+B",
            icon: GROK_OFFICIAL_ICONS.rightSidebar,
            iconAdaptive: true
        },
        {
            name: "Project",
            labelKey: "shortcuts.Project",
            actionType: "url",
            url: "https://grok.com/project",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+P",
            icon: GROK_OFFICIAL_ICONS.project,
            iconAdaptive: true
        },
        {
            name: "Automations",
            labelKey: "shortcuts.Automations",
            actionType: "url",
            url: "https://grok.com/automations",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+A",
            icon: GROK_OFFICIAL_ICONS.automations,
            iconAdaptive: true
        },
        {
            name: "Skills and Connectors",
            labelKey: "shortcuts.Skills and Connectors",
            actionType: "url",
            url: "https://grok.com/skills-and-connectors",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+S",
            icon: GROK_OFFICIAL_ICONS.skills,
            iconAdaptive: true
        },
        {
            name: "Plugins",
            labelKey: "shortcuts.Plugins",
            actionType: "url",
            url: "https://grok.com/?_s=void_plugins_tab",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+O",
            icon: GROK_OFFICIAL_ICONS.plugins,
            iconAdaptive: true
        },
        {
            name: "Settings",
            labelKey: "shortcuts.Settings",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: GROK_NATIVE_HOTKEYS.settings,
            hotkey: "CTRL+,",
            icon: GROK_OFFICIAL_ICONS.settings,
            iconAdaptive: true
        },
        ...GROK_CONVERSATION_SHORTCUT_TEMPLATES.map((shortcut) => ({ ...shortcut, data: isPlainObjectLocal(shortcut.data) ? { ...shortcut.data, menu: isPlainObjectLocal(shortcut.data.menu) ? { ...shortcut.data.menu } : shortcut.data.menu } : shortcut.data }))
    ];

    const GROK_ADMIN_SHORTCUT_TEMPLATE = defaultShortcuts[0] || null;
    const GROK_PRIVATE_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Private") || null;
    const GROK_IMAGINE_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Imagine") || null;
    const GROK_NEW_CHAT_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "New Chat") || null;
    const GROK_SEARCH_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Search") || null;
    const GROK_SETTINGS_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Settings") || null;
    const GROK_PLUGINS_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Plugins") || null;
    const GROK_AUTOMATIONS_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Automations") || null;
    const GROK_SKILLS_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Skills and Connectors") || null;
    const GROK_SIDEBAR_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Sidebar") || null;
    const GROK_RIGHT_SIDEBAR_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Right Sidebar") || null;
    const GROK_PROJECT_SHORTCUT_TEMPLATE = defaultShortcuts.find((item) => item?.name === "Project") || null;
    const GROK_MODEL_SHORTCUT_TEMPLATE_BY_ID = Object.freeze(GROK_MODEL_SHORTCUT_TEMPLATES.reduce((acc, shortcut) => {
        const targetId = String(shortcut?.data?.menu?.id || "").trim();
        if (targetId) acc[targetId] = shortcut;
        return acc;
    }, {}));
    const GROK_CONVERSATION_SHORTCUT_TEMPLATE_BY_ID = Object.freeze(GROK_CONVERSATION_SHORTCUT_TEMPLATES.reduce((acc, shortcut) => {
        const targetId = String(shortcut?.data?.menu?.id || "").trim();
        if (targetId) acc[targetId] = shortcut;
        return acc;
    }, {}));

    function getGrokModelTargetIdFromText(value) {
        const token = normalizeGrokModelToken(value);
        if (!token) return "";

        for (const targetId of GROK_MODEL_TARGET_IDS) {
            const target = GROK_MODEL_TARGETS[targetId];
            const aliases = Array.isArray(target?.aliases) ? target.aliases : [];
            for (const alias of aliases) {
                const aliasToken = normalizeGrokModelToken(alias);
                if (!aliasToken) continue;
                if (token === aliasToken || token.startsWith(aliasToken) || aliasToken.startsWith(token)) return targetId;
            }
        }

        if (/^(model)?grok43(beta)?$/.test(token)) return "build";
        return "";
    }

    function getGrokModelTargetById(value) {
        const targetId = getGrokModelTargetIdFromText(value);
        return targetId ? (GROK_MODEL_TARGETS[targetId] || null) : null;
    }

    function getGrokModelTargetIdFromShortcut(shortcut) {
        const data = isPlainObjectLocal(shortcut?.data) ? shortcut.data : {};
        const rawMenu = data.menu;
        const menu = isPlainObjectLocal(rawMenu) ? rawMenu : null;
        const candidates = [];
        const push = (value) => {
            const text = String(value ?? "").trim();
            if (text) candidates.push(text);
        };

        if (menu) {
            push(menu.id);
            push(menu.keyword);
            push(menu.textMatch);
            if (Array.isArray(menu.path) && menu.path.length) push(menu.path[menu.path.length - 1]);
        } else if (typeof rawMenu === "string") {
            push(rawMenu);
        }

        push(data.id);
        push(data.keyword);
        push(data.textMatch);
        if (Array.isArray(data.path) && data.path.length) push(data.path[data.path.length - 1]);
        push(shortcut?.key);
        push(shortcut?.name);

        const labelKey = String(shortcut?.labelKey || "").trim();
        if (labelKey) {
            push(labelKey);
            push(labelKey.split(".").pop());
        }

        for (const candidate of candidates) {
            const targetId = getGrokModelTargetIdFromText(candidate);
            if (targetId) return targetId;
        }
        return "";
    }

    function getGrokConversationTargetIdFromText(value) {
        const token = normalizeGrokMenuToken(value);
        if (!token) return "";

        for (const targetId of GROK_CONVERSATION_TARGET_IDS) {
            const target = GROK_CONVERSATION_TARGETS[targetId];
            const aliases = Array.isArray(target?.aliases) ? target.aliases : [];
            for (const alias of aliases) {
                const aliasToken = normalizeGrokMenuToken(alias);
                if (!aliasToken) continue;
                if (token === aliasToken || token.startsWith(aliasToken) || aliasToken.startsWith(token)) return targetId;
            }
        }

        return "";
    }

    function getGrokElementAttrText(element, names) {
        if (!element || !Array.isArray(names)) return "";
        const parts = [];
        for (const name of names) {
            try {
                const value = element.getAttribute?.(name);
                if (value !== undefined && value !== null) parts.push(String(value));
            } catch { }
        }
        return parts.join(" ");
    }

    function getGrokLeftmostIconElement(container) {
        if (!container || typeof container.querySelectorAll !== "function") return null;
        const iconSelector = [
            "svg",
            "img",
            "[data-icon]",
            "[data-lucide]",
            "[data-slot='icon']",
            "[class*='icon']"
        ].join(", ");
        const icons = [];
        try {
            for (const icon of Array.from(container.querySelectorAll(iconSelector))) {
                if (!icon || !isElementVisible(icon)) continue;
                const rect = icon.getBoundingClientRect?.();
                if (!rect || rect.width <= 0 || rect.height <= 0) continue;
                icons.push({ icon, rect });
            }
        } catch { }
        icons.sort((a, b) => {
            if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
            return a.rect.top - b.rect.top;
        });
        return icons[0]?.icon || null;
    }

    function getGrokIconVectorText(icon) {
        if (!icon) return "";
        const parts = [
            getGrokElementAttrText(icon, ["aria-label", "title", "alt", "data-icon", "data-lucide", "data-testid", "class", "name"])
        ];
        try {
            for (const title of Array.from(icon.querySelectorAll?.("title") || [])) {
                const text = String(title.textContent || "").trim();
                if (text) parts.push(text);
            }
        } catch { }
        try {
            for (const node of Array.from(icon.querySelectorAll?.("path, line, polyline, polygon, rect, circle") || [])) {
                parts.push(getGrokElementAttrText(node, [
                    "d",
                    "points",
                    "x",
                    "y",
                    "x1",
                    "y1",
                    "x2",
                    "y2",
                    "width",
                    "height",
                    "rx",
                    "class",
                    "data-icon",
                    "data-lucide"
                ]));
            }
        } catch { }
        return parts.join(" ");
    }

    function grokLeftIconLooksLikeTrash(icon) {
        if (!icon) return false;
        const attrToken = normalizeGrokMenuToken(getGrokElementAttrText(icon, [
            "aria-label",
            "title",
            "alt",
            "data-icon",
            "data-lucide",
            "data-testid",
            "class",
            "name"
        ]));
        if (/(trash|delete|remove|bin|垃圾|删除)/.test(attrToken)) return true;

        const vectorText = getGrokIconVectorText(icon).toLowerCase().replace(/\s+/g, "");
        if (!vectorText) return false;
        const hasLid = /m?3[,]?6h18|m?4[,]?7h16|m?5[,]?6h14|x1.?=.?3.*x2.?=.?21|x1.?=.?4.*x2.?=.?20/.test(vectorText);
        const hasHandle = /m?8[,]?6v-?2h8v2|m?9[,]?6v-?1h6v1|v4h8v2|v5h6v1/.test(vectorText);
        const hasCan = /l1[,]?14|l-?1[,]?14|h10l1-?14|h12l-?1-?14|v14|y.?=.?6.*height.?=.?14/.test(vectorText);
        const hasTines = /m?10[,]?11v6|m?14[,]?11v6|x1.?=.?10.*y1.?=.?11.*y2.?=.?17|x1.?=.?14.*y1.?=.?11.*y2.?=.?17/.test(vectorText);
        return (hasLid && (hasHandle || hasCan || hasTines)) || (hasCan && hasTines);
    }

    function grokMoreIconLooksLikeEllipsis(icon) {
        if (!icon) return false;
        const attrToken = normalizeGrokMenuToken(getGrokElementAttrText(icon, [
            "aria-label",
            "title",
            "alt",
            "data-icon",
            "data-lucide",
            "data-testid",
            "class",
            "name"
        ]));
        if (/(more|ellipsis|kebab|meatball|dots?)(horizontal|vertical)?/.test(attrToken)) return true;

        const circleCount = typeof icon.querySelectorAll === "function"
            ? (() => {
                try { return icon.querySelectorAll("circle").length; } catch { return 0; }
            })()
            : 0;
        if (circleCount >= 3) return true;

        const vectorText = getGrokIconVectorText(icon).toLowerCase().replace(/\s+/g, "");
        if (!vectorText) return false;
        if (/(morehorizontal|morevertical|ellipsis|kebab|meatball|dots?)/.test(vectorText)) return true;
        if (/cx.?=.?[0-9.]+.*cx.?=.?[0-9.]+.*cx.?=.?[0-9.]+/.test(vectorText)) return true;
        if (/circle.*circle.*circle/.test(vectorText)) return true;
        return false;
    }

    function getGrokConversationTargetIdFromLeftIcon(menuItem) {
        const leftIcon = getGrokLeftmostIconElement(menuItem);
        if (grokLeftIconLooksLikeTrash(leftIcon)) return "delete";
        return "";
    }

    function getGrokConversationTargetById(value) {
        const targetId = getGrokConversationTargetIdFromText(value);
        return targetId ? (GROK_CONVERSATION_TARGETS[targetId] || null) : null;
    }

    function getGrokConversationTargetIdFromShortcut(shortcut) {
        const data = isPlainObjectLocal(shortcut?.data) ? shortcut.data : {};
        const rawMenu = data.menu;
        const menu = isPlainObjectLocal(rawMenu) ? rawMenu : null;
        const candidates = [];
        const push = (value) => {
            const text = String(value ?? "").trim();
            if (text) candidates.push(text);
        };

        if (menu) {
            push(menu.id);
            push(menu.keyword);
            push(menu.textMatch);
            if (Array.isArray(menu.path) && menu.path.length) push(menu.path[menu.path.length - 1]);
        } else if (typeof rawMenu === "string") {
            push(rawMenu);
        }

        push(data.id);
        push(data.keyword);
        push(data.textMatch);
        if (Array.isArray(data.path) && data.path.length) push(data.path[data.path.length - 1]);
        push(shortcut?.key);
        push(shortcut?.name);

        const labelKey = String(shortcut?.labelKey || "").trim();
        if (labelKey) {
            push(labelKey);
            push(labelKey.split(".").pop());
        }

        for (const candidate of candidates) {
            const targetId = getGrokConversationTargetIdFromText(candidate);
            if (targetId) return targetId;
        }
        return "";
    }

    function cloneGrokShortcutRecord(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return null;
        const next = { ...shortcut };
        if (isPlainObjectLocal(shortcut.data)) {
            next.data = { ...shortcut.data };
            if (isPlainObjectLocal(shortcut.data.menu)) {
                next.data.menu = { ...shortcut.data.menu };
                if (Array.isArray(shortcut.data.menu.path)) next.data.menu.path = shortcut.data.menu.path.slice();
            }
            if (Array.isArray(shortcut.data.path)) next.data.path = shortcut.data.path.slice();
            if (Array.isArray(shortcut.data.openSubmenus)) next.data.openSubmenus = shortcut.data.openSubmenus.slice();
        }
        return next;
    }

    function isLegacySwitchUserShortcut(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const selector = String(shortcut?.selector || "").trim();
        const actionType = String(shortcut?.actionType || "").trim();
        return (
            name === GROK_LEGACY_SWITCH_USER_NAME_ZH ||
            name === GROK_LEGACY_SWITCH_USER_NAME_EN ||
            (actionType === "selector" && selector === GROK_LEGACY_SWITCH_USER_SELECTOR)
        );
    }

    function isGrokDefaultShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        if (!name) return false;
        if (name === "Admin") return true;
        if (name === "Private") return true;
        if (name === "Imagine") return true;
        if (name === "New Chat") return true;
        if (name === "Search") return true;
        if (name === "Settings") return true;
        if (name === "Plugins") return true;
        if (name === "Automations") return true;
        if (name === "Skills and Connectors") return true;
        if (name === "Sidebar") return true;
        if (name === "Right Sidebar") return true;
        if (name === "Project") return true;
        if (getGrokModelTargetIdFromShortcut(shortcut)) return true;
        if (getGrokConversationTargetIdFromShortcut(shortcut)) return true;

        const labelKey = String(shortcut?.labelKey || "").trim();
        if (labelKey === "shortcuts.Admin") return true;
        if (labelKey === "shortcuts.Private") return true;
        if (labelKey === "shortcuts.Imagine") return true;
        if (labelKey === "shortcuts.New Chat") return true;
        if (labelKey === "shortcuts.Search") return true;
        if (labelKey === "shortcuts.Settings") return true;
        if (labelKey === "shortcuts.Plugins") return true;
        if (labelKey === "shortcuts.Automations") return true;
        if (labelKey === "shortcuts.Skills and Connectors") return true;
        if (labelKey === "shortcuts.Sidebar") return true;
        if (labelKey === "shortcuts.Right Sidebar") return true;
        if (labelKey === "shortcuts.Project") return true;
        if (labelKey === "shortcuts.modelAuto") return true;
        if (labelKey === "shortcuts.modelFast") return true;
        if (labelKey === "shortcuts.modelExpert") return true;
        if (labelKey === "shortcuts.modelGrok43") return true;
        if (labelKey === "shortcuts.modelBuild") return true;
        if (labelKey === "shortcuts.modelHeavy") return true;
        if (labelKey === "shortcuts.deleteChat") return true;

        const actionType = String(shortcut?.actionType || "").trim();
        const selector = String(shortcut?.selector || "").trim();
        const url = String(shortcut?.url || "").trim();
        if (name === "Private" && actionType === "simulate" && normalizeGrokHotkey(shortcut?.simulateKeys) === GROK_NATIVE_HOTKEYS.private) return true;
        if (name === "Imagine" && actionType === "url" && url === "https://grok.com/imagine") return true;
        if (name === "New Chat" && actionType === "simulate" && normalizeGrokHotkey(shortcut?.simulateKeys) === GROK_NATIVE_HOTKEYS.newChat) return true;
        if (name === "New Chat" && actionType === "selector" && selector === '[aria-label="Home page"]') return true;
        if (name === "Search" && actionType === "simulate" && normalizeGrokHotkey(shortcut?.simulateKeys) === GROK_NATIVE_HOTKEYS.search) return true;
        if (name === "Settings" && actionType === "simulate" && normalizeGrokHotkey(shortcut?.simulateKeys) === GROK_NATIVE_HOTKEYS.settings) return true;
        if (name === "Plugins" && actionType === "url" && String(url).includes("_s=void_plugins_tab")) return true;
        if (name === "Automations" && actionType === "url" && url === "https://grok.com/automations") return true;
        if (name === "Skills and Connectors" && actionType === "url" && url === "https://grok.com/skills-and-connectors") return true;
        if (name === "Sidebar" && actionType === "selector" && selector === SELECTORS.sidebarToggle) return true;
        if (name === "Right Sidebar" && actionType === "selector" && selector === SELECTORS.rightPanelToggle) return true;
        if (name === "Project" && actionType === "url" && url === "https://grok.com/project") return true;
        if (name === "Admin" && actionType === "url" && url === GROK_ADMIN_URL) return true;
        return false;
    }

    function isRightSidebarShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const selector = String(shortcut?.selector || "").trim();
        if (name === "Right Sidebar") return true;
        if (labelKey === "shortcuts.Right Sidebar") return true;
        if (selector && selector.includes("Toggle Right Panel")) return true;
        return false;
    }

    function isImagineShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const url = String(shortcut?.url || "").trim();
        if (name === "Imagine") return true;
        if (labelKey === "shortcuts.Imagine") return true;
        if (url === "https://grok.com/imagine") return true;
        return false;
    }

    function isNewChatShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const selector = String(shortcut?.selector || "").trim();
        if (name === "New Chat") return true;
        if (labelKey === "shortcuts.New Chat") return true;
        if (selector === '[aria-label="Home page"]') return true;
        return false;
    }

    function isSearchShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        if (name === "Search") return true;
        if (labelKey === "shortcuts.Search") return true;
        return false;
    }

    function isSettingsShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        if (name === "Settings") return true;
        if (labelKey === "shortcuts.Settings") return true;
        return false;
    }

    function isPluginsShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const url = String(shortcut?.url || "").trim();
        if (name === "Plugins") return true;
        if (labelKey === "shortcuts.Plugins") return true;
        if (url.includes("_s=void_plugins_tab")) return true;
        return false;
    }

    function isAutomationsShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const url = String(shortcut?.url || "").trim();
        if (name === "Automations") return true;
        if (labelKey === "shortcuts.Automations") return true;
        if (url === "https://grok.com/automations") return true;
        return false;
    }

    function isSkillsShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const url = String(shortcut?.url || "").trim();
        if (name === "Skills and Connectors") return true;
        if (labelKey === "shortcuts.Skills and Connectors") return true;
        if (url === "https://grok.com/skills-and-connectors") return true;
        return false;
    }

    function isPrivateShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const selector = String(shortcut?.selector || "").trim();
        if (name === "Private") return true;
        if (labelKey === "shortcuts.Private") return true;
        if (selector === 'a[aria-label*="Switch to "]') return true;
        return false;
    }

    function normalizeGrokHotkey(value) {
        return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
    }

    function getGrokDefaultShortcutTemplate(shortcut) {
        const modelTargetId = getGrokModelTargetIdFromShortcut(shortcut);
        if (modelTargetId) return GROK_MODEL_SHORTCUT_TEMPLATE_BY_ID[modelTargetId] || null;
        const conversationTargetId = getGrokConversationTargetIdFromShortcut(shortcut);
        if (conversationTargetId) return GROK_CONVERSATION_SHORTCUT_TEMPLATE_BY_ID[conversationTargetId] || null;

        const name = String(shortcut?.name || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        if (name === "Admin" || labelKey === "shortcuts.Admin") return GROK_ADMIN_SHORTCUT_TEMPLATE;
        if (isPrivateShortcutRecord(shortcut)) return GROK_PRIVATE_SHORTCUT_TEMPLATE;
        if (isImagineShortcutRecord(shortcut)) return GROK_IMAGINE_SHORTCUT_TEMPLATE;
        if (isNewChatShortcutRecord(shortcut)) return GROK_NEW_CHAT_SHORTCUT_TEMPLATE;
        if (isSearchShortcutRecord(shortcut)) return GROK_SEARCH_SHORTCUT_TEMPLATE;
        if (isSettingsShortcutRecord(shortcut)) return GROK_SETTINGS_SHORTCUT_TEMPLATE;
        if (isPluginsShortcutRecord(shortcut)) return GROK_PLUGINS_SHORTCUT_TEMPLATE;
        if (isAutomationsShortcutRecord(shortcut)) return GROK_AUTOMATIONS_SHORTCUT_TEMPLATE;
        if (isSkillsShortcutRecord(shortcut)) return GROK_SKILLS_SHORTCUT_TEMPLATE;
        if (name === "Sidebar" || labelKey === "shortcuts.Sidebar") return GROK_SIDEBAR_SHORTCUT_TEMPLATE;
        if (isRightSidebarShortcutRecord(shortcut)) return GROK_RIGHT_SIDEBAR_SHORTCUT_TEMPLATE;
        if (name === "Project" || labelKey === "shortcuts.Project") return GROK_PROJECT_SHORTCUT_TEMPLATE;
        return null;
    }

    function isLegacyGrok43ShortcutRecord(shortcut) {
        const name = String(shortcut?.name || "");
        const key = String(shortcut?.key || "").trim();
        const labelKey = String(shortcut?.labelKey || "").trim();
        const menuId = String(shortcut?.data?.menu?.id || "").trim();
        if (key === "model-grok43") return true;
        if (labelKey === "shortcuts.modelGrok43") return true;
        if (normalizeGrokModelToken(menuId) === "grok43") return true;
        return /^(model)?grok43(beta)?$/.test(normalizeGrokModelToken(name));
    }

    function applyGrokOfficialIconTemplate(cloned, template) {
        if (!cloned || !template) return false;
        let changed = false;
        if (template.icon && cloned.icon !== template.icon) {
            cloned.icon = template.icon;
            changed = true;
        }
        if (cloned.iconAdaptive !== true) {
            cloned.iconAdaptive = true;
            changed = true;
        }
        if (template.labelKey && cloned.labelKey !== template.labelKey) {
            cloned.labelKey = template.labelKey;
            changed = true;
        }
        if (template.actionType && cloned.actionType !== template.actionType) {
            cloned.actionType = template.actionType;
            changed = true;
        }
        if (Object.prototype.hasOwnProperty.call(template, "simulateKeys") && cloned.simulateKeys !== template.simulateKeys) {
            cloned.simulateKeys = template.simulateKeys || "";
            changed = true;
        }
        if (template.actionType === "simulate") {
            if (cloned.selector) {
                cloned.selector = "";
                changed = true;
            }
        } else if (template.selector && cloned.actionType === "selector" && cloned.selector !== template.selector) {
            cloned.selector = template.selector;
            changed = true;
        }
        if (template.actionType === "url" && template.url && cloned.url !== template.url) {
            cloned.url = template.url;
            changed = true;
        }
        if (template?.data?.menu?.id === "build" && isLegacyGrok43ShortcutRecord(cloned)) {
            if (template.name && cloned.name !== template.name) {
                cloned.name = template.name;
                changed = true;
            }
            if (template.key && cloned.key !== template.key) {
                cloned.key = template.key;
                changed = true;
            }
            if (!isPlainObjectLocal(cloned.data)) cloned.data = {};
            if (!isPlainObjectLocal(cloned.data.menu)) cloned.data.menu = {};
            if (cloned.data.menu.id !== "build") {
                cloned.data.menu.id = "build";
                changed = true;
            }
        }
        return changed;
    }

    function migrateGrokShortcuts() {
        const stored = gmGetValueLocal(GROK_SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored)) return;

        let changed = false;
        const existingModelTargetIds = new Set();
        const modelDefaultsAddedRaw = gmGetValueLocal(GROK_MODEL_SHORTCUTS_MIGRATION_KEY, false);
        const modelDefaultsAdded = modelDefaultsAddedRaw === true || modelDefaultsAddedRaw === "true";
        const existingConversationTargetIds = new Set();
        const conversationDefaultsAddedRaw = gmGetValueLocal(GROK_CONVERSATION_SHORTCUTS_MIGRATION_KEY, false);
        const conversationDefaultsAdded = conversationDefaultsAddedRaw === true || conversationDefaultsAddedRaw === "true";
        const officialIconsAppliedRaw = gmGetValueLocal(GROK_OFFICIAL_ICONS_MIGRATION_KEY, false);
        const officialIconsApplied = officialIconsAppliedRaw === true || officialIconsAppliedRaw === "true";
        let hasRightSidebar = false;
        let hasImagine = false;
        let hasSearch = false;
        let hasSettings = false;
        let hasPlugins = false;
        let hasAutomations = false;
        let hasSkills = false;
        let sidebarInsertIndex = -1;
        let privateInsertIndex = -1;
        let newChatInsertIndex = -1;
        let projectInsertIndex = -1;
        const next = stored.map((shortcut, index) => {
            const cloned = cloneGrokShortcutRecord(shortcut);
            if (!cloned) return shortcut;
            const modelTargetId = getGrokModelTargetIdFromShortcut(cloned);
            if (modelTargetId) existingModelTargetIds.add(modelTargetId);
            const conversationTargetId = getGrokConversationTargetIdFromShortcut(cloned);
            if (conversationTargetId) existingConversationTargetIds.add(conversationTargetId);
            if (isRightSidebarShortcutRecord(cloned)) hasRightSidebar = true;
            if (isImagineShortcutRecord(cloned)) hasImagine = true;
            if (isSearchShortcutRecord(cloned)) hasSearch = true;
            if (isSettingsShortcutRecord(cloned)) hasSettings = true;
            if (isPluginsShortcutRecord(cloned)) hasPlugins = true;
            if (isAutomationsShortcutRecord(cloned)) hasAutomations = true;
            if (isSkillsShortcutRecord(cloned)) hasSkills = true;
            if (String(cloned?.name || "").trim() === "Sidebar" || String(cloned?.labelKey || "").trim() === "shortcuts.Sidebar") {
                sidebarInsertIndex = index;
            }
            if (isPrivateShortcutRecord(cloned)) {
                privateInsertIndex = index;
            }
            if (isNewChatShortcutRecord(cloned)) {
                newChatInsertIndex = index;
            }
            if (String(cloned?.name || "").trim() === "Project" || String(cloned?.labelKey || "").trim() === "shortcuts.Project") {
                projectInsertIndex = index;
            }

            if (isLegacySwitchUserShortcut(cloned)) {
                const replacement = cloneGrokShortcutRecord(GROK_ADMIN_SHORTCUT_TEMPLATE) || {};
                changed = true;
                return {
                    ...replacement,
                    id: cloned.id || replacement.id || "",
                    iconAdaptive: true
                };
            }

            if (isPrivateShortcutRecord(cloned)) {
                const privateHotkey = normalizeGrokHotkey(cloned.hotkey);
                if (privateHotkey === "CTRL+I" || privateHotkey === "CTRL+SHIFT+I") {
                    cloned.hotkey = "CTRL+SHIFT+P";
                    changed = true;
                }
            }

            if (isGrokDefaultShortcutRecord(cloned)) {
                const template = getGrokDefaultShortcutTemplate(cloned);
                if (applyGrokOfficialIconTemplate(cloned, template)) changed = true;
            }

            return cloned;
        });

        if (!modelDefaultsAdded) {
            for (const targetId of GROK_MODEL_TARGET_IDS) {
                if (existingModelTargetIds.has(targetId)) continue;
                const template = cloneGrokShortcutRecord(GROK_MODEL_SHORTCUT_TEMPLATE_BY_ID[targetId]);
                if (!template) continue;
                next.push(template);
                changed = true;
            }
        }

        if (!conversationDefaultsAdded) {
            for (const targetId of GROK_CONVERSATION_TARGET_IDS) {
                if (existingConversationTargetIds.has(targetId)) continue;
                const template = cloneGrokShortcutRecord(GROK_CONVERSATION_SHORTCUT_TEMPLATE_BY_ID[targetId]);
                if (!template) continue;
                next.push(template);
                changed = true;
            }
        }

        if (!hasRightSidebar && GROK_RIGHT_SIDEBAR_SHORTCUT_TEMPLATE) {
            const template = cloneGrokShortcutRecord(GROK_RIGHT_SIDEBAR_SHORTCUT_TEMPLATE);
            if (template) {
                const insertAt = sidebarInsertIndex >= 0 ? sidebarInsertIndex + 1 : next.length;
                next.splice(insertAt, 0, template);
                changed = true;
            }
        }

        if (!hasImagine && GROK_IMAGINE_SHORTCUT_TEMPLATE) {
            const template = cloneGrokShortcutRecord(GROK_IMAGINE_SHORTCUT_TEMPLATE);
            if (template) {
                let insertAt = next.length;
                for (let i = 0; i < next.length; i++) {
                    if (isPrivateShortcutRecord(next[i])) {
                        insertAt = i + 1;
                        break;
                    }
                }
                next.splice(insertAt, 0, template);
                changed = true;
            }
        }

        function insertGrokShortcutIfMissing(hasItem, template, afterIndex) {
            if (hasItem || !template) return afterIndex;
            const cloned = cloneGrokShortcutRecord(template);
            if (!cloned) return afterIndex;
            const insertAt = afterIndex >= 0 ? afterIndex + 1 : next.length;
            next.splice(insertAt, 0, cloned);
            changed = true;
            return insertAt;
        }

        let chromeInsertAt = newChatInsertIndex >= 0 ? newChatInsertIndex : next.length - 1;
        chromeInsertAt = insertGrokShortcutIfMissing(hasSearch, GROK_SEARCH_SHORTCUT_TEMPLATE, chromeInsertAt);
        chromeInsertAt = projectInsertIndex >= 0 ? Math.max(projectInsertIndex, chromeInsertAt) : chromeInsertAt;
        chromeInsertAt = insertGrokShortcutIfMissing(hasAutomations, GROK_AUTOMATIONS_SHORTCUT_TEMPLATE, chromeInsertAt);
        chromeInsertAt = insertGrokShortcutIfMissing(hasSkills, GROK_SKILLS_SHORTCUT_TEMPLATE, chromeInsertAt);
        chromeInsertAt = insertGrokShortcutIfMissing(hasPlugins, GROK_PLUGINS_SHORTCUT_TEMPLATE, chromeInsertAt);
        insertGrokShortcutIfMissing(hasSettings, GROK_SETTINGS_SHORTCUT_TEMPLATE, chromeInsertAt);

        if (changed) gmSetValueLocal(GROK_SHORTCUTS_STORAGE_KEY, next);
        if (!modelDefaultsAdded) gmSetValueLocal(GROK_MODEL_SHORTCUTS_MIGRATION_KEY, true);
        if (!conversationDefaultsAdded) gmSetValueLocal(GROK_CONVERSATION_SHORTCUTS_MIGRATION_KEY, true);
        if (!officialIconsApplied) gmSetValueLocal(GROK_OFFICIAL_ICONS_MIGRATION_KEY, true);
    }

    function getLocalBooleanFallback(key, fallback) {
        const storage = getLocalStorageLocal();
        const normalizedKey = String(key ?? "").trim();
        if (!storage || !normalizedKey) return fallback;
        try {
            const raw = storage.getItem(normalizedKey);
            if (raw == null) return fallback;
            if (raw === "true" || raw === "1") return true;
            if (raw === "false" || raw === "0") return false;
            const parsed = JSON.parse(raw);
            if (typeof parsed === "boolean") return parsed;
        } catch { }
        return fallback;
    }

    function setLocalBooleanFallback(key, value) {
        const storage = getLocalStorageLocal();
        const normalizedKey = String(key ?? "").trim();
        if (!storage || !normalizedKey) return;
        try {
            storage.setItem(normalizedKey, JSON.stringify(!!value));
        } catch { }
    }

    function getKeepSidebarVisibleSetting() {
        const localFallback = getLocalBooleanFallback(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
        try {
            const value = gmGetValueLocal(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
            if (value && typeof value.then === "function") return localFallback;
            return value === true || value === "true";
        } catch { }
        return localFallback;
    }

    function setKeepSidebarVisibleSetting(value) {
        try {
            gmSetValueLocal(SIDEBAR_VISIBILITY_STORAGE_KEY, !!value);
        } catch { }
        setLocalBooleanFallback(SIDEBAR_VISIBILITY_STORAGE_KEY, !!value);
    }

    function getSidebarVisibilityMenuLabel() {
        const stateText = engine?.i18n?.t?.(keepSidebarVisible ? "on" : "off", {}, keepSidebarVisible ? "On" : "Off") || (keepSidebarVisible ? "On" : "Off");
        return engine?.i18n?.t?.("keepSidebarVisibleLabel", { state: stateText }, `Grok - Keep sidebar visible: ${stateText}`) || `Grok - Keep sidebar visible: ${stateText}`;
    }

    function registerSidebarVisibilityMenuCommand() {
        if (sidebarVisibilityMenuCommandId !== null) {
            try {
                gmUnregisterMenuCommandLocal(sidebarVisibilityMenuCommandId);
            } catch { }
        }

        sidebarVisibilityMenuCommandId = gmRegisterMenuCommandLocal(getSidebarVisibilityMenuLabel(), () => {
            setSidebarVisibilityPreference(!keepSidebarVisible);
        });
    }

    function isElementVisible(el) {
        if (!el) return false;
        if (el.offsetParent !== null) return true;
        try {
            const rect = el.getBoundingClientRect?.();
            return !!rect && rect.width > 0 && rect.height > 0;
        } catch {
            return false;
        }
    }

    function getFirstVisibleBySelector(selector, { fallbackToFirst = false } = {}) {
        if (typeof selector !== "string" || !selector.trim()) return null;
        let all = [];
        try {
            all = Array.from(document.querySelectorAll(selector));
        } catch {
            return null;
        }
        for (const el of all) {
            if (isElementVisible(el)) return el;
        }
        return fallbackToFirst ? (all[0] || null) : null;
    }

    function getSidebarToggleButton() {
        return getFirstVisibleBySelector(SELECTORS.sidebarToggle, { fallbackToFirst: true });
    }

    function getSidebarProviderElement(fromElement = null) {
        const directProvider = fromElement?.closest?.(SELECTORS.sidebarProvider);
        if (directProvider) return directProvider;

        const sidebarRoot = fromElement?.closest?.(SELECTORS.sidebarRoot)
            || getFirstVisibleBySelector(SELECTORS.sidebarRoot, { fallbackToFirst: true });
        const providerFromRoot = sidebarRoot?.closest?.(SELECTORS.sidebarProvider);
        if (providerFromRoot) return providerFromRoot;

        return getFirstVisibleBySelector(SELECTORS.sidebarProvider, { fallbackToFirst: true });
    }

    function parseBooleanAttr(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (token === "true") return true;
        if (token === "false") return false;
        return null;
    }

    const GROK_MODEL_MENU_ROOT_SELECTORS = Object.freeze([
        "[role='menu']",
        "[role='listbox']"
    ]);
    const GROK_MODEL_MENU_ITEM_SELECTORS = Object.freeze([
        "[role='menuitemradio']",
        "[role='menuitem']",
        "[role='option']",
        "button",
        "[data-radix-collection-item]",
        "[cmdk-item]"
    ]);
    const GROK_MODEL_TRIGGER_CANDIDATE_SELECTORS = Object.freeze([
        "button",
        "[role='button']",
        "[aria-haspopup='menu']",
        "[aria-haspopup='listbox']"
    ]);
    const GROK_MODEL_MENU_TIMING = Object.freeze({
        waitTimeoutMs: 2500,
        pollIntervalMs: 120,
        openDelayMs: 120
    });
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));

    function resolveGrokSelectorList(spec) {
        if (!spec) return [];
        if (Array.isArray(spec)) return spec.flatMap((item) => resolveGrokSelectorList(item));
        if (typeof spec === "string") {
            const trimmed = spec.trim();
            return trimmed ? [trimmed] : [];
        }
        if (isPlainObjectLocal(spec)) {
            if (Array.isArray(spec.selectors)) return resolveGrokSelectorList(spec.selectors);
            if (typeof spec.selector === "string") {
                const trimmed = spec.selector.trim();
                return trimmed ? [trimmed] : [];
            }
        }
        return [];
    }

    function getGrokElementText(element) {
        if (!element) return "";
        const parts = [];
        const push = (value) => {
            const text = String(value ?? "").replace(/\s+/g, " ").trim();
            if (text) parts.push(text);
        };

        try { push(element.getAttribute?.("aria-label")); } catch { }
        try { push(element.getAttribute?.("aria-valuetext")); } catch { }
        try { push(element.getAttribute?.("title")); } catch { }
        try { push(element.getAttribute?.("data-value")); } catch { }
        try { push(element.getAttribute?.("value")); } catch { }
        try { push(element.innerText); } catch { }
        try { push(element.textContent); } catch { }
        try { push(element.value); } catch { }
        return parts[0] || "";
    }

    function getGrokElementSearchText(element) {
        if (!element) return "";
        const parts = [];
        const push = (value) => {
            const text = String(value ?? "").replace(/\s+/g, " ").trim();
            if (text && !parts.includes(text)) parts.push(text);
        };

        for (const name of ["aria-label", "title", "data-testid", "data-test-id", "data-value", "value"]) {
            try { push(element.getAttribute?.(name)); } catch { }
        }
        try { push(element.innerText); } catch { }
        try { push(element.textContent); } catch { }
        try { push(element.value); } catch { }
        return parts.join(" ");
    }

    function matchesGrokModelText(value, matcher) {
        const candidate = normalizeGrokModelToken(value);
        if (!candidate) return false;
        const token = normalizeGrokModelToken(matcher);
        if (!token) return false;
        return candidate.startsWith(token) || token.startsWith(candidate);
    }

    function createGrokModelTargetMatcher(target) {
        const aliases = Array.isArray(target?.aliases) ? target.aliases : [];
        return (value) => {
            const candidate = normalizeGrokModelToken(value);
            if (!candidate) return false;
            for (const alias of aliases) {
                const aliasToken = normalizeGrokModelToken(alias);
                if (!aliasToken) continue;
                if (candidate.startsWith(aliasToken) || aliasToken.startsWith(candidate)) return true;
            }
            return false;
        };
    }

    function createGrokModelTextMatcher(value) {
        const targetId = getGrokModelTargetIdFromText(value);
        if (targetId) return createGrokModelTargetMatcher(GROK_MODEL_TARGETS[targetId]);
        const query = normalizeGrokModelToken(value);
        if (!query) return null;
        return (candidateText) => {
            const candidate = normalizeGrokModelToken(candidateText);
            if (!candidate) return false;
            return candidate.startsWith(query) || query.startsWith(candidate);
        };
    }

    function isGrokModelMenuItemDisabled(element) {
        if (!element) return true;
        if (element.disabled) return true;
        if (element.hasAttribute?.("disabled")) return true;
        if (element.hasAttribute?.("data-disabled")) return true;
        const ariaDisabled = parseBooleanAttr(element.getAttribute?.("aria-disabled"));
        if (ariaDisabled === true) return true;
        const state = String(element.getAttribute?.("data-state") || "").trim().toLowerCase();
        if (state === "disabled") return true;
        const className = String(element.className || "").toLowerCase();
        return /\bdisabled\b/.test(className);
    }

    function getGrokEventView(element) {
        try { return element?.ownerDocument?.defaultView || document?.defaultView || window; } catch { }
        try { return window; } catch { }
        return null;
    }

    function getGrokEventConstructor(name, element = null) {
        try {
            const view = getGrokEventView(element);
            return view?.[name] || window?.[name] || null;
        } catch {
            return null;
        }
    }

    function getGrokElementCenterPoint(element) {
        if (!element) return null;
        try {
            const rect = element.getBoundingClientRect?.();
            if (!rect || rect.width <= 0 || rect.height <= 0) return null;
            const viewportWidth = Math.max(1, Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1);
            const viewportHeight = Math.max(1, Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 1);
            const x = Math.min(Math.max(rect.left + rect.width / 2, 1), viewportWidth - 1);
            const y = Math.min(Math.max(rect.top + rect.height / 2, 1), viewportHeight - 1);
            return { x, y };
        } catch {
            return null;
        }
    }

    function getGrokElementFromPoint(x, y, element = null) {
        try {
            const doc = element?.ownerDocument || document;
            return doc.elementFromPoint?.(x, y) || null;
        } catch {
            return null;
        }
    }

    function getGrokActivationTargets(element) {
        if (!element) return [];
        const targets = [];
        const seen = new Set();
        const add = (target) => {
            if (!target || seen.has(target)) return;
            seen.add(target);
            targets.push(target);
        };

        const point = getGrokElementCenterPoint(element);
        if (point) {
            const pointTarget = getGrokElementFromPoint(point.x, point.y, element);
            if (pointTarget && (pointTarget === element || element.contains?.(pointTarget) || pointTarget.contains?.(element))) {
                add(pointTarget);
                try { add(pointTarget.closest?.("button, [role='button'], [role='menuitem'], [role='menuitemradio'], [role='option'], a[href]")); } catch { }
            }
        }
        add(element);
        try { add(element.closest?.("button, [role='button'], [role='menuitem'], [role='menuitemradio'], [role='option'], a[href]")); } catch { }
        return targets;
    }

    function simulateGrokPointerClick(element) {
        if (!element) return false;
        const point = getGrokElementCenterPoint(element);
        if (!point) return false;
        const PointerEventCtor = getGrokEventConstructor("PointerEvent", element);
        const MouseEventCtor = getGrokEventConstructor("MouseEvent", element);
        if (typeof PointerEventCtor !== "function" && typeof MouseEventCtor !== "function") return false;

        const clientX = Number(point.x) || 1;
        const clientY = Number(point.y) || 1;
        const view = getGrokEventView(element);
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: view || null,
            clientX,
            clientY,
            screenX: clientX,
            screenY: clientY,
            button: 0
        };
        const plans = [
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerdown", opts: { ...common, buttons: 1, pointerId: 1, pointerType: "mouse", isPrimary: true } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mousedown", opts: { ...common, buttons: 1, detail: 1 } },
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerup", opts: { ...common, buttons: 0, pointerId: 1, pointerType: "mouse", isPrimary: true } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseup", opts: { ...common, buttons: 0, detail: 1 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "click", opts: { ...common, buttons: 0, detail: 1 } }
        ].filter(Boolean);

        let dispatched = false;
        for (const target of getGrokActivationTargets(element)) {
            if (!target || typeof target.dispatchEvent !== "function") continue;
            try { target.focus?.({ preventScroll: true }); } catch { }
            try { target.focus?.(); } catch { }
            for (const plan of plans) {
                try {
                    target.dispatchEvent(new plan.ctor(plan.type, plan.opts));
                    dispatched = true;
                } catch { }
            }
            if (dispatched) return true;
        }
        return false;
    }

    function simulateGrokTemplateClick(element) {
        if (!element) return false;
        try {
            const clicked = TemplateUtils?.events?.simulateClick?.(element, { nativeFallback: true });
            if (clicked) return true;
        } catch { }
        return false;
    }

    function simulateGrokNativeClick(element) {
        if (!element) return false;
        try {
            element.click();
            return true;
        } catch { }
        return false;
    }

    function simulateGrokKeyboardActivation(element) {
        if (!element) return false;
        const KeyboardEventCtor = getGrokEventConstructor("KeyboardEvent", element);
        if (typeof KeyboardEventCtor !== "function") return false;
        try { element.focus?.({ preventScroll: true }); } catch { }
        try { element.focus?.(); } catch { }
        const view = getGrokEventView(element);
        const eventInit = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: view || null,
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13
        };
        let dispatched = false;
        try {
            element.dispatchEvent(new KeyboardEventCtor("keydown", eventInit));
            dispatched = true;
        } catch { }
        try {
            element.dispatchEvent(new KeyboardEventCtor("keyup", eventInit));
            dispatched = true;
        } catch { }
        return dispatched;
    }

    function simulateGrokClick(element, { method = "auto" } = {}) {
        if (!element) return false;
        const activationMethod = String(method || "auto").trim().toLowerCase();
        if (activationMethod === "pointer") return simulateGrokPointerClick(element);
        if (activationMethod === "template") return simulateGrokTemplateClick(element);
        if (activationMethod === "native") return simulateGrokNativeClick(element);
        if (activationMethod === "keyboard") return simulateGrokKeyboardActivation(element);
        return simulateGrokPointerClick(element)
            || simulateGrokTemplateClick(element)
            || simulateGrokNativeClick(element);
    }

    function getGrokModelMenuItemCandidates(menuRoot) {
        if (!menuRoot || typeof menuRoot.querySelectorAll !== "function") return [];
        const candidates = [];
        const seen = new Set();
        const selectors = resolveGrokSelectorList(GROK_MODEL_MENU_ITEM_SELECTORS);

        const pushCandidate = (element) => {
            const candidate = getGrokClickableMenuItemElement(element, menuRoot);
            if (!candidate || seen.has(candidate)) return;
            if (!isElementVisible(candidate)) return;
            seen.add(candidate);
            candidates.push(candidate);
        };

        for (const selector of selectors) {
            try {
                for (const element of Array.from(menuRoot.querySelectorAll(selector))) {
                    pushCandidate(element);
                }
            } catch { }
        }

        if (candidates.length > 0) return candidates;

        try {
            for (const element of Array.from(menuRoot.querySelectorAll("*"))) {
                pushCandidate(element);
            }
        } catch { }

        return candidates;
    }

    function countGrokModelMenuTargetItems(menuRoot) {
        const items = getGrokModelMenuItemCandidates(menuRoot);
        let count = 0;
        for (const item of items) {
            if (getGrokModelTargetIdFromText(getGrokElementText(item))) count += 1;
        }
        return count;
    }

    function getGrokClickableMenuItemElement(element, menuRoot = null) {
        if (!element) return null;
        const selector = GROK_MODEL_MENU_ITEM_SELECTORS.join(", ");
        try {
            if (element.matches?.(selector)) return element;
            const closest = element.closest?.(selector) || null;
            if (!closest) return null;
            if (menuRoot && !menuRoot.contains(closest)) return null;
            return closest;
        } catch {
            return null;
        }
    }

    function isGrokModelMenuCandidate(menuRoot) {
        if (!menuRoot || !isElementVisible(menuRoot)) return false;
        const itemCount = countGrokModelMenuTargetItems(menuRoot);
        if (itemCount >= 2) return true;
        return !!getGrokModelTargetIdFromText(getGrokElementText(menuRoot));
    }

    function getGrokVisibleModelMenuRoots() {
        const roots = [];
        const seen = new Set();
        const selector = GROK_MODEL_MENU_ROOT_SELECTORS.join(", ");
        try {
            for (const menuRoot of Array.from(document.querySelectorAll(selector))) {
                if (!menuRoot || seen.has(menuRoot)) continue;
                seen.add(menuRoot);
                if (!isGrokModelMenuCandidate(menuRoot)) continue;
                roots.push(menuRoot);
            }
        } catch { }
        roots.sort((a, b) => {
            const aBottom = Number(a.getBoundingClientRect?.().bottom || 0);
            const bBottom = Number(b.getBoundingClientRect?.().bottom || 0);
            return aBottom - bBottom;
        });
        return roots;
    }

    function findGrokModelTriggerElement() {
        const seen = new Set();
        const candidates = [];
        for (const element of Array.from(document.querySelectorAll(GROK_MODEL_TRIGGER_CANDIDATE_SELECTORS.join(", ")))) {
            if (!element || seen.has(element) || !isElementVisible(element)) continue;
            seen.add(element);
            if (element.closest?.(GROK_MODEL_MENU_ROOT_SELECTORS.join(", "))) continue;

            const text = getGrokElementText(element);
            const ariaLabel = String(element.getAttribute?.("aria-label") || "").trim();
            const targetId = getGrokModelTargetIdFromText(text) || getGrokModelTargetIdFromText(ariaLabel);
            if (!targetId) continue;

            let score = 0;
            score += 400;
            if (String(element.getAttribute?.("aria-haspopup") || "").trim().toLowerCase() === "menu") score += 80;
            if (String(element.getAttribute?.("aria-haspopup") || "").trim().toLowerCase() === "listbox") score += 60;
            if (parseBooleanAttr(element.getAttribute?.("aria-expanded")) !== null) score += 20;
            if (parseBooleanAttr(element.getAttribute?.("aria-pressed")) !== null) score += 10;
            if (/model/i.test(text) || /model/i.test(ariaLabel)) score += 20;
            let bottom = 0;
            try { bottom = Number(element.getBoundingClientRect?.().bottom || 0); } catch { }
            candidates.push({ element, score, bottom });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || null;
    }

    function findGrokModelMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (isGrokModelMenuCandidate(controlled)) return controlled;
            }

            const triggerId = String(triggerEl.getAttribute?.("id") || "").trim();
            if (triggerId) {
                const escapedTriggerId = TemplateUtils?.dom?.escapeForAttributeSelector?.(triggerId) || triggerId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                for (const selector of GROK_MODEL_MENU_ROOT_SELECTORS) {
                    const labelledSelector = `${selector}[aria-labelledby="${escapedTriggerId}"]`;
                    try {
                        const labelled = document.querySelector(labelledSelector);
                        if (isGrokModelMenuCandidate(labelled)) return labelled;
                    } catch { }
                }
            }
        }

        const roots = getGrokVisibleModelMenuRoots();
        return roots[roots.length - 1] || null;
    }

    function findGrokSelectedModelMenuItem(menuRoot) {
        const items = getGrokModelMenuItemCandidates(menuRoot);
        for (const item of items) {
            const ariaChecked = parseBooleanAttr(item.getAttribute?.("aria-checked"));
            const ariaSelected = parseBooleanAttr(item.getAttribute?.("aria-selected"));
            const state = String(item.getAttribute?.("data-state") || "").trim().toLowerCase();
            if (ariaChecked === true || ariaSelected === true || state === "checked" || state === "selected" || state === "active") {
                return item;
            }
            const className = String(item.className || "").toLowerCase();
            if (/\b(selected|checked|active)\b/.test(className)) return item;
        }
        return null;
    }

    function findGrokModelMenuItem(menuRoot, { selector = GROK_MODEL_MENU_ITEM_SELECTORS, textMatch = null, fallbackToFirst = false } = {}) {
        if (!menuRoot) return null;
        const selectorList = resolveGrokSelectorList(selector);
        const candidates = [];
        const seen = new Set();
        const pushCandidate = (element) => {
            const candidate = getGrokClickableMenuItemElement(element, menuRoot);
            if (!candidate || seen.has(candidate) || !isElementVisible(candidate)) return;
            seen.add(candidate);
            candidates.push(candidate);
        };

        if (selectorList.length > 0) {
            for (const sel of selectorList) {
                try {
                    for (const element of Array.from(menuRoot.querySelectorAll(sel))) pushCandidate(element);
                } catch { }
            }
        }

        if (candidates.length === 0) {
            for (const element of getGrokModelMenuItemCandidates(menuRoot)) pushCandidate(element);
        }

        const matcher = typeof textMatch === "function"
            ? textMatch
            : (typeof textMatch === "string" ? createGrokModelTextMatcher(textMatch) : null);
        if (matcher) {
            for (const candidate of candidates) {
                if (matcher(getGrokElementText(candidate), candidate)) return candidate;
            }
        } else if (candidates.length > 0) {
            return candidates[0];
        }

        if (!fallbackToFirst) return null;
        return candidates[0] || null;
    }

    async function ensureGrokModelMenuOpen({ timeoutMs = GROK_MODEL_MENU_TIMING.waitTimeoutMs, intervalMs = GROK_MODEL_MENU_TIMING.pollIntervalMs, openDelayMs = GROK_MODEL_MENU_TIMING.openDelayMs } = {}) {
        const existing = findGrokModelMenuRoot();
        if (existing) return existing;

        const triggerEl = findGrokModelTriggerElement();
        if (!triggerEl) return null;
        if (!simulateGrokClick(triggerEl)) return null;
        if (openDelayMs > 0) await sleep(openDelayMs);

        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() < deadline) {
            const menuRoot = findGrokModelMenuRoot(triggerEl);
            if (menuRoot) return menuRoot;
            await sleep(intervalMs);
        }
        return findGrokModelMenuRoot(triggerEl);
    }

    function getCurrentGrokModelTargetId() {
        const triggerEl = findGrokModelTriggerElement();
        if (triggerEl) {
            const targetId = getGrokModelTargetIdFromText(getGrokElementText(triggerEl));
            if (targetId) return targetId;
        }

        const menuRoot = findGrokModelMenuRoot(triggerEl);
        if (menuRoot) {
            const selected = findGrokSelectedModelMenuItem(menuRoot) || findGrokModelMenuItem(menuRoot, { fallbackToFirst: false });
            if (selected) return getGrokModelTargetIdFromText(getGrokElementText(selected));
        }

        return "";
    }

    function getGrokModelPickerSpec(shortcut) {
        const data = isPlainObjectLocal(shortcut?.data) ? shortcut.data : {};
        const rawMenu = data.menu;
        const menu = isPlainObjectLocal(rawMenu)
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const action = String(menu.action || "").trim().toLowerCase() === "open"
            ? "open"
            : (String(menu.action || "").trim().toLowerCase() === "click" ? "click" : "oneStep");
        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = menu.waitForItem !== undefined ? !!menu.waitForItem : true;
        const selectorProvided = menu.selector !== undefined && menu.selector !== null;
        const selector = selectorProvided ? resolveGrokSelectorList(menu.selector) : [];
        const textQuery = typeof menu.keyword === "string" && menu.keyword.trim()
            ? menu.keyword.trim()
            : (typeof menu.textMatch === "string" && menu.textMatch.trim()
                ? menu.textMatch.trim()
                : (typeof rawMenu === "string" && rawMenu.trim() ? rawMenu.trim() : ""));
        const targetId = getGrokModelTargetIdFromShortcut(shortcut)
            || (typeof menu.id !== "undefined" && menu.id !== null ? getGrokModelTargetIdFromText(menu.id) : "")
            || getGrokModelTargetIdFromText(textQuery);
        const target = targetId ? GROK_MODEL_TARGETS[targetId] || null : null;
        const textMatch = target ? createGrokModelTargetMatcher(target) : createGrokModelTextMatcher(textQuery);

        return {
            action,
            fallbackToFirst,
            waitForItem,
            selector,
            selectorProvided,
            targetId,
            target,
            textMatch
        };
    }

    function createGrokModelPickerDataAdapter() {
        return {
            label: siteText("dataAdapters.modelPicker.label", "Model keyword (or paste JSON, advanced):"),
            placeholder: siteText("dataAdapters.modelPicker.placeholder", "Example: Auto / Fast / Expert / Build / Heavy"),
            format: (data) => {
                const raw = isPlainObjectLocal(data) ? data : {};
                const keys = Object.keys(raw);
                if (keys.length === 0) return "";

                const menu = raw.menu;
                if (typeof menu === "string" && menu.trim()) return menu.trim();

                if (isPlainObjectLocal(menu)) {
                    const menuKeys = Object.keys(menu);
                    const keyword = (typeof menu.keyword === "string" && menu.keyword.trim())
                        ? menu.keyword.trim()
                        : ((typeof menu.textMatch === "string" && menu.textMatch.trim()) ? menu.textMatch.trim() : "");
                    const target = typeof menu.id === "string" && menu.id.trim() ? getGrokModelTargetById(menu.id) : null;
                    if (target && menuKeys.every(k => ["id"].includes(k))) return target.name;
                    if (keyword && menuKeys.every(k => ["id", "keyword", "textMatch"].includes(k))) return keyword;
                }

                if (keys.length === 1 && keys[0] === "keyword" && typeof raw.keyword === "string" && raw.keyword.trim()) {
                    return raw.keyword.trim();
                }
                if (keys.length === 1 && keys[0] === "textMatch" && typeof raw.textMatch === "string" && raw.textMatch.trim()) {
                    return raw.textMatch.trim();
                }
                if (keys.length === 1 && keys[0] === "path" && Array.isArray(raw.path)) {
                    const parts = raw.path.map(value => String(value ?? "").trim()).filter(Boolean);
                    if (parts.length === 1) return parts[0];
                }

                try {
                    return JSON.stringify(raw, null, 2);
                } catch {
                    return "";
                }
            },
            parse: (text) => {
                const trimmed = String(text ?? "").trim();
                if (!trimmed) return {};
                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                    const parsed = JSON.parse(trimmed);
                    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
                    return parsed;
                }
                const targetId = getGrokModelTargetIdFromText(trimmed);
                if (targetId) return { menu: { id: targetId } };
                return { menu: trimmed };
            }
        };
    }

    async function modelPickerAction({ shortcut, engine }) {
        const spec = getGrokModelPickerSpec(shortcut);
        if (spec.targetId) {
            const currentTargetId = getCurrentGrokModelTargetId();
            if (currentTargetId && currentTargetId === spec.targetId) return true;
        }

        if (spec.action === "open") {
            return !!(await ensureGrokModelMenuOpen());
        }

        const menuRoot = findGrokModelMenuRoot() || await ensureGrokModelMenuOpen();
        if (!menuRoot) {
            console.warn(`${LOG_TAG} modelPicker: model menu not found.`);
            return false;
        }

        const selector = spec.selector.length > 0 ? spec.selector : GROK_MODEL_MENU_ITEM_SELECTORS;
        let targetItem = findGrokModelMenuItem(menuRoot, {
            selector,
            textMatch: spec.textMatch,
            fallbackToFirst: spec.fallbackToFirst
        });
        if (!targetItem && spec.waitForItem) {
            const deadline = Date.now() + GROK_MODEL_MENU_TIMING.waitTimeoutMs;
            while (Date.now() < deadline) {
                await sleep(GROK_MODEL_MENU_TIMING.pollIntervalMs);
                const currentMenuRoot = findGrokModelMenuRoot() || menuRoot;
                targetItem = findGrokModelMenuItem(currentMenuRoot, {
                    selector,
                    textMatch: spec.textMatch,
                    fallbackToFirst: spec.fallbackToFirst
                });
                if (targetItem) break;
            }
        }
        if (!targetItem) {
            console.warn(`${LOG_TAG} modelPicker: target model item not found.`);
            return false;
        }

        if (isGrokModelMenuItemDisabled(targetItem)) {
            console.warn(`${LOG_TAG} modelPicker: target model item is disabled.`);
            return false;
        }

        return simulateGrokClick(targetItem);
    }

    const GROK_CONVERSATION_MENU_ROOT_SELECTORS = Object.freeze([
        "[role='menu']",
        "[role='listbox']"
    ]);
    const GROK_CONVERSATION_MENU_ITEM_SELECTORS = Object.freeze([
        "[role='menuitemradio']",
        "[role='menuitem']",
        "[role='option']",
        "button",
        "[data-radix-collection-item]",
        "[cmdk-item]"
    ]);
    const GROK_CONVERSATION_TRIGGER_CANDIDATE_SELECTORS = Object.freeze([
        "button",
        "[role='button']",
        "[aria-haspopup='menu']",
        "[aria-haspopup='listbox']"
    ]);
    const GROK_CONVERSATION_MENU_TIMING = Object.freeze({
        waitTimeoutMs: 2500,
        pollIntervalMs: 120,
        openDelayMs: 120
    });
    function createGrokConversationTargetMatcher(target) {
        const aliases = Array.isArray(target?.aliases) ? target.aliases : [];
        return (value) => {
            const candidate = normalizeGrokMenuToken(value);
            if (!candidate) return false;
            for (const alias of aliases) {
                const aliasToken = normalizeGrokMenuToken(alias);
                if (!aliasToken) continue;
                if (candidate.startsWith(aliasToken) || aliasToken.startsWith(candidate)) return true;
            }
            return false;
        };
    }

    function createGrokConversationTextMatcher(value) {
        const targetId = getGrokConversationTargetIdFromText(value);
        if (targetId) return createGrokConversationTargetMatcher(GROK_CONVERSATION_TARGETS[targetId]);
        const query = normalizeGrokMenuToken(value);
        if (!query) return null;
        return (candidateText) => {
            const candidate = normalizeGrokMenuToken(candidateText);
            if (!candidate) return false;
            return candidate.startsWith(query) || query.startsWith(candidate);
        };
    }

    function createGrokConversationTargetIconMatcher(target) {
        if (!target) return null;
        return (menuItem) => getGrokConversationTargetIdFromLeftIcon(menuItem) === target.id;
    }

    function getGrokConversationMenuItemCandidates(menuRoot) {
        if (!menuRoot || typeof menuRoot.querySelectorAll !== "function") return [];
        const candidates = [];
        const seen = new Set();
        const selectors = resolveGrokSelectorList(GROK_CONVERSATION_MENU_ITEM_SELECTORS);

        const pushCandidate = (element) => {
            const candidate = getGrokClickableMenuItemElement(element, menuRoot);
            if (!candidate || seen.has(candidate)) return;
            if (!isElementVisible(candidate)) return;
            seen.add(candidate);
            candidates.push(candidate);
        };

        for (const selector of selectors) {
            try {
                for (const element of Array.from(menuRoot.querySelectorAll(selector))) {
                    pushCandidate(element);
                }
            } catch { }
        }

        if (candidates.length > 0) return candidates;

        try {
            for (const element of Array.from(menuRoot.querySelectorAll("*"))) {
                pushCandidate(element);
            }
        } catch { }

        return candidates;
    }

    function countGrokConversationMenuTargetItems(menuRoot) {
        const items = getGrokConversationMenuItemCandidates(menuRoot);
        let count = 0;
        for (const item of items) {
            if (getGrokConversationTargetIdFromLeftIcon(item) || getGrokConversationTargetIdFromText(getGrokElementText(item))) count += 1;
        }
        return count;
    }

    function isGrokConversationMenuCandidate(menuRoot) {
        if (!menuRoot || !isElementVisible(menuRoot)) return false;
        const itemCount = countGrokConversationMenuTargetItems(menuRoot);
        if (itemCount >= 1) return true;
        return !!getGrokConversationTargetIdFromLeftIcon(menuRoot) || !!getGrokConversationTargetIdFromText(getGrokElementText(menuRoot));
    }

    function getGrokVisibleConversationMenuRoots() {
        const roots = [];
        const seen = new Set();
        const selector = GROK_CONVERSATION_MENU_ROOT_SELECTORS.join(", ");
        try {
            for (const menuRoot of Array.from(document.querySelectorAll(selector))) {
                if (!menuRoot || seen.has(menuRoot)) continue;
                seen.add(menuRoot);
                if (!isGrokConversationMenuCandidate(menuRoot)) continue;
                roots.push(menuRoot);
            }
        } catch { }
        roots.sort((a, b) => {
            const aTop = Number(a.getBoundingClientRect?.().top || 0);
            const bTop = Number(b.getBoundingClientRect?.().top || 0);
            return aTop - bTop;
        });
        return roots;
    }

    function grokConversationTriggerLooksLikeMore(element) {
        if (!element || !isElementVisible(element)) return false;

        const text = getGrokElementText(element);
        const ariaLabel = String(element.getAttribute?.("aria-label") || "").trim();
        const title = String(element.getAttribute?.("title") || "").trim();
        const token = normalizeGrokMenuToken(text || ariaLabel || title);
        if (token === "more" || token === "moreactions" || token.includes("more")) return true;

        const icon = getGrokLeftmostIconElement(element);
        if (grokMoreIconLooksLikeEllipsis(icon)) return true;

        const hasMenuSemantics = String(element.getAttribute?.("aria-haspopup") || "").trim().toLowerCase() === "menu"
            || String(element.getAttribute?.("aria-haspopup") || "").trim().toLowerCase() === "listbox"
            || parseBooleanAttr(element.getAttribute?.("aria-expanded")) !== null;
        if (!hasMenuSemantics) return false;

        let rect = null;
        try { rect = element.getBoundingClientRect?.() || null; } catch { }
        if (!rect || rect.width <= 0 || rect.height <= 0) return false;
        const viewportWidth = Math.max(1, Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1);
        const inTopBand = rect.top <= 180;
        const inRightBand = rect.right >= viewportWidth * 0.55;
        return inTopBand && inRightBand;
    }

    function findGrokConversationMenuTriggerElement() {
        const seen = new Set();
        const candidates = [];
        for (const element of Array.from(document.querySelectorAll(GROK_CONVERSATION_TRIGGER_CANDIDATE_SELECTORS.join(", ")))) {
            if (!element || seen.has(element) || !isElementVisible(element)) continue;
            seen.add(element);
            if (element.closest?.(GROK_CONVERSATION_MENU_ROOT_SELECTORS.join(", "))) continue;

            let rect = null;
            try { rect = element.getBoundingClientRect?.() || null; } catch { }
            if (!rect || rect.width <= 0 || rect.height <= 0) continue;
            if (rect.top > 180) continue;

            const text = getGrokElementText(element);
            const ariaLabel = String(element.getAttribute?.("aria-label") || "").trim();
            const title = String(element.getAttribute?.("title") || "").trim();
            const token = normalizeGrokMenuToken(text || ariaLabel || title);
            const icon = getGrokLeftmostIconElement(element);
            const iconLooksLikeMore = grokMoreIconLooksLikeEllipsis(icon);
            const hasMenuSemantics = String(element.getAttribute?.("aria-haspopup") || "").trim().toLowerCase() === "menu"
                || String(element.getAttribute?.("aria-haspopup") || "").trim().toLowerCase() === "listbox"
                || parseBooleanAttr(element.getAttribute?.("aria-expanded")) !== null
                || parseBooleanAttr(element.getAttribute?.("aria-pressed")) !== null;

            if (!token && !iconLooksLikeMore && !hasMenuSemantics) continue;

            let score = 0;
            if (token === "more") score += 1000;
            else if (token === "moreactions") score += 120;
            else if (token.includes("more")) score += 700;
            if (iconLooksLikeMore) score += 650;
            if (hasMenuSemantics) score += 120;
            if (!token && iconLooksLikeMore) score += 150;
            if (!token && !ariaLabel && !title) score += 80;
            if (rect.top <= 72) score += 70;
            if (rect.right >= (Number(window.innerWidth) || 0) * 0.65) score += 60;
            if (rect.width <= 56) score += 20;
            if (rect.height <= 56) score += 20;
            if (parseBooleanAttr(element.getAttribute?.("aria-expanded")) !== null) score += 20;
            if (parseBooleanAttr(element.getAttribute?.("aria-pressed")) !== null) score += 10;
            candidates.push({ element, score, top: rect.top, left: rect.left, right: rect.right });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.right !== a.right) return b.right - a.right;
            if (a.left !== b.left) return a.left - b.left;
            return a.top - b.top;
        });
        if (candidates[0]?.element) return candidates[0].element;

        const fallback = [];
        for (const element of Array.from(document.querySelectorAll("button, [role='button']"))) {
            if (!element || seen.has(element) || !isElementVisible(element)) continue;
            if (element.closest?.(GROK_CONVERSATION_MENU_ROOT_SELECTORS.join(", "))) continue;
            if (!grokConversationTriggerLooksLikeMore(element)) continue;
            let rect = null;
            try { rect = element.getBoundingClientRect?.() || null; } catch { }
            if (!rect || rect.width <= 0 || rect.height <= 0) continue;
            if (rect.top > 180) continue;
            fallback.push({ element, score: (rect.top <= 72 ? 50 : 0) + (rect.right >= (Number(window.innerWidth) || 0) * 0.65 ? 40 : 0), top: rect.top, left: rect.left, right: rect.right });
        }
        fallback.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.right !== a.right) return b.right - a.right;
            if (a.left !== b.left) return a.left - b.left;
            return a.top - b.top;
        });
        return fallback[0]?.element || null;
    }

    function findGrokConversationMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (isGrokConversationMenuCandidate(controlled)) return controlled;
            }

            const triggerId = String(triggerEl.getAttribute?.("id") || "").trim();
            if (triggerId) {
                const escapedTriggerId = TemplateUtils?.dom?.escapeForAttributeSelector?.(triggerId) || triggerId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                for (const selector of GROK_CONVERSATION_MENU_ROOT_SELECTORS) {
                    const labelledSelector = `${selector}[aria-labelledby="${escapedTriggerId}"]`;
                    try {
                        const labelled = document.querySelector(labelledSelector);
                        if (isGrokConversationMenuCandidate(labelled)) return labelled;
                    } catch { }
                }
            }
        }

        const roots = getGrokVisibleConversationMenuRoots();
        return roots[0] || null;
    }

    function getGrokConversationMenuItem(menuRoot, { selector = GROK_CONVERSATION_MENU_ITEM_SELECTORS, textMatch = null, iconMatch = null, fallbackToFirst = false } = {}) {
        if (!menuRoot) return null;
        const selectorList = resolveGrokSelectorList(selector);
        const candidates = [];
        const seen = new Set();
        const pushCandidate = (element) => {
            const candidate = getGrokClickableMenuItemElement(element, menuRoot);
            if (!candidate || seen.has(candidate) || !isElementVisible(candidate)) return;
            seen.add(candidate);
            candidates.push(candidate);
        };

        if (selectorList.length > 0) {
            for (const sel of selectorList) {
                try {
                    for (const element of Array.from(menuRoot.querySelectorAll(sel))) pushCandidate(element);
                } catch { }
            }
        }

        if (candidates.length === 0) {
            for (const element of getGrokConversationMenuItemCandidates(menuRoot)) pushCandidate(element);
        }

        const iconMatcher = typeof iconMatch === "function"
            ? iconMatch
            : null;
        if (iconMatcher) {
            for (const candidate of candidates) {
                if (iconMatcher(candidate, getGrokLeftmostIconElement(candidate))) return candidate;
            }
        }

        const matcher = typeof textMatch === "function"
            ? textMatch
            : (typeof textMatch === "string" ? createGrokConversationTextMatcher(textMatch) : null);
        if (matcher) {
            for (const candidate of candidates) {
                if (matcher(getGrokElementText(candidate), candidate)) return candidate;
            }
        } else if (candidates.length > 0) {
            return candidates[0];
        }

        if (!fallbackToFirst) return null;
        return candidates[0] || null;
    }

    async function ensureGrokConversationMenuOpen({ timeoutMs = GROK_CONVERSATION_MENU_TIMING.waitTimeoutMs, intervalMs = GROK_CONVERSATION_MENU_TIMING.pollIntervalMs, openDelayMs = GROK_CONVERSATION_MENU_TIMING.openDelayMs } = {}) {
        const existing = findGrokConversationMenuRoot();
        if (existing) return existing;

        const triggerEl = findGrokConversationMenuTriggerElement();
        if (!triggerEl) return null;
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const methods = ["pointer", "template", "native", "keyboard"];
        for (let index = 0; index < methods.length && Date.now() <= deadline; index += 1) {
            if (!isElementVisible(triggerEl)) break;
            if (!simulateGrokClick(triggerEl, { method: methods[index] })) continue;
            if (openDelayMs > 0) await sleep(openDelayMs);

            const perAttemptDeadline = index === methods.length - 1
                ? deadline
                : Math.min(deadline, Date.now() + Math.max(360, Number(intervalMs) * 3 || 360));
            while (Date.now() <= perAttemptDeadline) {
                const menuRoot = findGrokConversationMenuRoot(triggerEl);
                if (menuRoot) return menuRoot;
                await sleep(intervalMs);
            }
        }
        return findGrokConversationMenuRoot(triggerEl);
    }

    function focusGrokConversationMenuItem(item) {
        if (!item) return false;
        try { item.scrollIntoView?.({ block: "nearest", inline: "nearest" }); } catch { }
        try { TemplateUtils?.events?.simulateHover?.(item); } catch { }
        try {
            if (typeof item.tabIndex !== "number" || item.tabIndex < 0) item.tabIndex = -1;
        } catch { }
        try { item.focus?.({ preventScroll: true }); } catch { }
        try { item.focus?.(); } catch { }
        return true;
    }

    async function waitForGrokConversationMenuActivation({ menuRoot = null, textMatch = null, iconMatch = null, timeoutMs = 700, intervalMs = 55 } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(25, Number(intervalMs) || 55);
        while (Date.now() <= deadline) {
            const currentRoot = findGrokConversationMenuRoot() || (isElementVisible(menuRoot) ? menuRoot : null);
            if (!currentRoot || !isElementVisible(currentRoot)) return true;
            const currentItem = getGrokConversationMenuItem(currentRoot, { textMatch, iconMatch, fallbackToFirst: false });
            if (!currentItem || !isElementVisible(currentItem)) return true;
            await sleep(interval);
        }
        return false;
    }

    async function clickCurrentGrokConversationMenuItem({ menuRoot, targetItem, textMatch = null, iconMatch = null } = {}) {
        let currentRoot = findGrokConversationMenuRoot() || (isElementVisible(menuRoot) ? menuRoot : null);
        let currentItem = currentRoot
            ? getGrokConversationMenuItem(currentRoot, { textMatch, iconMatch, fallbackToFirst: false })
            : null;
        if (!currentItem && isElementVisible(targetItem)) currentItem = targetItem;

        if (!currentItem || !isElementVisible(currentItem)) {
            currentRoot = await ensureGrokConversationMenuOpen({ openDelayMs: 80 });
            currentItem = currentRoot
                ? getGrokConversationMenuItem(currentRoot, { textMatch, iconMatch, fallbackToFirst: false })
                : null;
        }

        if (!currentItem || !isElementVisible(currentItem)) {
            console.warn(`${LOG_TAG} conversationMenu: target menu item disappeared before activation.`);
            return false;
        }

        if (isGrokModelMenuItemDisabled(currentItem)) {
            console.warn(`${LOG_TAG} conversationMenu: target menu item is disabled before activation.`);
            return false;
        }

        focusGrokConversationMenuItem(currentItem);
        const methods = ["pointer", "keyboard", "template", "native"];
        for (const method of methods) {
            if (!currentItem || !isElementVisible(currentItem)) {
                if (await waitForGrokConversationMenuActivation({ menuRoot: currentRoot, textMatch, iconMatch, timeoutMs: 120 })) return true;
                currentRoot = await ensureGrokConversationMenuOpen({ openDelayMs: 80 });
                currentItem = currentRoot
                    ? getGrokConversationMenuItem(currentRoot, { textMatch, iconMatch, fallbackToFirst: false })
                    : null;
                if (!currentItem || !isElementVisible(currentItem)) break;
            }

            focusGrokConversationMenuItem(currentItem);
            const clicked = simulateGrokClick(currentItem, { method });
            if (clicked && await waitForGrokConversationMenuActivation({ menuRoot: currentRoot, textMatch, iconMatch })) return true;

            currentRoot = findGrokConversationMenuRoot() || (isElementVisible(currentRoot) ? currentRoot : null);
            currentItem = currentRoot
                ? getGrokConversationMenuItem(currentRoot, { textMatch, iconMatch, fallbackToFirst: false })
                : null;
            if (!currentRoot || !currentItem || !isElementVisible(currentItem)) continue;
        }

        console.warn(`${LOG_TAG} conversationMenu: target menu item did not activate; menu stayed open.`);
        return false;
    }

    const GROK_DELETE_CANCEL_LABELS = Object.freeze(["Cancel", "Close", "No", "Keep", "取消", "关闭", "保留"]);
    const GROK_DELETE_CONFIRM_LABELS = Object.freeze(["Delete", "Delete chat", "Delete topic", "Remove", "Confirm", "Confirm delete", "OK", "删除", "删除聊天", "删除话题", "确认", "确认删除", "确定"]);
    const GROK_DELETE_CONFIRM_STRICT_LABELS = Object.freeze(["Delete chat", "Delete Chat", "Delete topic", "Confirm delete", "确认删除", "删除聊天", "删除话题"]);
    const GROK_DELETE_CONFIRM_GENERIC_LABELS = Object.freeze(["Delete", "Confirm", "确认", "删除"]);
    const GROK_DELETE_CONFIRM_REJECT_PATTERN = /\b(rename|more|options|menu|pin|share|settings|history)\b|重命名|更多|菜单|选项|置顶|分享|设置|历史/i;
    const GROK_DELETE_DIALOG_ROOT_SELECTORS = Object.freeze([
        "[role='alertdialog']",
        "[role='dialog']",
        "dialog",
        "[aria-modal='true']",
        "[data-radix-dialog-content]",
        "[data-state='open']",
        "[class*='modal' i]",
        "[class*='dialog' i]"
    ]);

    function getGrokElementArea(element) {
        try {
            const rect = element?.getBoundingClientRect?.();
            return rect ? Math.max(0, Number(rect.width) || 0) * Math.max(0, Number(rect.height) || 0) : Number.POSITIVE_INFINITY;
        } catch {
            return Number.POSITIVE_INFINITY;
        }
    }

    function grokDeleteMatchesLabel(value, labels, exact = false) {
        const text = String(value ?? "").replace(/\s+/g, " ").trim();
        const token = normalizeGrokMenuToken(text);
        if (!text || !token) return false;
        return labels.some((label) => {
            const raw = String(label ?? "").replace(/\s+/g, " ").trim();
            const wanted = normalizeGrokMenuToken(raw);
            if (!wanted) return false;
            if (exact) return token === wanted || (token.includes(wanted) && token.length <= wanted.length + 14);
            return token.includes(wanted) || text.toLowerCase().includes(raw.toLowerCase());
        });
    }

    function grokDeleteMatchesExactLabelRepeats(value, labels) {
        const token = normalizeGrokMenuToken(value);
        if (!token) return false;
        return labels.some((label) => {
            const wanted = normalizeGrokMenuToken(label);
            if (!wanted || token.length % wanted.length !== 0) return false;
            for (let offset = 0; offset < token.length; offset += wanted.length) {
                if (token.slice(offset, offset + wanted.length) !== wanted) return false;
            }
            return true;
        });
    }

    function getGrokDeleteClickableElement(element) {
        if (!element || element === document || element === window) return null;
        const selector = "button,[role='button'],[role='menuitem'],[role='option'],a[href],[tabindex]:not([tabindex='-1']),[onclick],[class*='button' i],[class*='btn' i]";
        try {
            if (element.matches?.(selector)) return element;
            return element.closest?.(selector) || (element.nodeType === 1 ? element : null);
        } catch {
            return null;
        }
    }

    function getGrokVisibleDeleteActionCandidates(root = document) {
        if (!root?.querySelectorAll) return [];
        const selector = "button,[role='button'],[role='menuitem'],[role='option'],a[href],[tabindex]:not([tabindex='-1']),[onclick],[class*='button' i],[class*='btn' i]";
        const candidates = [];
        const seen = new Set();
        try {
            for (const element of Array.from(root.querySelectorAll(selector))) {
                const target = getGrokDeleteClickableElement(element);
                if (!target || seen.has(target) || !isElementVisible(target) || isGrokModelMenuItemDisabled(target)) continue;
                seen.add(target);
                candidates.push(target);
            }
        } catch { }
        return candidates;
    }

    function grokDeleteConfirmQuestionMatches(value) {
        const text = String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        const token = normalizeGrokMenuToken(text);
        return /are you sure you want to delete(?: this)? chat|are you sure.*delete|this chat can(?:'|’)?t be recovered|this chat cant be recovered|delete this chat|delete (?:the )?(?:chat|conversation)\s*[?？]|share links from it will be disabled|cannot be undone|can(?:'|’)?t be undone|permanently delete|permanent deletion|删除(?:此|该|这个|本)?(?:聊天|对话|会话|话题)\s*[?？]|确定.*删除|确认.*删除|删除.*不可恢复|无法恢复|不能恢复/i.test(text)
            || /confirmdelete|deleteconfirm|删除确认|确认删除/.test(token);
    }

    function grokDeleteConfirmRootMatches(value) {
        const text = String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        const token = normalizeGrokMenuToken(text);
        if (grokDeleteConfirmQuestionMatches(text)) return true;
        const hasDelete = /delete|remove|删除/.test(text) || /delete|remove|删除/.test(token);
        const hasConfirm = /confirm|确认|确定/.test(text) || /confirm|确认|确定/.test(token);
        const hasCancel = /cancel|取消|keep|关闭/.test(text) || /cancel|取消|keep|关闭/.test(token);
        const hasWarning = /recover|recovered|undo|permanent|不可恢复|无法恢复|不能恢复/.test(text) || /recover|recovered|undo|permanent|不可恢复|无法恢复|不能恢复/.test(token);
        return hasCancel && (hasWarning || (hasDelete && hasConfirm));
    }

    function grokDeleteConfirmRejects(element) {
        const value = getGrokElementSearchText(element);
        return GROK_DELETE_CONFIRM_REJECT_PATTERN.test(value) || GROK_DELETE_CONFIRM_REJECT_PATTERN.test(normalizeGrokMenuToken(value));
    }

    function grokDeleteConfirmButtonMatches(element, root = null) {
        const value = getGrokElementSearchText(element);
        if (!value || grokDeleteMatchesLabel(value, GROK_DELETE_CANCEL_LABELS) || grokDeleteConfirmRejects(element)) return false;
        if (grokDeleteMatchesExactLabelRepeats(value, GROK_DELETE_CONFIRM_STRICT_LABELS)) return true;
        if (grokDeleteMatchesExactLabelRepeats(value, GROK_DELETE_CONFIRM_GENERIC_LABELS)) return true;
        if (root && grokDeleteConfirmRootMatches(getGrokElementSearchText(root))) return grokDeleteMatchesLabel(value, GROK_DELETE_CONFIRM_LABELS);
        return grokDeleteMatchesLabel(value, GROK_DELETE_CONFIRM_STRICT_LABELS);
    }

    function grokDeleteCancelButtonMatches(element) {
        return grokDeleteMatchesLabel(getGrokElementSearchText(element), GROK_DELETE_CANCEL_LABELS);
    }

    function addGrokDeleteDialogRoot(roots, root) {
        if (!root || !isElementVisible(root)) return;
        if (!roots.some((item) => item === root || item.contains?.(root) || root.contains?.(item))) roots.push(root);
    }

    function getGrokDeleteDialogRoots() {
        const roots = [];
        const rootSelector = GROK_DELETE_DIALOG_ROOT_SELECTORS.join(",");
        try {
            for (const root of Array.from(document.querySelectorAll(rootSelector))) {
                if (grokDeleteConfirmRootMatches(getGrokElementSearchText(root))) addGrokDeleteDialogRoot(roots, root);
            }
        } catch { }

        let questions = [];
        try {
            questions = Array.from(document.querySelectorAll("div,section,[role='dialog'],[role='alertdialog'],dialog,[aria-modal='true'],[class*='modal' i],[class*='dialog' i],h1,h2,h3,p,span"))
                .filter((node) => isElementVisible(node) && grokDeleteConfirmQuestionMatches(getGrokElementSearchText(node)))
                .sort((a, b) => getGrokElementArea(a) - getGrokElementArea(b))
                .slice(0, 24);
        } catch { }
        for (const question of questions) {
            for (let node = question, depth = 0; node && node !== document.body && depth < 8; node = node.parentElement, depth += 1) {
                if (!isElementVisible(node)) continue;
                const buttons = getGrokVisibleDeleteActionCandidates(node);
                if (!buttons.some((button) => grokDeleteConfirmButtonMatches(button, node)) || !buttons.some(grokDeleteCancelButtonMatches)) continue;
                addGrokDeleteDialogRoot(roots, node);
                break;
            }
        }

        roots.sort((a, b) => getGrokElementArea(a) - getGrokElementArea(b));
        return roots;
    }

    function getGrokDeleteConfirmButtonInfo() {
        const roots = getGrokDeleteDialogRoots();
        const candidates = [];
        const seen = new Set();
        const add = (element, score = 0) => {
            const target = getGrokDeleteClickableElement(element);
            if (!target || seen.has(target) || !isElementVisible(target) || isGrokModelMenuItemDisabled(target)) return;
            const root = roots.find((item) => item.contains?.(target) || item.contains?.(element)) || null;
            if (!grokDeleteConfirmButtonMatches(target, root) && !grokDeleteConfirmButtonMatches(element, root)) return;
            if (grokDeleteCancelButtonMatches(target) || grokDeleteCancelButtonMatches(element)) return;
            const rect = target.getBoundingClientRect?.();
            if (!rect || rect.width < 12 || rect.height < 10 || rect.width > 760 || rect.height > 140) return;
            seen.add(target);
            candidates.push({
                node: target,
                root,
                score: score
                    + (grokDeleteMatchesExactLabelRepeats(getGrokElementSearchText(target), GROK_DELETE_CONFIRM_STRICT_LABELS) ? 700 : 0)
                    + (grokDeleteMatchesExactLabelRepeats(getGrokElementSearchText(target), GROK_DELETE_CONFIRM_GENERIC_LABELS) ? 420 : 0)
                    + (target.matches?.("button,[role='button']") ? 220 : 0),
                top: Number(rect.top) || 0,
                right: Number(rect.right) || 0,
                area: Math.max(0, Number(rect.width) || 0) * Math.max(0, Number(rect.height) || 0)
            });
        };

        for (const root of roots) {
            for (const element of getGrokVisibleDeleteActionCandidates(root)) add(element, 260);
        }
        if (candidates.length === 0 && questionsVisibleForGrokDeleteConfirmation()) {
            const buttons = getGrokVisibleDeleteActionCandidates(document);
            const cancelButtons = buttons.filter(grokDeleteCancelButtonMatches);
            for (const button of buttons) {
                const value = getGrokElementSearchText(button);
                if (!grokDeleteMatchesExactLabelRepeats(value, GROK_DELETE_CONFIRM_GENERIC_LABELS) && !grokDeleteMatchesExactLabelRepeats(value, GROK_DELETE_CONFIRM_STRICT_LABELS)) continue;
                const rect = button.getBoundingClientRect?.();
                if (!rect) continue;
                const nearCancel = cancelButtons.some((cancel) => {
                    const cancelRect = cancel.getBoundingClientRect?.();
                    if (!cancelRect) return false;
                    return Math.abs((cancelRect.left + cancelRect.right) / 2 - (rect.left + rect.right) / 2) < 360
                        && Math.abs((cancelRect.top + cancelRect.bottom) / 2 - (rect.top + rect.bottom) / 2) < 220;
                });
                if (nearCancel) add(button, 180);
            }
        }
        candidates.sort((a, b) => b.score - a.score || b.right - a.right || b.top - a.top || a.area - b.area);
        return candidates[0] || null;
    }

    function questionsVisibleForGrokDeleteConfirmation() {
        try {
            return Array.from(document.querySelectorAll("div,section,[role='dialog'],[role='alertdialog'],dialog,[aria-modal='true'],[class*='modal' i],[class*='dialog' i],h1,h2,h3,p,span"))
                .some((node) => isElementVisible(node) && grokDeleteConfirmQuestionMatches(getGrokElementSearchText(node)));
        } catch {
            return false;
        }
    }

    function grokDeleteConfirmationAlreadyOpen() {
        return Boolean(getGrokDeleteConfirmButtonInfo() || getGrokDeleteDialogRoots().length);
    }

    function sameGrokDeleteDialogRoot(left, right) {
        return Boolean(left && right && (left === right || left.contains?.(right) || right.contains?.(left)));
    }

    function getGrokDeleteConfirmationOwnership(baseline = new Set(), routeGuard = null) {
        if (typeof routeGuard === "function" && routeGuard() !== true) return null;
        const roots = getGrokDeleteDialogRoots();
        const info = getGrokDeleteConfirmButtonInfo();
        const button = info?.node || null;
        const root = info?.root || roots.find((candidate) => candidate === button || candidate.contains?.(button)) || null;
        if (!button || !root || baseline?.has(root)) return null;
        if ([...(baseline || [])].some((candidate) => sameGrokDeleteDialogRoot(candidate, root))) return null;
        if (!button.isConnected || !root.isConnected || !isElementVisible(button) || !isElementVisible(root) || !root.contains?.(button)) return null;
        if (!roots.some((candidate) => candidate === root)) return null;
        if (roots.some((candidate) => !sameGrokDeleteDialogRoot(candidate, root))) return null;
        return { root, button };
    }

    function grokDeleteConfirmationOwnershipIsCurrent(ownership, routeGuard = null) {
        const root = ownership?.root || null;
        const button = ownership?.button || null;
        if (typeof routeGuard === "function" && routeGuard() !== true) return false;
        if (!root || !button || !root.isConnected || !button.isConnected || !isElementVisible(root) || !isElementVisible(button)) return false;
        if (!root.contains?.(button)) return false;
        const roots = getGrokDeleteDialogRoots();
        const info = getGrokDeleteConfirmButtonInfo();
        const currentRoot = info?.root || roots.find((candidate) => candidate === info?.node || candidate.contains?.(info?.node)) || null;
        return info?.node === button
            && currentRoot === root
            && roots.some((candidate) => candidate === root)
            && roots.every((candidate) => sameGrokDeleteDialogRoot(candidate, root));
    }

    async function waitForGrokDeleteConfirmation(baseline, routeGuard, timeoutMs = 2600) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const ownership = getGrokDeleteConfirmationOwnership(baseline, routeGuard);
            if (ownership) return { state: "owned", ownership };
            if (grokDeleteConfirmationAlreadyOpen()) return { state: "unowned", ownership: null };
            await sleep(80);
        }
        return grokDeleteConfirmationAlreadyOpen()
            ? { state: "unowned", ownership: null }
            : { state: "none", ownership: null };
    }

    async function clickGrokDeleteConfirmIfPresent(timeoutMs = 4200, guard = null) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const methods = ["pointer", "keyboard", "template", "native"];
        let clicked = null;
        while (Date.now() <= deadline) {
            if (clicked && !grokDeleteConfirmationAlreadyOpen()) return true;
            const info = getGrokDeleteConfirmButtonInfo();
            const button = info?.node || null;
            if (button && typeof guard === "function" && guard() !== true) return false;
            if (button) {
                for (const method of methods) {
                    if (!isElementVisible(button)) break;
                    if (!simulateGrokClick(button, { method })) continue;
                    clicked = button;
                    await sleep(220);
                    if (!grokDeleteConfirmationAlreadyOpen()) return true;
                }
            }
            await sleep(120);
        }
        return Boolean(clicked && !grokDeleteConfirmationAlreadyOpen());
    }

    async function finishGrokDeleteConfirmation(ownership, routeGuard) {
        const guard = () => grokDeleteConfirmationOwnershipIsCurrent(ownership, routeGuard);
        if (!guard()) return false;
        const confirmed = await clickGrokDeleteConfirmIfPresent(5200, guard);
        if (confirmed) return true;
        console.warn(`${LOG_TAG} conversationMenu: native delete confirmation did not close.`);
        return false;
    }

    function getGrokDeleteRouteGuard() {
        let routeId = "";
        let routeHref = "";
        try {
            const url = new URL(String(window.location?.href || ""));
            routeId = url.pathname.match(/^\/(?:c|chat)\/([^/?#]+)/i)?.[1] || "";
            routeHref = url.href;
        } catch { }
        if (!routeId || !routeHref) return null;
        return () => {
            try {
                const url = new URL(String(window.location?.href || ""));
                return url.href === routeHref && url.pathname.match(/^\/(?:c|chat)\/([^/?#]+)/i)?.[1] === routeId;
            } catch {
                return false;
            }
        };
    }

    async function deleteCurrentGrokConversationViaPage(spec) {
        const routeGuard = getGrokDeleteRouteGuard();
        if (!routeGuard || !routeGuard()) {
            console.warn(`${LOG_TAG} conversationMenu: stable current conversation route not found.`);
            return false;
        }
        if (grokDeleteConfirmationAlreadyOpen()) {
            console.warn(`${LOG_TAG} conversationMenu: unverified native delete confirmation is already open.`);
            return false;
        }

        const trigger = findGrokConversationMenuTriggerElement();
        if (!trigger) {
            console.warn(`${LOG_TAG} conversationMenu: current conversation menu trigger not found.`);
            return false;
        }
        const confirmationBaseline = new Set(getGrokDeleteDialogRoots());
        const menuRoot = findGrokConversationMenuRoot(trigger) || await ensureGrokConversationMenuOpen();
        if (!menuRoot || !routeGuard()) {
            console.warn(`${LOG_TAG} conversationMenu: current conversation menu could not be opened.`);
            return false;
        }

        const selector = spec?.selector?.length ? spec.selector : GROK_CONVERSATION_MENU_ITEM_SELECTORS;
        const targetItem = getGrokConversationMenuItem(menuRoot, {
            selector,
            textMatch: spec?.textMatch || createGrokConversationTargetMatcher(GROK_CONVERSATION_TARGETS.delete),
            iconMatch: spec?.iconMatch || createGrokConversationTargetIconMatcher(GROK_CONVERSATION_TARGETS.delete),
            fallbackToFirst: false
        });
        if (!targetItem || isGrokModelMenuItemDisabled(targetItem)) {
            console.warn(`${LOG_TAG} conversationMenu: native delete menu item not found.`);
            return false;
        }
        if (grokDeleteConfirmationAlreadyOpen() || !routeGuard()) return false;

        const activated = await clickCurrentGrokConversationMenuItem({
            menuRoot,
            targetItem,
            textMatch: spec?.textMatch || createGrokConversationTargetMatcher(GROK_CONVERSATION_TARGETS.delete),
            iconMatch: spec?.iconMatch || createGrokConversationTargetIconMatcher(GROK_CONVERSATION_TARGETS.delete)
        });
        if (!activated) {
            console.warn(`${LOG_TAG} conversationMenu: native delete menu item did not activate.`);
            return false;
        }

        const observation = await waitForGrokDeleteConfirmation(confirmationBaseline, routeGuard, 1200);
        if (observation.state === "owned") return finishGrokDeleteConfirmation(observation.ownership, routeGuard);
        if (observation.state === "unowned") {
            console.warn(`${LOG_TAG} conversationMenu: native delete confirmation ownership is uncertain.`);
            return false;
        }
        return true;
    }

    function getGrokConversationMenuSpec(shortcut) {
        const data = isPlainObjectLocal(shortcut?.data) ? shortcut.data : {};
        const rawMenu = data.menu;
        const menu = isPlainObjectLocal(rawMenu)
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const action = String(menu.action || "").trim().toLowerCase() === "open"
            ? "open"
            : (String(menu.action || "").trim().toLowerCase() === "click" ? "click" : "oneStep");
        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = menu.waitForItem !== undefined ? !!menu.waitForItem : true;
        const selectorProvided = menu.selector !== undefined && menu.selector !== null;
        const selector = selectorProvided ? resolveGrokSelectorList(menu.selector) : [];
        const textQuery = typeof menu.keyword === "string" && menu.keyword.trim()
            ? menu.keyword.trim()
            : (typeof menu.textMatch === "string" && menu.textMatch.trim()
                ? menu.textMatch.trim()
                : (typeof rawMenu === "string" && rawMenu.trim() ? rawMenu.trim() : ""));
        const targetId = getGrokConversationTargetIdFromShortcut(shortcut)
            || (typeof menu.id !== "undefined" && menu.id !== null ? getGrokConversationTargetIdFromText(menu.id) : "")
            || getGrokConversationTargetIdFromText(textQuery);
        const target = targetId ? GROK_CONVERSATION_TARGETS[targetId] || null : null;
        const textMatch = target ? createGrokConversationTargetMatcher(target) : createGrokConversationTextMatcher(textQuery);
        const iconMatch = target ? createGrokConversationTargetIconMatcher(target) : null;

        return {
            action,
            fallbackToFirst,
            waitForItem,
            selector,
            selectorProvided,
            targetId,
            target,
            textMatch,
            iconMatch
        };
    }

    function createGrokConversationMenuDataAdapter() {
        return {
            label: siteText("dataAdapters.conversationMenu.label", "Menu keyword (or paste JSON, advanced):"),
            placeholder: siteText("dataAdapters.conversationMenu.placeholder", "Example: Delete Chat / Delete / {\"menu\":{\"id\":\"delete\"}}"),
            format: (data) => {
                const raw = isPlainObjectLocal(data) ? data : {};
                const keys = Object.keys(raw);
                if (keys.length === 0) return "";

                const menu = raw.menu;
                if (typeof menu === "string" && menu.trim()) return menu.trim();

                if (isPlainObjectLocal(menu)) {
                    const menuKeys = Object.keys(menu);
                    const keyword = (typeof menu.keyword === "string" && menu.keyword.trim())
                        ? menu.keyword.trim()
                        : ((typeof menu.textMatch === "string" && menu.textMatch.trim()) ? menu.textMatch.trim() : "");
                    const target = typeof menu.id === "string" && menu.id.trim() ? getGrokConversationTargetById(menu.id) : null;
                    if (target && menuKeys.every(k => ["id"].includes(k))) return target.name;
                    if (keyword && menuKeys.every(k => ["id", "keyword", "textMatch"].includes(k))) return keyword;
                }

                if (keys.length === 1 && keys[0] === "keyword" && typeof raw.keyword === "string" && raw.keyword.trim()) {
                    return raw.keyword.trim();
                }
                if (keys.length === 1 && keys[0] === "textMatch" && typeof raw.textMatch === "string" && raw.textMatch.trim()) {
                    return raw.textMatch.trim();
                }
                if (keys.length === 1 && keys[0] === "path" && Array.isArray(raw.path)) {
                    const parts = raw.path.map(value => String(value ?? "").trim()).filter(Boolean);
                    if (parts.length === 1) return parts[0];
                }

                try {
                    return JSON.stringify(raw, null, 2);
                } catch {
                    return "";
                }
            },
            parse: (text) => {
                const trimmed = String(text ?? "").trim();
                if (!trimmed) return {};
                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                    const parsed = JSON.parse(trimmed);
                    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
                    return parsed;
                }
                const targetId = getGrokConversationTargetIdFromText(trimmed);
                if (targetId) return { menu: { id: targetId } };
                return { menu: trimmed };
            }
        };
    }

    async function conversationMenuAction({ shortcut }) {
        const spec = getGrokConversationMenuSpec(shortcut);

        if (spec.action === "open") {
            return !!(await ensureGrokConversationMenuOpen());
        }

        if (spec.targetId === "delete") {
            return deleteCurrentGrokConversationViaPage(spec);
        }

        const menuRoot = findGrokConversationMenuRoot() || await ensureGrokConversationMenuOpen();
        if (!menuRoot) {
            console.warn(`${LOG_TAG} conversationMenu: menu not found.`);
            return false;
        }

        const selector = spec.selector.length > 0 ? spec.selector : GROK_CONVERSATION_MENU_ITEM_SELECTORS;
        let targetItem = getGrokConversationMenuItem(menuRoot, {
            selector,
            textMatch: spec.textMatch,
            iconMatch: spec.iconMatch,
            fallbackToFirst: spec.fallbackToFirst
        });
        if (!targetItem && spec.waitForItem) {
            const deadline = Date.now() + GROK_CONVERSATION_MENU_TIMING.waitTimeoutMs;
            while (Date.now() < deadline) {
                await sleep(GROK_CONVERSATION_MENU_TIMING.pollIntervalMs);
                const currentMenuRoot = findGrokConversationMenuRoot() || menuRoot;
                targetItem = getGrokConversationMenuItem(currentMenuRoot, {
                    selector,
                    textMatch: spec.textMatch,
                    iconMatch: spec.iconMatch,
                    fallbackToFirst: spec.fallbackToFirst
                });
                if (targetItem) break;
            }
        }
        if (!targetItem) {
            console.warn(`${LOG_TAG} conversationMenu: target menu item not found.`);
            return false;
        }

        if (isGrokModelMenuItemDisabled(targetItem)) {
            console.warn(`${LOG_TAG} conversationMenu: target menu item is disabled.`);
            return false;
        }

        if (spec.action === "click") {
            return clickCurrentGrokConversationMenuItem({ menuRoot, targetItem, textMatch: spec.textMatch, iconMatch: spec.iconMatch });
        }

        return clickCurrentGrokConversationMenuItem({ menuRoot, targetItem, textMatch: spec.textMatch, iconMatch: spec.iconMatch });
    }

    function inferSidebarStateFromClassName(value) {
        const token = String(value ?? "").toLowerCase();
        if (!token) return null;
        if (/(sidebar|sidenav)[-_a-z0-9]*(collapsed|closed|hidden)/.test(token)) return false;
        if (/(sidebar|sidenav)[-_a-z0-9]*(expanded|opened|open|visible)/.test(token)) return true;
        return null;
    }

    function readSidebarStateFromElement(element) {
        if (!element) return null;

        const isSidebarTrigger = element.matches?.(SELECTORS.sidebarToggle)
            || String(element.getAttribute?.("data-sidebar") || "").trim().toLowerCase() === "trigger";

        const expanded = parseBooleanAttr(element.getAttribute?.("aria-expanded"));
        if (expanded !== null) return expanded;

        const hidden = parseBooleanAttr(element.getAttribute?.("aria-hidden"));
        if (hidden !== null) return !hidden;

        if (!isSidebarTrigger) {
            const stateAttr = String(element.getAttribute?.("data-state") || "").trim().toLowerCase();
            if (stateAttr === "expanded" || stateAttr === "open" || stateAttr === "opened") return true;
            if (stateAttr === "collapsed" || stateAttr === "close" || stateAttr === "closed") return false;

            const collapsibleAttr = String(element.getAttribute?.("data-collapsible") || "").trim().toLowerCase();
            if (collapsibleAttr === "offcanvas" || collapsibleAttr === "icon") return false;
        }

        return inferSidebarStateFromClassName(element.className || "");
    }

    function readSidebarStateFromToggle(button) {
        if (!button) return null;

        const provider = getSidebarProviderElement(button);
        const providerState = readSidebarStateFromElement(provider);
        if (providerState !== null) return providerState;

        const directExpanded = parseBooleanAttr(button.getAttribute?.("aria-expanded"));
        if (directExpanded !== null) return directExpanded;

        const directPressed = parseBooleanAttr(button.getAttribute?.("aria-pressed"));
        if (directPressed !== null) return directPressed;

        const ariaLabel = String(button.getAttribute?.("aria-label") || "").trim().toLowerCase();
        if (/(open|expand|show).*(menu|navigation|sidebar|side nav|panel)/.test(ariaLabel)) return false;
        if (/(close|collapse|hide).*(menu|navigation|sidebar|side nav|panel)/.test(ariaLabel)) return true;

        const controlsId = String(button.getAttribute?.("aria-controls") || "").trim();
        if (controlsId) {
            const controlled = document.getElementById(controlsId);
            const controlledState = readSidebarStateFromElement(getSidebarProviderElement(controlled) || controlled);
            if (controlledState !== null) return controlledState;
        }

        const host = button.closest?.(`${SELECTORS.sidebarRoot}, [data-sidebar="rail"], [class*="sidebar"], [class*="sidenav"]`);
        return readSidebarStateFromElement(getSidebarProviderElement(host) || host);
    }

    function isSidebarOpen() {
        const sidebarProvider = getSidebarProviderElement();
        const providerState = readSidebarStateFromElement(sidebarProvider);
        if (providerState !== null) return providerState;

        const sidebarRoot = getFirstVisibleBySelector(SELECTORS.sidebarRoot, { fallbackToFirst: true });
        const rootState = readSidebarStateFromElement(sidebarRoot);
        if (rootState !== null) return rootState;

        for (const selector of SIDEBAR_OPEN_SELECTORS) {
            const el = getFirstVisibleBySelector(selector);
            if (el) return true;
        }

        for (const selector of SIDEBAR_CLOSED_SELECTORS) {
            const el = getFirstVisibleBySelector(selector, { fallbackToFirst: true });
            if (el) return false;
        }

        const button = getSidebarToggleButton();
        const fromToggle = readSidebarStateFromToggle(button);
        if (fromToggle !== null) return fromToggle;
        return null;
    }

    function clickSidebarToggleButton() {
        const button = getSidebarToggleButton();
        if (!button) return false;
        try {
            const clicked = TemplateUtils?.events?.simulateClick?.(button, { nativeFallback: true });
            if (clicked) return true;
        } catch { }
        try {
            button.click();
            return true;
        } catch { }
        return false;
    }

    function getViewportWidth() {
        const width = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 0;
        return width > 0 ? width : 0;
    }

    function isSidebarAutoExpandSuppressedByViewport() {
        const width = getViewportWidth();
        return width > 0 && width <= SIDEBAR_AUTO_EXPAND_MAX_VIEWPORT_WIDTH;
    }

    function shouldWarmupSidebarInBackground() {
        return keepSidebarVisible && !isSidebarAutoExpandSuppressedByViewport();
    }

    function ensureSidebarVisible() {
        if (!keepSidebarVisible) return false;
        const open = isSidebarOpen();
        if (open === true) return true;
        if (open === false) return clickSidebarToggleButton();
        return false;
    }

    function stopSidebarWarmup() {
        if (sidebarWarmupTimer === null) return;
        try { clearInterval(sidebarWarmupTimer); } catch { }
        sidebarWarmupTimer = null;
    }

    function startSidebarWarmup({ attempts = 20, intervalMs = 500 } = {}) {
        stopSidebarWarmup();
        if (!shouldWarmupSidebarInBackground()) return;
        let remaining = Math.max(1, Number(attempts) || 1);
        const interval = Math.max(150, Number(intervalMs) || 500);

        const tick = () => {
            if (!shouldWarmupSidebarInBackground()) {
                stopSidebarWarmup();
                return;
            }

            const open = isSidebarOpen();
            if (open === true) {
                stopSidebarWarmup();
                return;
            }

            ensureSidebarVisible();
            remaining -= 1;
            if (remaining <= 0) stopSidebarWarmup();
        };

        tick();
        sidebarWarmupTimer = window.setInterval(tick, interval);
    }

    function setSidebarVisibilityPreference(nextValue) {
        keepSidebarVisible = !!nextValue;
        setKeepSidebarVisibleSetting(keepSidebarVisible);
        if (keepSidebarVisible) {
            if (shouldWarmupSidebarInBackground()) {
                startSidebarWarmup();
            } else {
                stopSidebarWarmup();
            }
        } else {
            stopSidebarWarmup();
        }

        console.info(`${LOG_TAG} keep sidebar visible is now ${keepSidebarVisible ? "enabled" : "disabled"}.`);
        registerSidebarVisibilityMenuCommand();
        return keepSidebarVisible;
    }

    function setupKeepSidebarVisible() {
        let wasSidebarAutoExpandSuppressed = isSidebarAutoExpandSuppressedByViewport();

        window.addEventListener("load", () => {
            setTimeout(() => startSidebarWarmup(), 650);
        }, { once: true });

        if (document.readyState === "complete") {
            setTimeout(() => startSidebarWarmup(), 800);
        }

        let lastUrl = location.href;
        const observer = new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                startSidebarWarmup();
            }
        });
        observer.observe(document.documentElement || document, { subtree: true, childList: true });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") startSidebarWarmup();
        });

        window.addEventListener("resize", () => {
            const suppressed = isSidebarAutoExpandSuppressedByViewport();
            if (suppressed === wasSidebarAutoExpandSuppressed) return;

            wasSidebarAutoExpandSuppressed = suppressed;
            if (suppressed) {
                stopSidebarWarmup();
                return;
            }

            if (keepSidebarVisible) startSidebarWarmup();
        });
    }

    migrateGrokShortcuts();

    // 创建快捷键引擎实例
    const engine = ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "Grok - 设置快捷键",
        panelTitle: "Grok - 自定义快捷键",

        // 存储配置（保持与原脚本一致）
        storageKeys: {
            shortcuts: GROK_SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: 'grok_icon_cache_v1::',
            userIcons: 'grok_user_icons_v1'
        },

        // UI 配置
        ui: {
            idPrefix: 'grok',
            cssPrefix: 'grok',
            compactBreakpoint: 800
        },
        i18n: {
            messages: SITE_MESSAGES
        },

        // 自定义动作
        customActions: {
            conversationMenu: conversationMenuAction,
            modelPicker: modelPickerAction
        },
        customActionDataAdapters: {
            conversationMenu: createGrokConversationMenuDataAdapter(),
            modelPicker: createGrokModelPickerDataAdapter()
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
        consoleTag: LOG_TAG,

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
    setupKeepSidebarVisible();
    registerSidebarVisibilityMenuCommand();
})();
