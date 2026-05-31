/* -------------------------------------------------------------------------- *
 * Site Entry · [Gemini] 快捷键跳转
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

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Gemini Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = "[Gemini Shortcut Script]";
    const GEMINI_NATIVE_ICON_URL = "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg";
    const GEMINI_DEFAULT_SHORTCUTS_STORAGE_KEY = "gemini_shortcuts_v2";
    const GEMINI_EXTENDED_MODEL_SHORTCUT_MIGRATION_KEY = "gemini_extended_model_shortcut_added_v1";
    const GEMINI_EXTENDED_MODEL_SHORTCUT_NAME = "Model: Extended";
    const GEMINI_EXTENDED_MODEL_DEFAULT_HOTKEY = "CTRL+SHIFT+E";
    const defaultIconURL = GEMINI_NATIVE_ICON_URL;

    const defaultIcons = [
        { name: "Gemini", url: GEMINI_NATIVE_ICON_URL },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "ChatGPT", url: "https://chatgpt.com/favicon.ico" },
        { name: "Claude", url: "https://claude.ai/favicon.ico" },
        { name: "Perplexity", url: "https://www.perplexity.ai/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" }
    ];

    const protectedIconUrls = [
        GEMINI_NATIVE_ICON_URL
    ];

    const GEMINI_MANAGED_SHORTCUT_ICON_URLS = Object.freeze([
        GEMINI_NATIVE_ICON_URL,
        "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
        "https://gemini.google.com/favicon.ico",
        "https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/main/Site_Icon/gemini_keycap.svg",
        "https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/release/Site_Icon/gemini_keycap.svg",
        "https://raw.githubusercontent.com/0-V-linuxdo/Template_shortcuts.js/main/Site_Icon/gemini_keycap.svg",
        "https://raw.githubusercontent.com/0-V-linuxdo/Template_shortcuts.js/release/Site_Icon/gemini_keycap.svg"
    ]);

    function createGeminiNativeShortcutIconSet(iconName) {
        const normalizedIconName = String(iconName || "").trim();
        const source = normalizedIconName ? `font-icon:${normalizedIconName}` : "";
        return Object.freeze({
            icon: source,
            iconDark: source,
            iconAdaptive: false
        });
    }

    const GEMINI_SHORTCUT_ICON_SETS = Object.freeze({
        newChat: createGeminiNativeShortcutIconSet("edit_square"),
        sidebar: createGeminiNativeShortcutIconSet("left_panel_close"),
        model: createGeminiNativeShortcutIconSet("keyboard_arrow_down"),
        tools: createGeminiNativeShortcutIconSet("add_2"),
        canvas: createGeminiNativeShortcutIconSet("note_stack_add"),
        createImage: createGeminiNativeShortcutIconSet("photo_prints"),
        quickInput: createGeminiNativeShortcutIconSet("arrow_upward"),
        learn: createGeminiNativeShortcutIconSet("auto_stories"),
        deepResearch: createGeminiNativeShortcutIconSet("travel_explore"),
        delete: createGeminiNativeShortcutIconSet("delete"),
        pin: createGeminiNativeShortcutIconSet("push_pin")
    });

    const GEMINI_PREVIOUS_SHORTCUT_ICON_SETS = Object.freeze({
        sidebar: Object.freeze([
            createGeminiNativeShortcutIconSet("menu"),
            createGeminiNativeShortcutIconSet("menu_open"),
            createGeminiNativeShortcutIconSet("left_panel_open"),
            createGeminiNativeShortcutIconSet("side_navigation")
        ]),
        model: Object.freeze([createGeminiNativeShortcutIconSet("spark")]),
        tools: Object.freeze([createGeminiNativeShortcutIconSet("page_info")]),
        quickInput: Object.freeze([createGeminiNativeShortcutIconSet("send")])
    });

    const GEMINI_DEFAULT_SHORTCUT_ICON_KEYS_BY_NAME = Object.freeze({
        "New Chat": "newChat",
        "Toggle Sidebar": "sidebar",
        "Model: Pro": "model",
        "Model: Thinking": "model",
        "Model: Extended": "model",
        "Model: Fast": "model",
        "Open Tools": "tools",
        "Canvas": "canvas",
        "Image": "createImage",
        "Quick Input": "quickInput",
        "Learning": "learn",
        "Research": "deepResearch",
        "Delete": "delete",
        "Pin": "pin"
    });

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "Gemini - 设置快捷键",
            panelTitle: "Gemini - 自定义快捷键",
            quickInputTitle: "Gemini - 快捷输入",
            keepSidebarVisibleLabel: "Gemini - 保持侧边栏显示: {state}",
            on: "开",
            off: "关",
            shortcuts: {
                "New Chat": "新建聊天",
                "Toggle Sidebar": "切换侧边栏",
                "Model: Pro": "模型：Pro",
                "Model: Thinking": "模型：Thinking",
                "Model: Extended": "模型：Extended",
                "Model: Fast": "模型：Fast",
                "Open Tools": "打开工具",
                "Canvas": "画布",
                "Image": "图片",
                "Quick Input": "快捷输入",
                "Learning": "学习",
                "Research": "深度研究",
                "Delete": "删除",
                "Pin": "置顶"
            },
            dataAdapters: {
                toolsDrawer: {
                    label: "菜单关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: {\"menu\":{\"id\":\"canvas\"}} / Canvas"
                },
                conversationMenu: {
                    label: "菜单关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: {\"menu\":{\"id\":\"pin\"}} / Delete"
                },
                modelPicker: {
                    label: "模型关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: Pro / Thinking / Extended / Fast"
                }
            },
            quickInput: {
                nativeNewChatLabel: "CMD+SHIFT+O (原生)",
                notebookNewChatLabel: "Notebook 主页跳转",
                rootUrlMismatch: "当前 URL 必须匹配 QuickInput Notebook 目标 {targetUrl}，实际是 {currentUrl}",
                notebookNewPageMismatch: "当前 Notebook 不是新聊天空白页，目标是 {targetUrl}，实际是 {currentUrl}",
                notebookNewChatButtonMissing: "未找到安全的 Notebook 内新建聊天入口，已停止以避免写入旧上下文。",
                notebookHomeResetFailed: "Notebook 主页刷新后仍不是空白新页，目标是 {targetUrl}，实际是 {currentUrl}",
                emptyUrl: "(空)",
                imageInsertUrlPrefix: "图片插入前 URL 校验失败：",
                newChatVerifyPrefix: "Notebook 校验失败：",
                clearNoComposer: "清空当前图片附件失败：未找到输入框。",
                clearNoContainer: "清空当前图片附件失败：未找到附件容器。",
                clearStillRemaining: "清空当前图片附件失败：点击移除后仍识别到 {remaining} 个附件标记。",
                clearNoRemoveButton: "清空当前图片附件失败：仍识别到 {remaining} 个附件标记，但未找到可用的移除按钮。",
                clearUnknown: "清空当前图片附件失败：未能确认附件已全部移除。",
                noImageFiles: "未检测到图片文件。",
                attachFailed: "图片粘贴失败：未检测到输入框内出现图片预览。"
            }
        },
        "en-US": {
            menuCommandLabel: "Gemini - Shortcut settings",
            panelTitle: "Gemini - Custom shortcuts",
            quickInputTitle: "Gemini - Quick Input",
            keepSidebarVisibleLabel: "Gemini - Keep sidebar visible: {state}",
            on: "On",
            off: "Off",
            dataAdapters: {
                toolsDrawer: {
                    label: "Menu keyword (or paste JSON, advanced):",
                    placeholder: "Example: {\"menu\":{\"id\":\"canvas\"}} / Canvas"
                },
                conversationMenu: {
                    label: "Menu keyword (or paste JSON, advanced):",
                    placeholder: "Example: {\"menu\":{\"id\":\"pin\"}} / Delete"
                },
                modelPicker: {
                    label: "Model keyword (or paste JSON, advanced):",
                    placeholder: "Example: Pro / Thinking / Extended / Fast"
                }
            },
            quickInput: {
                nativeNewChatLabel: "CMD+SHIFT+O (native)",
                notebookNewChatLabel: "Notebook home jump",
                rootUrlMismatch: "Current URL must match the QuickInput Notebook target {targetUrl}; actual URL is {currentUrl}",
                notebookNewPageMismatch: "Current Notebook is not a blank new-chat page. Target: {targetUrl}; actual URL: {currentUrl}",
                notebookNewChatButtonMissing: "No safe Notebook new-chat control was found, so Quick Input stopped to avoid writing into old context.",
                notebookHomeResetFailed: "Notebook home still was not a blank new-chat page after route reset. Target: {targetUrl}; actual URL: {currentUrl}",
                emptyUrl: "(empty)",
                imageInsertUrlPrefix: "URL check failed before inserting images: ",
                newChatVerifyPrefix: "Notebook verification failed: ",
                clearNoComposer: "Failed to clear current image attachments: input box not found.",
                clearNoContainer: "Failed to clear current image attachments: attachment container not found.",
                clearStillRemaining: "Failed to clear current image attachments: {remaining} attachment marker(s) still detected after clicking remove.",
                clearNoRemoveButton: "Failed to clear current image attachments: {remaining} attachment marker(s) still detected, and no usable remove button was found.",
                clearUnknown: "Failed to clear current image attachments: could not confirm that all attachments were removed.",
                noImageFiles: "No image files detected.",
                attachFailed: "Image paste failed: no image preview was detected in the input box."
            }
        }
    });

    const siteText = (key, fallback) => ({ ctx } = {}) => ctx?.i18n?.t?.(key, {}, fallback) || fallback;
    const siteMessage = (engine, key, vars = {}, fallback = "") => engine?.i18n?.t?.(key, vars, fallback) || fallback;

    const SELECTORS = {
        sidebarToggle: [
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Toggle Sidebar']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Open sidebar']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Close sidebar']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Open side bar']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Close side bar']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Open navigation menu']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label='Close navigation menu']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='sidebar' i]",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='side bar' i]",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='side nav' i]",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='side-nav' i]",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='navigation' i]",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='侧栏']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='侧边栏']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='边栏']",
            "top-bar-actions button:not([aria-haspopup='menu'])[aria-label*='导航']",
            "top-bar-actions button:has(mat-icon[fonticon='menu'])",
            "top-bar-actions button:has(mat-icon[data-mat-icon-name='menu'])",
            "top-bar-actions button:has(mat-icon[fonticon='menu_open'])",
            "top-bar-actions button:has(mat-icon[data-mat-icon-name='menu_open'])",
            "top-bar-actions button:has(mat-icon[fonticon='left_panel_open'])",
            "top-bar-actions button:has(mat-icon[data-mat-icon-name='left_panel_open'])",
            "top-bar-actions button:has(mat-icon[fonticon='left_panel_close'])",
            "top-bar-actions button:has(mat-icon[data-mat-icon-name='left_panel_close'])",
            "top-bar-actions button:has(mat-icon[fonticon='side_navigation'])",
            "top-bar-actions button:has(mat-icon[data-mat-icon-name='side_navigation'])",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='sidebar' i]",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='sidebar' i]",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='side bar' i]",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='side bar' i]",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='side nav' i]",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='side nav' i]",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='side-nav' i]",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='side-nav' i]",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='navigation' i]",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='navigation' i]",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='menu' i]",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='menu' i]",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='侧栏']",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='侧栏']",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='侧边栏']",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='侧边栏']",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='边栏']",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='边栏']",
            "bard-sidenav button:not([aria-haspopup='menu'])[aria-label*='导航']",
            "side-navigation-content button:not([aria-haspopup='menu'])[aria-label*='导航']",
            "bard-sidenav button:has(mat-icon[fonticon='menu'])",
            "side-navigation-content button:has(mat-icon[fonticon='menu'])",
            "bard-sidenav button:has(mat-icon[data-mat-icon-name='menu'])",
            "side-navigation-content button:has(mat-icon[data-mat-icon-name='menu'])",
            "bard-sidenav button:has(mat-icon[fonticon='menu_open'])",
            "side-navigation-content button:has(mat-icon[fonticon='menu_open'])",
            "bard-sidenav button:has(mat-icon[data-mat-icon-name='menu_open'])",
            "side-navigation-content button:has(mat-icon[data-mat-icon-name='menu_open'])",
            "bard-sidenav button:has(mat-icon[fonticon='left_panel_open'])",
            "side-navigation-content button:has(mat-icon[fonticon='left_panel_open'])",
            "bard-sidenav button:has(mat-icon[data-mat-icon-name='left_panel_open'])",
            "side-navigation-content button:has(mat-icon[data-mat-icon-name='left_panel_open'])",
            "bard-sidenav button:has(mat-icon[fonticon='left_panel_close'])",
            "side-navigation-content button:has(mat-icon[fonticon='left_panel_close'])",
            "bard-sidenav button:has(mat-icon[data-mat-icon-name='left_panel_close'])",
            "side-navigation-content button:has(mat-icon[data-mat-icon-name='left_panel_close'])",
            "bard-sidenav button:has(mat-icon[fonticon='side_navigation'])",
            "side-navigation-content button:has(mat-icon[fonticon='side_navigation'])",
            "bard-sidenav button:has(mat-icon[data-mat-icon-name='side_navigation'])",
            "side-navigation-content button:has(mat-icon[data-mat-icon-name='side_navigation'])",
            "button[aria-label='Close sidebar']",
            "button[aria-label='Open sidebar']",
            "button[aria-label='Close side bar']",
            "button[aria-label='Open side bar']",
            "button[aria-label='Collapse sidebar']",
            "button[aria-label='Expand sidebar']",
            "button[aria-label='Collapse side bar']",
            "button[aria-label='Expand side bar']",
            "button:not([aria-haspopup='menu'])[aria-label='Open navigation menu']",
            "button:not([aria-haspopup='menu'])[aria-label='Close navigation menu']",
            "button:not([aria-haspopup='menu'])[aria-label*='侧栏']",
            "button:not([aria-haspopup='menu'])[aria-label*='侧边栏']",
            "button:not([aria-haspopup='menu'])[aria-label*='边栏']"
        ],
        modelPickerButton: [
            "button[aria-label='Open mode picker']",
            "bard-mode-switcher button[aria-label='Open mode picker']",
            "bard-mode-switcher button",
            "button[aria-label*='mode picker' i]",
            "button[aria-label*='model' i]"
        ],
        modelPickerMenuRoot: [
            ".cdk-overlay-pane .gds-mode-switch-menu.mat-mdc-menu-panel",
            ".cdk-overlay-pane .mat-mdc-menu-panel[role='menu']",
            ".cdk-overlay-pane .mat-menu-panel[role='menu']",
            ".cdk-overlay-pane [role='menu']",
            ".mat-mdc-menu-panel[role='menu']",
            ".mat-menu-panel[role='menu']"
        ],
        toolsButton: [
            "[data-node-type='input-area'] button[aria-label='Upload & tools']",
            "input-area-v2 button[aria-label='Upload & tools']",
            "button[aria-label='Upload & tools']",
            "[data-node-type='input-area'] button[aria-label*='tools' i]",
            "input-area-v2 button[aria-label*='tools' i]",
            "button[aria-label*='upload & tools' i]",
            "button[aria-label*='upload and tools' i]",
            "[data-node-type='input-area'] button[aria-label='Open upload file menu']",
            "input-area-v2 button[aria-label='Open upload file menu']",
            "button[aria-label='Open upload file menu']",
            "button[aria-label*='open upload' i]",
            "button[aria-controls='upload-file-menu']",
            "button.upload-card-button.open",
            "button.upload-card-button"
        ],
        toolsMenuRoot: [
            ".cdk-overlay-pane #upload-file-menu",
            "#upload-file-menu",
            ".cdk-overlay-pane [id*='upload-file-menu']",
            ".cdk-overlay-pane .mat-mdc-menu-panel[role='menu']",
            ".cdk-overlay-pane .mat-menu-panel[role='menu']",
            ".cdk-overlay-pane [role='menu']",
            ".cdk-overlay-pane .mat-mdc-menu-panel",
            ".cdk-overlay-pane .mat-menu-panel",
            ".cdk-overlay-pane",
            ".mat-mdc-menu-panel[role='menu']",
            ".mat-menu-panel[role='menu']"
        ],
        topBarConversationActionsButton: [
            "top-bar-actions conversation-actions-icon button[data-test-id='conversation-actions-menu-icon-button']",
            "top-bar-actions button[data-test-id='conversation-actions-menu-icon-button']",
            "top-bar-actions button.conversation-actions-menu-button",
            "top-bar-actions button[aria-label*='conversation actions' i]",
            "top-bar-actions button[aria-label*='menu' i]",
            "button[data-test-id='conversation-actions-menu-icon-button']",
            "button[aria-label*='Open menu for conversation actions' i]",
            "button[aria-label*='conversation actions' i]",
            "button[data-test-id='actions-menu-button']",
            "button.conversation-actions-menu-button"
        ],
        topBarConversationMenuRoot: [
            ".cdk-overlay-pane .mat-mdc-menu-panel[role='menu']",
            ".cdk-overlay-pane .mat-menu-panel[role='menu']",
            ".cdk-overlay-pane [role='menu']",
            ".cdk-overlay-pane .mat-mdc-menu-panel",
            ".cdk-overlay-pane .mat-menu-panel",
            ".mat-mdc-menu-panel[role='menu']",
            ".mat-menu-panel[role='menu']",
            ".cdk-overlay-pane"
        ],
    };

    const MODEL_PICKER_OPTION_TARGETS = Object.freeze({
        pro: Object.freeze({
            selector: [
                "button.bard-mode-list-button[role='menuitemradio']",
                "button[role='menuitemradio']",
                "button[role='menuitem']",
                "button[mat-menu-item]",
                "button.mat-mdc-menu-item",
                "[role='menuitemradio']",
                "[role='menuitem']"
            ],
            textMatch: ["Pro", "3.1 Pro"]
        }),
        thinking: Object.freeze({
            selector: [
                "button.bard-mode-list-button[role='menuitemradio']",
                "button[role='menuitemradio']",
                "button[role='menuitem']",
                "button[aria-haspopup='menu']",
                "button[mat-menu-item]",
                "button.mat-mdc-menu-item",
                "[role='menuitemradio']",
                "[role='menuitem']"
            ],
            textMatch: ["Thinking", "Thinking level"]
        }),
        extended: Object.freeze({
            selector: [
                "button.bard-mode-list-button[role='menuitemradio']",
                "button[role='menuitemradio']",
                "button[role='menuitem']",
                "button[mat-menu-item]",
                "button.mat-mdc-menu-item",
                "[role='menuitemradio']",
                "[role='menuitem']"
            ],
            textMatch: ["Extended thinking", "Extended"]
        }),
        fast: Object.freeze({
            selector: [
                "button.bard-mode-list-button[role='menuitemradio']",
                "button[role='menuitemradio']",
                "button[role='menuitem']",
                "button[mat-menu-item]",
                "button.mat-mdc-menu-item",
                "[role='menuitemradio']",
                "[role='menuitem']"
            ],
            textMatch: {
                preferred: ["3 Flash"],
                fallback: ["3.1 Flash-Lite", "Fast"]
            }
        })
    });

    function normalizeModelToken(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function inferModelKeyFromText(text) {
        const token = normalizeModelToken(text);
        if (!token) return "";
        if (/(^|[^a-z0-9])extended\s+thinking([^a-z0-9]|$)/.test(token)) return "extended";
        if (/(^|[^a-z0-9])extended([^a-z0-9]|$)/.test(token)) return "extended";
        if (/(^|[^a-z0-9])flash[\s-]*lite([^a-z0-9]|$)/.test(token)) return "flashLite";
        if (/(^|[^a-z0-9])3\s*\.?\s*1\s*pro([^a-z0-9]|$)/.test(token)) return "pro";
        if (/(^|[^a-z0-9])thinking\s+level([^a-z0-9]|$)/.test(token)) return "thinking";
        if (/(^|[^a-z0-9])3\s*flash([^a-z0-9]|$)/.test(token)) return "fast";
        if (token === "pro") return "pro";
        if (token === "thinking") return "thinking";
        if (token === "extended") return "extended";
        if (token === "fast") return "fast";
        if (token === "flash") return "fast";
        if (/(^|[^a-z0-9])pro([^a-z0-9]|$)/.test(token)) return "pro";
        if (/(^|[^a-z0-9])thinking([^a-z0-9]|$)/.test(token)) return "thinking";
        if (/(^|[^a-z0-9])fast([^a-z0-9]|$)/.test(token)) return "fast";
        if (/(^|[^a-z0-9])flash([^a-z0-9]|$)/.test(token)) return "fast";
        return "";
    }

    function normalizeGeminiUiText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function getElementLayoutWidth(element) {
        if (!element) return 0;
        try {
            const rect = element.getBoundingClientRect?.();
            return Number(rect?.width) || 0;
        } catch {
            return 0;
        }
    }

    function normalizeGeminiMenuTargetKey(value) {
        return String(value ?? "").trim().replace(/[\s_-]+/g, "").toLowerCase();
    }

    function normalizeGeminiToolIconName(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function normalizeGeminiToolIconNames(value) {
        if (Array.isArray(value)) {
            return value.map(normalizeGeminiToolIconName).filter(Boolean);
        }
        const one = normalizeGeminiToolIconName(value);
        return one ? [one] : [];
    }

    function normalizeGeminiToolStringIds(value) {
        if (Array.isArray(value)) {
            return value.map(item => String(item ?? "").trim()).filter(Boolean);
        }
        const one = String(value ?? "").trim();
        return one ? [one] : [];
    }

    const GEMINI_TOOL_TARGETS = Object.freeze({
        createImage: Object.freeze({
            id: "createImage",
            matchIds: Object.freeze(["createimage", "image"]),
            iconNames: Object.freeze(["photo_prints"]),
            jslogIds: Object.freeze(["271906"]),
            featureIds: Object.freeze(["14"]),
            aliases: Object.freeze(["Create image", "Image", "创建图片", "生成图片"])
        }),
        canvas: Object.freeze({
            id: "canvas",
            matchIds: Object.freeze(["canvas"]),
            iconNames: Object.freeze(["note_stack_add"]),
            jslogIds: Object.freeze(["251249"]),
            featureIds: Object.freeze(["2"]),
            aliases: Object.freeze(["Canvas", "画布"])
        }),
        deepResearch: Object.freeze({
            id: "deepResearch",
            matchIds: Object.freeze(["deepresearch", "research"]),
            iconNames: Object.freeze(["travel_explore"]),
            jslogIds: Object.freeze(["251250"]),
            featureIds: Object.freeze(["1"]),
            aliases: Object.freeze(["Deep research", "Research", "深度研究"])
        }),
        createVideo: Object.freeze({
            id: "createVideo",
            matchIds: Object.freeze(["createvideo", "video"]),
            iconNames: Object.freeze(["movie"]),
            jslogIds: Object.freeze(["255043"]),
            featureIds: Object.freeze(["11"]),
            aliases: Object.freeze(["Create video", "Video", "创建视频", "生成视频"])
        }),
        createMusic: Object.freeze({
            id: "createMusic",
            matchIds: Object.freeze(["createmusic", "music"]),
            iconNames: Object.freeze(["music_note"]),
            jslogIds: Object.freeze(["297655"]),
            featureIds: Object.freeze(["21"]),
            aliases: Object.freeze(["Create music", "Music", "创建音乐", "生成音乐"])
        }),
        learn: Object.freeze({
            id: "learn",
            matchIds: Object.freeze(["learn", "learning"]),
            iconNames: Object.freeze(["auto_stories"]),
            jslogIds: Object.freeze(["272446"]),
            featureIds: Object.freeze(["24"]),
            aliases: Object.freeze(["Learn", "Learning", "学习"])
        })
    });

    const GEMINI_TOOLS_PRIMARY_MENU_MARKERS = Object.freeze([
        "Upload files",
        "Add from Drive",
        "More uploads",
        "Create image",
        "Create video",
        "Canvas",
        "Deep research",
        "More tools",
        "上传文件",
        "从云端硬盘添加",
        "更多上传",
        "创建图片",
        "生成图片",
        "创建视频",
        "生成视频",
        "画布",
        "深度研究",
        "更多工具"
    ]);

    const GEMINI_TOOLS_SUBMENU_MARKERS = Object.freeze([
        "Learn",
        "Learning",
        "Create music",
        "Music",
        "学习",
        "创建音乐",
        "生成音乐"
    ]);

    const GEMINI_TOOLS_MENU_MARKERS = Object.freeze([
        ...GEMINI_TOOLS_PRIMARY_MENU_MARKERS,
        ...GEMINI_TOOLS_SUBMENU_MARKERS
    ]);

    const GEMINI_MORE_TOOLS_ALIASES = Object.freeze([
        "More tools",
        "更多工具"
    ]);

    const GEMINI_TOOLS_SUBMENU_TARGET_IDS = Object.freeze([
        "learn",
        "createMusic"
    ]);

    const GEMINI_TOOL_TARGET_ID_ALIASES = Object.freeze(
        Object.values(GEMINI_TOOL_TARGETS).reduce((acc, target) => {
            for (const matchId of target.matchIds || []) acc[matchId] = target.id;
            return acc;
        }, {})
    );

    const GEMINI_CONVERSATION_MENU_TARGETS = Object.freeze({
        filesInChat: Object.freeze({
            id: "filesInChat",
            matchIds: Object.freeze(["filesinchat", "files"]),
            dataTestIds: Object.freeze(["studio-sidebar-button"]),
            iconNames: Object.freeze(["home_storage"]),
            aliases: Object.freeze(["Files in this chat", "文件"])
        }),
        pin: Object.freeze({
            id: "pin",
            matchIds: Object.freeze(["pin"]),
            dataTestIds: Object.freeze(["pin-button"]),
            iconNames: Object.freeze(["push_pin"]),
            jslogIds: Object.freeze(["186001"]),
            aliases: Object.freeze(["Pin", "Unpin", "固定", "置顶", "取消固定"])
        }),
        rename: Object.freeze({
            id: "rename",
            matchIds: Object.freeze(["rename"]),
            dataTestIds: Object.freeze(["rename-button"]),
            iconNames: Object.freeze(["edit"]),
            jslogIds: Object.freeze(["186002"]),
            aliases: Object.freeze(["Rename", "重命名"])
        }),
        delete: Object.freeze({
            id: "delete",
            matchIds: Object.freeze(["delete", "remove"]),
            dataTestIds: Object.freeze(["delete-button"]),
            iconNames: Object.freeze(["delete"]),
            jslogIds: Object.freeze(["186000"]),
            aliases: Object.freeze(["Delete", "删除"])
        })
    });

    const GEMINI_CONVERSATION_MENU_TARGET_ID_ALIASES = Object.freeze(
        Object.values(GEMINI_CONVERSATION_MENU_TARGETS).reduce((acc, target) => {
            for (const matchId of target.matchIds || []) acc[matchId] = target.id;
            return acc;
        }, {})
    );

    function resolveGeminiToolTarget(value) {
        const key = normalizeGeminiMenuTargetKey(value);
        if (!key) return null;
        const targetId = GEMINI_TOOL_TARGET_ID_ALIASES[key] || "";
        return targetId ? (GEMINI_TOOL_TARGETS[targetId] || null) : null;
    }

    function resolveGeminiConversationMenuTarget(value) {
        const key = normalizeGeminiMenuTargetKey(value);
        if (!key) return null;
        const targetId = GEMINI_CONVERSATION_MENU_TARGET_ID_ALIASES[key] || "";
        return targetId ? (GEMINI_CONVERSATION_MENU_TARGETS[targetId] || null) : null;
    }

    function getCurrentModelKey() {
        const readText = () => {
            const currentButton = getFirstVisibleBySelector(SELECTORS.modelPickerButton, { fallbackToFirst: true });
            if (currentButton) {
                const parts = [
                    currentButton.textContent,
                    currentButton.getAttribute?.("aria-label"),
                    currentButton.getAttribute?.("title")
                ].filter(Boolean);
                if (parts.length > 0) return parts.join(" ");
            }

            return "";
        };
        return inferModelKeyFromText(readText());
    }

    const MENU_TIMING = {
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120,
        stepDelayMs: 120
    };
    const GEMINI_NATIVE_NEW_CHAT_HOTKEY = "CMD+SHIFT+O";

    const QUICK_INPUT_STORAGE_KEY = "gemini_quick_input_v1";
    const SIDEBAR_VISIBILITY_STORAGE_KEY = "gemini_keep_sidebar_visible_v1";
    const DEFAULT_KEEP_SIDEBAR_VISIBLE = true;
    const SIDEBAR_AUTO_EXPAND_MAX_VIEWPORT_WIDTH = 1024;
    const SIDEBAR_OPEN_LAYOUT_MIN_WIDTH = 160;
    const SIDEBAR_CLOSED_LAYOUT_MAX_WIDTH = 96;
    const SIDEBAR_WARMUP_REQUEST_COOLDOWN_MS = 1200;
    const SIDEBAR_TOGGLE_SETTLE_MS = 700;
    const SIDEBAR_TEMPORARY_EXPAND_WAIT_MS = 1000;
    const SIDEBAR_STATE_POLL_INTERVAL_MS = 120;
    const CONVERSATION_MENU_TARGET_POLL_INTERVAL_MS = 240;
    const SIDEBAR_OPEN_SELECTORS = [
        "div.sidenav-with-history-container.expanded",
        "div.conversation-items-container.side-nav-opened",
        "div.conversation-actions-container.side-nav-opened",
        "bard-sidenav[style*='--bard-sidenav-open-width']",
        "bard-sidenav.side-nav-expanded",
        "side-navigation-content.side-nav-expanded",
        "top-bar-actions.side-nav-expanded",
        "side-navigation-content side-nav-action-button.is-expanded",
        "side-navigation-content [data-test-id='new-chat-button'].is-expanded"
    ];
    const SIDEBAR_CLOSED_SELECTORS = [
        "div.sidenav-with-history-container:not(.expanded)",
        "bard-sidenav[style*='--bard-sidenav-closed-width']"
    ];
    let keepSidebarVisible = getKeepSidebarVisibleSetting();
    let sidebarVisibilityMenuCommandId = null;
    let sidebarWarmupTimer = null;
    let sidebarWarmupRequestTimer = null;
    let sidebarLastWarmupRequestAt = 0;
    let sidebarTogglePendingUntil = 0;

    const baseShortcut = Object.freeze({
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        customAction: "",
        data: {},
        icon: defaultIconURL
    });

    function deriveShortcutKeyFromName(name) {
        const raw = String(name ?? "").trim();
        if (!raw) return "";
        const words = raw.split(/[\s_-]+/g).filter(Boolean);
        const cleaned = words
            .map(word => word.replace(/[^a-zA-Z0-9]/g, ""))
            .filter(Boolean);
        if (cleaned.length === 0) return "";

        const [first, ...rest] = cleaned;
        const head = first.toLowerCase();
        const tail = rest
            .map(word => word.toLowerCase())
            .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
            .filter(Boolean)
            .join("");
        return head + tail;
    }

    function getGeminiShortcutIconDefaults(iconKey) {
        const key = String(iconKey || "");
        const iconSet = GEMINI_SHORTCUT_ICON_SETS[key] || null;
        return iconSet ? { ...iconSet } : {};
    }

    const createShortcut = (overrides, iconKey = "") => {
        const shortcut = { ...baseShortcut, ...getGeminiShortcutIconDefaults(iconKey), ...(overrides || {}) };
        const existingKey = (typeof shortcut.key === "string") ? shortcut.key.trim() : "";
        if (!existingKey && typeof shortcut.name === "string") {
            const derived = deriveShortcutKeyFromName(shortcut.name);
            if (derived) shortcut.key = derived;
        }
        return shortcut;
    };

    const defaultShortcuts = [
        createShortcut({ name: "New Chat", actionType: "simulate", simulateKeys: GEMINI_NATIVE_NEW_CHAT_HOTKEY, hotkey: "CTRL+N" }, "newChat"),
        createShortcut({ name: "Toggle Sidebar", actionType: "selector", selector: SELECTORS.sidebarToggle, hotkey: "CTRL+B" }, "sidebar"),

        createShortcut({
            name: "Model: Pro",
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: "CTRL+SHIFT+P",
            data: { menu: MODEL_PICKER_OPTION_TARGETS.pro }
        }, "model"),
        createShortcut({
            name: "Model: Thinking",
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: "CTRL+SHIFT+T",
            data: { menu: MODEL_PICKER_OPTION_TARGETS.thinking }
        }, "model"),
        createShortcut({
            name: GEMINI_EXTENDED_MODEL_SHORTCUT_NAME,
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: GEMINI_EXTENDED_MODEL_DEFAULT_HOTKEY,
            data: { menu: MODEL_PICKER_OPTION_TARGETS.extended }
        }, "model"),
        createShortcut({
            name: "Model: Fast",
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: "CTRL+SHIFT+F",
            data: { menu: MODEL_PICKER_OPTION_TARGETS.fast }
        }, "model"),

        createShortcut({ name: "Open Tools", actionType: "selector", selector: SELECTORS.toolsButton, hotkey: "CTRL+T" }, "tools"),
        createShortcut({
            name: "Canvas",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+C",
            data: { menu: { id: "canvas" } }
        }, "canvas"),
        createShortcut({
            name: "Image",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+I",
            data: { menu: { id: "createImage" } }
        }, "createImage"),
        createShortcut({
            name: "Quick Input",
            actionType: "custom",
            customAction: "quickInput",
            hotkey: "CTRL+SHIFT+K",
            data: {}
        }, "quickInput"),
        createShortcut({
            name: "Learning",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+L",
            data: { menu: { id: "learn" } }
        }, "learn"),
        createShortcut({
            name: "Research",
            actionType: "custom",
            customAction: "toolsDrawer",
            hotkey: "CTRL+R",
            data: { menu: { id: "deepResearch" } }
        }, "deepResearch"),
        createShortcut({
            name: "Delete",
            actionType: "custom",
            customAction: "conversationMenu",
            hotkey: "CTRL+BACKSPACE",
            data: { menu: { id: "delete" } }
        }, "delete"),
        createShortcut({
            name: "Pin",
            actionType: "custom",
            customAction: "conversationMenu",
            hotkey: "CTRL+P",
            data: { menu: { id: "pin" } }
        }, "pin")
    ];

    const GEMINI_DEFAULT_SHORTCUTS_BY_NAME = Object.freeze(defaultShortcuts.reduce((acc, shortcut) => {
        const name = String(shortcut?.name || "").trim();
        if (name) acc[name] = shortcut;
        return acc;
    }, {}));

    function cloneGeminiShortcutValue(value) {
        if (value === undefined) return undefined;
        if (typeof structuredClone === "function") {
            try { return structuredClone(value); } catch { }
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return value;
        }
    }

    function getGeminiDefaultShortcutByName(name) {
        const key = String(name || "").trim();
        return key ? (GEMINI_DEFAULT_SHORTCUTS_BY_NAME[key] || null) : null;
    }

    function valueContainsGeminiLegacyUiAdapter(value) {
        let text = "";
        try {
            text = typeof value === "string" ? value : JSON.stringify(value);
        } catch {
            text = String(value ?? "");
        }
        return /(toolbox-drawer|toolbox-drawer-menu|side-nav-menu-button|bard-mode-menu-button|bard-mode-option|rich-textarea|text-input-field|ql-editor)/i.test(text);
    }

    function getGeminiDefaultShortcutIconKey(shortcut) {
        const name = String(shortcut?.name || "").trim();
        if (name && GEMINI_DEFAULT_SHORTCUT_ICON_KEYS_BY_NAME[name]) {
            return GEMINI_DEFAULT_SHORTCUT_ICON_KEYS_BY_NAME[name];
        }

        const customAction = String(shortcut?.customAction || "").trim();
        const data = shortcut?.data && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const menu = data.menu && typeof data.menu === "object" && !Array.isArray(data.menu) ? data.menu : {};
        const menuId = String(menu.id || "").trim();
        if (customAction === "quickInput") return "quickInput";
        if (customAction === "modelPicker") return "model";
        if (customAction === "toolsDrawer") {
            if (menuId === "canvas") return "canvas";
            if (menuId === "createImage") return "createImage";
            if (menuId === "learn") return "learn";
            if (menuId === "deepResearch") return "deepResearch";
        }
        if (customAction === "conversationMenu") {
            if (menuId === "delete") return "delete";
            if (menuId === "pin") return "pin";
        }
        return "";
    }

    function isGeminiManagedShortcutIcon(value, iconKey) {
        const icon = String(value || "").trim();
        if (!icon) return true;
        if (GEMINI_MANAGED_SHORTCUT_ICON_URLS.includes(icon)) return true;
        if (/gemini_sparkle_(?:aurora|v002)_/i.test(icon)) return true;
        if (/(?:^|\/)gemini_keycap\.svg(?:[?#].*)?$/i.test(icon)) return true;

        const iconSet = GEMINI_SHORTCUT_ICON_SETS[iconKey] || null;
        const iconSets = [
            iconSet,
            ...(GEMINI_PREVIOUS_SHORTCUT_ICON_SETS[iconKey] || [])
        ].filter(Boolean);
        return iconSets.some(set => icon === set.icon || icon === set.iconDark);
    }

    function buildGeminiShortcutIconMigration(shortcuts) {
        if (!Array.isArray(shortcuts)) return null;
        let changed = false;
        const next = shortcuts.map((shortcut) => {
            if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return shortcut;

            const iconKey = getGeminiDefaultShortcutIconKey(shortcut);
            const iconSet = getGeminiShortcutIconDefaults(iconKey);
            if (!iconSet?.icon) return shortcut;

            const replaceLightIcon = isGeminiManagedShortcutIcon(shortcut.icon, iconKey);
            const replaceDarkIcon = replaceLightIcon && isGeminiManagedShortcutIcon(shortcut.iconDark, iconKey);
            if (!replaceLightIcon && !replaceDarkIcon) return shortcut;

            const updated = { ...shortcut };
            if (replaceLightIcon && updated.icon !== iconSet.icon) {
                updated.icon = iconSet.icon;
                changed = true;
            }
            if (replaceDarkIcon && updated.iconDark !== iconSet.iconDark) {
                updated.iconDark = iconSet.iconDark;
                changed = true;
            }
            if ((replaceLightIcon || replaceDarkIcon) && updated.iconAdaptive) {
                updated.iconAdaptive = false;
                changed = true;
            }
            return updated;
        });

        return changed ? next : null;
    }

    function buildGeminiLegacyUiAdapterMigration(shortcuts) {
        if (!Array.isArray(shortcuts)) return null;
        let changed = false;
        const next = shortcuts.map((shortcut) => {
            if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return shortcut;

            const defaultShortcut = getGeminiDefaultShortcutByName(shortcut.name);
            if (!defaultShortcut) return shortcut;

            let updated = shortcut;
            const ensureUpdated = () => {
                if (updated === shortcut) updated = { ...shortcut };
                return updated;
            };

            const actionType = String(shortcut.actionType || "").trim();
            const customAction = String(shortcut.customAction || "").trim();
            const name = String(shortcut.name || "").trim();

            if (
                (name === "Toggle Sidebar" || name === "Open Tools") &&
                actionType === "selector" &&
                valueContainsGeminiLegacyUiAdapter(shortcut.selector)
            ) {
                ensureUpdated().selector = cloneGeminiShortcutValue(defaultShortcut.selector);
                changed = true;
            }

            if (
                customAction === "modelPicker" &&
                valueContainsGeminiLegacyUiAdapter(shortcut.data) &&
                defaultShortcut.data
            ) {
                ensureUpdated().data = cloneGeminiShortcutValue(defaultShortcut.data);
                changed = true;
            }

            return updated;
        });

        return changed ? next : null;
    }

    function buildGeminiManagedShortcutMigration(shortcuts) {
        let next = Array.isArray(shortcuts) ? shortcuts : null;
        if (!next) return null;

        const iconMigrated = buildGeminiShortcutIconMigration(next);
        if (iconMigrated) next = iconMigrated;

        const legacyUiMigrated = buildGeminiLegacyUiAdapterMigration(next);
        if (legacyUiMigrated) next = legacyUiMigrated;

        return next !== shortcuts ? next : null;
    }

    function getGeminiEngineShortcuts(engine) {
        if (!engine) return null;
        try {
            if (typeof engine.getShortcuts === "function") return engine.getShortcuts();
            if (typeof engine.core?.getShortcuts === "function") return engine.core.getShortcuts();
        } catch { }
        return null;
    }

    function migrateGeminiManagedShortcuts(engine = null, { refreshPanel = false } = {}) {
        const stored = gmGetValueLocal(GEMINI_DEFAULT_SHORTCUTS_STORAGE_KEY, null);
        const source = Array.isArray(stored) ? stored : getGeminiEngineShortcuts(engine);
        if (!Array.isArray(source)) return false;

        const next = buildGeminiManagedShortcutMigration(source);
        if (!next) return false;

        if (engine && typeof engine.setShortcuts === "function") {
            engine.setShortcuts(next);
            if (refreshPanel && typeof engine.reopenSettingsPanel === "function") {
                engine.reopenSettingsPanel();
            }
        } else {
            gmSetValueLocal(GEMINI_DEFAULT_SHORTCUTS_STORAGE_KEY, next);
        }
        return true;
    }

    function normalizeGeminiShortcutHotkey(value) {
        return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
    }

    function shortcutTargetsGeminiExtendedModel(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        if (String(shortcut.name || "").trim() === GEMINI_EXTENDED_MODEL_SHORTCUT_NAME) return true;
        return String(shortcut.customAction || "").trim() === "modelPicker" && getTargetModelKey(shortcut) === "extended";
    }

    function createGeminiExtendedModelShortcut({ hotkey = GEMINI_EXTENDED_MODEL_DEFAULT_HOTKEY } = {}) {
        return createShortcut({
            name: GEMINI_EXTENDED_MODEL_SHORTCUT_NAME,
            actionType: "custom",
            customAction: "modelPicker",
            hotkey,
            data: { menu: MODEL_PICKER_OPTION_TARGETS.extended }
        }, "model");
    }

    function migrateGeminiExtendedModelShortcut() {
        const migratedRaw = gmGetValueLocal(GEMINI_EXTENDED_MODEL_SHORTCUT_MIGRATION_KEY, false);
        const migrated = migratedRaw === true || migratedRaw === "true";
        const stored = gmGetValueLocal(GEMINI_DEFAULT_SHORTCUTS_STORAGE_KEY, null);

        if (!Array.isArray(stored)) {
            if (!migrated) gmSetValueLocal(GEMINI_EXTENDED_MODEL_SHORTCUT_MIGRATION_KEY, true);
            return;
        }

        if (stored.some(shortcutTargetsGeminiExtendedModel)) {
            if (!migrated) gmSetValueLocal(GEMINI_EXTENDED_MODEL_SHORTCUT_MIGRATION_KEY, true);
            return;
        }

        if (migrated) return;

        const defaultHotkey = normalizeGeminiShortcutHotkey(GEMINI_EXTENDED_MODEL_DEFAULT_HOTKEY);
        const hotkeyInUse = stored.some(shortcut => normalizeGeminiShortcutHotkey(shortcut?.hotkey) === defaultHotkey);
        const extendedShortcut = createGeminiExtendedModelShortcut({
            hotkey: hotkeyInUse ? "" : GEMINI_EXTENDED_MODEL_DEFAULT_HOTKEY
        });

        gmSetValueLocal(GEMINI_DEFAULT_SHORTCUTS_STORAGE_KEY, [...stored, extendedShortcut]);
        gmSetValueLocal(GEMINI_EXTENDED_MODEL_SHORTCUT_MIGRATION_KEY, true);
    }

    const TemplateUtils = ShortcutTemplate.utils;
    if (!TemplateUtils?.menu?.createMenuController) {
        console.error('[Gemini Shortcut] Template utils.menu not found (update Template core).');
        return;
    }

    function getLocalBooleanFallback(key, fallback) {
        const storage = getLocalStorageLocal();
        const k = String(key ?? "").trim();
        if (!storage || !k) return fallback;
        try {
            const raw = storage.getItem(k);
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
        const k = String(key ?? "").trim();
        if (!storage || !k) return;
        try {
            storage.setItem(k, JSON.stringify(!!value));
        } catch { }
    }

    function getKeepSidebarVisibleSetting() {
        const localFallback = getLocalBooleanFallback(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
        if (typeof GM_getValue !== "function") return localFallback;
        try {
            const value = GM_getValue(SIDEBAR_VISIBILITY_STORAGE_KEY, DEFAULT_KEEP_SIDEBAR_VISIBLE);
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

    function getSidebarVisibilityMenuLabel(engine = null) {
        const stateText = siteMessage(engine, keepSidebarVisible ? "on" : "off", {}, keepSidebarVisible ? "On" : "Off");
        return siteMessage(engine, "keepSidebarVisibleLabel", { state: stateText }, `Gemini - Keep sidebar visible: ${stateText}`);
    }

    function registerSidebarVisibilityMenuCommand(engine = null) {
        if (sidebarVisibilityMenuCommandId !== null) {
            try {
                gmUnregisterMenuCommandLocal(sidebarVisibilityMenuCommandId);
            } catch { }
        }

        sidebarVisibilityMenuCommandId = gmRegisterMenuCommandLocal(getSidebarVisibilityMenuLabel(engine), () => {
            setSidebarVisibilityPreference(!keepSidebarVisible, engine);
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
        const selectorList = (() => {
            if (Array.isArray(selector)) {
                return selector.flatMap(item => {
                    if (Array.isArray(item)) return item;
                    const token = String(item ?? "").trim();
                    return token ? [token] : [];
                }).map(item => String(item ?? "").trim()).filter(Boolean);
            }
            if (selector && typeof selector === "object") {
                if (Array.isArray(selector.selectors)) return selector.selectors.flatMap(item => {
                    const token = String(item ?? "").trim();
                    return token ? [token] : [];
                }).filter(Boolean);
                const token = String(selector.selector ?? selector.fallback ?? "").trim();
                return token ? [token] : [];
            }
            const token = String(selector ?? "").trim();
            return token ? [token] : [];
        })();

        if (selectorList.length === 0) return null;

        let fallback = null;
        for (const sel of selectorList) {
            let all = [];
            try {
                all = Array.from(document.querySelectorAll(sel));
            } catch {
                continue;
            }
            for (const el of all) {
                if (isElementVisible(el)) return el;
            }
            if (fallbackToFirst && !fallback) fallback = all[0] || null;
        }
        return fallbackToFirst ? fallback : null;
    }

    function getSidebarToggleButton() {
        return getFirstVisibleBySelector(SELECTORS.sidebarToggle, { fallbackToFirst: true });
    }

    function parseBooleanAttr(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (token === "true") return true;
        if (token === "false") return false;
        return null;
    }

    function inferSidebarStateFromClassName(value) {
        const token = String(value ?? "").toLowerCase();
        if (!token) return null;
        if (/(?:sidebar|sidenav|side[-_]?nav)[-_a-z0-9]*(collapsed|closed)/.test(token)) return false;
        if (/(?:sidebar|sidenav|side[-_]?nav)[-_a-z0-9]*(expanded|opened|open)/.test(token)) return true;
        return null;
    }

    function readSidebarStateFromRoot(root) {
        if (!root) return null;

        const ariaExpanded = parseBooleanAttr(root.getAttribute?.("aria-expanded"));
        if (ariaExpanded !== null) return ariaExpanded;

        const dataState = String(root.getAttribute?.("data-state") || "").trim().toLowerCase();
        if (dataState === "expanded" || dataState === "open" || dataState === "opened") return true;
        if (dataState === "collapsed" || dataState === "close" || dataState === "closed") return false;

        const classState = inferSidebarStateFromClassName(root.className || "");
        if (classState !== null) return classState;

        const style = String(root.getAttribute?.("style") || "");
        if (style.includes("--bard-sidenav-open-width")) return true;
        if (style.includes("--bard-sidenav-closed-width")) return false;

        const explicitOpen = [
            ".sidenav-with-history-container.expanded",
            ".conversation-items-container.side-nav-opened",
            ".conversation-actions-container.side-nav-opened",
            "side-nav-action-button.is-expanded",
            "[data-test-id='new-chat-button'].is-expanded"
        ];
        for (const selector of explicitOpen) {
            try {
                if (root.querySelector?.(selector)) return true;
            } catch { }
        }

        const explicitClosed = [
            ".sidenav-with-history-container:not(.expanded)",
            ".conversation-items-container:not(.side-nav-opened)",
            "side-nav-action-button:not(.is-expanded)",
            "[data-test-id='new-chat-button']:not(.is-expanded)"
        ];
        for (const selector of explicitClosed) {
            try {
                if (root.querySelector?.(selector)) {
                    const width = getElementLayoutWidth(root);
                    if (width > 0 && width <= SIDEBAR_CLOSED_LAYOUT_MAX_WIDTH) return false;
                }
            } catch { }
        }

        const width = getElementLayoutWidth(root);
        if (root.matches?.("bard-sidenav, side-navigation-content") && width >= SIDEBAR_OPEN_LAYOUT_MIN_WIDTH) return true;
        if (root.matches?.("bard-sidenav, side-navigation-content") && width > 0 && width <= SIDEBAR_CLOSED_LAYOUT_MAX_WIDTH) return false;

        return null;
    }

    function readSidebarStateFromToggle(button) {
        if (!button) return null;

        const expanded = parseBooleanAttr(button.getAttribute?.("aria-expanded"));
        if (expanded !== null) return expanded;

        const pressed = parseBooleanAttr(button.getAttribute?.("aria-pressed"));
        if (pressed !== null) return pressed;

        const stateAttr = String(button.getAttribute?.("data-state") || "").trim().toLowerCase();
        if (stateAttr === "expanded" || stateAttr === "open" || stateAttr === "opened") return true;
        if (stateAttr === "collapsed" || stateAttr === "close" || stateAttr === "closed") return false;

        const ariaLabel = String(button.getAttribute?.("aria-label") || "").trim().toLowerCase();
        if (/(open|expand).*(menu|navigation|sidebar|side nav)/.test(ariaLabel)) return false;
        if (/(close|collapse|hide).*(menu|navigation|sidebar|side nav)/.test(ariaLabel)) return true;
        if (/(打开|展开|显示|开启).*(侧栏|侧边栏|边栏|导航|菜单)/.test(ariaLabel)) return false;
        if (/(关闭|收起|折叠|隐藏).*(侧栏|侧边栏|边栏|导航|菜单)/.test(ariaLabel)) return true;

        const host = button.closest?.("[class*='side-nav'], [class*='sidebar'], [class*='sidenav']");
        const byHostClass = inferSidebarStateFromClassName(host?.className || "");
        if (byHostClass !== null) return byHostClass;

        return inferSidebarStateFromClassName(button.className || "");
    }

    function getGeminiSidebarRoots() {
        const roots = [];
        for (const selector of ["top-bar-actions", "bard-sidenav", "side-navigation-content"]) {
            const root = getFirstVisibleBySelector(selector, { fallbackToFirst: true });
            if (root && !roots.includes(root)) roots.push(root);
        }
        return roots;
    }

    function isSidebarOpen() {
        for (const root of getGeminiSidebarRoots()) {
            const state = readSidebarStateFromRoot(root);
            if (state !== null) return state;
        }

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

    function clearSidebarTogglePending() {
        sidebarTogglePendingUntil = 0;
    }

    function isSidebarTogglePending() {
        if (sidebarTogglePendingUntil <= Date.now()) return false;
        if (isSidebarOpen() === true) {
            clearSidebarTogglePending();
            return false;
        }
        return true;
    }

    function markSidebarTogglePending(settleMs = SIDEBAR_TOGGLE_SETTLE_MS) {
        sidebarTogglePendingUntil = Date.now() + Math.max(150, Number(settleMs) || SIDEBAR_TOGGLE_SETTLE_MS);
    }

    function clickSidebarToggleButton({ settleMs = SIDEBAR_TOGGLE_SETTLE_MS } = {}) {
        if (isSidebarTogglePending()) return true;
        const button = getSidebarToggleButton();
        if (!button) return false;
        try {
            const clicked = TemplateUtils?.events?.simulateClick?.(button, { nativeFallback: true });
            if (clicked) {
                markSidebarTogglePending(settleMs);
                return true;
            }
        } catch { }
        try {
            button.click();
            markSidebarTogglePending(settleMs);
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

    function ensureSidebarVisible({ ignorePreference = false } = {}) {
        if (!ignorePreference && !keepSidebarVisible) return false;
        const open = isSidebarOpen();
        if (open === true) {
            clearSidebarTogglePending();
            return true;
        }
        if (isSidebarTogglePending()) return true;
        if (open !== false) return false;
        return clickSidebarToggleButton();
    }

    function setSidebarVisibilityPreference(nextValue, engine = null) {
        keepSidebarVisible = !!nextValue;
        setKeepSidebarVisibleSetting(keepSidebarVisible);
        if (keepSidebarVisible) {
            if (shouldWarmupSidebarInBackground()) {
                startSidebarWarmup();
            } else {
                stopSidebarWarmup();
            }
        } else {
            cancelSidebarWarmupRequest();
            stopSidebarWarmup();
        }

        console.info(`${LOG_TAG} keep sidebar visible is now ${keepSidebarVisible ? "enabled" : "disabled"}.`);
        registerSidebarVisibilityMenuCommand(engine);
        return keepSidebarVisible;
    }

    function stopSidebarWarmup() {
        if (sidebarWarmupTimer === null) return;
        try { clearInterval(sidebarWarmupTimer); } catch { }
        sidebarWarmupTimer = null;
    }

    function cancelSidebarWarmupRequest() {
        if (sidebarWarmupRequestTimer === null) return;
        try { clearTimeout(sidebarWarmupRequestTimer); } catch { }
        sidebarWarmupRequestTimer = null;
    }

    function requestSidebarWarmup({ attempts = 5, intervalMs = 300, delayMs = 0 } = {}) {
        if (!shouldWarmupSidebarInBackground()) return;
        const now = Date.now();
        const delay = Math.max(0, Number(delayMs) || 0);
        const cooldown = Math.max(0, SIDEBAR_WARMUP_REQUEST_COOLDOWN_MS - (now - sidebarLastWarmupRequestAt));
        const waitMs = Math.max(delay, cooldown);

        if (sidebarWarmupRequestTimer !== null) return;
        sidebarWarmupRequestTimer = window.setTimeout(() => {
            sidebarWarmupRequestTimer = null;
            sidebarLastWarmupRequestAt = Date.now();
            startSidebarWarmup({ attempts, intervalMs });
        }, waitMs);
    }

    function startSidebarWarmup({ attempts = 20, intervalMs = 500 } = {}) {
        cancelSidebarWarmupRequest();
        stopSidebarWarmup();
        if (!shouldWarmupSidebarInBackground()) return;
        let remaining = Math.max(1, Number(attempts) || 1);
        const interval = Math.max(150, Number(intervalMs) || 500);

        const tick = () => {
            if (!shouldWarmupSidebarInBackground()) {
                stopSidebarWarmup();
                return false;
            }

            const open = isSidebarOpen();
            if (open === true) {
                clearSidebarTogglePending();
                stopSidebarWarmup();
                return false;
            }

            if (open === false) ensureSidebarVisible();
            remaining -= 1;
            if (remaining <= 0) {
                stopSidebarWarmup();
                return false;
            }
            return true;
        };

        if (!tick()) return;
        sidebarWarmupTimer = window.setInterval(tick, interval);
    }

    function isSidebarToggleEventTarget(target) {
        const element = target && typeof target.closest === "function"
            ? target.closest("button, [role='button']")
            : null;
        if (!element) return false;

        const label = normalizeGeminiUiText([
            element.getAttribute?.("aria-label"),
            element.getAttribute?.("title"),
            element.textContent
        ].filter(Boolean).join(" "));
        if (/(sidebar|side bar|side nav|side-nav|navigation|侧栏|侧边栏|边栏|导航)/.test(label)) {
            return true;
        }

        const inGeminiSidebarChrome = !!element.closest?.("top-bar-actions, bard-sidenav, side-navigation-content");
        if (!inGeminiSidebarChrome) return false;

        let iconText = "";
        try {
            iconText = Array.from(element.querySelectorAll("mat-icon"))
                .map(icon => [
                    icon.getAttribute?.("fonticon"),
                    icon.getAttribute?.("data-mat-icon-name"),
                    icon.textContent
                ].filter(Boolean).join(" "))
                .join(" ");
        } catch {
            iconText = "";
        }
        const normalizedIconText = normalizeGeminiUiText(iconText);
        return /(?:^|\s)(menu|menu_open|left_panel_open|left_panel_close|side_navigation)(?:\s|$)/.test(normalizedIconText);
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
        const handlePossibleRouteChange = () => {
            const currentUrl = location.href;
            if (currentUrl === lastUrl) return;
            lastUrl = currentUrl;
            requestSidebarWarmup({ attempts: 8, intervalMs: 350, delayMs: 300 });
        };
        const patchHistoryMethod = (methodName) => {
            try {
                const original = window.history?.[methodName];
                if (typeof original !== "function" || original.__geminiSidebarWarmupPatched) return;
                const patched = function (...args) {
                    const result = original.apply(this, args);
                    handlePossibleRouteChange();
                    return result;
                };
                patched.__geminiSidebarWarmupPatched = true;
                patched.__geminiSidebarWarmupOriginal = original;
                window.history[methodName] = patched;
            } catch { }
        };
        patchHistoryMethod("pushState");
        patchHistoryMethod("replaceState");

        window.addEventListener("popstate", handlePossibleRouteChange);
        window.addEventListener("hashchange", handlePossibleRouteChange);

        document.addEventListener("click", (event) => {
            if (!isSidebarToggleEventTarget(event.target)) return;
            requestSidebarWarmup({ attempts: 5, intervalMs: 300, delayMs: 500 });
        }, true);

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") requestSidebarWarmup({ attempts: 8, intervalMs: 350, delayMs: 250 });
        });

        window.addEventListener("resize", () => {
            const suppressed = isSidebarAutoExpandSuppressedByViewport();
            if (suppressed === wasSidebarAutoExpandSuppressed) return;

            wasSidebarAutoExpandSuppressed = suppressed;
            if (suppressed) {
                cancelSidebarWarmupRequest();
                stopSidebarWarmup();
                return;
            }

            if (keepSidebarVisible) requestSidebarWarmup({ attempts: 8, intervalMs: 350, delayMs: 250 });
        });
    }

    const toolsDrawerMenuBase = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: SELECTORS.toolsButton
        },
        root: {
            type: "selector",
            selector: SELECTORS.toolsMenuRoot,
            pick: "last"
        },
        timing: MENU_TIMING
    });
    const toolsDrawerMenu = createGeminiToolsMenuController(toolsDrawerMenuBase);

    const modelPickerMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: SELECTORS.modelPickerButton
        },
        root: {
            type: "selector",
            selector: SELECTORS.modelPickerMenuRoot,
            pick: "last"
        },
        timing: MENU_TIMING
    });

    const topBarConversationMenuBase = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: SELECTORS.topBarConversationActionsButton
        },
        root: {
            type: "selector",
            selector: SELECTORS.topBarConversationMenuRoot,
            pick: "last"
        },
        timing: MENU_TIMING
    });

    function getGeminiTopBarConversationMenuRootElement(trigger) {
        if (!trigger) return null;

        const controlsId = getStringAttr(trigger, "aria-controls");
        if (controlsId) {
            let menu = null;
            try {
                menu = document.getElementById(controlsId);
            } catch {
                menu = null;
            }
            if (menu && isGeminiConversationMenuRoot(menu)) return menu;
        }

        let roots = [];
        try {
            roots = Array.from(document.querySelectorAll(SELECTORS.topBarConversationMenuRoot.join(", ")));
        } catch {
            roots = [];
        }
        const visibleRoots = roots.filter(isGeminiConversationMenuRoot);
        return visibleRoots[visibleRoots.length - 1] || null;
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function waitForSidebarOpen({ timeoutMs = SIDEBAR_TEMPORARY_EXPAND_WAIT_MS, intervalMs = SIDEBAR_STATE_POLL_INTERVAL_MS } = {}) {
        const timeout = Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(30, Number(intervalMs) || SIDEBAR_STATE_POLL_INTERVAL_MS);
        const deadline = Date.now() + timeout;

        while (Date.now() <= deadline) {
            if (isSidebarOpen() === true) {
                clearSidebarTogglePending();
                return true;
            }
            await sleep(interval);
        }

        const open = isSidebarOpen() === true;
        if (open) clearSidebarTogglePending();
        return open;
    }

    const GEMINI_CONVERSATION_LINK_SELECTOR = [
        "a[data-test-id='conversation']",
        "gem-nav-list-item[data-test-id='conversation'] a[href*='/app/']",
        "a[href*='/app/']"
    ].join(", ");
    const GEMINI_CONVERSATION_SIDEBAR_SELECTOR = "bard-sidenav, side-navigation-content, .sidenav-with-history-container";
    const GEMINI_CONVERSATION_SEARCH_ROOT_SELECTOR = [
        "conversations-list",
        ".chat-history-list",
        ".chat-history",
        "mat-nav-list[role='navigation']",
        "mat-nav-list.gds-sidenav-list",
        "bard-sidenav",
        "side-navigation-content",
        ".sidenav-with-history-container"
    ].join(", ");
    const GEMINI_CONVERSATION_ROW_CANDIDATE_SELECTOR = [
        "gem-nav-list-item[data-test-id='conversation']",
        "gem-nav-list-item",
        ".conversation-item",
        ".conversation-list-item",
        ".conversation-row",
        ".gem-nav-list-item",
        "[data-test-id='conversation-container']",
        "[data-test-id='conversation-row']",
        "[role='listitem']",
        ".mat-mdc-list-item",
        ".mat-list-item",
        "li"
    ].join(", ");
    const GEMINI_CONVERSATION_CONTAINER_SELECTOR = ".conversation-items-container";
    const GEMINI_CONVERSATION_ACTION_BUTTON_FAST_SELECTOR = [
        ".hovered-trailing-content gem-icon-button[data-test-id='actions-menu-button'] button",
        ".hovered-trailing-content gem-icon-button[data-test-id='actions-menu-button']",
        "gem-icon-button[data-test-id='actions-menu-button'] button",
        "gem-icon-button[data-test-id='actions-menu-button']",
        "gem-icon-button.gem-conversation-actions-menu-button button",
        "gem-icon-button.gem-conversation-actions-menu-button",
        "button[data-test-id='actions-menu-button']",
        "button[data-test-id='conversation-actions-menu-icon-button']"
    ].join(", ");
    const GEMINI_CONVERSATION_ACTION_BUTTON_SELECTOR = [
        "gem-icon-button[data-test-id='actions-menu-button']",
        "gem-icon-button[data-test-id='actions-menu-button'] button",
        "gem-icon-button[data-test-id='conversation-actions-menu-icon-button']",
        "gem-icon-button[data-test-id='conversation-actions-menu-icon-button'] button",
        "gem-icon-button.gem-conversation-actions-menu-button",
        "gem-icon-button.gem-conversation-actions-menu-button button",
        ".hovered-trailing-content gem-icon-button[data-test-id='actions-menu-button']",
        ".hovered-trailing-content gem-icon-button[data-test-id='actions-menu-button'] button",
        "button[data-test-id='actions-menu-button']",
        "button[data-test-id='conversation-actions-menu-icon-button']",
        "button[aria-label*='More options' i]",
        "button[aria-label*='更多选项' i]",
        "[role='button'][aria-label*='More options' i]",
        "[role='button'][aria-label*='更多选项' i]",
        "button[aria-haspopup='menu']",
        "[role='button'][aria-haspopup='menu']",
        "button[aria-label*='menu' i]",
        "[role='button'][aria-label*='menu' i]",
        "button:has(mat-icon[fonticon='more_vert'])",
        "button:has(mat-icon[data-mat-icon-name='more_vert'])",
        "button:has(mat-icon[fonticon='more_horiz'])",
        "button:has(mat-icon[data-mat-icon-name='more_horiz'])",
        "button.conversation-actions-menu-button"
    ].join(", ");

    function normalizePathname(value) {
        if (value === undefined || value === null || value === "") return "";
        try {
            const url = new URL(String(value), location.origin);
            const normalized = String(url.pathname || "").replace(/\/+$/, "");
            return normalized || "/";
        } catch {
            return "";
        }
    }

    function normalizeGeminiConversationPathname(value) {
        const pathname = normalizePathname(value);
        const match = pathname.match(/^\/app\/([^/?#]+)/);
        return match ? `/app/${match[1]}` : "";
    }

    function getCurrentGeminiConversationPathname() {
        try {
            return normalizeGeminiConversationPathname(location.href);
        } catch {
            return "";
        }
    }

    function countGeminiConversationLinks(element) {
        if (!element) return 0;
        try {
            const selfCount = element.matches?.(GEMINI_CONVERSATION_LINK_SELECTOR) ? 1 : 0;
            return selfCount + (element.querySelectorAll?.(GEMINI_CONVERSATION_LINK_SELECTOR)?.length || 0);
        } catch {
            return 0;
        }
    }

    function isGeminiConversationSidebarBoundary(element) {
        return !!element?.matches?.(GEMINI_CONVERSATION_SIDEBAR_SELECTOR);
    }

    function getPreferredGeminiConversationEntryContainer(link) {
        if (!link) return null;
        const preferredSelectors = [
            "gem-nav-list-item[data-test-id='conversation']",
            "gem-nav-list-item",
            ".conversation-item",
            ".conversation-list-item",
            ".conversation-row",
            ".mat-mdc-list-item",
            ".mat-list-item",
            "[role='listitem']"
        ];

        for (const selector of preferredSelectors) {
            let candidate = null;
            try { candidate = link.closest?.(selector) || null; } catch { candidate = null; }
            if (!candidate || isGeminiConversationSidebarBoundary(candidate)) continue;
            if (countGeminiConversationLinks(candidate) === 1) return candidate;
        }
        return null;
    }

    function scoreGeminiConversationEntryContainer(element, link) {
        if (!element || !link || element === document || element === document.body) return -Infinity;
        if (!element.contains?.(link)) return -Infinity;
        if (isGeminiConversationSidebarBoundary(element)) return -Infinity;

        const linkCount = countGeminiConversationLinks(element);
        if (linkCount <= 0) return -Infinity;

        let score = 0;
        if (linkCount === 1) score += 120;
        else score -= Math.min(120, linkCount * 16);

        if (element === link) score += 15;
        if (element === link.parentElement) score += 30;
        if (elementMatchesGeminiSelector(element, GEMINI_CONVERSATION_ROW_CANDIDATE_SELECTOR)) score += 45;
        if (elementMatchesGeminiSelector(element, GEMINI_CONVERSATION_CONTAINER_SELECTOR)) score -= 80;
        if (getConversationMenuButton(element)) score += 80;

        const text = normalizeGeminiUiText(getGeminiUiElementText(element));
        if (text.includes("new chat") || text.includes("search chats") || text.includes("新建聊天") || text.includes("搜索聊天")) score -= 160;

        try {
            const rect = element.getBoundingClientRect?.();
            if (rect && rect.width > 0 && rect.height > 0) {
                score += 8;
                if (rect.height <= 72) score += 28;
                else if (rect.height <= 112) score += 12;
                else score -= 25;
            }
        } catch { }

        return score;
    }

    function getGeminiConversationEntryContainer(link) {
        if (!link) return null;

        const preferred = getPreferredGeminiConversationEntryContainer(link);
        if (preferred) return preferred;

        const seen = new Set();
        const candidates = [];
        const pushCandidate = (node) => {
            if (!node || node.nodeType !== 1 || seen.has(node)) return;
            seen.add(node);
            candidates.push(node);
        };

        let node = link;
        let guard = 0;
        while (node && node.nodeType === 1 && guard < 12) {
            pushCandidate(node);

            let row = null;
            try { row = node.closest?.(GEMINI_CONVERSATION_ROW_CANDIDATE_SELECTOR) || null; } catch { row = null; }
            pushCandidate(row);

            const parent = node.parentElement || null;
            if (!parent || parent === node) break;
            if (isGeminiConversationSidebarBoundary(parent)) break;

            node = parent;
            guard += 1;
        }

        let best = null;
        let bestScore = -Infinity;
        for (const candidate of candidates) {
            const score = scoreGeminiConversationEntryContainer(candidate, link);
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }

        return best || link.parentElement || link.closest?.(GEMINI_CONVERSATION_CONTAINER_SELECTOR) || null;
    }

    function getGeminiConversationActionButtonHost(element) {
        if (!element || element.nodeType !== 1) return null;
        const hostSelector = [
            "gem-icon-button[data-test-id='actions-menu-button']",
            "gem-icon-button[data-test-id='conversation-actions-menu-icon-button']",
            "gem-icon-button.gem-conversation-actions-menu-button",
            ".gem-conversation-actions-menu-button"
        ].join(", ");

        try {
            if (element.matches?.(hostSelector)) return element;
            return element.closest?.(hostSelector) || null;
        } catch {
            return null;
        }
    }

    function getGeminiConversationMenuClickTarget(element) {
        if (!element || element.nodeType !== 1) return null;
        const tagName = String(element.tagName || "").toLowerCase();
        const role = getStringAttr(element, "role").toLowerCase();
        if (tagName === "button" || role === "button") return element;

        const host = getGeminiConversationActionButtonHost(element) || element;
        try {
            return host.querySelector?.("button, [role='button']") || host;
        } catch {
            return host;
        }
    }

    function scoreGeminiConversationMenuButton(button) {
        if (!button || button.nodeType !== 1) return -Infinity;
        if (button.closest?.("mat-dialog-container, [role='dialog'], .cdk-overlay-pane")) return -Infinity;
        const host = getGeminiConversationActionButtonHost(button);
        if (button.disabled || getStringAttr(button, "aria-disabled").toLowerCase() === "true") return -Infinity;
        if (getStringAttr(host, "aria-disabled").toLowerCase() === "true") return -Infinity;

        let score = 0;
        const tagName = String(button.tagName || "").toLowerCase();
        const role = getStringAttr(button, "role").toLowerCase();
        const dataTestId = normalizeGeminiUiText([
            getStringAttr(button, "data-test-id"),
            getStringAttr(host, "data-test-id")
        ].filter(Boolean).join(" "));
        const ariaLabel = normalizeGeminiUiText([
            button.getAttribute?.("aria-label"),
            host?.getAttribute?.("aria-label")
        ].filter(Boolean).join(" "));
        const title = normalizeGeminiUiText([
            button.getAttribute?.("title"),
            host?.getAttribute?.("title")
        ].filter(Boolean).join(" "));
        const className = normalizeGeminiUiText([
            String(button.className || ""),
            host ? String(host.className || "") : ""
        ].filter(Boolean).join(" "));
        const ariaHasPopup = normalizeGeminiUiText([
            getStringAttr(button, "aria-haspopup"),
            getStringAttr(host, "aria-haspopup")
        ].filter(Boolean).join(" "));
        const iconNames = [
            ...getGeminiElementIconNames(button),
            ...(host && host !== button ? getGeminiElementIconNames(host) : [])
        ].map(normalizeGeminiToolIconName);

        const dataTestIds = dataTestId.split(/\s+/).filter(Boolean);
        const ariaPopupValues = ariaHasPopup.split(/\s+/).filter(Boolean);

        if (dataTestIds.includes("actions-menu-button")) score += 170;
        if (dataTestIds.includes("conversation-actions-menu-icon-button")) score += 170;
        if (className.includes("conversation-actions-menu-button")) score += 130;
        if (ariaLabel.includes("open menu for conversation actions")) score += 150;
        if (ariaLabel.includes("conversation actions")) score += 120;
        if (ariaLabel.includes("more options for")) score += 140;
        if (ariaLabel.includes("more options") || ariaLabel.includes("更多选项")) score += 115;
        if (ariaPopupValues.includes("menu")) score += 80;
        if (title.includes("more options") || title.includes("conversation actions")) score += 55;
        if (iconNames.includes("more_vert") || iconNames.includes("more_horiz")) score += 100;
        if (ariaLabel.includes("delete") || ariaLabel.includes("rename") || ariaLabel.includes("pin")) score -= 80;
        if (ariaLabel.includes("删除") || ariaLabel.includes("重命名") || ariaLabel.includes("置顶") || ariaLabel.includes("固定")) score -= 80;

        try {
            const rect = button.getBoundingClientRect?.();
            if (rect && rect.width > 0 && rect.height > 0) {
                score += 8;
                if (rect.width <= 64 && rect.height <= 64) score += 18;
            }
        } catch { }

        if (score > 0 && tagName === "button") score += 8;
        if (score > 0 && role === "button") score += 5;
        return score;
    }

    function getScoredConversationMenuButton(container, selectorText) {
        if (!container || typeof container.querySelectorAll !== "function") return null;
        let buttons = [];
        const selectors = String(selectorText || "").split(",").map(selector => selector.trim()).filter(Boolean);
        const seen = new Set();
        for (const selector of selectors) {
            try {
                for (const candidate of Array.from(container.querySelectorAll(selector))) {
                    const button = getGeminiConversationMenuClickTarget(candidate);
                    if (!button || seen.has(button)) continue;
                    seen.add(button);
                    buttons.push(button);
                }
            } catch { }
        }
        const scored = buttons
            .map(button => ({ button, score: scoreGeminiConversationMenuButton(button), visible: isElementVisible(button) }))
            .filter(item => item.score > 0)
            .sort((a, b) => {
                if (a.visible !== b.visible) return a.visible ? -1 : 1;
                return b.score - a.score;
            });

        return scored[0]?.button || null;
    }

    function getConversationMenuButton(container) {
        return getScoredConversationMenuButton(container, GEMINI_CONVERSATION_ACTION_BUTTON_FAST_SELECTOR)
            || getScoredConversationMenuButton(container, GEMINI_CONVERSATION_ACTION_BUTTON_SELECTOR);
    }

    function refreshConversationEntryButton(entry) {
        if (!entry?.container) return entry;
        const button = getConversationMenuButton(entry.container);
        if (!button || button === entry.button) return entry;
        return { ...entry, button };
    }

    function revealConversationEntryActions(entry) {
        let nextEntry = refreshConversationEntryButton(entry);
        if (isConversationMenuButtonUsable(nextEntry?.button)) return nextEntry;

        const targets = [];
        const pushTarget = (target) => {
            if (!target || targets.includes(target)) return;
            targets.push(target);
        };
        pushTarget(nextEntry?.container);
        pushTarget(nextEntry?.link);
        let node = nextEntry?.link || null;
        let guard = 0;
        while (node && node.nodeType === 1 && guard < 5) {
            pushTarget(node);
            if (node === nextEntry?.container) break;
            node = node.parentElement || null;
            guard += 1;
        }

        for (const target of targets) {
            try { target.scrollIntoView?.({ block: "nearest", inline: "nearest" }); } catch { }
            let rect = null;
            try { rect = target.getBoundingClientRect?.() || null; } catch { rect = null; }
            const clientX = rect ? Math.max(1, Math.floor(rect.right - Math.min(12, Math.max(4, rect.width / 6)))) : 1;
            const clientY = rect ? Math.max(1, Math.floor(rect.top + Math.min(rect.height - 4, Math.max(4, rect.height / 2)))) : 1;
            const eventInit = { bubbles: true, cancelable: true, view: window, clientX, clientY };
            try { target.dispatchEvent(new MouseEvent("mousemove", eventInit)); } catch { }
            try { target.dispatchEvent(new MouseEvent("mouseover", eventInit)); } catch { }
            try { target.dispatchEvent(new MouseEvent("mouseenter", eventInit)); } catch { }
            try { target.dispatchEvent(new PointerEvent("pointermove", { ...eventInit, pointerId: 1, pointerType: "mouse", isPrimary: true })); } catch { }
            try { target.dispatchEvent(new PointerEvent("pointerover", { ...eventInit, pointerId: 1, pointerType: "mouse", isPrimary: true })); } catch { }
            try { target.dispatchEvent(new PointerEvent("pointerenter", { ...eventInit, pointerId: 1, pointerType: "mouse", isPrimary: true })); } catch { }
            try { target.focus?.({ preventScroll: true }); } catch { }
        }

        nextEntry = refreshConversationEntryButton(nextEntry);
        return nextEntry;
    }

    function isConversationEntryVisible(entry) {
        if (!entry) return false;
        return !!(
            isElementVisible(entry.button) ||
            isElementVisible(entry.link) ||
            isElementVisible(entry.container)
        );
    }

    function isConversationMenuButtonUsable(button) {
        return !!button && isElementVisible(button);
    }

    function getStringAttr(node, attrName) {
        if (!node || !attrName) return "";
        try {
            return String(node.getAttribute?.(attrName) || "").trim();
        } catch {
            return "";
        }
    }

    function hasTruthyCurrentAttr(node) {
        if (!node) return false;

        const ariaCurrent = getStringAttr(node, "aria-current").toLowerCase();
        if (ariaCurrent && ariaCurrent !== "false") return true;

        const ariaSelected = getStringAttr(node, "aria-selected").toLowerCase();
        if (ariaSelected === "true") return true;

        const dataSelected = getStringAttr(node, "data-selected").toLowerCase();
        if (dataSelected === "true") return true;

        const dataActive = getStringAttr(node, "data-active").toLowerCase();
        if (dataActive === "true" || dataActive === "1") return true;

        const dataCurrent = getStringAttr(node, "data-current").toLowerCase();
        if (dataCurrent === "true" || dataCurrent === "1") return true;

        const dataState = getStringAttr(node, "data-state").toLowerCase();
        if (dataState === "active" || dataState === "selected" || dataState === "current") return true;

        return false;
    }

    function hasCurrentLikeClass(node) {
        if (!node) return false;
        const className = String(node.className || "").trim();
        if (!className) return false;
        return /(?:^|[\s_-])(active|selected|current)(?:$|[\s_-])/i.test(className);
    }

    function hasExplicitCurrentConversationState(entry) {
        if (!entry) return false;
        const nodes = [entry.link, entry.container, entry.button];
        for (const node of nodes) {
            if (!node) continue;
            if (hasTruthyCurrentAttr(node)) return true;
            if (hasCurrentLikeClass(node)) return true;
        }
        return false;
    }

    function parseGeminiConversationJslogMeta(link) {
        if (!link) return null;
        const raw = getStringAttr(link, "jslog");
        if (!raw || !raw.includes("BardVeMetadataKey:")) return null;

        const decoded = raw.replace(/&quot;/g, "\"");
        const marker = "BardVeMetadataKey:";
        const markerIndex = decoded.indexOf(marker);
        if (markerIndex < 0) return null;

        const tail = decoded.slice(markerIndex + marker.length);
        const innerOpen = tail.lastIndexOf("[");
        if (innerOpen < 0) return null;

        const innerClose = tail.indexOf("]", innerOpen);
        if (innerClose < 0) return null;

        const tokens = tail
            .slice(innerOpen + 1, innerClose)
            .split(",")
            .map(part => String(part || "").trim())
            .filter(Boolean);

        if (tokens.length < 3) return null;

        const conversationToken = tokens[0].replace(/^["']|["']$/g, "");
        const conversationId = conversationToken.startsWith("c_")
            ? conversationToken.slice(2)
            : conversationToken;

        return {
            conversationId,
            tokens,
            isCurrent: tokens.length === 3 && tokens[2] === "1"
        };
    }

    function hasJslogCurrentConversationState(entry) {
        return !!entry?.jslogMeta?.isCurrent;
    }

    function getGeminiConversationSearchRoots() {
        const roots = [];
        const seen = new Set();
        const pushRoot = (root) => {
            if (!root || root.nodeType !== 1 || seen.has(root)) return;
            seen.add(root);
            roots.push(root);
        };

        try {
            for (const root of Array.from(document.querySelectorAll(GEMINI_CONVERSATION_SEARCH_ROOT_SELECTOR))) {
                pushRoot(root);
            }
        } catch { }

        for (const root of getGeminiSidebarRoots()) {
            if (root?.matches?.("top-bar-actions")) continue;
            pushRoot(root);
        }

        return roots;
    }

    function queryGeminiConversationLinks({ fallbackToDocument = false } = {}) {
        const links = [];
        const seen = new Set();
        const collectFromRoot = (root) => {
            if (!root || typeof root.querySelectorAll !== "function") return;
            try {
                for (const link of Array.from(root.querySelectorAll(GEMINI_CONVERSATION_LINK_SELECTOR))) {
                    if (!link || seen.has(link)) continue;
                    if (!link.closest?.(GEMINI_CONVERSATION_SIDEBAR_SELECTOR)) continue;
                    seen.add(link);
                    links.push(link);
                }
            } catch { }
        };

        for (const root of getGeminiConversationSearchRoots()) collectFromRoot(root);
        if (links.length === 0 && fallbackToDocument) collectFromRoot(document);
        return links;
    }

    function getGeminiConversationLinkPathname(link) {
        if (!link) return "";
        return normalizeGeminiConversationPathname(link.getAttribute?.("href") || link.href || "");
    }

    function createGeminiConversationEntry(link) {
        if (!link?.closest?.(GEMINI_CONVERSATION_SIDEBAR_SELECTOR)) return null;
        const container = getGeminiConversationEntryContainer(link);
        if (!container) return null;
        return {
            link,
            container,
            button: getConversationMenuButton(container),
            pathname: getGeminiConversationLinkPathname(link),
            jslogMeta: parseGeminiConversationJslogMeta(link)
        };
    }

    function resolveCurrentConversationMenuTargetByPath(currentPathname) {
        const pathname = String(currentPathname || "").trim();
        if (!pathname) {
            return {
                entry: null,
                reason: "noCurrentConversationPath",
                currentPathname: pathname,
                entriesCount: 0
            };
        }

        const matches = queryGeminiConversationLinks({ fallbackToDocument: true })
            .filter(link => getGeminiConversationLinkPathname(link) === pathname);
        if (matches.length === 0) {
            return {
                entry: null,
                reason: "noCurrentConversationEntry",
                currentPathname: pathname,
                entriesCount: 0
            };
        }

        const visibleMatches = matches.filter(link => isElementVisible(link) || isElementVisible(link.closest?.(GEMINI_CONVERSATION_ROW_CANDIDATE_SELECTOR)));
        const pool = visibleMatches.length ? visibleMatches : matches;
        if (pool.length > 1) {
            return {
                entry: null,
                reason: "multipleUrlMatches",
                currentPathname: pathname,
                entriesCount: pool.length
            };
        }

        return buildConversationTargetResult(createGeminiConversationEntry(pool[0]), {
            matchSource: "url",
            currentPathname: pathname,
            entriesCount: pool.length,
            hiddenReason: "matchedUrlButButtonHidden"
        });
    }

    function collectGeminiConversationEntries() {
        return queryGeminiConversationLinks({ fallbackToDocument: true })
            .map(createGeminiConversationEntry)
            .filter(Boolean)
            .filter(entry => !!entry.link && !!entry.container);
    }

    function resolveUniqueConversationEntry(entries, predicate) {
        const matched = entries.filter(predicate);
        if (matched.length !== 1) return null;
        return matched[0] || null;
    }

    function buildConversationTargetResult(entry, base = {}) {
        return isConversationMenuButtonUsable(entry?.button)
            ? {
                ...base,
                entry,
                reason: ""
            }
            : {
                ...base,
                entry: entry || null,
                reason: base.hiddenReason || "matchedButButtonHidden"
            };
    }

    function resolveCurrentConversationMenuTarget({ currentPathname = getCurrentGeminiConversationPathname(), allowFullScan = true } = {}) {
        const pathname = String(currentPathname || "").trim();
        if (!pathname) {
            return {
                entry: null,
                reason: "noCurrentConversationPath",
                currentPathname: pathname,
                entriesCount: 0
            };
        }

        const pathResult = resolveCurrentConversationMenuTargetByPath(pathname);
        if (pathResult.entry || pathResult.reason === "multipleUrlMatches" || !allowFullScan) return pathResult;

        const entries = collectGeminiConversationEntries();
        const visibleEntries = entries.filter(isConversationEntryVisible);
        const pool = visibleEntries.length ? visibleEntries : entries;

        const explicitEntry = resolveUniqueConversationEntry(pool, hasExplicitCurrentConversationState);
        if (explicitEntry) {
            return buildConversationTargetResult(explicitEntry, {
                matchSource: "explicitCurrent",
                currentPathname: pathname,
                entriesCount: pool.length,
                hiddenReason: "matchedExplicitCurrentButButtonHidden"
            });
        }

        const explicitMatchesCount = pool.filter(hasExplicitCurrentConversationState).length;
        if (explicitMatchesCount > 1) {
            return {
                entry: null,
                reason: "multipleExplicitCurrentMatches",
                currentPathname: pathname,
                entriesCount: pool.length
            };
        }

        const jslogEntry = resolveUniqueConversationEntry(pool, hasJslogCurrentConversationState);
        if (jslogEntry) {
            return buildConversationTargetResult(jslogEntry, {
                matchSource: "jslogCurrent",
                currentPathname: pathname,
                entriesCount: pool.length,
                hiddenReason: "matchedJslogCurrentButButtonHidden"
            });
        }

        const pathMatches = pool.filter(entry => entry.pathname === pathname);
        if (pathMatches.length === 1) {
            return buildConversationTargetResult(pathMatches[0], {
                matchSource: "url",
                currentPathname: pathname,
                entriesCount: pool.length,
                hiddenReason: "matchedUrlButButtonHidden"
            });
        }
        if (pathMatches.length > 1) {
            return {
                entry: null,
                reason: "multipleUrlMatches",
                currentPathname: pathname,
                entriesCount: pool.length
            };
        }

        const jslogMatchesCount = pool.filter(hasJslogCurrentConversationState).length;
        if (jslogMatchesCount > 1) {
            return {
                entry: null,
                reason: "multipleJslogCurrentMatches",
                currentPathname: pathname,
                entriesCount: pool.length
            };
        }

        return {
            entry: null,
            reason: "noCurrentConversationEntry",
            currentPathname: pathname,
            entriesCount: pool.length
        };
    }

    async function waitForCurrentConversationMenuTarget({ timeoutMs = MENU_TIMING.waitTimeoutMs, intervalMs = MENU_TIMING.pollIntervalMs } = {}) {
        const timeout = Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(CONVERSATION_MENU_TARGET_POLL_INTERVAL_MS, Number(intervalMs) || 0);
        const deadline = Date.now() + timeout;
        const currentPathname = getCurrentGeminiConversationPathname();
        if (!currentPathname) {
            return {
                entry: null,
                reason: "noCurrentConversationPath",
                currentPathname,
                entriesCount: 0
            };
        }

        let lastResult = {
            entry: null,
            reason: "noCurrentConversationEntry",
            currentPathname,
            entriesCount: 0
        };
        let revealedContainer = null;

        if (isSidebarOpen() === false) {
            const expanded = ensureSidebarVisible({ ignorePreference: true });
            if (!expanded) {
                return {
                    ...lastResult,
                    reason: "temporarySidebarExpandFailed"
                };
            }

            const remainingMs = Math.max(0, deadline - Date.now());
            const waitMs = Math.min(
                SIDEBAR_TEMPORARY_EXPAND_WAIT_MS,
                Math.max(remainingMs, MENU_TIMING.openDelayMs || 120)
            );
            await waitForSidebarOpen({
                timeoutMs: waitMs,
                intervalMs: SIDEBAR_STATE_POLL_INTERVAL_MS
            });
        }

        while (Date.now() <= deadline) {
            const result = resolveCurrentConversationMenuTarget({ currentPathname, allowFullScan: false });
            if (isConversationMenuButtonUsable(result?.entry?.button)) return result;

            if (result?.entry) {
                const shouldReveal = revealedContainer !== result.entry.container;
                const revealedEntry = shouldReveal
                    ? revealConversationEntryActions(result.entry)
                    : refreshConversationEntryButton(result.entry);
                if (shouldReveal) revealedContainer = result.entry.container;
                if (isConversationMenuButtonUsable(revealedEntry?.button)) {
                    return {
                        ...result,
                        entry: revealedEntry,
                        reason: ""
                    };
                }
            }
            lastResult = result;
            await sleep(interval);
        }

        const finalResult = resolveCurrentConversationMenuTarget({ currentPathname, allowFullScan: true });
        return finalResult?.entry || finalResult?.reason !== "noCurrentConversationEntry"
            ? finalResult
            : lastResult;
    }

    function getConversationMenuRootElementFromEntry(entry) {
        const button = entry?.button;
        if (!button) return null;

        const expanded = getStringAttr(button, "aria-expanded").toLowerCase();
        if (expanded && expanded !== "true") return null;

        const controlsId = getStringAttr(button, "aria-controls");
        if (controlsId) {
            let menu = null;
            try {
                menu = document.getElementById(controlsId);
            } catch {
                menu = null;
            }
            if (menu && isElementVisible(menu) && isGeminiConversationMenuRoot(menu)) return menu;
        }

        const panels = getVisibleConversationMenuPanels();
        return panels[panels.length - 1] || null;
    }

    function logConversationMenuTargetAbort(result) {
        const reason = String(result?.reason || "").trim();
        const currentPathname = String(result?.currentPathname || "").trim() || "/app";

        switch (reason) {
            case "noCurrentConversationPath":
                console.warn(`[Gemini Shortcut] conversationMenu: 未找到当前对话项，已中止操作。当前页面不是已保存对话: ${currentPathname}`);
                return;
            case "temporarySidebarExpandFailed":
                console.warn(`[Gemini Shortcut] conversationMenu: 侧边栏未展开且临时展开失败，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "matchedUrlButButtonHidden":
                console.warn(`[Gemini Shortcut] conversationMenu: 已定位当前对话，但三个点按钮暂不可用，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "matchedExplicitCurrentButButtonHidden":
            case "matchedJslogCurrentButButtonHidden":
            case "matchedButButtonHidden":
                console.warn(`[Gemini Shortcut] conversationMenu: 已定位当前对话，但会话菜单按钮暂不可用，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "multipleUrlMatches":
                console.warn(`[Gemini Shortcut] conversationMenu: 当前对话匹配到多个侧边栏项，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "multipleExplicitCurrentMatches":
                console.warn(`[Gemini Shortcut] conversationMenu: 检测到多个高亮对话项，已中止操作。当前对话: ${currentPathname}`);
                return;
            case "multipleJslogCurrentMatches":
                console.warn(`[Gemini Shortcut] conversationMenu: 检测到多个当前对话候选，已中止操作。当前对话: ${currentPathname}`);
                return;
            default:
                console.warn(`[Gemini Shortcut] conversationMenu: 未找到当前对话项，已中止操作。当前对话: ${currentPathname}`);
        }
    }

    function simulateGeminiMenuClick(target) {
        if (!target) return false;
        try {
            if (TemplateUtils?.events?.simulateClick?.(target, { nativeFallback: true })) return true;
        } catch { }
        try {
            target.click?.();
            return true;
        } catch {
            return false;
        }
    }

    function getGeminiElementJslog(element) {
        let node = element;
        while (node && node.nodeType === 1) {
            const value = String(node.getAttribute?.("jslog") || "").trim();
            if (value) return value;
            node = node.parentElement || null;
        }
        return "";
    }

    function getGeminiElementJslogId(element) {
        const raw = getGeminiElementJslog(element);
        const match = raw.match(/^\s*([0-9]+)/);
        return match ? match[1] : "";
    }

    function getGeminiElementFeatureId(element) {
        const raw = getGeminiElementJslog(element);
        let found = "";
        try {
            for (const match of raw.matchAll(/\[\s*null\s*,\s*null\s*,\s*([0-9]+)\s*\]/g)) {
                found = match[1] || found;
            }
        } catch { }
        return found;
    }

    function getGeminiElementIconNames(element) {
        if (!element) return [];
        const nodes = [element];
        try {
            nodes.push(...Array.from(element.querySelectorAll("[fonticon], [data-mat-icon-name], mat-icon")));
        } catch { }

        const names = [];
        for (const node of nodes) {
            const fontIcon = normalizeGeminiToolIconName(node.getAttribute?.("fonticon"));
            const dataIcon = normalizeGeminiToolIconName(node.getAttribute?.("data-mat-icon-name"));
            if (fontIcon) names.push(fontIcon);
            if (dataIcon) names.push(dataIcon);
            if (node !== element && String(node.tagName || "").toLowerCase() === "mat-icon") {
                const textIcon = normalizeGeminiToolIconName(node.textContent);
                if (textIcon) names.push(textIcon);
            }
        }
        return Array.from(new Set(names));
    }

    function getGeminiElementDataTestIds(element) {
        if (!element) return [];
        const nodes = [element];
        try {
            nodes.push(...Array.from(element.querySelectorAll("[data-test-id]")));
        } catch { }

        const ids = [];
        for (const node of nodes) {
            const id = String(node.getAttribute?.("data-test-id") || "").trim().toLowerCase();
            if (id) ids.push(id);
        }
        return Array.from(new Set(ids));
    }

    const GEMINI_CONVERSATION_MENU_MARKERS = Object.freeze([
        "Delete",
        "Rename",
        "Pin",
        "Share",
        "Unpin",
        "删除",
        "重命名",
        "固定",
        "取消固定",
        "分享"
    ]);

    const GEMINI_CONVERSATION_MENU_CLICKABLE_ITEM_SELECTOR = [
        "button:not([disabled])",
        "a[href]",
        "label",
        "[role='menuitem']",
        "[role='menuitemradio']",
        "[role='menuitemcheckbox']",
        "[role='button']",
        "[mat-menu-item]",
        ".mat-mdc-menu-item",
        ".mat-mdc-list-item",
        "[jslog]",
        "[data-test-id]",
        "[tabindex]"
    ].join(", ");

    const GEMINI_CONVERSATION_MENU_TEXT_FALLBACK_ITEM_SELECTOR = [
        "button",
        "a",
        "label",
        "[role='menuitem']",
        "[role='menuitemradio']",
        "[role='menuitemcheckbox']",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "[jslog]",
        "[data-test-id]",
        "[tabindex]",
        "mat-icon",
        "span",
        "div"
    ].join(", ");

    function countGeminiConversationMenuMarkers(element, markers = GEMINI_CONVERSATION_MENU_MARKERS) {
        const text = getGeminiNormalizedElementSearchText(element);
        if (!text) return 0;
        const normalizedMarkers = Array.from(new Set((Array.isArray(markers) ? markers : [])
            .map(normalizeGeminiUiText)
            .filter(Boolean)))
            .sort((a, b) => b.length - a.length);
        const matched = [];
        for (const marker of normalizedMarkers) {
            if (!text.includes(marker)) continue;
            if (matched.some(existing => existing.includes(marker))) continue;
            matched.push(marker);
        }
        return matched.length;
    }

    function isGeminiConversationMenuRoot(element) {
        if (!element || !isElementVisible(element)) return false;

        const tagName = String(element.tagName || "").toLowerCase();
        if (tagName === "mat-dialog-container" || String(element.getAttribute?.("role") || "").toLowerCase() === "dialog") {
            return false;
        }

        const isOverlayPane = !!element.matches?.(".cdk-overlay-pane");

        let menuPanel = null;
        try {
            menuPanel = element.matches?.(".mat-mdc-menu-panel, .mat-menu-panel, [role='menu']") ? element : element.querySelector?.(".mat-mdc-menu-panel, .mat-menu-panel, [role='menu']");
        } catch {
            menuPanel = null;
        }
        if (!menuPanel && !isOverlayPane) return false;

        let dialogRoot = null;
        try {
            dialogRoot = element.matches?.("mat-dialog-container, [role='dialog']") ? element : element.querySelector?.("mat-dialog-container, [role='dialog']");
        } catch {
            dialogRoot = null;
        }
        if (dialogRoot) return false;

        let hasMarker = false;
        try {
            hasMarker = !!element.querySelector?.(CONVERSATION_MENU_MARKER_SELECTOR);
        } catch {
            hasMarker = false;
        }
        if (hasMarker) return true;

        const text = getGeminiNormalizedElementSearchText(element);
        if (!text) return false;
        return geminiNormalizedTextIncludesAny(text, GEMINI_CONVERSATION_MENU_MARKERS);
    }

    function geminiConversationMenuElementLooksTooBroad(element, rootEl) {
        if (!element || element === rootEl) return true;
        const text = getGeminiNormalizedElementSearchText(element);
        if (!text) return false;
        return countGeminiConversationMenuMarkers(element) > 1;
    }

    function getGeminiConversationMenuClickableElement(element, rootEl) {
        if (!element) return null;

        let node = element.nodeType === 1 ? element : (element.parentElement || null);
        const candidates = [];
        while (node && node.nodeType === 1 && node !== rootEl) {
            if (
                isElementVisible(node) &&
                elementMatchesGeminiSelector(node, GEMINI_CONVERSATION_MENU_CLICKABLE_ITEM_SELECTOR) &&
                !geminiConversationMenuElementLooksTooBroad(node, rootEl)
            ) {
                candidates.push(node);
            }
            node = node.parentElement || null;
        }

        const withKnownMarker = candidates.find(el => countGeminiConversationMenuMarkers(el) > 0);
        if (withKnownMarker) return withKnownMarker;
        if (candidates[0]) return candidates[0];

        if (
            element.nodeType === 1 &&
            isElementVisible(element) &&
            !geminiConversationMenuElementLooksTooBroad(element, rootEl)
        ) {
            return element;
        }
        return null;
    }

    function findGeminiConversationMenuItemInRoot(rootEl, selector, { textMatch = null, normalize, fallbackToFirst = false } = {}) {
        const direct = findMenuItemInRoot(rootEl, selector, { textMatch, normalize, fallbackToFirst });
        const directClickable = getGeminiConversationMenuClickableElement(direct, rootEl);
        if (directClickable) return directClickable;

        if (!textMatch) return directClickable || null;

        let all = [];
        try {
            all = Array.from(rootEl.querySelectorAll(GEMINI_CONVERSATION_MENU_TEXT_FALLBACK_ITEM_SELECTOR));
        } catch {
            return null;
        }

        const visible = all.filter(el => el !== rootEl && isElementVisible(el));
        const candidates = visible.length ? visible : all.filter(el => el !== rootEl);
        if (candidates.length === 0) return null;

        const normalizeText = (typeof normalize === "function")
            ? normalize
            : (value) => String(value ?? "").trim().toLowerCase();
        const matchText = TemplateUtils?.dom?.matchText;
        const structuredTextMatch = isStructuredGeminiTextMatchSpec(textMatch);
        const textMatchGroups = structuredTextMatch
            ? getGeminiTextMatchPriorityGroups(textMatch)
            : [textMatch];

        for (const group of textMatchGroups) {
            for (const el of candidates) {
                if (geminiConversationMenuElementLooksTooBroad(el, rootEl)) continue;

                const uiText = getGeminiUiElementText(el);
                const text = uiText || String(el?.textContent || "");
                const matched = (typeof matchText === "function")
                    ? matchText(text, group, { normalize: normalizeText, element: el })
                    : geminiMenuTextMatches(text, group, el);
                if (!matched) continue;

                const clickable = getGeminiConversationMenuClickableElement(el, rootEl);
                if (clickable) return clickable;
            }
        }

        return null;
    }

    const GEMINI_TOP_BAR_CONVERSATION_ACTION_CANDIDATE_SELECTOR = [
        "top-bar-actions conversation-actions-icon button[data-test-id='conversation-actions-menu-icon-button']",
        "top-bar-actions button[data-test-id='conversation-actions-menu-icon-button']",
        "top-bar-actions button.conversation-actions-menu-button",
        "top-bar-actions button[aria-label*='conversation actions' i]",
        "top-bar-actions button[aria-label*='open menu' i]",
        "button[data-test-id='conversation-actions-menu-icon-button']",
        "button.conversation-actions-menu-button",
        "button[aria-label*='Open menu for conversation actions' i]",
        "button[aria-label*='conversation actions' i]",
        "button[aria-label*='more options' i]",
        "button[data-test-id='actions-menu-button']"
    ].join(", ");

    function isGeminiConversationActionButtonExcluded(button) {
        if (!button) return true;
        if (!isElementVisible(button)) return true;
        if (button.closest?.("bard-sidenav, side-navigation-content, .sidenav-with-history-container, .conversation-items-container, side-nav-action-button")) return true;
        if (button.closest?.("input-area-v2, [data-node-type='input-area'], [contenteditable='true'], .prompt-input, .composer, .prompt-composer")) return true;
        if (button.closest?.([
            "user-query",
            "user-query-content",
            "model-response",
            "message-content",
            "message-actions",
            "response-actions",
            ".message-actions",
            ".response-actions",
            "[data-test-id*='user-query' i]",
            "[data-test-id*='model-response' i]",
            "[data-test-id*='response' i]",
            "[data-test-id*='message' i]",
            "[data-test-id*='query' i]"
        ].join(", "))) return true;
        if (button.closest?.(".cdk-overlay-pane .mat-mdc-menu-panel, .cdk-overlay-pane .mat-menu-panel, .cdk-overlay-pane [role='menu'], mat-dialog-container, [role='dialog']")) return true;
        return false;
    }

    function scoreGeminiConversationActionButton(button) {
        if (!button || isGeminiConversationActionButtonExcluded(button)) return -Infinity;

        let score = 0;
        const dataTestId = String(button.getAttribute?.("data-test-id") || "").trim().toLowerCase();
        const ariaLabel = normalizeGeminiUiText(button.getAttribute?.("aria-label") || "");
        const title = normalizeGeminiUiText(button.getAttribute?.("title") || "");
        const text = normalizeGeminiUiText(getGeminiUiElementText(button));
        const className = normalizeGeminiUiText(String(button.className || ""));
        const iconNames = getGeminiElementIconNames(button);
        const inTopBar = !!button.closest?.("top-bar-actions");
        const explicitlyConversationAction = !!(
            inTopBar ||
            dataTestId === "conversation-actions-menu-icon-button" ||
            className.includes("conversation-actions-menu-button") ||
            ariaLabel.includes("conversation actions") ||
            ariaLabel.includes("open menu for conversation actions") ||
            title.includes("conversation actions") ||
            text.includes("conversation actions")
        );

        if (!explicitlyConversationAction) return -Infinity;

        if (dataTestId === "conversation-actions-menu-icon-button") score += 160;
        if (dataTestId === "actions-menu-button") score += 70;
        if (className.includes("conversation-actions-menu-button")) score += 130;
        if (inTopBar) score += 120;
        if (ariaLabel.includes("conversation actions")) score += 100;
        if (ariaLabel.includes("open menu for conversation actions")) score += 140;
        if (inTopBar && ariaLabel.includes("more options")) score += 40;
        if (title.includes("conversation actions")) score += 60;
        if (text.includes("conversation actions")) score += 70;
        if (inTopBar && iconNames.some(name => normalizeGeminiToolIconName(name) === "more_vert")) score += 35;

        try {
            const rect = button.getBoundingClientRect?.();
            if (rect) {
                const viewportWidth = Math.max(1, Number(window.innerWidth) || 1);
                const viewportHeight = Math.max(1, Number(window.innerHeight) || 1);
                if (rect.top <= Math.max(220, viewportHeight * 0.32)) score += 20;
                if (rect.left >= viewportWidth * 0.42) score += 20;
                if (rect.width > 0 && rect.height > 0) score += 5;
            }
        } catch { }

        return score;
    }

    function getGeminiTopBarConversationActionButton() {
        let candidates = [];
        try {
            candidates = Array.from(document.querySelectorAll(GEMINI_TOP_BAR_CONVERSATION_ACTION_CANDIDATE_SELECTOR));
        } catch {
            candidates = [];
        }
        if (candidates.length === 0) return null;

        const scored = candidates
            .map(button => ({ button, score: scoreGeminiConversationActionButton(button) }))
            .filter(item => item.score > -Infinity)
            .sort((a, b) => b.score - a.score);

        return scored[0]?.button || null;
    }

    function elementHasGeminiToolIconName(element, iconNames) {
        const expected = new Set(normalizeGeminiToolIconNames(iconNames));
        if (expected.size === 0) return false;
        return getGeminiElementIconNames(element).some(name => expected.has(name));
    }

    function elementHasGeminiDataTestId(element, dataTestIds) {
        const expected = new Set(normalizeGeminiToolStringIds(dataTestIds).map(id => id.toLowerCase()));
        if (expected.size === 0) return false;
        return getGeminiElementDataTestIds(element).some(id => expected.has(id));
    }

    function collectGeminiElementTextExcludingIcons(node, parts = []) {
        if (!node) return parts;
        if (node.nodeType === 3) {
            parts.push(node.nodeValue || "");
            return parts;
        }
        if (node.nodeType !== 1) return parts;

        const tagName = String(node.tagName || "").toLowerCase();
        if (tagName === "mat-icon") return parts;
        if (String(node.getAttribute?.("aria-hidden") || "").trim().toLowerCase() === "true") return parts;
        if (node.hasAttribute?.("fonticon") || node.hasAttribute?.("data-mat-icon-name")) return parts;

        try {
            for (const child of Array.from(node.childNodes || [])) {
                collectGeminiElementTextExcludingIcons(child, parts);
            }
        } catch { }
        return parts;
    }

    function getGeminiUiElementText(element) {
        if (!element) return "";
        const ariaLabel = element.getAttribute?.("aria-label");
        if (ariaLabel && String(ariaLabel).trim()) return String(ariaLabel);
        const title = element.getAttribute?.("title");
        if (title && String(title).trim()) return String(title);

        const textWithoutIcons = collectGeminiElementTextExcludingIcons(element, []).join(" ");
        if (textWithoutIcons && String(textWithoutIcons).trim()) return textWithoutIcons;

        try {
            return String(element.textContent || "");
        } catch {
            return "";
        }
    }

    function geminiMenuItemLooksLikeNotebook(rawText, element) {
        const values = [
            rawText,
            getGeminiUiElementText(element),
            getGeminiElementDataTestIds(element).join(" ")
        ];
        return values.some((value) => {
            const text = normalizeGeminiUiText(value);
            return !!text && (/\bnotebook\b/i.test(text) || text.includes("笔记本"));
        });
    }

    function geminiMenuTextExactlyMatches(rawText, aliases, element) {
        const aliasSet = new Set((Array.isArray(aliases) ? aliases : [])
            .map(normalizeGeminiUiText)
            .filter(Boolean));
        if (aliasSet.size === 0) return false;

        const text = element ? getGeminiUiElementText(element) : rawText;
        const normalizedText = normalizeGeminiUiText(text);
        return !!normalizedText && aliasSet.has(normalizedText);
    }

    function geminiMenuTextMatches(rawText, matcher, element = null) {
        if (matcher == null) return true;
        if (typeof matcher === "function") {
            try {
                return !!matcher(rawText, element);
            } catch {
                return false;
            }
        }
        if (matcher instanceof RegExp) {
            try {
                return matcher.test(String(rawText || ""));
            } catch {
                return false;
            }
        }
        if (Array.isArray(matcher)) {
            return matcher.some(item => geminiMenuTextMatches(rawText, item, element));
        }
        const text = normalizeGeminiUiText(rawText);
        const target = normalizeGeminiUiText(matcher);
        return target ? text.includes(target) : true;
    }

    function createGeminiConversationDeleteTargetMatcher(target) {
        const dataTestIds = normalizeGeminiToolStringIds(target?.dataTestIds || []);
        const jslogIds = normalizeGeminiToolStringIds(target?.jslogIds || []);
        const aliases = Array.isArray(target?.aliases) ? target.aliases : ["Delete", "删除"];

        return (rawText, element) => {
            if (geminiMenuItemLooksLikeNotebook(rawText, element)) return false;
            if (geminiMenuTextMatches(rawText, aliases, element)) return true;

            const hasReadableText = !!normalizeGeminiUiText(element ? getGeminiUiElementText(element) : rawText);
            if (hasReadableText) return false;

            if (dataTestIds.length > 0 && elementHasGeminiDataTestId(element, dataTestIds)) return true;

            const jslogId = getGeminiElementJslogId(element);
            return !!jslogId && jslogIds.includes(jslogId);
        };
    }

    function createGeminiToolTargetMatcher(target, extraIconNames = []) {
        const iconNames = normalizeGeminiToolIconNames([
            ...(target?.iconNames || []),
            ...normalizeGeminiToolIconNames(extraIconNames)
        ]);
        const jslogIds = normalizeGeminiToolStringIds(target?.jslogIds || []);
        const featureIds = normalizeGeminiToolStringIds(target?.featureIds || []);
        const aliases = Array.isArray(target?.aliases) ? target.aliases : [];

        if (!target && iconNames.length === 0) return null;

        return (rawText, element) => {
            if (aliases.length > 0 && geminiMenuTextMatches(rawText, aliases, element)) return true;

            const hasReadableText = !!normalizeGeminiUiText(element ? getGeminiUiElementText(element) : rawText);
            if (hasReadableText) return false;

            if (iconNames.length > 0 && elementHasGeminiToolIconName(element, iconNames)) return true;

            const jslogId = getGeminiElementJslogId(element);
            if (jslogId && jslogIds.includes(jslogId)) return true;

            const featureId = getGeminiElementFeatureId(element);
            return !!featureId && featureIds.includes(featureId);
        };
    }

    function createGeminiConversationMenuTargetMatcher(target, extraIconNames = []) {
        if (target?.id === "delete") {
            return createGeminiConversationDeleteTargetMatcher(target);
        }

        const dataTestIds = normalizeGeminiToolStringIds(target?.dataTestIds || []);
        const iconNames = normalizeGeminiToolIconNames([
            ...(target?.iconNames || []),
            ...normalizeGeminiToolIconNames(extraIconNames)
        ]);
        const jslogIds = normalizeGeminiToolStringIds(target?.jslogIds || []);
        const aliases = Array.isArray(target?.aliases) ? target.aliases : [];

        if (!target && iconNames.length === 0) return null;

        return (rawText, element) => {
            if (dataTestIds.length > 0 && elementHasGeminiDataTestId(element, dataTestIds)) return true;
            if (iconNames.length > 0 && elementHasGeminiToolIconName(element, iconNames)) return true;

            const jslogId = getGeminiElementJslogId(element);
            if (jslogId && jslogIds.includes(jslogId)) return true;

            return aliases.length > 0 && geminiMenuTextMatches(rawText, aliases, element);
        };
    }

    function combineGeminiMenuTextMatches(...matchers) {
        const list = matchers.filter(matcher => hasValidTextMatch(matcher));
        if (list.length === 0) return undefined;
        return list.length === 1 ? list[0] : list;
    }

    function isStructuredGeminiTextMatchSpec(value) {
        return !!value && typeof value === "object" && !Array.isArray(value) && !(value instanceof RegExp) && typeof value !== "function";
    }

    function getGeminiTextMatchPriorityGroups(textMatch) {
        if (!isStructuredGeminiTextMatchSpec(textMatch)) {
            return hasValidTextMatch(textMatch) ? [textMatch] : [];
        }

        const groups = [];
        const pushGroup = (value) => {
            if (hasValidTextMatch(value)) groups.push(value);
        };

        if (textMatch.preferred !== undefined) pushGroup(textMatch.preferred);
        if (textMatch.primary !== undefined) pushGroup(textMatch.primary);
        if (textMatch.first !== undefined) pushGroup(textMatch.first);
        if (textMatch.fallback !== undefined) pushGroup(textMatch.fallback);
        if (textMatch.any !== undefined) pushGroup(textMatch.any);
        if (textMatch.values !== undefined) pushGroup(textMatch.values);
        if (textMatch.textMatch !== undefined) pushGroup(textMatch.textMatch);
        if (textMatch.match !== undefined) pushGroup(textMatch.match);

        return groups;
    }

    function resolveSelectorListFromSpec(ctx, spec) {
        if (!spec) return [];
        if (Array.isArray(spec)) {
            return spec.flatMap(item => resolveSelectorListFromSpec(ctx, item));
        }
        if (typeof spec === "string") {
            const trimmed = spec.trim();
            return trimmed ? [trimmed] : [];
        }
        if (typeof spec === "object") {
            if (Array.isArray(spec.selectors)) return resolveSelectorListFromSpec(ctx, spec.selectors);

            const fromId = typeof spec.fromShortcutId === "string" ? spec.fromShortcutId : "";
            const fromKey = typeof spec.fromShortcutKey === "string" ? spec.fromShortcutKey : "";
            const fromName = typeof spec.fromShortcutName === "string" ? spec.fromShortcutName : "";
            const field = typeof spec.field === "string" ? spec.field : "selector";
            const fallback = typeof spec.fallback === "string"
                ? spec.fallback
                : (typeof spec.selector === "string" ? spec.selector : "");

            let selector = fallback;
            const resolveShortcutField = TemplateUtils?.shortcuts?.resolveShortcutField;
            if ((fromId || fromKey || fromName) && typeof resolveShortcutField === "function") {
                selector = resolveShortcutField(ctx?.engine, { id: fromId, key: fromKey, name: fromName }, field, fallback);
            }

            const trimmed = String(selector || "").trim();
            return trimmed ? [trimmed] : [];
        }
        return [];
    }

    function findMenuItemInRoot(rootEl, selector, { textMatch = null, normalize, fallbackToFirst = false } = {}) {
        const findFirst = TemplateUtils?.dom?.findFirst;
        const structuredTextMatch = isStructuredGeminiTextMatchSpec(textMatch);
        if (!structuredTextMatch && typeof findFirst === "function") {
            return findFirst(rootEl, selector, { textMatch, normalize, fallbackToFirst });
        }

        let all = [];
        try {
            all = Array.from(rootEl.querySelectorAll(selector));
        } catch {
            return null;
        }

        const visible = all.filter(isElementVisible);
        const candidates = visible.length ? visible : all;
        if (candidates.length === 0) return null;

        if (!textMatch) return candidates[0] || null;

        const normalizeText = (typeof normalize === "function")
            ? normalize
            : (value) => String(value ?? "").trim().toLowerCase();
        const matchText = TemplateUtils?.dom?.matchText;
        const textMatchGroups = structuredTextMatch
            ? getGeminiTextMatchPriorityGroups(textMatch)
            : [textMatch];

        for (const group of textMatchGroups) {
            for (const el of candidates) {
                const text = String(el?.textContent || "");
                const matched = (typeof matchText === "function")
                    ? matchText(text, group, { normalize: normalizeText, element: el })
                    : geminiMenuTextMatches(text, group, el);
                if (matched) return el;
            }
        }

        if (!fallbackToFirst) return null;
        return candidates[0] || null;
    }

    function getGeminiNormalizedElementSearchText(element) {
        if (!element) return "";
        const parts = [];
        try {
            const text = String(element.textContent || "");
            if (text) parts.push(text);
        } catch { }
        const uiText = getGeminiUiElementText(element);
        if (uiText) parts.push(uiText);
        return normalizeGeminiUiText(parts.join(" "));
    }

    function geminiNormalizedTextIncludesAny(normalizedText, markers) {
        if (!normalizedText) return false;
        return (Array.isArray(markers) ? markers : []).some(marker => {
            const token = normalizeGeminiUiText(marker);
            return !!token && normalizedText.includes(token);
        });
    }

    function countGeminiToolsMarkers(element, markers = GEMINI_TOOLS_MENU_MARKERS) {
        const text = getGeminiNormalizedElementSearchText(element);
        if (!text) return 0;
        const normalizedMarkers = Array.from(new Set((Array.isArray(markers) ? markers : [])
            .map(normalizeGeminiUiText)
            .filter(Boolean)))
            .sort((a, b) => b.length - a.length);
        const matched = [];
        for (const marker of normalizedMarkers) {
            if (!text.includes(marker)) continue;
            if (matched.some(existing => existing.includes(marker))) continue;
            matched.push(marker);
        }
        return matched.length;
    }

    function elementMatchesGeminiSelector(element, selector) {
        if (!element || !selector) return false;
        try {
            return !!element.matches?.(selector);
        } catch {
            return false;
        }
    }

    function isGeminiToolsPrimaryMenuRoot(element) {
        if (!element || !isElementVisible(element)) return false;

        const text = getGeminiNormalizedElementSearchText(element);
        if (!text) return false;

        const hasUploadMarker = geminiNormalizedTextIncludesAny(text, [
            "Upload files",
            "Add from Drive",
            "More uploads",
            "上传文件",
            "从云端硬盘添加",
            "更多上传"
        ]);
        const hasMoreTools = geminiNormalizedTextIncludesAny(text, GEMINI_MORE_TOOLS_ALIASES);
        const primaryCount = countGeminiToolsMarkers(element, GEMINI_TOOLS_PRIMARY_MENU_MARKERS);

        return hasUploadMarker || hasMoreTools || primaryCount >= 2;
    }

    function isGeminiToolsAnyMenuRoot(element) {
        if (!element || !isElementVisible(element)) return false;
        if (isGeminiToolsPrimaryMenuRoot(element)) return true;
        return countGeminiToolsMarkers(element, GEMINI_TOOLS_SUBMENU_MARKERS) > 0;
    }

    function getGeminiToolsMenuRootCandidates(ctx) {
        const doc = globalThis.document || null;
        if (!doc) return [];

        const selectors = resolveSelectorListFromSpec(ctx, SELECTORS.toolsMenuRoot);
        const seen = new Set();
        const candidates = [];

        for (const sel of selectors) {
            let list = [];
            try {
                list = Array.from(doc.querySelectorAll(sel));
            } catch {
                continue;
            }
            for (const el of list) {
                if (!el || seen.has(el)) continue;
                seen.add(el);
                candidates.push(el);
            }
        }

        return candidates.filter(isElementVisible);
    }

    function getGeminiToolsMenuRootElements(ctx, { includeSubmenus = true } = {}) {
        const candidates = getGeminiToolsMenuRootCandidates(ctx);
        return candidates.filter(el => includeSubmenus
            ? isGeminiToolsAnyMenuRoot(el)
            : isGeminiToolsPrimaryMenuRoot(el));
    }

    function getGeminiToolsMenuRootElement(ctx) {
        const roots = getGeminiToolsMenuRootElements(ctx, { includeSubmenus: false });
        return roots[roots.length - 1] || null;
    }

    function geminiToolsMenuElementLooksTooBroad(element, rootEl) {
        if (!element || element === rootEl) return true;
        const text = getGeminiNormalizedElementSearchText(element);
        if (!text) return false;
        return countGeminiToolsMarkers(element) > 1;
    }

    const GEMINI_TOOLS_CLICKABLE_ITEM_SELECTOR = [
        "button:not([disabled])",
        "a[href]",
        "label",
        "[role='menuitem']",
        "[role='menuitemradio']",
        "[role='menuitemcheckbox']",
        "[role='button']",
        "[mat-menu-item]",
        ".mat-mdc-menu-item",
        ".mat-mdc-list-item",
        "[jslog]",
        "[data-test-id]",
        "[tabindex]"
    ].join(", ");

    function getGeminiToolsMenuClickableElement(element, rootEl) {
        if (!element) return null;

        let node = element.nodeType === 1 ? element : (element.parentElement || null);
        const candidates = [];
        while (node && node.nodeType === 1 && node !== rootEl) {
            if (
                isElementVisible(node) &&
                elementMatchesGeminiSelector(node, GEMINI_TOOLS_CLICKABLE_ITEM_SELECTOR) &&
                !geminiToolsMenuElementLooksTooBroad(node, rootEl)
            ) {
                candidates.push(node);
            }
            node = node.parentElement || null;
        }

        const withKnownMarker = candidates.find(el => countGeminiToolsMarkers(el) > 0);
        if (withKnownMarker) return withKnownMarker;
        if (candidates[0]) return candidates[0];

        if (
            element.nodeType === 1 &&
            isElementVisible(element) &&
            !geminiToolsMenuElementLooksTooBroad(element, rootEl)
        ) {
            return element;
        }
        return null;
    }

    const GEMINI_TOOLS_TEXT_FALLBACK_ITEM_SELECTOR = [
        "button",
        "a",
        "label",
        "[role='menuitem']",
        "[role='menuitemradio']",
        "[role='menuitemcheckbox']",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "[jslog]",
        "[data-test-id]",
        "[tabindex]",
        "mat-icon",
        "span",
        "div"
    ].join(", ");

    function findGeminiToolsMenuItemInRoot(rootEl, selector, { textMatch = null, normalize, fallbackToFirst = false } = {}) {
        const direct = findMenuItemInRoot(rootEl, selector, { textMatch, normalize, fallbackToFirst });
        const directClickable = getGeminiToolsMenuClickableElement(direct, rootEl);
        if (directClickable) return directClickable;

        if (!textMatch) return directClickable || null;

        let all = [];
        try {
            all = Array.from(rootEl.querySelectorAll(GEMINI_TOOLS_TEXT_FALLBACK_ITEM_SELECTOR));
        } catch {
            return null;
        }

        const visible = all.filter(el => el !== rootEl && isElementVisible(el));
        const candidates = visible.length ? visible : all.filter(el => el !== rootEl);
        if (candidates.length === 0) return null;

        const normalizeText = (typeof normalize === "function")
            ? normalize
            : (value) => String(value ?? "").trim().toLowerCase();
        const matchText = TemplateUtils?.dom?.matchText;
        const structuredTextMatch = isStructuredGeminiTextMatchSpec(textMatch);
        const textMatchGroups = structuredTextMatch
            ? getGeminiTextMatchPriorityGroups(textMatch)
            : [textMatch];

        for (const group of textMatchGroups) {
            for (const el of candidates) {
                if (geminiToolsMenuElementLooksTooBroad(el, rootEl)) continue;

                const uiText = getGeminiUiElementText(el);
                const text = uiText || String(el?.textContent || "");
                const matched = (typeof matchText === "function")
                    ? matchText(text, group, { normalize: normalizeText, element: el })
                    : geminiMenuTextMatches(text, group, el);
                if (!matched) continue;

                const clickable = getGeminiToolsMenuClickableElement(el, rootEl);
                if (clickable) return clickable;
            }
        }

        return null;
    }

    function geminiMoreToolsMenuMatcher(rawText, element) {
        if (geminiMenuTextExactlyMatches(rawText, GEMINI_MORE_TOOLS_ALIASES, element)) return true;
        const text = normalizeGeminiUiText(element ? getGeminiUiElementText(element) : rawText);
        return text === "more tools" || text === "更多工具";
    }

    function createGeminiToolsMenuController(baseMenu) {
        return Object.freeze({
            timing: MENU_TIMING,
            getTriggerElement(ctx) {
                return baseMenu?.getTriggerElement?.(ctx) || null;
            },
            activateTrigger(ctx) {
                return !!baseMenu?.activateTrigger?.(ctx);
            },
            getRootElement(ctx) {
                return getGeminiToolsMenuRootElement(ctx);
            },
            isOpen(ctx) {
                return !!this.getRootElement(ctx);
            },
            getOpenMenuRoots(ctx, { includeRoot = true, includeSubmenus = true } = {}) {
                if (!includeRoot && !includeSubmenus) return [];
                return getGeminiToolsMenuRootElements(ctx, { includeSubmenus });
            },
            async ensureOpen(ctx, opts = {}) {
                const timeoutMs = opts.timeoutMs ?? MENU_TIMING.waitTimeoutMs;
                const intervalMs = opts.intervalMs ?? MENU_TIMING.pollIntervalMs;
                const openDelayMs = opts.openDelayMs ?? MENU_TIMING.openDelayMs;

                if (this.isOpen(ctx)) return true;

                const trigger = this.getTriggerElement(ctx);
                if (!trigger || !isElementVisible(trigger)) return false;
                if (!this.activateTrigger(ctx)) return false;
                if (openDelayMs > 0) await sleep(openDelayMs);

                const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
                while (Date.now() <= deadline) {
                    if (this.isOpen(ctx)) return true;
                    await sleep(Math.max(30, Number(intervalMs) || 30));
                }
                return this.isOpen(ctx);
            },
            async ensureSubmenuOpen(ctx, submenuKey, opts = {}) {
                const key = normalizeMenuKey(submenuKey);
                if (key !== "moretools") return false;
                if (!await this.ensureOpen(ctx, opts)) return false;

                const rootsBefore = this.getOpenMenuRoots(ctx, { includeSubmenus: true }).length;
                const clicked = await this.clickInOpenMenus(ctx, {
                    selector: TOOLS_DRAWER_ITEM_SELECTOR,
                    textMatch: geminiMoreToolsMenuMatcher,
                    waitForItem: true
                });
                if (!clicked) return false;

                const timeoutMs = opts.timeoutMs ?? MENU_TIMING.waitTimeoutMs;
                const intervalMs = opts.intervalMs ?? MENU_TIMING.pollIntervalMs;
                const openDelayMs = opts.openDelayMs ?? MENU_TIMING.openDelayMs;
                if (openDelayMs > 0) await sleep(openDelayMs);

                const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
                while (Date.now() <= deadline) {
                    const roots = this.getOpenMenuRoots(ctx, { includeSubmenus: true });
                    if (roots.length > rootsBefore) return true;
                    if (roots.some(root => countGeminiToolsMarkers(root, GEMINI_TOOLS_SUBMENU_MARKERS) > 0)) return true;
                    await sleep(Math.max(30, Number(intervalMs) || 30));
                }
                return true;
            },
            async clickInOpenMenus(ctx, {
                selector,
                textMatch = null,
                normalize = TemplateUtils?.dom?.normalizeText,
                fallbackToFirst = false,
                waitForItem = false
            } = {}) {
                const selectorList = resolveSelectorListFromSpec(ctx, selector);
                if (selectorList.length === 0) return false;

                const tryClickOnce = () => {
                    const roots = this.getOpenMenuRoots(ctx, { includeRoot: true, includeSubmenus: true }).filter(Boolean);
                    if (roots.length === 0) return false;

                    for (const rootEl of roots) {
                        for (const sel of selectorList) {
                            const item = findGeminiToolsMenuItemInRoot(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                            if (item && simulateGeminiMenuClick(item)) return true;
                        }
                    }
                    return false;
                };

                if (!waitForItem) return tryClickOnce();

                const timeoutMs = MENU_TIMING.waitTimeoutMs ?? 3000;
                const intervalMs = MENU_TIMING.pollIntervalMs ?? 120;
                const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
                while (Date.now() <= deadline) {
                    if (tryClickOnce()) return true;
                    await sleep(Math.max(30, Number(intervalMs) || 30));
                }
                return tryClickOnce();
            },
            async oneStepClick(ctx, {
                selector,
                textMatch = null,
                normalize = TemplateUtils?.dom?.normalizeText,
                fallbackToFirst = false,
                openSubmenus = [],
                waitForItem = true
            } = {}) {
                if (!selector) return false;
                if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
                if (!await this.ensureOpen(ctx)) return false;
                if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;

                const submenuKeys = Array.isArray(openSubmenus) ? openSubmenus.filter(Boolean) : [];
                for (const key of submenuKeys) {
                    await this.ensureSubmenuOpen(ctx, key);
                    if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
                }

                if (!waitForItem) return false;
                return await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
            }
        });
    }

    const topBarConversationMenu = Object.freeze({
        timing: MENU_TIMING,
        submenus: Object.freeze({}),
        getTriggerElement(ctx) {
            return getGeminiTopBarConversationActionButton() || topBarConversationMenuBase.getTriggerElement(ctx) || null;
        },
        activateTrigger(ctx) {
            const trigger = this.getTriggerElement(ctx);
            return !!(trigger && simulateGeminiMenuClick(trigger));
        },
        getRootElement(ctx) {
            const trigger = this.getTriggerElement(ctx);
            if (!trigger || !isElementVisible(trigger)) return null;

            const expanded = String(trigger.getAttribute?.("aria-expanded") || "").trim().toLowerCase();
            if (expanded && expanded !== "true") return null;

            const root = getGeminiTopBarConversationMenuRootElement(trigger) || topBarConversationMenuBase.getRootElement(ctx);
            return (root && isElementVisible(root) && isGeminiConversationMenuRoot(root)) ? root : null;
        },
        isOpen(ctx) {
            return !!this.getRootElement(ctx);
        },
        getOpenMenuRoots(ctx) {
            const root = this.getRootElement(ctx);
            return root ? [root] : [];
        },
        async ensureOpen(ctx, opts = {}) {
            const timeoutMs = opts.timeoutMs ?? MENU_TIMING.waitTimeoutMs;
            const intervalMs = opts.intervalMs ?? MENU_TIMING.pollIntervalMs;
            const openDelayMs = opts.openDelayMs ?? MENU_TIMING.openDelayMs;

            if (this.isOpen(ctx)) return true;

            const trigger = this.getTriggerElement(ctx);
            if (!trigger || !isElementVisible(trigger)) return false;
            if (isGeminiConversationActionButtonExcluded(trigger)) return false;
            if (!this.activateTrigger(ctx)) return false;
            if (openDelayMs > 0) await sleep(openDelayMs);

            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (this.isOpen(ctx)) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }

            return this.isOpen(ctx);
        },
        async ensureSubmenuOpen() {
            return false;
        },
        async clickInOpenMenus(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = false
        } = {}) {
            const selectorList = resolveSelectorListFromSpec(ctx, selector);
            if (selectorList.length === 0) return false;

            const tryClickOnce = () => {
                const rootEl = this.getRootElement(ctx);
                if (!rootEl) return false;

                for (const sel of selectorList) {
                    const item = findGeminiConversationMenuItemInRoot(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                    if (item && simulateGeminiMenuClick(item)) return true;
                }
                return false;
            };

            if (!waitForItem) return tryClickOnce();

            const timeoutMs = MENU_TIMING.waitTimeoutMs ?? 3000;
            const intervalMs = MENU_TIMING.pollIntervalMs ?? 120;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (tryClickOnce()) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }
            return tryClickOnce();
        },
        async oneStepClick(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = true
        } = {}) {
            if (!selector) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!await this.ensureOpen(ctx)) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!waitForItem) return false;
            return await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
        }
    });

    const conversationMenu = Object.freeze({
        timing: MENU_TIMING,
        submenus: Object.freeze({}),
        getTriggerElement() {
            const entry = resolveCurrentConversationMenuTarget({ allowFullScan: false })?.entry || null;
            if (!entry) return null;
            if (isConversationMenuButtonUsable(entry.button)) return entry.button;
            return refreshConversationEntryButton(entry)?.button || null;
        },
        activateTrigger() {
            const trigger = this.getTriggerElement();
            return !!(trigger && simulateGeminiMenuClick(trigger));
        },
        getRootElement() {
            const entry = resolveCurrentConversationMenuTarget({ allowFullScan: false })?.entry || null;
            return entry ? getConversationMenuRootElementFromEntry(entry) : null;
        },
        isOpen() {
            return !!this.getRootElement();
        },
        getOpenMenuRoots() {
            const root = this.getRootElement();
            return root ? [root] : [];
        },
        async ensureOpen(ctx, opts = {}) {
            const timeoutMs = opts.timeoutMs ?? MENU_TIMING.waitTimeoutMs;
            const intervalMs = opts.intervalMs ?? MENU_TIMING.pollIntervalMs;
            const openDelayMs = opts.openDelayMs ?? MENU_TIMING.openDelayMs;

            const target = await waitForCurrentConversationMenuTarget({ timeoutMs, intervalMs });
            const entry = target?.entry || null;
            if (!entry?.button || !isConversationMenuButtonUsable(entry.button)) {
                logConversationMenuTargetAbort(target);
                return false;
            }

            const getActiveRoot = () => {
                const existing = getConversationMenuRootElementFromEntry(entry);
                if (existing) return existing;
                const latest = resolveCurrentConversationMenuTarget({
                    currentPathname: target.currentPathname,
                    allowFullScan: false
                });
                return latest?.entry ? getConversationMenuRootElementFromEntry(latest.entry) : null;
            };

            const existingRoot = getActiveRoot();
            if (existingRoot) return true;

            if (!simulateGeminiMenuClick(entry.button)) return false;
            if (openDelayMs > 0) await sleep(openDelayMs);

            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (getActiveRoot()) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }

            return !!getActiveRoot();
        },
        async ensureSubmenuOpen() {
            return false;
        },
        async clickInOpenMenus(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = false
        } = {}) {
            const selectorList = resolveSelectorListFromSpec(ctx, selector);
            if (selectorList.length === 0) return false;

            const tryClickOnce = () => {
                const target = resolveCurrentConversationMenuTarget({ allowFullScan: false });
                const rootEl = target?.entry ? getConversationMenuRootElementFromEntry(target.entry) : null;
                if (!rootEl) return false;

                for (const sel of selectorList) {
                    const item = findGeminiConversationMenuItemInRoot(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                    if (item && simulateGeminiMenuClick(item)) return true;
                }
                return false;
            };

            if (!waitForItem) return tryClickOnce();

            const timeoutMs = MENU_TIMING.waitTimeoutMs ?? 3000;
            const intervalMs = MENU_TIMING.pollIntervalMs ?? 120;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            while (Date.now() <= deadline) {
                if (tryClickOnce()) return true;
                await sleep(Math.max(30, Number(intervalMs) || 30));
            }
            return tryClickOnce();
        },
        async oneStepClick(ctx, {
            selector,
            textMatch = null,
            normalize = TemplateUtils?.dom?.normalizeText,
            fallbackToFirst = false,
            waitForItem = true
        } = {}) {
            if (!selector) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!await this.ensureOpen(ctx)) return false;
            if (await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
            if (!waitForItem) return false;
            return await this.clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
        }
    });

    function normalizeMenuToken(value) {
        return String(value ?? "").trim();
    }

    function normalizeMenuKey(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        return token.replace(/[\s_-]+/g, "");
    }

    function normalizeMenuAction(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        return token || "onestep";
    }

    const TOOLS_DRAWER_ITEM_SELECTOR = "button[mat-menu-item], button.mat-mdc-menu-item, button[mat-list-item], button.mat-mdc-list-item, button[aria-label], button[jslog], button[data-test-id], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='button'], [aria-label], [title], [jslog], [data-test-id], [tabindex]";
    const CONVERSATION_ITEM_SELECTOR = [
        "button[mat-menu-item]",
        "button.mat-mdc-menu-item",
        "button[aria-label]",
        "button[jslog]",
        "button[data-test-id]",
        "[role='menuitem']",
        "[role='menuitemradio']",
        "[role='menuitemcheckbox']",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "[jslog]",
        "[data-test-id]",
        "[tabindex]"
    ].join(", ");
    const CONVERSATION_MENU_PANEL_SELECTOR = SELECTORS.topBarConversationMenuRoot.join(", ");
    const CONVERSATION_MENU_MARKER_SELECTOR = [
        "button[data-test-id='delete-button']",
        "button[data-test-id='pin-button']",
        "button[data-test-id='rename-button']",
        "button[data-test-id='studio-sidebar-button']",
        "button[aria-label*='Delete' i]",
        "button[aria-label*='Rename' i]",
        "button[aria-label*='Pin' i]",
        "button[aria-label*='Share' i]"
    ].join(", ");
    const MODEL_PICKER_ITEM_SELECTOR = "button.bard-mode-list-button[role='menuitemradio'], button[role='menuitemradio'], button[role='menuitem'], button[mat-menu-item], button.mat-mdc-menu-item, [role='menuitemradio'], [role='menuitem']";
    const MODEL_PICKER_EXTENDED_TEXT_MATCH = MODEL_PICKER_OPTION_TARGETS.extended.textMatch;
    const MODEL_PICKER_TARGET_DISCOVERY_TIMEOUT_MS = 600;
    const MODEL_PICKER_SUBMENU_EXTENDED_TIMEOUT_MS = 600;
    const MODEL_PICKER_FAST_WAIT_INTERVAL_MS = 60;

    function isGeminiThinkingLevelSubmenuTrigger(rawText, element) {
        const text = getGeminiUiElementText(element) || rawText;
        if (geminiMenuTextMatches(text, "Thinking level", element)) return true;
        if (!geminiMenuTextMatches(text, "Thinking", element)) return false;

        let node = element;
        let guard = 0;
        while (node && node.nodeType === 1 && guard < 4) {
            const hasPopup = String(node.getAttribute?.("aria-haspopup") || "").trim().toLowerCase();
            if (hasPopup === "menu" || hasPopup === "true") return true;
            node = node.parentElement || null;
            guard += 1;
        }
        return false;
    }

    function inferModelKeyFromSelectorSpec(selectorSpec) {
        const fromString = (value) => {
            const token = normalizeModelToken(value);
            if (!token) return "";
            return inferModelKeyFromText(token);
        };

        if (typeof selectorSpec === "string") return fromString(selectorSpec);
        if (Array.isArray(selectorSpec)) {
            for (const item of selectorSpec) {
                const found = inferModelKeyFromSelectorSpec(item);
                if (found) return found;
            }
            return "";
        }
        if (selectorSpec && typeof selectorSpec === "object") {
            for (const key of ["textMatch", "keyword", "id", "name", "label"]) {
                if (selectorSpec[key] !== undefined && selectorSpec[key] !== null) {
                    const found = inferModelKeyFromSelectorSpec(selectorSpec[key]);
                    if (found) return found;
                }
            }
            if (selectorSpec.selector) {
                const found = inferModelKeyFromSelectorSpec(selectorSpec.selector);
                if (found) return found;
            }
            if (selectorSpec.selectors) {
                const found = inferModelKeyFromSelectorSpec(selectorSpec.selectors);
                if (found) return found;
            }
            if (selectorSpec.fallback) {
                const found = inferModelKeyFromSelectorSpec(selectorSpec.fallback);
                if (found) return found;
            }
            return "";
        }
        return "";
    }

    function getTargetModelKey(shortcut) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const fromSelector = inferModelKeyFromSelectorSpec(menu.selector);
        if (fromSelector) return fromSelector;

        const candidates = [];
        const pushCandidate = (value) => {
            if (Array.isArray(value)) {
                for (const item of value) pushCandidate(item);
                return;
            }
            if (value instanceof RegExp || typeof value === "function") return;
            if (value && typeof value === "object") {
                for (const key of ["preferred", "primary", "first", "fallback", "any", "values", "textMatch", "match", "keyword", "id", "name", "label"]) {
                    pushCandidate(value[key]);
                }
                return;
            }
            const token = String(value ?? "").trim();
            if (token) candidates.push(token);
        };

        pushCandidate(menu.id);
        pushCandidate(menu.keyword);
        pushCandidate(menu.textMatch);
        pushCandidate(menu.name);
        pushCandidate(menu.label);
        if (Array.isArray(menu.path) && menu.path.length) candidates.push(menu.path[menu.path.length - 1]);
        pushCandidate(rawMenu);
        pushCandidate(shortcut?.name);

        for (const text of candidates) {
            const found = inferModelKeyFromText(text);
            if (found) return found;
        }
        return "";
    }

    function describeSelectorSpec(value) {
        if (typeof value === "string") {
            const trimmed = value.trim();
            return { provided: !!trimmed, hasLiteral: !!trimmed };
        }
        if (Array.isArray(value)) {
            return {
                provided: value.some(item => describeSelectorSpec(item).provided),
                hasLiteral: value.some(item => describeSelectorSpec(item).hasLiteral)
            };
        }
        if (value && typeof value === "object") {
            const hasLiteral = (
                (typeof value.selector === "string" && !!value.selector.trim()) ||
                (typeof value.fallback === "string" && !!value.fallback.trim()) ||
                (Array.isArray(value.selectors) && value.selectors.some(item => describeSelectorSpec(item).hasLiteral))
            );
            return { provided: true, hasLiteral };
        }
        return { provided: false, hasLiteral: false };
    }

    function getGeminiMenuActionSpec(shortcut, { menuController, defaultItemSelector, resolveMenuTarget = null, createMenuTargetMatcher = null, actionName = "" } = {}) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = (menu.waitForItem !== undefined) ? !!menu.waitForItem : true;
        const allowFirstItem = !!menu.allowFirstItem;

        const hasMenuId = menu.id !== undefined && menu.id !== null && String(menu.id).trim();
        const menuTarget = (hasMenuId && typeof resolveMenuTarget === "function")
            ? resolveMenuTarget(menu.id)
            : null;
        if (hasMenuId && typeof resolveMenuTarget === "function" && !menuTarget) {
            console.warn(`[Gemini Shortcut] ${actionName || "geminiMenu"}: unknown menu.id "${String(menu.id).trim()}"; falling back to textMatch / keyword if provided.`);
        }

        const rawTextMatch = (menu.keyword !== undefined) ? menu.keyword : menu.textMatch;
        const path = Array.isArray(menu.path) ? menu.path : null;
        const pathParts = path && path.length ? path.map(normalizeMenuToken).filter(Boolean) : [];
        const pathLast = pathParts.length ? pathParts[pathParts.length - 1] : "";
        const inferredMenuTarget = menuTarget || (
            !hasMenuId && typeof resolveMenuTarget === "function"
                ? resolveMenuTarget(typeof rawTextMatch === "string" ? rawTextMatch : pathLast)
                : null
        );
        const isConversationDeleteTarget = !!(
            inferredMenuTarget?.id === "delete" &&
            String(actionName || "").startsWith("conversationMenu")
        );
        const extraIconNames = normalizeGeminiToolIconNames(
            menu.iconNames !== undefined
                ? menu.iconNames
                : (menu.iconName !== undefined ? menu.iconName : (menu.fonticon ?? menu.fontIcon))
        );
        const canonicalMatch = (typeof createMenuTargetMatcher === "function")
            ? createMenuTargetMatcher(inferredMenuTarget, extraIconNames)
            : null;
        let textMatch = combineGeminiMenuTextMatches(canonicalMatch, isConversationDeleteTarget ? null : rawTextMatch);

        const openSubmenus = [];
        if (Array.isArray(menu.openSubmenus)) openSubmenus.push(...menu.openSubmenus);
        if (
            String(actionName || "") === "toolsDrawer" &&
            inferredMenuTarget?.id &&
            GEMINI_TOOLS_SUBMENU_TARGET_IDS.includes(inferredMenuTarget.id)
        ) {
            openSubmenus.push("More tools");
        }

        if (pathParts.length) {
            if ((textMatch === undefined || textMatch === null || textMatch === "") && pathLast) textMatch = pathLast;
            for (const label of pathParts.slice(0, -1)) openSubmenus.push(label);
        }

        const normalizedOpenSubmenus = Array.from(new Set(openSubmenus.map(normalizeMenuKey).filter(Boolean)));

        const action = normalizeMenuAction(menu.action);
        const submenuKey = normalizeMenuKey(menu.submenuKey || (normalizedOpenSubmenus[0] || ""));

        const rawSelector = menu.selector;
        const { provided: selectorProvided, hasLiteral: selectorHasLiteral } = describeSelectorSpec(rawSelector);

        const selector = selectorProvided
            ? ((typeof rawSelector === "string") ? rawSelector.trim() : rawSelector)
            : defaultItemSelector;

        const selectorMaybeEmpty = selectorProvided && !selectorHasLiteral && action !== "open" && action !== "submenu";

        return {
            menu: menuController,
            defaultItemSelector,
            action,
            selector,
            selectorProvided,
            selectorMaybeEmpty,
            textMatch,
            fallbackToFirst,
            waitForItem,
            allowFirstItem,
            openSubmenus: normalizedOpenSubmenus,
            submenuKey
        };
    }

    function hasValidTextMatch(textMatch) {
        if (typeof textMatch === "string") return !!textMatch.trim();
        if (textMatch instanceof RegExp) return true;
        if (typeof textMatch === "function") return true;
        if (Array.isArray(textMatch)) return textMatch.some(v => hasValidTextMatch(v));
        if (isStructuredGeminiTextMatchSpec(textMatch)) return getGeminiTextMatchPriorityGroups(textMatch).length > 0;
        return false;
    }

    function ensureMenuTarget(spec, actionName) {
        if (spec.allowFirstItem || hasValidTextMatch(spec.textMatch) || spec.selectorProvided) return true;
        console.warn(`[Gemini Shortcut] ${actionName || "geminiMenu"}: missing menu target; set data.menu = { id: "canvas" } (or data.menu.textMatch / data.menu.keyword / data.menu.path), or set data.textMatch / data.keyword / data.path, or set data.menu.allowFirstItem=true (or data.allowFirstItem=true) to click the first item.`);
        return false;
    }

    async function runMenuSelection(spec, engine, mode, actionName) {
        const common = {
            textMatch: spec.textMatch,
            fallbackToFirst: spec.fallbackToFirst,
            waitForItem: spec.waitForItem
        };

        const run = (selector) => {
            if (mode === "click") {
                return spec.menu.clickInOpenMenus({ engine }, { selector, ...common });
            }
            return spec.menu.oneStepClick(
                { engine },
                { selector, openSubmenus: spec.openSubmenus, ...common }
            );
        };

        let ok = await run(spec.selector);
        if (ok || !spec.selectorMaybeEmpty || !hasValidTextMatch(spec.textMatch)) return ok;

        console.warn(`[Gemini Shortcut] ${actionName || "geminiMenu"}: menu.selector resolved to empty; fallback to default item selector.`);
        ok = await run(spec.defaultItemSelector);
        return ok;
    }

    function createGeminiMenuAction({ actionName, menuController, defaultItemSelector, resolveMenuTarget = null, createMenuTargetMatcher = null } = {}) {
        return async function geminiMenuAction({ shortcut, engine }) {
            const spec = getGeminiMenuActionSpec(shortcut, {
                menuController,
                defaultItemSelector,
                resolveMenuTarget,
                createMenuTargetMatcher,
                actionName
            });
            if (!spec?.menu) return false;

            switch (spec.action) {
                case "open": {
                    return await spec.menu.ensureOpen({ engine });
                }
                case "submenu": {
                    if (!spec.submenuKey) return false;
                    return await spec.menu.ensureSubmenuOpen({ engine }, spec.submenuKey);
                }
                case "click": {
                    if (!ensureMenuTarget(spec, actionName)) return false;
                    return await runMenuSelection(spec, engine, "click", actionName);
                }
                default: {
                    if (!ensureMenuTarget(spec, actionName)) return false;
                    return await runMenuSelection(spec, engine, "oneStep", actionName);
                }
            }
        };
    }

    const toolsDrawerMenuAction = createGeminiMenuAction({
        actionName: "toolsDrawer",
        menuController: toolsDrawerMenu,
        defaultItemSelector: TOOLS_DRAWER_ITEM_SELECTOR,
        resolveMenuTarget: resolveGeminiToolTarget,
        createMenuTargetMatcher: createGeminiToolTargetMatcher
    });

    function textLooksLikeDelete(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (!token) return false;
        return token.includes("delete") || token.includes("删除");
    }

    function getConversationMenuShortcutTexts(shortcut) {
        const data = (shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data)) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const texts = [];
        if (typeof shortcut?.name === "string") texts.push(shortcut.name);
        if (menu?.id !== undefined && menu?.id !== null) texts.push(menu.id);
        if (typeof menu?.keyword === "string") texts.push(menu.keyword);
        if (typeof menu?.textMatch === "string") texts.push(menu.textMatch);
        if (typeof rawMenu === "string") texts.push(rawMenu);

        if (Array.isArray(menu?.path) && menu.path.length) {
            texts.push(menu.path[menu.path.length - 1]);
        }
        if (Array.isArray(data?.path) && data.path.length) {
            texts.push(data.path[data.path.length - 1]);
        }

        return texts
            .map(value => String(value ?? "").trim())
            .filter(Boolean);
    }

    function shortcutLooksLikeDelete(shortcut) {
        return getConversationMenuShortcutTexts(shortcut).some(textLooksLikeDelete);
    }

    function shortcutShouldPreferTopBarConversationMenu(shortcut) {
        return getConversationMenuShortcutTexts(shortcut).some((text) => {
            const token = normalizeMenuKey(text);
            return token === "pin" || token === "delete";
        });
    }

    function getConversationMenuShortcutLabel(shortcut) {
        const first = getConversationMenuShortcutTexts(shortcut)[0] || "";
        if (first) return first;
        const fallback = String(shortcut?.customAction || "").trim();
        return fallback || "conversationMenu";
    }

    let deleteConfirmEnterBridgeCleanup = null;

    function isUsableDeleteConfirmButton(button) {
        if (!button) return false;
        const ariaDisabled = String(button.getAttribute?.("aria-disabled") || "").trim().toLowerCase();
        if (button.disabled || ariaDisabled === "true") return false;
        return isElementVisible(button);
    }

    function findDeleteConfirmDialog() {
        let candidates = [];
        try {
            candidates = Array.from(document.querySelectorAll("mat-dialog-container, [role='dialog'], .cdk-overlay-pane"));
        } catch {
            return null;
        }

        for (const candidate of candidates) {
            if (!candidate || !isElementVisible(candidate)) continue;

            const dialog = candidate.matches?.("mat-dialog-container, [role='dialog']")
                ? candidate
                : (candidate.querySelector?.("mat-dialog-container, [role='dialog']") || null);
            const root = dialog || candidate;

            let confirmBtn = null;
            try {
                confirmBtn = root.querySelector?.("button[data-test-id='confirm-button']") || null;
            } catch {
                confirmBtn = null;
            }
            if (isUsableDeleteConfirmButton(confirmBtn)) {
                const ariaLabel = String(root.getAttribute?.("aria-label") || "");
                const titleText = String(root.querySelector?.("[data-test-id='message-dialog-title']")?.textContent || "");
                const dialogText = String(root.textContent || "");
                if (textLooksLikeDelete(ariaLabel) || textLooksLikeDelete(titleText) || textLooksLikeDelete(dialogText)) {
                    return { dialog: root, confirmBtn };
                }
            }

            let buttons = [];
            try { buttons = Array.from(root.querySelectorAll("button")); } catch { buttons = []; }
            for (const btn of buttons) {
                const buttonText = `${btn.textContent || ""} ${btn.getAttribute?.("aria-label") || ""}`;
                if (!isUsableDeleteConfirmButton(btn) || !textLooksLikeDelete(buttonText)) continue;

                const ariaLabel = String(root.getAttribute?.("aria-label") || "");
                const titleText = String(root.querySelector?.("[data-test-id='message-dialog-title']")?.textContent || "");
                const dialogText = String(root.textContent || "");
                if (textLooksLikeDelete(ariaLabel) || textLooksLikeDelete(titleText) || textLooksLikeDelete(dialogText)) {
                    return { dialog: root, confirmBtn: btn };
                }
            }
        }
        return null;
    }

    function focusDeleteConfirmButton(confirmBtn) {
        if (!confirmBtn) return false;
        try { confirmBtn.focus({ preventScroll: true }); } catch { }
        try { confirmBtn.focus(); } catch { }
        return true;
    }

    function isPlainEnterKeyEvent(event) {
        if (!event) return false;
        const key = String(event.key || "");
        const code = String(event.code || "");
        if (key !== "Enter" && key !== "NumpadEnter" && code !== "Enter" && code !== "NumpadEnter") return false;
        if (event.isComposing || event.keyCode === 229) return false;
        return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    }

    function clearDeleteConfirmEnterBridge() {
        const cleanup = deleteConfirmEnterBridgeCleanup;
        if (typeof cleanup === "function") cleanup();
    }

    function getVisibleConversationMenuPanels() {
        let panels = [];
        try { panels = Array.from(document.querySelectorAll(CONVERSATION_MENU_PANEL_SELECTOR)); } catch { return []; }
        return panels.filter(panel => isGeminiConversationMenuRoot(panel));
    }

    function isConversationMenuClosingOrOpen(ctx = {}) {
        try { if (topBarConversationMenu.isOpen(ctx)) return true; } catch { }
        try { if (conversationMenu.isOpen(ctx)) return true; } catch { }
        return getVisibleConversationMenuPanels().length > 0;
    }

    async function waitForConversationMenusSettled({ engine = null, timeoutMs = 900, intervalMs = 40, settleMs = 80 } = {}) {
        const timeout = Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(20, Number(intervalMs) || 40);
        const settle = Math.max(0, Number(settleMs) || 0);
        const deadline = Date.now() + timeout;
        const ctx = { engine };
        let closedSince = 0;

        while (Date.now() <= deadline) {
            if (!isConversationMenuClosingOrOpen(ctx)) {
                if (!closedSince) closedSince = Date.now();
                if (Date.now() - closedSince >= settle) return true;
            } else {
                closedSince = 0;
            }
            await sleep(interval);
        }

        return !isConversationMenuClosingOrOpen(ctx);
    }

    function armDeleteConfirmEnterBridge({ dialog, confirmBtn }, { engine = null, timeoutMs = 30000, closeCheckIntervalMs = 250 } = {}) {
        if (!dialog || !confirmBtn) return false;
        clearDeleteConfirmEnterBridge();

        const doc = dialog.ownerDocument || document;
        const win = doc.defaultView || window;
        let cleaned = false;
        let timeoutId = 0;
        let closeCheckId = 0;
        let handlingEnter = false;

        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            try { win?.removeEventListener?.("keydown", onKeydown, true); } catch { }
            try { doc.removeEventListener("keydown", onKeydown, true); } catch { }
            try { clearTimeout(timeoutId); } catch { }
            try { clearInterval(closeCheckId); } catch { }
            if (deleteConfirmEnterBridgeCleanup === cleanup) deleteConfirmEnterBridgeCleanup = null;
        };

        const onKeydown = (event) => {
            if (!isPlainEnterKeyEvent(event)) return;

            if (handlingEnter) return;

            const latest = findDeleteConfirmDialog();
            const candidate = latest?.confirmBtn || confirmBtn;
            if (!latest?.dialog && !isUsableDeleteConfirmButton(candidate)) {
                cleanup();
                return;
            }

            try { event.preventDefault(); } catch { }
            try { event.stopPropagation(); } catch { }
            try { event.stopImmediatePropagation?.(); } catch { }

            handlingEnter = true;
            cleanup();
            void (async () => {
                await waitForConversationMenusSettled({
                    engine,
                    timeoutMs: 650,
                    intervalMs: 35,
                    settleMs: 35
                });

                const settledLatest = findDeleteConfirmDialog();
                const target = isUsableDeleteConfirmButton(settledLatest?.confirmBtn)
                    ? settledLatest.confirmBtn
                    : candidate;
                if (!isUsableDeleteConfirmButton(target)) return;
                focusDeleteConfirmButton(target);
                simulateGeminiMenuClick(target);
            })();
        };

        deleteConfirmEnterBridgeCleanup = cleanup;
        try {
            win?.addEventListener?.("keydown", onKeydown, true);
            doc.addEventListener("keydown", onKeydown, true);
        } catch {
            cleanup();
            return false;
        }
        void (async () => {
            await waitForConversationMenusSettled({
                engine,
                timeoutMs: 900,
                intervalMs: 40,
                settleMs: 80
            });
            if (cleaned) return;
            const latest = findDeleteConfirmDialog();
            const target = isUsableDeleteConfirmButton(latest?.confirmBtn)
                ? latest.confirmBtn
                : confirmBtn;
            if (isUsableDeleteConfirmButton(target)) focusDeleteConfirmButton(target);
        })();

        const timeout = Math.max(1000, Number(timeoutMs) || 30000);
        const closeCheckInterval = Math.max(100, Number(closeCheckIntervalMs) || 250);
        timeoutId = setTimeout(cleanup, timeout);
        closeCheckId = setInterval(() => {
            const latest = findDeleteConfirmDialog();
            if (!latest?.dialog) cleanup();
        }, closeCheckInterval);
        return true;
    }

    async function prepareDeleteConfirmEnterBridge({ engine = null, timeoutMs = 2500, intervalMs = 80 } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(30, Number(intervalMs) || 80);
        while (Date.now() <= deadline) {
            const target = findDeleteConfirmDialog();
            if (target?.confirmBtn) return armDeleteConfirmEnterBridge(target, { engine });
            await sleep(interval);
        }
        return false;
    }

    const topBarConversationMenuActionBase = createGeminiMenuAction({
        actionName: "conversationMenuTopBar",
        menuController: topBarConversationMenu,
        defaultItemSelector: CONVERSATION_ITEM_SELECTOR,
        resolveMenuTarget: resolveGeminiConversationMenuTarget,
        createMenuTargetMatcher: createGeminiConversationMenuTargetMatcher
    });

    const conversationMenuActionBase = createGeminiMenuAction({
        actionName: "conversationMenu",
        menuController: conversationMenu,
        defaultItemSelector: CONVERSATION_ITEM_SELECTOR,
        resolveMenuTarget: resolveGeminiConversationMenuTarget,
        createMenuTargetMatcher: createGeminiConversationMenuTargetMatcher
    });

    const conversationMenuAction = async ({ shortcut, engine }) => {
        let ok = false;
        if (shortcutShouldPreferTopBarConversationMenu(shortcut)) {
            ok = await topBarConversationMenuActionBase({ shortcut, engine });
            if (ok) {
                console.info(`${LOG_TAG} conversationMenu: top bar 命中 ${getConversationMenuShortcutLabel(shortcut)}。`);
            } else {
                console.info(`${LOG_TAG} conversationMenu: top bar 不可用，已回退侧边栏当前话题处理 ${getConversationMenuShortcutLabel(shortcut)}。`);
                ok = await conversationMenuActionBase({ shortcut, engine });
            }
        }

        if (!ok) {
            ok = await conversationMenuActionBase({ shortcut, engine });
        }
        if (!ok) return false;
        if (!shortcutLooksLikeDelete(shortcut)) return true;
        await prepareDeleteConfirmEnterBridge({ engine });
        return true;
    };

    const modelPickerMenuAction = createGeminiMenuAction({
        actionName: "modelPicker",
        menuController: modelPickerMenu,
        defaultItemSelector: MODEL_PICKER_ITEM_SELECTOR
    });

    async function clickGeminiModelPickerItemFast({ engine, textMatch, timeoutMs = 0, intervalMs = MODEL_PICKER_FAST_WAIT_INTERVAL_MS } = {}) {
        const ctx = { engine };
        const timeout = Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(20, Number(intervalMs) || MODEL_PICKER_FAST_WAIT_INTERVAL_MS);
        const deadline = Date.now() + timeout;

        while (true) {
            if (await modelPickerMenu.clickInOpenMenus(ctx, {
                selector: MODEL_PICKER_ITEM_SELECTOR,
                textMatch,
                waitForItem: false
            })) {
                return true;
            }
            if (Date.now() >= deadline) return false;
            await sleep(interval);
        }
    }

    async function clickGeminiExtendedModelInOpenMenus({ engine, timeoutMs = 0 } = {}) {
        return await clickGeminiModelPickerItemFast({
            engine,
            textMatch: MODEL_PICKER_EXTENDED_TEXT_MATCH,
            timeoutMs
        });
    }

    async function clickGeminiExtendedOrThinkingLevelInOpenMenus({ engine, timeoutMs = 0, intervalMs = MODEL_PICKER_FAST_WAIT_INTERVAL_MS } = {}) {
        const timeout = Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(20, Number(intervalMs) || MODEL_PICKER_FAST_WAIT_INTERVAL_MS);
        const deadline = Date.now() + timeout;

        while (true) {
            if (await clickGeminiExtendedModelInOpenMenus({ engine })) return "extended";
            if (await clickGeminiModelPickerItemFast({
                engine,
                textMatch: isGeminiThinkingLevelSubmenuTrigger
            })) {
                return "thinkingLevel";
            }
            if (Date.now() >= deadline) return "";
            await sleep(interval);
        }
    }

    async function clickGeminiExtendedModelViaThinkingLevel({ engine, timeoutMs = MODEL_PICKER_TARGET_DISCOVERY_TIMEOUT_MS } = {}) {
        const target = await clickGeminiExtendedOrThinkingLevelInOpenMenus({ engine, timeoutMs });
        if (target === "extended") return true;
        if (target !== "thinkingLevel") return false;

        return await clickGeminiExtendedModelInOpenMenus({
            engine,
            timeoutMs: MODEL_PICKER_SUBMENU_EXTENDED_TIMEOUT_MS
        });
    }

    async function extendedModelPickerAction({ engine }) {
        if (getCurrentModelKey() === "extended") return true;
        if (await clickGeminiExtendedModelInOpenMenus({ engine })) return true;

        const ctx = { engine };
        if (!await modelPickerMenu.ensureOpen(ctx)) return false;
        return await clickGeminiExtendedModelViaThinkingLevel({ engine });
    }

    async function modelPickerAction({ shortcut, engine }) {
        const target = getTargetModelKey(shortcut);
        const current = getCurrentModelKey();
        if (target && current && target === current) return true;
        if (target === "extended") return await extendedModelPickerAction({ shortcut, engine });
        return await modelPickerMenuAction({ shortcut, engine });
    }

    function createGeminiQuickInputAdapter({ idPrefix = "gemini", engine = null } = {}) {
        const QuickInput = ShortcutTemplate?.quickInput;
        const dom = QuickInput?.dom;

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        function qiText(key, vars = {}, fallback = "") {
            return engine?.i18n?.t?.(`quickInput.${key}`, vars, fallback) || fallback;
        }
        function getNativeNewChatLabel() {
            return qiText("nativeNewChatLabel", {}, `${GEMINI_NATIVE_NEW_CHAT_HOTKEY} (native)`);
        }
        function getNotebookNewChatLabel() {
            return qiText("notebookNewChatLabel", {}, "Notebook home jump");
        }

        const focusComposer = dom?.focusComposer;
        const simulateKeystroke = dom?.simulateKeystroke;
        const isElementVisible = dom?.isElementVisible;
        const dispatchPasteEvent = dom?.dispatchPasteEvent;
        const dispatchBeforeInputFromPaste = dom?.dispatchBeforeInputFromPaste;
        const dispatchInputFromPaste = dom?.dispatchInputFromPaste;
        const dispatchDragEvent = dom?.dispatchDragEvent;
        const collectFileInputs = dom?.collectFileInputs;
        const collectFileInputsFromOpenShadows = dom?.collectFileInputsFromOpenShadows;
        const trySetFileInputFiles = dom?.trySetFileInputFiles;
        const waitForObservedState = dom?.waitForObservedState;
        const genericSetInputValue = typeof dom?.setInputValue === "function" ? dom.setInputValue : null;
        const genericClearInputValue = typeof dom?.clearInputValue === "function" ? dom.clearInputValue : null;
        const genericGetComposerText = typeof dom?.getComposerText === "function" ? dom.getComposerText : fallbackGetComposerText;
        const genericNormalizeComposerText = typeof dom?.normalizeComposerText === "function" ? dom.normalizeComposerText : fallbackNormalizeComposerText;

        function fallbackNormalizeComposerText(value, { trimTrailingEditorNewlines = false } = {}) {
            let text = String(value ?? "");
            text = text
                .replace(/\r\n?/g, "\n")
                .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "");
            if (trimTrailingEditorNewlines) {
                text = text.replace(/\n+$/g, "");
            }
            return text;
        }

        function fallbackGetComposerText(el) {
            if (!el) return "";
            const tag = String(el.tagName || "").toUpperCase();
            if (tag === "TEXTAREA" || tag === "INPUT") {
                try { return String(el.value ?? ""); } catch { }
            }
            if (el.isContentEditable || el.contentEditable === "true") {
                try { return String(el.innerText || el.textContent || ""); } catch { }
            }
            try { return String(el.textContent || ""); } catch { return ""; }
        }

        if (
            typeof focusComposer !== "function" ||
            typeof simulateKeystroke !== "function" ||
            typeof isElementVisible !== "function" ||
            typeof dispatchPasteEvent !== "function" ||
            typeof dispatchBeforeInputFromPaste !== "function" ||
            typeof dispatchInputFromPaste !== "function" ||
            typeof dispatchDragEvent !== "function" ||
            typeof collectFileInputs !== "function" ||
            typeof collectFileInputsFromOpenShadows !== "function" ||
            typeof trySetFileInputFiles !== "function" ||
            typeof waitForObservedState !== "function"
        ) {
            return null;
        }

        const overlayId = `${String(idPrefix || "").trim() || "gemini"}-quick-input-overlay`;
        const isInsideOverlayTree = typeof dom?.isInsideOverlayTree === "function"
            ? dom.isInsideOverlayTree
            : (target, targetOverlayId) => {
                if (!target || !targetOverlayId) return false;
                let node = target;
                while (node) {
                    if (node.nodeType === 1) {
                        if (node.id === targetOverlayId) return true;
                        try {
                            if (typeof node.closest === "function" && node.closest(`#${targetOverlayId}`)) return true;
                        } catch {}
                    }
                    let next = null;
                    try { next = node.parentNode || null; } catch {}
                    if (!next && typeof node.getRootNode === "function") {
                        try {
                            const root = node.getRootNode();
                            next = root?.host || null;
                        } catch {}
                    }
                    if (!next || next === node) break;
                    node = next;
                }
                return false;
            };

        function isInsideQuickInputOverlay(el) {
            return isInsideOverlayTree(el, overlayId);
        }

        function getRuntimeNow(runtime = null) {
            if (runtime && typeof runtime.now === "function") {
                try { return Number(runtime.now()) || Date.now(); } catch { }
            }
            return Date.now();
        }

        async function runtimeWaitIfPaused(runtime = null, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return false;
            if (runtime && typeof runtime.waitIfPaused === "function") {
                try {
                    const result = await runtime.waitIfPaused();
                    if (result === false) return false;
                } catch {
                    return false;
                }
            }
            return !(cancelFn && cancelFn());
        }

        async function runtimeSleep(runtime = null, ms = 0, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (!(await runtimeWaitIfPaused(runtime, { shouldCancel: cancelFn }))) return false;
            if (runtime && typeof runtime.sleep === "function") {
                try {
                    const result = await runtime.sleep(ms);
                    return result !== false && !(cancelFn && cancelFn());
                } catch {
                    return false;
                }
            }
            await sleep(ms);
            return runtimeWaitIfPaused(runtime, { shouldCancel: cancelFn });
        }

        const GEMINI_ORIGIN = "https://gemini.google.com";
        const GEMINI_ROOT_URL = `${GEMINI_ORIGIN}/`;
        const GEMINI_APP_RESET_URL = `${GEMINI_ORIGIN}/app`;
        const GEMINI_NOTEBOOK_ID_RE = /^[A-Za-z0-9-]+$/;
        const GEMINI_NOTEBOOK_TARGET_TTL_MS = 330000;
        const GEMINI_NOTEBOOK_NEW_CHAT_TEXT_RE = /(?:^|\b)(?:new|start)\s+(?:chat|conversation)(?:\b|$)|新(?:建)?(?:聊天|对话)|开始(?:聊天|对话)/i;
        const GEMINI_NOTEBOOK_NEW_CHAT_RETRY_POLICY = Object.freeze({
            maxNewChatRetries: 3,
            newChatReadyTimeoutMs: 45000,
            newChatRetryDelayMs: 2000,
            newChatReadyIntervalMs: 160,
            newChatReadySettleMs: 300
        });
        let pendingGeminiNotebookTarget = null;
        let pendingGeminiNotebookTargetAt = 0;
        let sessionGeminiNotebookTarget = null;
        let armedGeminiNotebookTarget = null;
        let observedGeminiQuickInputOverlayEl = null;
        let geminiQuickInputOverlayObserver = null;

        function getCurrentGeminiUrl() {
            try { return String(window.location.href || ""); } catch { return ""; }
        }

        function createGeminiAppTarget(url = getCurrentGeminiUrl()) {
            return {
                kind: "app",
                ready: true,
                targetUrl: GEMINI_ROOT_URL,
                url: String(url || "")
            };
        }

        function normalizeGeminiNotebookPath(pathname = "") {
            const path = String(pathname || "").replace(/\/+$/g, "");
            return path || "/";
        }

        function getGeminiNotebookTargetUrl(notebookId) {
            return `${GEMINI_ORIGIN}/notebook/${notebookId}`;
        }

        function parseGeminiQuickInputTarget(currentUrl = getCurrentGeminiUrl()) {
            const rawUrl = String(currentUrl || "").trim();
            if (!rawUrl) return null;
            let url = null;
            try {
                url = new URL(rawUrl, GEMINI_ROOT_URL);
            } catch {
                return null;
            }
            if (url.origin !== GEMINI_ORIGIN) return null;

            const segments = url.pathname.split("/").filter(Boolean);
            const notebookId = String(segments[1] || "").trim();
            if (segments[0] === "notebook" && GEMINI_NOTEBOOK_ID_RE.test(notebookId)) {
                const targetUrl = getGeminiNotebookTargetUrl(notebookId);
                const targetPath = normalizeGeminiNotebookPath(new URL(targetUrl).pathname);
                const currentPath = normalizeGeminiNotebookPath(url.pathname);
                return {
                    kind: "notebook",
                    ready: currentPath === targetPath,
                    notebookId,
                    targetUrl,
                    url: url.href
                };
            }

            return createGeminiAppTarget(url.href);
        }

        function cloneGeminiNotebookTarget(target) {
            if (!target || target.kind !== "notebook" || !target.notebookId || !target.targetUrl) return null;
            return { ...target };
        }

        function getGeminiQuickInputOverlayElement() {
            try {
                return document.getElementById(overlayId) || null;
            } catch {
                return null;
            }
        }

        function getPendingGeminiNotebookTarget() {
            if (!pendingGeminiNotebookTarget) return null;
            const ageMs = Date.now() - pendingGeminiNotebookTargetAt;
            if (ageMs >= 0 && ageMs <= GEMINI_NOTEBOOK_TARGET_TTL_MS) {
                return pendingGeminiNotebookTarget;
            }
            pendingGeminiNotebookTarget = null;
            pendingGeminiNotebookTargetAt = 0;
            return null;
        }

        function rememberPendingGeminiNotebookTarget(target) {
            const nextTarget = cloneGeminiNotebookTarget(target);
            if (!nextTarget) return;
            pendingGeminiNotebookTarget = nextTarget;
            pendingGeminiNotebookTargetAt = Date.now();
        }

        function clearPendingGeminiNotebookTarget(target = null) {
            if (target && pendingGeminiNotebookTarget && !isSameGeminiQuickInputTarget(pendingGeminiNotebookTarget, target)) return;
            pendingGeminiNotebookTarget = null;
            pendingGeminiNotebookTargetAt = 0;
        }

        function rememberSessionGeminiNotebookTarget(target) {
            const nextTarget = cloneGeminiNotebookTarget(target);
            if (!nextTarget) return;
            sessionGeminiNotebookTarget = nextTarget;
            rememberPendingGeminiNotebookTarget(nextTarget);
        }

        function clearSessionGeminiNotebookTarget({ clearPending = false } = {}) {
            sessionGeminiNotebookTarget = null;
            clearGeminiNotebookArmed();
            if (clearPending) clearPendingGeminiNotebookTarget();
        }

        function handleGeminiQuickInputOverlayState(overlayEl = getGeminiQuickInputOverlayElement()) {
            const isOpen = !!(overlayEl && overlayEl.getAttribute?.("data-open") === "1");
            if (!isOpen) {
                clearSessionGeminiNotebookTarget({ clearPending: true });
                return false;
            }

            const currentTarget = parseGeminiQuickInputTarget();
            if (currentTarget?.kind === "notebook") {
                rememberSessionGeminiNotebookTarget(currentTarget);
            }
            return true;
        }

        function observeGeminiQuickInputOverlay(overlayEl) {
            if (observedGeminiQuickInputOverlayEl === overlayEl) return;
            try { geminiQuickInputOverlayObserver?.disconnect?.(); } catch { }
            observedGeminiQuickInputOverlayEl = overlayEl || null;
            geminiQuickInputOverlayObserver = null;
            if (!overlayEl || typeof MutationObserver !== "function") return;
            try {
                geminiQuickInputOverlayObserver = new MutationObserver(() => {
                    handleGeminiQuickInputOverlayState(overlayEl);
                });
                geminiQuickInputOverlayObserver.observe(overlayEl, {
                    attributes: true,
                    attributeFilter: ["data-open"]
                });
            } catch {
                geminiQuickInputOverlayObserver = null;
            }
        }

        function isGeminiQuickInputOverlayOpen() {
            const overlayEl = getGeminiQuickInputOverlayElement();
            observeGeminiQuickInputOverlay(overlayEl);
            return handleGeminiQuickInputOverlayState(overlayEl);
        }

        function getGeminiNewChatTriggerTarget() {
            const currentTarget = parseGeminiQuickInputTarget();
            const overlayOpen = isGeminiQuickInputOverlayOpen();
            if (currentTarget?.kind === "notebook") {
                if (overlayOpen) rememberSessionGeminiNotebookTarget(currentTarget);
                return currentTarget;
            }

            if (overlayOpen) {
                if (sessionGeminiNotebookTarget?.kind === "notebook") {
                    rememberPendingGeminiNotebookTarget(sessionGeminiNotebookTarget);
                    return sessionGeminiNotebookTarget;
                }

                const pendingTarget = getPendingGeminiNotebookTarget();
                if (pendingTarget?.kind === "notebook") {
                    rememberSessionGeminiNotebookTarget(pendingTarget);
                    return pendingTarget;
                }
            }

            return currentTarget || createGeminiAppTarget();
        }

        function getGeminiNewChatLabel() {
            const target = getGeminiNewChatTriggerTarget();
            return target?.kind === "notebook" ? getNotebookNewChatLabel() : getNativeNewChatLabel();
        }

        function getGeminiNewChatRetryPolicy() {
            const target = getGeminiNewChatTriggerTarget();
            return target?.kind === "notebook" ? GEMINI_NOTEBOOK_NEW_CHAT_RETRY_POLICY : null;
        }

        function isSameGeminiQuickInputTarget(currentTarget, expectedTarget) {
            if (!currentTarget || !expectedTarget) return false;
            if (currentTarget.kind !== expectedTarget.kind) return false;
            if (expectedTarget.kind === "notebook") {
                return currentTarget.notebookId === expectedTarget.notebookId;
            }
            return true;
        }

        function markGeminiNotebookArmed(target) {
            if (!target || target.kind !== "notebook" || !target.notebookId || !target.targetUrl) return;
            armedGeminiNotebookTarget = { ...target };
        }

        function clearGeminiNotebookArmed() {
            armedGeminiNotebookTarget = null;
        }

        function isGeminiNotebookArmed(target) {
            return !!(
                target?.kind === "notebook" &&
                armedGeminiNotebookTarget &&
                isSameGeminiQuickInputTarget(armedGeminiNotebookTarget, target)
            );
        }

        function navigateGeminiSpaToUrl(url) {
            const targetUrl = String(url || "").trim();
            if (!targetUrl) return false;
            try {
                const urlObj = new URL(targetUrl, GEMINI_ROOT_URL);
                if (urlObj.origin !== GEMINI_ORIGIN) return false;
                window.history.pushState({ url: urlObj.href }, document.title, urlObj.pathname + urlObj.search + urlObj.hash);
                window.dispatchEvent(new PopStateEvent("popstate", { state: { url: urlObj.href } }));
                return true;
            } catch {
                return false;
            }
        }

        function navigateGeminiSpaToTarget(target) {
            if (!target || typeof target.targetUrl !== "string" || !target.targetUrl) return false;
            return navigateGeminiSpaToUrl(target.targetUrl);
        }

        async function resetGeminiNotebookRouteToHome(target, { shouldCancel = null, runtime = null, intervalMs = 160 } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (!target || target.kind !== "notebook" || !target.notebookId || !target.targetUrl) return false;
            if (cancelFn && cancelFn()) return false;
            rememberPendingGeminiNotebookTarget(target);
            clearGeminiNotebookArmed();

            if (!navigateGeminiSpaToUrl(GEMINI_APP_RESET_URL)) return false;
            if (!(await runtimeSleep(runtime, Math.max(120, Number(intervalMs) || 0), { shouldCancel: cancelFn }))) return false;
            if (cancelFn && cancelFn()) return false;

            rememberPendingGeminiNotebookTarget(target);
            if (!navigateGeminiSpaToTarget(target)) return false;
            if (!(await runtimeSleep(runtime, Math.max(260, Number(intervalMs) || 0), { shouldCancel: cancelFn }))) return false;
            rememberPendingGeminiNotebookTarget(target);
            return !(cancelFn && cancelFn());
        }

        function buildGeminiTargetUrlMismatchMessage(currentUrl, { target = null, prefix = "" } = {}) {
            const expectedTarget = target || getGeminiNewChatTriggerTarget();
            const targetUrl = String(expectedTarget?.targetUrl || GEMINI_ROOT_URL);
            const base = qiText("rootUrlMismatch", {
                rootUrl: targetUrl,
                targetUrl,
                currentUrl: currentUrl || qiText("emptyUrl", {}, "(empty)")
            }, `Current URL must match ${targetUrl}; actual URL is ${currentUrl || "(empty)"}`);
            return prefix ? `${prefix}${base}` : base;
        }

        function buildGeminiNotebookNewPageMismatchMessage(currentUrl, { target = null, prefix = "" } = {}) {
            const expectedTarget = target || getGeminiNewChatTriggerTarget();
            const targetUrl = String(expectedTarget?.targetUrl || GEMINI_ROOT_URL);
            const base = qiText("notebookNewPageMismatch", {
                rootUrl: targetUrl,
                targetUrl,
                currentUrl: currentUrl || qiText("emptyUrl", {}, "(empty)")
            }, `Current Notebook is not a blank new-chat page. Target: ${targetUrl}; actual URL: ${currentUrl || "(empty)"}`);
            return prefix ? `${prefix}${base}` : base;
        }

        function buildGeminiNotebookNewChatButtonMissingMessage({ prefix = "" } = {}) {
            const base = qiText(
                "notebookNewChatButtonMissing",
                {},
                "No safe Notebook new-chat control was found, so Quick Input stopped to avoid writing into old context."
            );
            return prefix ? `${prefix}${base}` : base;
        }

        function buildGeminiNotebookHomeResetFailedMessage(currentUrl, { target = null, prefix = "" } = {}) {
            const expectedTarget = target || getGeminiNewChatTriggerTarget();
            const targetUrl = String(expectedTarget?.targetUrl || GEMINI_ROOT_URL);
            const base = qiText("notebookHomeResetFailed", {
                rootUrl: targetUrl,
                targetUrl,
                currentUrl: currentUrl || qiText("emptyUrl", {}, "(empty)")
            }, `Notebook home still was not a blank new-chat page after route reset. Target: ${targetUrl}; actual URL: ${currentUrl || "(empty)"}`);
            return prefix ? `${prefix}${base}` : base;
        }

        function findGeminiNotebookZeroStateElement(composerEl = null) {
            const selectors = [
                ".input-area-container.is-zero-state",
                "[data-node-type='input-area'].is-zero-state",
                ".input-area.is-zero-state"
            ];

            const scopes = [];
            const seen = new Set();
            const pushScope = (scope) => {
                if (!scope || seen.has(scope)) return;
                seen.add(scope);
                scopes.push(scope);
            };

            try { pushScope(composerEl?.closest?.(".input-area-container") || null); } catch { }
            try { pushScope(composerEl?.closest?.("[data-node-type='input-area']") || null); } catch { }
            try { pushScope(composerEl?.closest?.("input-area-v2") || null); } catch { }
            pushScope(document);

            for (const scope of scopes) {
                for (const selector of selectors) {
                    let nodes = [];
                    try {
                        if (scope.matches?.(selector)) nodes.push(scope);
                    } catch { }
                    try { nodes.push(...Array.from(scope.querySelectorAll?.(selector) || [])); } catch { }
                    for (const node of nodes) {
                        if (!node) continue;
                        if (isInsideQuickInputOverlay(node)) continue;
                        if (!isElementVisible(node)) continue;
                        return node;
                    }
                }
            }

            return null;
        }

        function getGeminiNotebookNewPageState(target = null) {
            const expectedTarget = target || getGeminiNewChatTriggerTarget();
            const currentUrl = getCurrentGeminiUrl();
            const currentTarget = parseGeminiQuickInputTarget(currentUrl);
            const matchesTarget = !!(
                expectedTarget?.kind === "notebook" &&
                currentTarget?.ready &&
                isSameGeminiQuickInputTarget(currentTarget, expectedTarget)
            );
            const composer = matchesTarget ? findGeminiComposerElement({ requireVisible: true }) : null;
            const composerText = composer ? normalizeGeminiCommittedText(getGeminiComposerPlainText(composer, { trimTrailingEditorNewlines: true })).trim() : "";
            const composerBlank = !!(composer && composerText.length === 0);
            const zeroState = !!(matchesTarget && findGeminiNotebookZeroStateElement(composer));

            return {
                ok: !!(matchesTarget && composer && composerBlank && zeroState),
                currentUrl,
                currentTarget,
                matchesTarget,
                composer,
                composerBlank,
                zeroState,
                targetUrl: expectedTarget?.targetUrl || GEMINI_ROOT_URL
            };
        }

        function getGeminiNotebookCandidateHref(el) {
            let node = el;
            for (let depth = 0; node && depth < 4; depth++) {
                const tag = String(node.tagName || "").toUpperCase();
                if (tag === "A") {
                    try { return String(node.getAttribute?.("href") || node.href || "").trim(); } catch { return ""; }
                }
                try { node = node.parentElement || null; } catch { node = null; }
            }
            return "";
        }

        function isSafeGeminiNotebookNewChatCandidate(el, target) {
            if (!el || target?.kind !== "notebook") return false;
            if (isInsideQuickInputOverlay(el)) return false;
            if (!isElementVisible(el)) return false;
            try {
                if (el.closest?.("bard-sidenav, side-navigation-content")) return false;
            } catch { }
            try {
                if (el.closest?.([
                    "user-query",
                    "user-query-content",
                    "model-response",
                    "message-content",
                    "[data-test-id*='user-query' i]",
                    "[data-test-id*='model-response' i]",
                    "[data-test-id*='response' i]",
                    "[data-test-id*='message' i]",
                    "[data-test-id*='query' i]"
                ].join(", "))) return false;
            } catch { }

            const rawText = String(
                el.getAttribute?.("aria-label") ||
                el.getAttribute?.("title") ||
                el.textContent ||
                ""
            );
            const text = rawText.replace(/\s+/g, " ").trim();
            const iconNames = getGeminiElementIconNames(el);
            const dataTestIds = getGeminiElementDataTestIds(el).join(" ");
            const looksLikeNewChat = GEMINI_NOTEBOOK_NEW_CHAT_TEXT_RE.test(text)
                || GEMINI_NOTEBOOK_NEW_CHAT_TEXT_RE.test(dataTestIds)
                || iconNames.includes("edit_square");
            if (!looksLikeNewChat) return false;
            if (/temporary|临时/i.test(text) || /temp-chat/i.test(dataTestIds)) return false;

            const href = getGeminiNotebookCandidateHref(el);
            if (!href) return true;
            try {
                const url = new URL(href, GEMINI_ROOT_URL);
                if (url.origin !== GEMINI_ORIGIN) return false;
                if (url.pathname === "/app" || url.pathname.startsWith("/app/")) return false;
                if (url.pathname === `/notebook/${target.notebookId}`) return true;
                return !url.pathname.startsWith("/app");
            } catch {
                return false;
            }
        }

        function scoreGeminiNotebookNewChatCandidate(el) {
            let score = 0;
            const rawText = String(
                el.getAttribute?.("aria-label") ||
                el.getAttribute?.("title") ||
                el.textContent ||
                ""
            );
            const text = rawText.replace(/\s+/g, " ").trim();
            if (GEMINI_NOTEBOOK_NEW_CHAT_TEXT_RE.test(text)) score += 80;
            const dataTestIds = getGeminiElementDataTestIds(el).join(" ");
            if (/notebook/i.test(dataTestIds)) score += 40;
            if (/new.*chat|chat.*new/i.test(dataTestIds)) score += 30;
            if (getGeminiElementIconNames(el).includes("edit_square")) score += 20;
            try { if (el.closest?.("[data-test-id*='notebook' i], [class*='notebook' i]")) score += 30; } catch { }
            try {
                const rect = el.getBoundingClientRect();
                score += Math.max(0, Math.min(20, rect.top / Math.max(1, window.innerHeight) * 20));
            } catch { }
            return score;
        }

        function findGeminiNotebookNewChatControl(target) {
            const selectors = [
                "button[aria-label*='New chat' i]",
                "a[aria-label*='New chat' i]",
                "[role='button'][aria-label*='New chat' i]",
                "button[aria-label*='新建聊天']",
                "button[aria-label*='新聊天']",
                "button[data-test-id*='new-chat' i]",
                "a[data-test-id*='new-chat' i]",
                "[role='button'][data-test-id*='new-chat' i]",
                "button",
                "a",
                "[role='button']"
            ];
            const candidates = [];
            const seen = new Set();
            for (const selector of selectors) {
                let nodes = [];
                try { nodes = Array.from(document.querySelectorAll(selector)); } catch { nodes = []; }
                for (const node of nodes) {
                    if (!node || seen.has(node)) continue;
                    seen.add(node);
                    if (isSafeGeminiNotebookNewChatCandidate(node, target)) candidates.push(node);
                }
            }
            candidates.sort((a, b) => scoreGeminiNotebookNewChatCandidate(b) - scoreGeminiNotebookNewChatCandidate(a));
            return candidates[0] || null;
        }

        function clickGeminiNotebookNewChatControl(target) {
            const control = findGeminiNotebookNewChatControl(target);
            if (!control) return false;
            try {
                if (TemplateUtils?.events?.simulateClick?.(control, { nativeFallback: true })) return true;
            } catch { }
            try {
                control.click?.();
                return true;
            } catch {
                return false;
            }
        }

        function getGeminiUrlGuardResult() {
            const expectedTarget = getGeminiNewChatTriggerTarget();
            const currentUrl = getCurrentGeminiUrl();
            if (expectedTarget?.kind !== "notebook") {
                return { ok: true, url: currentUrl, targetUrl: expectedTarget?.targetUrl || GEMINI_ROOT_URL };
            }

            const currentTarget = parseGeminiQuickInputTarget(currentUrl);
            if (currentTarget?.ready && isSameGeminiQuickInputTarget(currentTarget, expectedTarget)) {
                if (isGeminiNotebookArmed(expectedTarget)) {
                    return { ok: true, url: currentUrl, targetUrl: expectedTarget.targetUrl };
                }
                const newPageState = getGeminiNotebookNewPageState(expectedTarget);
                if (newPageState.ok) {
                    markGeminiNotebookArmed(expectedTarget);
                    return { ok: true, url: currentUrl, targetUrl: expectedTarget.targetUrl };
                }
                clearGeminiNotebookArmed();
                return {
                    ok: false,
                    url: currentUrl,
                    targetUrl: expectedTarget.targetUrl,
                    message: buildGeminiNotebookNewPageMismatchMessage(currentUrl, { target: expectedTarget })
                };
            }

            clearGeminiNotebookArmed();
            return {
                ok: false,
                url: currentUrl,
                targetUrl: expectedTarget.targetUrl,
                message: buildGeminiTargetUrlMismatchMessage(currentUrl, { target: expectedTarget })
            };
        }

        function buildGeminiUrlGuardFailureMessage(urlGuard, { prefix = "" } = {}) {
            const base = String(urlGuard?.message || buildGeminiTargetUrlMismatchMessage(getCurrentGeminiUrl())).trim();
            return prefix ? `${prefix}${base}` : base;
        }

        function findGeminiDropzone(composerEl) {
            try {
                const direct = composerEl?.closest?.("[xapfileselectordropzone]");
                if (direct) return direct;
            } catch { }
            try {
                const near = composerEl?.closest?.(".input-area-container");
                if (near) return near;
            } catch { }
            try {
                const near = composerEl?.closest?.("[data-node-type='input-area']");
                if (near) return near;
            } catch { }
            try {
                const near = composerEl?.closest?.("input-area-v2");
                if (near) return near;
            } catch { }
            let zones = [];
            try {
                zones = Array.from(document.querySelectorAll([
                    "[xapfileselectordropzone]",
                    ".input-area-container",
                    "[data-node-type='input-area']",
                    "input-area-v2"
                ].join(", ")));
            } catch { zones = []; }
            if (!zones.length) return null;
            if (composerEl) {
                const containing = zones.find(z => z && z.contains(composerEl));
                if (containing) return containing;
            }

            let best = null;
            let bestScore = -Infinity;
            for (const zone of zones) {
                if (!zone) continue;
                if (isInsideQuickInputOverlay(zone)) continue;
                if (!isElementVisible(zone)) continue;
                try {
                    const rect = zone.getBoundingClientRect();
                    const score = rect.bottom / Math.max(1, window.innerHeight);
                    if (score > bestScore) {
                        bestScore = score;
                        best = zone;
                    }
                } catch { }
            }
            return best || zones[0] || null;
        }

        function findGeminiComposerContainer(composerEl) {
            if (!composerEl) return null;
            try {
                const field = composerEl.closest?.(".input-area-container");
                if (field) return field;
            } catch { }
            try {
                const field = composerEl.closest?.("[data-node-type='input-area']");
                if (field) return field;
            } catch { }
            try {
                const field = composerEl.closest?.("input-area-v2");
                if (field) return field;
            } catch { }
            try {
                const zone = composerEl.closest?.("[xapfileselectordropzone]");
                if (zone) return zone;
            } catch { }
            return findGeminiDropzone(composerEl) || null;
        }

        async function triggerNativeNewChat({ shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return { ok: false, label: getNativeNewChatLabel() };

            try {
                if (simulateKeystroke(GEMINI_NATIVE_NEW_CHAT_HOTKEY, { target: document.body })) {
                    return { ok: true, label: getNativeNewChatLabel() };
                }
            } catch { }

            return { ok: false, label: getNativeNewChatLabel() };
        }

        async function triggerNotebookNewChat({ shouldCancel = null, target = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const nextTarget = target || getGeminiNewChatTriggerTarget();
            const label = getNotebookNewChatLabel();
            if (cancelFn && cancelFn()) return { ok: false, label, targetUrl: nextTarget?.targetUrl || "" };
            if (nextTarget?.kind !== "notebook") return { ok: false, label, targetUrl: nextTarget?.targetUrl || "" };

            rememberPendingGeminiNotebookTarget(nextTarget);
            clearGeminiNotebookArmed();

            const newPageState = getGeminiNotebookNewPageState(nextTarget);
            if (newPageState.ok) {
                markGeminiNotebookArmed(nextTarget);
                return { ok: true, label, targetUrl: nextTarget.targetUrl };
            }

            const currentTarget = parseGeminiQuickInputTarget();
            if (currentTarget?.ready && isSameGeminiQuickInputTarget(currentTarget, nextTarget)) {
                return { ok: true, label, targetUrl: nextTarget.targetUrl };
            }

            const navigatedHome = navigateGeminiSpaToTarget(nextTarget);
            if (navigatedHome) {
                return { ok: true, label, targetUrl: nextTarget.targetUrl };
            }

            if (currentTarget?.kind === "notebook" && isSameGeminiQuickInputTarget(currentTarget, nextTarget)) {
                const ok = clickGeminiNotebookNewChatControl(nextTarget);
                return {
                    ok,
                    label,
                    targetUrl: nextTarget.targetUrl,
                    message: ok ? "" : buildGeminiNotebookNewChatButtonMissingMessage()
                };
            }

            return { ok: false, label, targetUrl: nextTarget.targetUrl };
        }

        async function triggerGeminiNewChat({ shouldCancel = null } = {}) {
            const target = getGeminiNewChatTriggerTarget();
            if (target?.kind === "notebook") {
                return triggerNotebookNewChat({ shouldCancel, target });
            }
            return triggerNativeNewChat({ shouldCancel });
        }

        async function waitForGeminiNewChatReady({ target = null, timeoutMs = 12000, intervalMs = 160, settleMs = 300, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expectedTarget = target || getGeminiNewChatTriggerTarget();
            if (expectedTarget?.kind !== "notebook") {
                return {
                    ok: true,
                    cancelled: false,
                    url: getCurrentGeminiUrl(),
                    targetUrl: expectedTarget?.targetUrl || GEMINI_ROOT_URL
                };
            }

            rememberPendingGeminiNotebookTarget(expectedTarget);
            const deadline = getRuntimeNow(runtime) + Math.max(0, Number(timeoutMs) || 0);
            const interval = Math.max(60, Number(intervalMs) || 160);
            const settle = Math.max(0, Number(settleMs) || 0);
            let stableSince = 0;
            let recoveryAttempted = false;
            let routeResetAttempted = false;
            let routeResetFailed = false;
            let newChatClickAttempted = false;
            let missingNewChatControl = false;

            while (getRuntimeNow(runtime) < deadline) {
                if (cancelFn && cancelFn()) {
                    return { ok: false, cancelled: true, url: getCurrentGeminiUrl(), targetUrl: expectedTarget.targetUrl };
                }

                const currentUrl = getCurrentGeminiUrl();
                const currentTarget = parseGeminiQuickInputTarget(currentUrl);
                const matchesTarget = currentTarget?.ready && isSameGeminiQuickInputTarget(currentTarget, expectedTarget);
                const armed = matchesTarget && isGeminiNotebookArmed(expectedTarget);
                const newPageState = matchesTarget && !armed ? getGeminiNotebookNewPageState(expectedTarget) : null;
                const composer = armed
                    ? findGeminiComposerElement({ requireVisible: true })
                    : (newPageState?.composer || null);
                const ready = armed ? !!composer : !!newPageState?.ok;

                if (ready) {
                    if (!stableSince) stableSince = getRuntimeNow(runtime);
                    if (getRuntimeNow(runtime) - stableSince >= settle) {
                        markGeminiNotebookArmed(expectedTarget);
                        rememberPendingGeminiNotebookTarget(expectedTarget);
                        return { ok: true, cancelled: false, url: currentUrl, targetUrl: expectedTarget.targetUrl };
                    }
                } else {
                    stableSince = 0;
                    clearGeminiNotebookArmed();
                    if (!matchesTarget && !recoveryAttempted) {
                        recoveryAttempted = true;
                        if (navigateGeminiSpaToTarget(expectedTarget)) {
                            await runtimeSleep(runtime, interval, { shouldCancel: cancelFn });
                            continue;
                        }
                    }
                    if (matchesTarget && !routeResetAttempted) {
                        routeResetAttempted = true;
                        if (await resetGeminiNotebookRouteToHome(expectedTarget, { shouldCancel: cancelFn, runtime, intervalMs: interval })) {
                            continue;
                        }
                        routeResetFailed = true;
                    }
                    if (matchesTarget && !newChatClickAttempted) {
                        newChatClickAttempted = true;
                        if (clickGeminiNotebookNewChatControl(expectedTarget)) {
                            await runtimeSleep(runtime, Math.max(220, interval), { shouldCancel: cancelFn });
                            continue;
                        }
                        missingNewChatControl = true;
                    }
                }

                const waitOk = await runtimeSleep(runtime, interval, { shouldCancel: cancelFn });
                if (!waitOk) {
                    return { ok: false, cancelled: true, url: getCurrentGeminiUrl(), targetUrl: expectedTarget.targetUrl };
                }
            }

            const currentUrl = getCurrentGeminiUrl();
            const currentTarget = parseGeminiQuickInputTarget(currentUrl);
            const matchesTarget = currentTarget?.ready && isSameGeminiQuickInputTarget(currentTarget, expectedTarget);
            return {
                ok: false,
                cancelled: false,
                url: currentUrl,
                targetUrl: expectedTarget.targetUrl,
                message: missingNewChatControl
                    ? buildGeminiNotebookNewChatButtonMissingMessage({
                        prefix: qiText("newChatVerifyPrefix", {}, "Notebook verification failed: ")
                    })
                    : ((routeResetFailed || routeResetAttempted)
                        ? buildGeminiNotebookHomeResetFailedMessage(currentUrl, {
                            target: expectedTarget,
                            prefix: qiText("newChatVerifyPrefix", {}, "Notebook verification failed: ")
                        })
                        : (matchesTarget
                            ? buildGeminiNotebookNewPageMismatchMessage(currentUrl, {
                                target: expectedTarget,
                                prefix: qiText("newChatVerifyPrefix", {}, "Notebook verification failed: ")
                            })
                            : buildGeminiTargetUrlMismatchMessage(currentUrl, {
                                target: expectedTarget,
                                prefix: qiText("newChatVerifyPrefix", {}, "Notebook verification failed: ")
                            })))
            };
        }

        const GEMINI_ATTACHMENT_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "src",
            "disabled",
            "aria-disabled",
            "aria-busy"
        ]);

        const GEMINI_READY_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "src",
            "disabled",
            "aria-disabled",
            "aria-busy"
        ]);

        const GEMINI_COMPOSER_SELECTORS = Object.freeze([
            ".input-area-container [contenteditable='true'][role='textbox']",
            ".input-area-container [contenteditable='true']",
            ".input-area-container textarea",
            "[data-node-type='input-area'] [contenteditable='true'][role='textbox']",
            "[data-node-type='input-area'] [contenteditable='true']",
            "[data-node-type='input-area'] textarea",
            "input-area-v2 [contenteditable='true'][role='textbox']",
            "input-area-v2 [contenteditable='true']",
            "input-area-v2 textarea",
            "[contenteditable='true'][data-placeholder='Ask Gemini']",
            "[contenteditable='true'][aria-label='Ask Gemini']",
            "[contenteditable='true'][aria-label='Enter a prompt for Gemini']",
            "[contenteditable='true'][aria-label*='Gemini']",
            "[contenteditable='true'][role='textbox']",
            "textarea[placeholder='Ask Gemini']",
            "textarea[placeholder*='Ask Gemini']",
            "textarea[placeholder*='Gemini']",
            "textarea[aria-label='Ask Gemini']",
            "textarea[aria-label='Enter a prompt for Gemini']",
            "textarea[aria-label*='Gemini']",
            "textarea"
        ]);

        const GEMINI_TEXT_ATTEMPT_TIMEOUT_MS = 2800;
        const GEMINI_TEXT_ATTEMPT_SETTLE_MS = 900;
        const GEMINI_TEXT_ATTEMPT_POLL_MS = 80;
        const GEMINI_TEXT_INSERT_SETTLE_MS = 20;
        const GEMINI_TEXT_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "style",
            "value",
            "placeholder",
            "data-placeholder",
            "data-state",
            "aria-hidden",
            "hidden"
        ]);

        function isGeminiComposerConnected(el) {
            if (!el) return false;
            try {
                if (typeof el.isConnected === "boolean") return el.isConnected;
            } catch { }
            try { return !!document.contains(el); } catch { return false; }
        }

        function isGeminiAttachmentOrPreviewElement(el) {
            if (!el || typeof el.closest !== "function") return false;
            try {
                return !!el.closest([
                    ".attachment-preview-wrapper",
                    ".uploader-file-preview-container",
                    "uploader-file-preview-container",
                    "uploader-file-preview",
                    ".file-preview-wrapper",
                    ".file-preview-chip",
                    ".file-preview-container",
                    "button.image-preview",
                    "button[data-test-id='cancel-button']",
                    "button.cancel-button"
                ].join(", "));
            } catch {
                return false;
            }
        }

        function isGeminiComposerCandidate(el, { requireVisible = true } = {}) {
            if (!el) return false;
            if (isInsideQuickInputOverlay(el)) return false;
            if (!isGeminiComposerConnected(el)) return false;
            if (requireVisible && !isElementVisible(el)) return false;
            const tag = String(el.tagName || "").toUpperCase();
            const isEditable = tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable || el.contentEditable === "true";
            if (!isEditable) return false;
            try {
                if (el.disabled || el.hidden) return false;
                if (el.getAttribute?.("aria-hidden") === "true") return false;
            } catch { }
            if (isGeminiAttachmentOrPreviewElement(el)) return false;
            return true;
        }

        function scoreGeminiComposerCandidate(el) {
            let score = 0;
            try { if (el.closest?.(".input-area-container")) score += 130; } catch { }
            try { if (el.closest?.("[data-node-type='input-area']")) score += 130; } catch { }
            try { if (el.closest?.("input-area-v2")) score += 130; } catch { }
            try {
                const role = String(el.getAttribute?.("role") || "").toLowerCase();
                if (role === "textbox") score += 40;
            } catch { }
            try {
                const aria = String(el.getAttribute?.("aria-label") || "").toLowerCase();
                const placeholder = String(el.getAttribute?.("placeholder") || el.getAttribute?.("data-placeholder") || "").toLowerCase();
                if (aria.includes("ask gemini") || aria.includes("enter a prompt for gemini")) score += 80;
                if (placeholder.includes("ask gemini") || placeholder.includes("gemini")) score += 80;
                if (aria.includes("prompt") || aria.includes("gemini")) score += 30;
            } catch { }
            try {
                const rect = el.getBoundingClientRect();
                score += (rect.bottom / Math.max(1, window.innerHeight)) * 12;
                score += (rect.width / Math.max(1, window.innerWidth)) * 8;
                score += Math.min(8, (rect.width * rect.height) / Math.max(1, window.innerWidth * window.innerHeight) * 80);
            } catch { }
            return score;
        }

        function findGeminiComposerInside(root, { requireVisible = true } = {}) {
            if (!root || typeof root.querySelectorAll !== "function") return null;
            const candidates = [];
            for (const selector of GEMINI_COMPOSER_SELECTORS) {
                try {
                    candidates.push(...Array.from(root.querySelectorAll(selector)));
                } catch { }
            }
            return pickBestGeminiComposerCandidate(candidates, { requireVisible });
        }

        function pickBestGeminiComposerCandidate(candidates, { requireVisible = true } = {}) {
            let best = null;
            let bestScore = -Infinity;
            for (const el of Array.from(candidates || [])) {
                if (!isGeminiComposerCandidate(el, { requireVisible })) continue;
                const score = scoreGeminiComposerCandidate(el);
                if (score > bestScore) {
                    bestScore = score;
                    best = el;
                }
            }
            return best;
        }

        function resolveGeminiComposerFromElement(el, { requireVisible = true } = {}) {
            if (!el) return null;
            if (isGeminiComposerCandidate(el, { requireVisible })) return el;

            const scopes = [];
            const seen = new Set();
            const pushScope = (scope) => {
                if (!scope || seen.has(scope)) return;
                seen.add(scope);
                scopes.push(scope);
            };

            try { pushScope(el.closest?.(".input-area-container") || null); } catch { }
            try { pushScope(el.closest?.("[data-node-type='input-area']") || null); } catch { }
            try { pushScope(el.closest?.("input-area-v2") || null); } catch { }
            try { pushScope(el.closest?.("[xapfileselectordropzone]") || null); } catch { }
            pushScope(el);

            for (const scope of scopes) {
                const composer = findGeminiComposerInside(scope, { requireVisible });
                if (composer) return composer;
            }

            return null;
        }

        function findGeminiComposerElement({ requireVisible = true } = {}) {
            const active = document.activeElement || null;
            const activeComposer = resolveGeminiComposerFromElement(active, { requireVisible });
            if (activeComposer) return activeComposer;

            const candidates = [];
            for (const selector of GEMINI_COMPOSER_SELECTORS) {
                try {
                    candidates.push(...Array.from(document.querySelectorAll(selector)));
                } catch { }
            }
            return pickBestGeminiComposerCandidate(candidates, { requireVisible });
        }

        function resolveGeminiComposerElement(composerEl, { requireVisible = true } = {}) {
            return resolveGeminiComposerFromElement(composerEl, { requireVisible })
                || findGeminiComposerElement({ requireVisible })
                || null;
        }

        async function focusGeminiComposer({ timeoutMs = 2500, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const deadline = getRuntimeNow(runtime) + Math.max(0, Number(timeoutMs) || 0);
            let composer = findGeminiComposerElement();

            while (!composer && getRuntimeNow(runtime) < deadline) {
                if (cancelFn && cancelFn()) return null;
                const waitOk = await runtimeSleep(runtime, intervalMs, { shouldCancel: cancelFn });
                if (!waitOk) return null;
                composer = findGeminiComposerElement();
            }

            if (!composer && typeof focusComposer === "function") {
                const genericComposer = await focusComposer({
                    timeoutMs: Math.max(0, deadline - getRuntimeNow(runtime)),
                    intervalMs,
                    shouldCancel: cancelFn,
                    shouldIgnore: isInsideQuickInputOverlay,
                    runtime
                });
                composer = resolveGeminiComposerElement(genericComposer) || genericComposer || null;
            }

            if (cancelFn && cancelFn()) return null;
            if (!composer) return null;
            try { composer.scrollIntoView?.({ block: "center" }); } catch { }
            try { composer.focus?.(); } catch { }
            try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
            const settleOk = await runtimeSleep(runtime, 20, { shouldCancel: cancelFn });
            if (!settleOk) return null;
            return composer;
        }

        function createGeminiDataTransfer({ text = "", files = [] } = {}) {
            if (typeof DataTransfer !== "function") return null;
            try {
                const dt = new DataTransfer();
                const plainText = String(text ?? "");
                if (plainText) {
                    try { dt.setData("text/plain", plainText); } catch { }
                }
                for (const file of Array.from(files || [])) {
                    if (!(file instanceof File)) continue;
                    try { dt.items.add(file); } catch { }
                }
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
                return dt;
            } catch {
                return null;
            }
        }

        function isGeminiStructuredTextElement(node) {
            const tag = String(node?.tagName || "").toUpperCase();
            return (
                tag === "P" ||
                tag === "DIV" ||
                tag === "LI" ||
                tag === "BLOCKQUOTE" ||
                tag === "PRE" ||
                tag === "UL" ||
                tag === "OL" ||
                tag === "H1" ||
                tag === "H2" ||
                tag === "H3" ||
                tag === "H4" ||
                tag === "H5" ||
                tag === "H6"
            );
        }

        function isGeminiTrailingBreak(node) {
            if (!node || String(node.tagName || "").toUpperCase() !== "BR") return false;
            const parent = node.parentElement || null;
            if (!parent) return true;
            const siblings = Array.from(parent.childNodes || []).filter(Boolean);
            return siblings[siblings.length - 1] === node;
        }

        function serializeGeminiInlineText(node, { preserveWhitespace = false } = {}) {
            if (!node) return "";
            const nodeType = Number(node.nodeType) || 0;
            if (nodeType === 3) return String(node.nodeValue || "");
            if (nodeType !== 1) return "";

            const tag = String(node.tagName || "").toUpperCase();
            if (tag === "BR") return isGeminiTrailingBreak(node) ? "" : "\n";
            if (tag === "IMG" || tag === "SVG" || tag === "BUTTON") return "";
            if (isInsideQuickInputOverlay(node) || isGeminiAttachmentOrPreviewElement(node)) return "";

            const nextPreserveWhitespace = preserveWhitespace || tag === "PRE";
            let text = "";
            for (const child of Array.from(node.childNodes || [])) {
                text += serializeGeminiInlineText(child, { preserveWhitespace: nextPreserveWhitespace });
            }
            return text;
        }

        function serializeGeminiStructuredText(node) {
            if (!node) return "";
            const nodeType = Number(node.nodeType) || 0;
            if (nodeType === 3) return String(node.nodeValue || "");
            if (nodeType !== 1) return "";

            const tag = String(node.tagName || "").toUpperCase();
            if (tag === "UL" || tag === "OL") {
                return Array.from(node.children || [])
                    .filter(child => String(child?.tagName || "").toUpperCase() === "LI")
                    .map(child => serializeGeminiStructuredText(child))
                    .join("\n");
            }

            const structuredChildren = Array.from(node.childNodes || [])
                .filter(child => isGeminiStructuredTextElement(child));
            if (structuredChildren.length > 0 && tag !== "LI") {
                return structuredChildren.map(child => serializeGeminiStructuredText(child)).join("\n");
            }

            return serializeGeminiInlineText(node, { preserveWhitespace: tag === "PRE" });
        }

        function serializeGeminiComposerText(composerEl) {
            if (!composerEl) return "";
            const topLevelBlocks = Array.from(composerEl.childNodes || [])
                .filter(child => isGeminiStructuredTextElement(child));
            if (topLevelBlocks.length > 0) {
                return topLevelBlocks.map(child => serializeGeminiStructuredText(child)).join("\n");
            }
            return serializeGeminiInlineText(composerEl);
        }

        function getGeminiComposerPlaceholderText(composerEl) {
            if (!composerEl || typeof composerEl.getAttribute !== "function") return "";
            const attrs = [
                "data-placeholder",
                "aria-placeholder",
                "placeholder"
            ];
            for (const attr of attrs) {
                try {
                    const value = String(composerEl.getAttribute(attr) || "").trim();
                    if (value) return value;
                } catch { }
            }
            return "";
        }

        function isGeminiComposerBlank(composerEl) {
            if (!composerEl) return false;
            try {
                if (composerEl.classList?.contains?.("ql-blank")) return true;
            } catch { }
            try {
                if (composerEl.getAttribute?.("data-placeholder") && !String(composerEl.textContent || "").trim()) return true;
            } catch { }
            return false;
        }

        function getGeminiComposerPlainText(composerEl, { trimTrailingEditorNewlines = false } = {}) {
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false });
            if (!composer) return "";

            let text = "";
            const tag = String(composer.tagName || "").toUpperCase();
            if (composer.isContentEditable || composer.contentEditable === "true") {
                text = serializeGeminiComposerText(composer);
                if (!text) {
                    try { text = String(composer.innerText || composer.textContent || ""); } catch { }
                }
            } else if (tag === "TEXTAREA" || tag === "INPUT") {
                text = genericGetComposerText(composer);
            } else {
                text = genericGetComposerText(composer);
            }

            const normalized = genericNormalizeComposerText(text, { trimTrailingEditorNewlines });
            const placeholder = genericNormalizeComposerText(getGeminiComposerPlaceholderText(composer), { trimTrailingEditorNewlines });
            if (placeholder && isGeminiComposerBlank(composer) && normalized === placeholder) return "";
            return normalized;
        }

        function normalizeGeminiCommittedText(value) {
            return genericNormalizeComposerText(String(value ?? ""), { trimTrailingEditorNewlines: true });
        }

        function hasMarkdownFenceText(value) {
            return String(value ?? "").includes("```");
        }

        function stripMarkdownFenceMarkerLines(value) {
            const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
            return lines
                .filter(line => !/^\s*```/.test(String(line ?? "")))
                .join("\n");
        }

        function hasGeminiRenderedCodeBlock(composerEl) {
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            if (!composer || typeof composer.querySelector !== "function") return false;
            try {
                return !!composer.querySelector("pre");
            } catch {
                return false;
            }
        }

        function isGeminiFencedTextMatch(composerEl, expectedText, actualText) {
            if (!hasMarkdownFenceText(expectedText)) return false;
            if (!hasGeminiRenderedCodeBlock(composerEl)) return false;
            const normalizedRenderedExpected = normalizeGeminiCommittedText(stripMarkdownFenceMarkerLines(expectedText));
            return String(actualText ?? "") === normalizedRenderedExpected;
        }

        function getGeminiSelection(composerEl) {
            const doc = composerEl?.ownerDocument || document;
            try { return doc.defaultView?.getSelection?.() || window.getSelection?.() || null; } catch { return null; }
        }

        function selectGeminiComposerContent(composerEl, { collapse = false, toStart = false } = {}) {
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            if (!composer || typeof document.createRange !== "function") return false;
            try {
                composer.focus?.();
                const selection = getGeminiSelection(composer);
                if (!selection) return false;
                const range = document.createRange();
                range.selectNodeContents(composer);
                if (collapse) range.collapse(!!toStart);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            } catch {
                return false;
            }
        }

        function moveGeminiComposerCaretToEnd(composerEl) {
            return selectGeminiComposerContent(composerEl, { collapse: true, toStart: false });
        }

        function dispatchGeminiComposerInput(composerEl, { inputType = "insertText", data = null } = {}) {
            if (!composerEl) return false;
            try {
                composerEl.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    inputType,
                    data
                }));
                return true;
            } catch {
                try {
                    const evt = new Event("input", { bubbles: true, cancelable: true, composed: true });
                    try { Object.defineProperty(evt, "inputType", { value: inputType, configurable: true }); } catch { }
                    if (data != null) {
                        try { Object.defineProperty(evt, "data", { value: data, configurable: true }); } catch { }
                    }
                    composerEl.dispatchEvent(evt);
                    return true;
                } catch {
                    return false;
                }
            }
        }

        function dispatchGeminiComposerBeforeInput(composerEl, { inputType = "insertText", data = null } = {}) {
            if (!composerEl) return false;
            try {
                composerEl.dispatchEvent(new InputEvent("beforeinput", {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    inputType,
                    data
                }));
                return true;
            } catch {
                try {
                    const evt = new Event("beforeinput", { bubbles: true, cancelable: true, composed: true });
                    try { Object.defineProperty(evt, "inputType", { value: inputType, configurable: true }); } catch { }
                    if (data != null) {
                        try { Object.defineProperty(evt, "data", { value: data, configurable: true }); } catch { }
                    }
                    composerEl.dispatchEvent(evt);
                    return true;
                } catch {
                    return false;
                }
            }
        }

        function tryPasteTextIntoGeminiComposer(composerEl, text) {
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            const plainText = String(text ?? "");
            if (!composer || !plainText) return false;

            const dt = createGeminiDataTransfer({ text: plainText });
            if (!dt) return false;

            try { composer.focus?.(); } catch { }
            moveGeminiComposerCaretToEnd(composer);

            let fired = false;
            fired = dispatchBeforeInputFromPaste(composer, dt) || fired;
            fired = dispatchPasteEvent(composer, dt) || fired;
            fired = dispatchInputFromPaste(composer, dt) || fired;
            return fired;
        }

        async function tryInsertTextIntoGeminiComposerAtomically(composerEl, text) {
            const plainText = String(text ?? "").replace(/\r\n?/g, "\n");
            if (!plainText) return false;
            let composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            if (!composer) return false;

            try { composer.focus?.(); } catch { }
            try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
            if (!selectGeminiComposerContent(composer)) return false;

            const beforeText = normalizeGeminiCommittedText(getGeminiComposerPlainText(composer));
            dispatchGeminiComposerBeforeInput(composer, { inputType: "insertReplacementText", data: plainText });
            let executed = false;
            try { executed = !!document.execCommand?.("insertText", false, plainText); } catch { }
            if (!executed) return false;
            dispatchGeminiComposerInput(composer, { inputType: "insertReplacementText", data: plainText });
            try { composer.dispatchEvent(new Event("change", { bubbles: true })); } catch { }

            await sleep(GEMINI_TEXT_INSERT_SETTLE_MS);
            composer = resolveGeminiComposerElement(composer, { requireVisible: false }) || composer;
            const afterText = normalizeGeminiCommittedText(getGeminiComposerPlainText(composer));
            return afterText === normalizeGeminiCommittedText(plainText) || afterText !== beforeText;
        }

        function setGeminiComposerTextContentFallback(composerEl, text) {
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            if (!composer) return false;
            const plainText = String(text ?? "").replace(/\r\n?/g, "\n");
            try { composer.focus?.(); } catch { }
            dispatchGeminiComposerBeforeInput(composer, { inputType: "insertText", data: plainText });
            try {
                composer.textContent = plainText;
            } catch {
                return false;
            }
            dispatchGeminiComposerInput(composer, { inputType: "insertText", data: plainText });
            try { composer.dispatchEvent(new Event("change", { bubbles: true })); } catch { }
            return true;
        }

        async function waitForGeminiComposerTextMatch(composerEl, expectedText, { timeoutMs = GEMINI_TEXT_ATTEMPT_TIMEOUT_MS } = {}) {
            const normalizedExpected = normalizeGeminiCommittedText(expectedText);
            let composerRef = composerEl;

            const computeState = () => {
                const resolvedComposer = resolveGeminiComposerElement(composerRef, { requireVisible: false }) || composerRef || null;
                if (resolvedComposer) composerRef = resolvedComposer;
                const actualText = normalizeGeminiCommittedText(getGeminiComposerPlainText(composerRef, { trimTrailingEditorNewlines: true }));
                const exactMatch = actualText === normalizedExpected;
                const fenceMatch = isGeminiFencedTextMatch(composerRef, normalizedExpected, actualText);
                return {
                    composer: composerRef,
                    actualText,
                    expectedText: normalizedExpected,
                    ok: exactMatch || fenceMatch,
                    stateKey: `${actualText.length}:${exactMatch || fenceMatch ? 1 : 0}`
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiTextObservationRoots(composerRef),
                computeState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs: GEMINI_TEXT_ATTEMPT_SETTLE_MS,
                pollFallbackMs: GEMINI_TEXT_ATTEMPT_POLL_MS,
                attributeFilter: GEMINI_TEXT_OBSERVED_ATTRIBUTES
            });

            const state = observed?.state || computeState();
            return {
                ok: !!observed?.ok,
                composer: state?.composer || composerRef,
                actualText: state?.actualText || "",
                expectedText: normalizedExpected
            };
        }

        function getGeminiComposerTextMatchSnapshot(composerEl, expectedText) {
            const normalizedExpected = normalizeGeminiCommittedText(expectedText);
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            const actualText = normalizeGeminiCommittedText(getGeminiComposerPlainText(composer, { trimTrailingEditorNewlines: true }));
            const exactMatch = actualText === normalizedExpected;
            const fenceMatch = isGeminiFencedTextMatch(composer, normalizedExpected, actualText);
            return {
                composer,
                actualText,
                expectedText: normalizedExpected,
                ok: exactMatch || fenceMatch
            };
        }

        async function setGeminiInputValue(composerEl, value) {
            const urlGuard = getGeminiUrlGuardResult();
            if (!urlGuard.ok) return false;

            let composer = resolveGeminiComposerElement(composerEl, { requireVisible: false });
            if (!composer) return false;

            const text = String(value ?? "");
            const tag = String(composer.tagName || "").toUpperCase();
            if ((tag === "TEXTAREA" || tag === "INPUT") && typeof genericSetInputValue === "function") {
                return !!genericSetInputValue(composer, text);
            }

            await clearGeminiInputValue(composer);
            if (!text) return true;

            const hasFence = hasMarkdownFenceText(text);
            const attempts = hasFence
                ? [
                    () => Promise.resolve(tryPasteTextIntoGeminiComposer(composer, text)),
                    () => Promise.resolve(setGeminiComposerTextContentFallback(composer, text))
                ]
                : [
                    () => tryInsertTextIntoGeminiComposerAtomically(composer, text),
                    () => Promise.resolve(tryPasteTextIntoGeminiComposer(composer, text)),
                    () => Promise.resolve(setGeminiComposerTextContentFallback(composer, text))
                ];

            for (let index = 0; index < attempts.length; index++) {
                composer = resolveGeminiComposerElement(composer, { requireVisible: false }) || composer;
                if (!composer) return false;

                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }

                let attemptStarted = false;
                try { attemptStarted = !!(await attempts[index]()); } catch { attemptStarted = false; }
                let snapshot = getGeminiComposerTextMatchSnapshot(composer, text);
                if (snapshot?.composer) composer = snapshot.composer;
                if (snapshot?.ok) return true;

                if (attemptStarted || snapshot?.actualText) {
                    const matched = await waitForGeminiComposerTextMatch(composer, text);
                    if (matched?.composer) composer = matched.composer;
                    if (matched?.ok || matched?.actualText === matched?.expectedText) return true;
                }

                if (index < attempts.length - 1) {
                    snapshot = getGeminiComposerTextMatchSnapshot(composer, text);
                    if (snapshot?.composer) composer = snapshot.composer;
                    if (snapshot?.ok) return true;
                    if (snapshot?.actualText) {
                        await clearGeminiInputValue(composer);
                        await sleep(20);
                    }
                }
            }

            return false;
        }

        function clearGeminiInputValue(composerEl) {
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false });
            if (!composer) return false;

            const tag = String(composer.tagName || "").toUpperCase();
            if ((tag === "TEXTAREA" || tag === "INPUT") && typeof genericClearInputValue === "function") {
                return !!genericClearInputValue(composer);
            }

            try { composer.focus?.(); } catch { }
            try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }

            let cleared = false;
            dispatchGeminiComposerBeforeInput(composer, { inputType: "deleteContentBackward", data: null });

            try {
                if (selectGeminiComposerContent(composer)) {
                    cleared = !!document.execCommand?.("delete", false, null);
                    if (!cleared) cleared = !!document.execCommand?.("insertText", false, "");
                }
            } catch { }

            if (!cleared) {
                try {
                    if (selectGeminiComposerContent(composer)) {
                        getGeminiSelection(composer)?.deleteFromDocument?.();
                        cleared = true;
                    }
                } catch { }
            }

            if (!cleared && typeof genericClearInputValue === "function") {
                try { cleared = !!genericClearInputValue(composer); } catch { }
            }

            if (!cleared) {
                try {
                    composer.textContent = "";
                    cleared = true;
                } catch { }
            }

            dispatchGeminiComposerInput(composer, { inputType: "deleteContentBackward", data: null });
            try { composer.dispatchEvent(new Event("change", { bubbles: true })); } catch { }
            return cleared || !getGeminiComposerPlainText(composer, { trimTrailingEditorNewlines: true });
        }

        function getGeminiTextObservationRoots(composerEl) {
            const roots = [];
            const seen = new Set();
            const composer = resolveGeminiComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            const pushRoot = (node) => {
                if (!node || seen.has(node)) return;
                const nodeType = Number(node?.nodeType) || 0;
                if (!(nodeType === 1 || nodeType === 9 || nodeType === 11)) return;
                seen.add(node);
                roots.push(node);
            };

            pushRoot(composer);
            try { pushRoot(composer?.closest?.(".input-area-container") || null); } catch { }
            try { pushRoot(composer?.closest?.("[data-node-type='input-area']") || null); } catch { }
            try { pushRoot(composer?.closest?.("input-area-v2") || null); } catch { }
            try { pushRoot(composer?.closest?.("form") || null); } catch { }

            const observedRoots = getGeminiObservationRoots({
                containerEl: composer ? findGeminiComposerContainer(composer) : null,
                composerEl: composer
            });
            for (const root of observedRoots) pushRoot(root);
            pushRoot(document.body || document || null);
            return roots;
        }

        function getGeminiAttachmentScope(containerEl) {
            const container = containerEl || document;
            const selectors = [
                ".attachment-preview-wrapper",
                ".uploader-file-preview-container",
                "uploader-file-preview-container",
                ".file-preview-wrapper",
                ".input-area-container",
                "[data-node-type='input-area']",
                "input-area-v2"
            ];

            for (const selector of selectors) {
                try {
                    const candidates = Array.from(container.querySelectorAll(selector))
                        .filter(el => el && !isInsideQuickInputOverlay(el))
                        .filter(el => isElementVisible(el));
                    for (const candidate of candidates) {
                        try {
                            if (candidate.querySelector("button[data-test-id='cancel-button'], button.cancel-button, img[data-test-id='image-preview'], uploader-file-preview, .file-preview-chip, .file-preview-container")) {
                                return candidate;
                            }
                        } catch { }
                    }
                    if (candidates.length) return candidates[0];
                } catch { }
            }

            return container;
        }

        function getGeminiAttachmentPreviewCards(containerEl) {
            const scope = getGeminiAttachmentScope(containerEl);
            const selectors = [
                "uploader-file-preview",
                ".file-preview-chip",
                ".file-preview-container"
            ].join(", ");

            try {
                return Array.from(scope.querySelectorAll(selectors))
                    .filter(card => card && !isInsideQuickInputOverlay(card))
                    .filter(card => isElementVisible(card));
            } catch {
                return [];
            }
        }

        function getGeminiRemoveAttachmentButtons(containerEl) {
            const scope = getGeminiAttachmentScope(containerEl);
            const previewCards = getGeminiAttachmentPreviewCards(scope);
            const ordered = [];
            const seen = new Set();

            const pushButton = (button) => {
                if (!button || seen.has(button)) return;
                if (isInsideQuickInputOverlay(button)) return;
                if (button.disabled) return;
                seen.add(button);
                ordered.push(button);
            };

            for (const card of previewCards) {
                try {
                    pushButton(card.querySelector("button[data-test-id='cancel-button'], button.cancel-button"));
                } catch { }
            }

            try {
                const buttons = Array.from(scope.querySelectorAll("button[data-test-id='cancel-button'], button.cancel-button"));
                for (const button of buttons) pushButton(button);
                return ordered;
            } catch {
                return ordered;
            }
        }

        function getGeminiObservationRoots({ containerEl = null, composerEl = null } = {}) {
            const roots = [];
            const container = containerEl || (composerEl ? findGeminiComposerContainer(composerEl) : null);
            if (container) roots.push(container);

            try {
                const attachmentScope = getGeminiAttachmentScope(container);
                if (attachmentScope) roots.push(attachmentScope);
                const previewContainer = attachmentScope?.querySelector?.(".uploader-file-preview-container, uploader-file-preview-container");
                if (previewContainer) roots.push(previewContainer);
            } catch { }

            try {
                const form = composerEl?.closest?.("form");
                if (form) roots.push(form);
            } catch { }

            const sendBtn = composerEl ? findSendButtonNearComposer(composerEl) : null;
            if (sendBtn) {
                roots.push(sendBtn);
                try {
                    const sendScope = sendBtn.closest?.("form");
                    if (sendScope) roots.push(sendScope);
                } catch { }
                try {
                    const sendParent = sendBtn.parentElement;
                    if (sendParent) roots.push(sendParent);
                } catch { }
            }

            return roots;
        }

        function getGeminiAttachmentSnapshot(containerEl) {
            const container = containerEl || document;
            const scope = getGeminiAttachmentScope(container);
            const urls = new Set();
            let cancelCount = 0;
            let hasFilePreview = false;
            let imageCount = 0;
            let previewChipCount = 0;

            try { hasFilePreview = !!container.classList?.contains?.("with-file-preview"); } catch { }
            if (!hasFilePreview) {
                try {
                    hasFilePreview = !!scope.querySelector(".attachment-preview-wrapper, .uploader-file-preview-container, uploader-file-preview, .file-preview-chip, button[data-test-id='cancel-button'], img[data-test-id='image-preview']");
                } catch { }
            }

            try {
                const selector = [
                    "img[data-test-id='image-preview']",
                    "uploader-file-preview img[aria-label='Image preview']",
                    "button.image-preview img[aria-label='Image preview']"
                ].join(", ");
                const imgs = Array.from(scope.querySelectorAll(selector))
                    .filter(img => img && !isInsideQuickInputOverlay(img))
                    .filter(img => isElementVisible(img));
                imageCount = imgs.length;
                for (const img of imgs) {
                    if (!img) continue;
                    const src = String(img.getAttribute?.("src") || img.currentSrc || img.src || "").trim();
                    if (!src) continue;
                    urls.add(src);
                }
            } catch { }

            try {
                cancelCount = getGeminiRemoveAttachmentButtons(scope).length;
            } catch { }

            try {
                previewChipCount = Array.from(scope.querySelectorAll("uploader-file-preview, .file-preview-chip"))
                    .filter(el => el && !isInsideQuickInputOverlay(el))
                    .filter(el => isElementVisible(el))
                    .length;
            } catch { }

            const attachmentCount = Math.max(imageCount, cancelCount, previewChipCount, hasFilePreview ? 1 : 0);
            return { urls, imageCount, cancelCount, previewChipCount, hasFilePreview, attachmentCount };
        }

        function hasGeminiAttachmentChange(prev, next) {
            if (!prev || !next) return false;
            if ((next.attachmentCount || 0) > (prev.attachmentCount || 0)) return true;
            if (next.hasFilePreview && !prev.hasFilePreview) return true;
            if (next.cancelCount > prev.cancelCount) return true;
            if ((next.previewChipCount || 0) > (prev.previewChipCount || 0)) return true;
            if (next.imageCount > prev.imageCount) return true;
            for (const url of next.urls) {
                if (!prev.urls.has(url)) return true;
            }
            return false;
        }

        async function waitForGeminiAttachmentCount(containerEl, targetCount, { timeoutMs = 6000, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expected = Math.max(0, Number(targetCount) || 0);
            let containerRef = containerEl || document;

            const computeAttachmentCountState = () => {
                containerRef = containerEl || containerRef || document;
                const snapshot = getGeminiAttachmentSnapshot(containerRef);
                return {
                    container: containerRef,
                    snapshot,
                    stateKey: getGeminiAttachmentFingerprint(snapshot)
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiObservationRoots({ containerEl: containerRef }),
                computeState: computeAttachmentCountState,
                isSatisfied: (state) => (state?.snapshot?.attachmentCount || 0) === expected,
                timeoutMs,
                settleMs: 0,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: GEMINI_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const snapshot = observed?.state?.snapshot || getGeminiAttachmentSnapshot(containerRef);
            if (observed?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            return { ok: !!observed?.ok, cancelled: false, snapshot };
        }

        async function trimGeminiUnexpectedAttachments(containerEl, expectedCount, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expected = Math.max(0, Number(expectedCount) || 0);
            let snapshot = getGeminiAttachmentSnapshot(containerEl);

            while ((snapshot?.attachmentCount || 0) > expected) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true, snapshot };
                const buttons = getGeminiRemoveAttachmentButtons(containerEl);
                const extraCount = (snapshot?.attachmentCount || 0) - expected;
                if (!buttons.length || extraCount <= 0) break;

                const removeBtn = buttons[buttons.length - 1];
                let clicked = false;
                try {
                    clicked = !!TemplateUtils?.events?.simulateClick?.(removeBtn, { nativeFallback: true });
                } catch { }
                if (!clicked) {
                    try { removeBtn.click(); clicked = true; } catch { }
                }
                if (!clicked) break;

                const waitResult = await waitForGeminiAttachmentCount(containerEl, (snapshot?.attachmentCount || 0) - 1, {
                    timeoutMs: 5000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime
                });
                snapshot = waitResult?.snapshot || getGeminiAttachmentSnapshot(containerEl);
                if (waitResult?.cancelled) return { ok: false, cancelled: true, snapshot };
                if (!waitResult?.ok && (snapshot?.attachmentCount || 0) >= expected + extraCount) break;
            }

            snapshot = getGeminiAttachmentSnapshot(containerEl);
            return { ok: (snapshot?.attachmentCount || 0) === expected, cancelled: false, snapshot };
        }

        async function clearGeminiAttachments(composerEl, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
            if (!composer) {
                return {
                    ok: false,
                    cancelled: !!(cancelFn && cancelFn()),
                    message: qiText("clearNoComposer", {}, "Failed to clear current image attachments: input box not found.")
                };
            }

            const container = findGeminiComposerContainer(composer);
            if (!container) {
                return { ok: false, cancelled: false, message: qiText("clearNoContainer", {}, "Failed to clear current image attachments: attachment container not found.") };
            }

            const initialSnapshot = getGeminiAttachmentSnapshot(container);
            if ((initialSnapshot?.attachmentCount || 0) <= 0) {
                return { ok: true, cancelled: false, snapshot: initialSnapshot };
            }

            const clearResult = await trimGeminiUnexpectedAttachments(container, 0, { shouldCancel: cancelFn, runtime });
            const snapshot = clearResult?.snapshot || getGeminiAttachmentSnapshot(container);
            if (clearResult?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            if (clearResult?.ok) {
                return { ok: true, cancelled: false, snapshot };
            }

            const remaining = Math.max(0, Number(snapshot?.attachmentCount) || 0);
            const removeButtons = getGeminiRemoveAttachmentButtons(container);
            const message = remaining > 0
                ? (removeButtons.length
                    ? qiText("clearStillRemaining", { remaining }, `Failed to clear current image attachments: ${remaining} attachment marker(s) still detected after clicking remove.`)
                    : qiText("clearNoRemoveButton", { remaining }, `Failed to clear current image attachments: ${remaining} attachment marker(s) still detected, and no usable remove button was found.`))
                : qiText("clearUnknown", {}, "Failed to clear current image attachments: could not confirm that all attachments were removed.");
            return { ok: false, cancelled: false, snapshot, message };
        }

        async function waitForGeminiAttachmentChange(containerEl, prevSnapshot, { timeoutMs = 9000, intervalMs = 120, shouldCancel = null, runtime = null, composerEl = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let containerRef = containerEl || (composerEl ? findGeminiComposerContainer(composerEl) : null) || document;

            const computeAttachmentState = () => {
                const nextContainer = containerEl || (composerEl ? findGeminiComposerContainer(composerEl) : null) || containerRef || document;
                if (nextContainer) containerRef = nextContainer;
                const snapshot = getGeminiAttachmentSnapshot(containerRef);
                return {
                    container: containerRef,
                    snapshot,
                    stateKey: getGeminiAttachmentFingerprint(snapshot)
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiObservationRoots({ containerEl: containerRef, composerEl }),
                computeState: computeAttachmentState,
                isSatisfied: (state) => hasGeminiAttachmentChange(prevSnapshot, state?.snapshot),
                timeoutMs,
                settleMs: 0,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: GEMINI_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const snapshot = observed?.state?.snapshot || getGeminiAttachmentSnapshot(containerRef);
            if (observed?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            return { ok: !!observed?.ok, cancelled: false, snapshot };
        }

        function tryAttachImageViaSimulatedPaste(file, composerEl) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            let dt;
            try {
                dt = new DataTransfer();
                dt.items.add(file);
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
            } catch {
                return false;
            }

            const targets = [];
            const dropzone = findGeminiDropzone(composerEl);
            if (dropzone) targets.push(dropzone);
            targets.push(composerEl);
            try {
                if (document.activeElement) targets.push(document.activeElement);
            } catch { }
            targets.push(document);
            targets.push(window);

            const uniq = [];
            const seen = new Set();
            for (const t of targets) {
                if (!t || seen.has(t)) continue;
                if (isInsideQuickInputOverlay(t)) continue;
                seen.add(t);
                uniq.push(t);
            }

            let fired = false;
            for (const target of uniq) {
                fired = dispatchBeforeInputFromPaste(target, dt) || fired;
                fired = dispatchPasteEvent(target, dt) || fired;
                fired = dispatchInputFromPaste(target, dt) || fired;
            }
            return fired;
        }

        function tryAttachImageViaDropzone(file, composerEl) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            let dt;
            try {
                dt = new DataTransfer();
                dt.items.add(file);
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
            } catch {
                return false;
            }

            const targets = [];
            const dropzone = findGeminiDropzone(composerEl);
            if (dropzone) targets.push(dropzone);
            targets.push(composerEl);
            targets.push(document);
            targets.push(window);

            const uniq = [];
            const seen = new Set();
            for (const t of targets) {
                if (!t || seen.has(t)) continue;
                if (isInsideQuickInputOverlay(t)) continue;
                seen.add(t);
                uniq.push(t);
            }

            let fired = false;
            for (const target of uniq) {
                fired = dispatchDragEvent(target, "dragenter", dt) || fired;
                fired = dispatchDragEvent(target, "dragover", dt) || fired;
                fired = dispatchDragEvent(target, "drop", dt) || fired;
            }
            return fired;
        }

        function tryAttachImageViaFileInput(file, composerEl, diagnostics) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            const container = findGeminiComposerContainer(composerEl);
            const candidates = [];

            if (container) candidates.push(...collectFileInputs(container, { shouldIgnore: isInsideQuickInputOverlay }));
            candidates.push(...collectFileInputs(document, { shouldIgnore: isInsideQuickInputOverlay }));

            if (candidates.length === 0) {
                if (container) candidates.push(...collectFileInputsFromOpenShadows(container, { maxHosts: 1200, shouldIgnore: isInsideQuickInputOverlay }));
                candidates.push(...collectFileInputsFromOpenShadows(document, { maxHosts: 3500, shouldIgnore: isInsideQuickInputOverlay }));
            }

            const uniq = [];
            const seen = new Set();
            for (const input of candidates) {
                if (!input || seen.has(input)) continue;
                seen.add(input);
                if (isInsideQuickInputOverlay(input)) continue;
                uniq.push(input);
            }

            if (diagnostics && typeof diagnostics === "object") diagnostics.fileInputCandidates = uniq.length;

            const accepted = [];
            const fallback = [];
            for (const input of uniq) {
                const accept = String(input.getAttribute?.("accept") || input.accept || "").toLowerCase();
                if (!accept || accept.includes("image") || accept.includes(".png") || accept.includes(".jpg") || accept.includes(".jpeg") || accept.includes(".webp")) {
                    accepted.push(input);
                } else {
                    fallback.push(input);
                }
            }

            for (const input of [...accepted, ...fallback]) {
                if (trySetFileInputFiles(input, file)) return true;
            }

            return false;
        }

        async function attachImageToComposer(file, composerEl, { onDiagnostics, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;

            if (!file || !(file instanceof File)) return { ok: false, cancelled: false };
            if (!String(file.type || "").startsWith("image/")) return { ok: false, cancelled: false };
            if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
            const urlGuard = getGeminiUrlGuardResult();
            if (!urlGuard.ok) return {
                ok: false,
                cancelled: false,
                message: buildGeminiUrlGuardFailureMessage(urlGuard, {
                    prefix: qiText("imageInsertUrlPrefix", {}, "URL check failed before inserting images: ")
                })
            };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };
            const container = findGeminiComposerContainer(composer);
            if (!container) return { ok: false, cancelled: false };

            const diagnostics = {
                attempts: { paste: 0, drop: 0, fileInput: 0 },
                fired: { paste: 0, drop: 0, fileInput: 0 },
                fileInputCandidates: 0,
                finalSnapshot: null
            };

            const maxAttempts = 3;
            let prev = getGeminiAttachmentSnapshot(container);

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                if (cancelFn && cancelFn()) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                diagnostics.attempts.paste += 1;
                if (attempt > 0) {
                    const retryWaitOk = await runtimeSleep(runtime, 180, { shouldCancel: cancelFn });
                    if (!retryWaitOk) {
                        diagnostics.finalSnapshot = prev;
                        if (typeof onDiagnostics === "function") {
                            try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                        }
                        return { ok: false, cancelled: true };
                    }
                }
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                const focusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
                if (!focusSettleOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }

                const fired = tryAttachImageViaSimulatedPaste(file, composer);
                if (fired) diagnostics.fired.paste += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, {
                    timeoutMs: 9000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime,
                    composerEl: composer
                });
                if (cancelled) {
                    diagnostics.finalSnapshot = snapshot;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                if (ok) return { ok: true, cancelled: false };
                prev = snapshot;
            }

            for (let attempt = 0; attempt < 2; attempt++) {
                if (cancelFn && cancelFn()) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                diagnostics.attempts.drop += 1;
                const dropWaitOk = await runtimeSleep(runtime, 220, { shouldCancel: cancelFn });
                if (!dropWaitOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                const dropFocusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
                if (!dropFocusSettleOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }

                const fired = tryAttachImageViaDropzone(file, composer);
                if (fired) diagnostics.fired.drop += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, {
                    timeoutMs: 9000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime,
                    composerEl: composer
                });
                if (cancelled) {
                    diagnostics.finalSnapshot = snapshot;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                if (ok) return { ok: true, cancelled: false };
                prev = snapshot;
            }

            for (let attempt = 0; attempt < 2; attempt++) {
                if (cancelFn && cancelFn()) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                diagnostics.attempts.fileInput += 1;
                const fileInputWaitOk = await runtimeSleep(runtime, 220, { shouldCancel: cancelFn });
                if (!fileInputWaitOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
                const fileInputFocusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
                if (!fileInputFocusSettleOk) {
                    diagnostics.finalSnapshot = prev;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }

                const fired = tryAttachImageViaFileInput(file, composer, diagnostics);
                if (fired) diagnostics.fired.fileInput += 1;
                if (!fired) continue;

                const { ok, cancelled, snapshot } = await waitForGeminiAttachmentChange(container, prev, {
                    timeoutMs: 9000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime,
                    composerEl: composer
                });
                if (cancelled) {
                    diagnostics.finalSnapshot = snapshot;
                    if (typeof onDiagnostics === "function") {
                        try { onDiagnostics({ ...diagnostics, cancelled: true }); } catch { }
                    }
                    return { ok: false, cancelled: true };
                }
                if (ok) return { ok: true, cancelled: false };
                prev = snapshot;
            }

            diagnostics.finalSnapshot = prev;
            if (typeof onDiagnostics === "function") {
                try { onDiagnostics(diagnostics); } catch { }
            }
            return { ok: false, cancelled: false };
        }

        async function attachImagesToComposer(files, composerEl, { onDiagnostics, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const list = Array.from(files || []).filter(file => file && (file instanceof File) && String(file.type || "").startsWith("image/"));
            if (list.length === 0) return { ok: false, cancelled: false, message: qiText("noImageFiles", {}, "No image files detected.") };
            const urlGuard = getGeminiUrlGuardResult();
            if (!urlGuard.ok) return {
                ok: false,
                cancelled: false,
                message: buildGeminiUrlGuardFailureMessage(urlGuard, {
                    prefix: qiText("imageInsertUrlPrefix", {}, "URL check failed before inserting images: ")
                })
            };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };

            for (let i = 0; i < list.length; i++) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
                const file = list[i];
                const result = await attachImageToComposer(file, composer, {
                    onDiagnostics: (diag) => {
                        if (typeof onDiagnostics !== "function") return;
                        try {
                            onDiagnostics({
                                fileIndex: i,
                                fileName: file?.name || "",
                                fileSize: Number(file?.size) || 0,
                                ...diag
                            });
                        } catch { }
                    },
                    shouldCancel: cancelFn,
                    runtime
                });
                if (result?.cancelled) return { ok: false, cancelled: true };
                if (!result?.ok) return { ok: false, cancelled: false, message: qiText("attachFailed", {}, "Image paste failed: no image preview was detected in the input box.") };
                const betweenFilesWaitOk = await runtimeSleep(runtime, 120, { shouldCancel: cancelFn });
                if (!betweenFilesWaitOk) return { ok: false, cancelled: true };
            }

            return { ok: true, cancelled: false };
        }

        function findSendButtonNearComposer(composerEl) {
            const candidates = [];
            const scopes = [];
            const pushScope = (scope) => {
                if (!scope || scopes.includes(scope)) return;
                scopes.push(scope);
            };
            try {
                const form = composerEl?.closest?.("form");
                if (form) pushScope(form);
            } catch { }
            try { pushScope(composerEl?.closest?.(".input-area-container") || null); } catch { }
            try { pushScope(composerEl?.closest?.("[data-node-type='input-area']") || null); } catch { }
            try { pushScope(composerEl?.closest?.("input-area-v2") || null); } catch { }
            pushScope(document);

            const selectors = [
                "button[type='submit']",
                "button[aria-label='Send']",
                "button[aria-label*='Send message']",
                "button[aria-label*='Send']",
                "button[title*='Send']",
                "button[aria-label*='send' i]",
                "button[aria-label*='发送']",
                "button[data-test-id*='send']"
            ];

            for (const scope of scopes) {
                for (const sel of selectors) {
                    try {
                        candidates.push(...Array.from(scope.querySelectorAll(sel)));
                    } catch { }
                }
            }

            for (const btn of candidates) {
                if (!btn) continue;
                if (!isElementVisible(btn)) continue;
                if (isInsideQuickInputOverlay(btn)) continue;
                return btn;
            }
            return null;
        }

        function isAriaDisabled(el) {
            if (!el || typeof el.getAttribute !== "function") return false;
            const value = String(el.getAttribute("aria-disabled") || "").trim().toLowerCase();
            return value === "true";
        }

        function isGeminiSendButtonDisabled(btn) {
            if (!btn) return true;
            if (btn.disabled) return true;
            if (isAriaDisabled(btn)) return true;
            return false;
        }

        function getGeminiAttachmentFingerprint(snapshot) {
            if (!snapshot) return "";
            const urls = Array.from(snapshot.urls || []).slice(0, 6).sort().join("|");
            return `${snapshot.attachmentCount || 0};${snapshot.hasFilePreview ? 1 : 0};${snapshot.cancelCount || 0};${snapshot.previewChipCount || 0};${snapshot.imageCount || 0};${urls}`;
        }

        function hasGeminiUploadInProgress(containerEl) {
            const container = containerEl || document;
            let scope = container;
            try { scope = getGeminiAttachmentScope(container) || container; } catch { }

            const selectors = [
                "[aria-busy='true']",
                "[role='progressbar']",
                "mat-progress-spinner",
                "mat-mdc-progress-spinner",
                ".mat-progress-spinner",
                ".mat-mdc-progress-spinner",
                "mat-progress-bar",
                "mat-mdc-progress-bar",
                ".mat-progress-bar",
                ".mat-mdc-progress-bar",
                "progress"
            ].join(", ");

            try { return !!scope.querySelector(selectors); } catch { return false; }
        }

        function getGeminiReadyToSendState(composerEl, { requireImage = false, minAttachments = 0 } = {}) {
            const container = composerEl ? findGeminiComposerContainer(composerEl) : null;
            const snapshot = container ? getGeminiAttachmentSnapshot(container) : null;
            const sendBtn = composerEl ? findSendButtonNearComposer(composerEl) : null;
            const sendReady = !!(sendBtn && !isGeminiSendButtonDisabled(sendBtn));

            const requiredAttachments = Math.max(0, Number(minAttachments) || 0);
            const attachmentCount = snapshot ? (snapshot.attachmentCount || 0) : 0;
            const hasImage = !!(snapshot && (snapshot.hasFilePreview || snapshot.imageCount > 0 || snapshot.cancelCount > 0 || (snapshot.previewChipCount || 0) > 0));
            const hasEnoughAttachments = !requireImage || requiredAttachments <= 0 || attachmentCount >= requiredAttachments;
            const uploadBusy = requireImage && container ? hasGeminiUploadInProgress(container) : false;
            const ok = !!(sendReady && (!requireImage || (hasImage && hasEnoughAttachments && !uploadBusy)));
            const fingerprint = getGeminiAttachmentFingerprint(snapshot);
            const stateKey = `${fingerprint};send=${sendReady ? 1 : 0};busy=${uploadBusy ? 1 : 0};img=${hasImage ? 1 : 0};count=${attachmentCount};min=${requiredAttachments}`;

            return {
                composer: composerEl,
                container,
                snapshot,
                sendBtn,
                sendReady,
                attachmentCount,
                hasImage,
                hasEnoughAttachments,
                uploadBusy,
                requiredAttachments,
                ok,
                stateKey
            };
        }

        async function waitForGeminiReadyToSend(composerEl, { requireImage = false, minAttachments = 0, timeoutMs = 45000, intervalMs = 160, settleMs = 600, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const urlGuard = getGeminiUrlGuardResult();
            if (!urlGuard.ok) return {
                ok: false,
                reason: "url-guard",
                cancelled: false,
                message: buildGeminiUrlGuardFailureMessage(urlGuard)
            };

            const composer = composerEl || (await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, shouldIgnore: isInsideQuickInputOverlay, runtime }));
            if (!composer) return { ok: false, reason: "no-composer", cancelled: !!(cancelFn && cancelFn()) };

            let composerRef = composer;
            let lastState = null;
            const computeReadyState = () => {
                lastState = getGeminiReadyToSendState(composerRef, { requireImage, minAttachments });
                return lastState;
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getGeminiObservationRoots({
                    containerEl: lastState?.container || findGeminiComposerContainer(composerRef),
                    composerEl: composerRef
                }),
                computeState: computeReadyState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: GEMINI_READY_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const finalState = observed?.state || computeReadyState();
            if (observed?.cancelled) {
                return { ok: false, reason: "cancelled", cancelled: true, snapshot: finalState?.snapshot || null };
            }

            return {
                ok: !!observed?.ok,
                button: finalState?.sendBtn || null,
                snapshot: finalState?.snapshot || null,
                reason: observed?.ok ? "ok" : "timeout",
                cancelled: false
            };
        }

        async function sendGeminiMessage(composerEl) {
            const urlGuard = getGeminiUrlGuardResult();
            if (!urlGuard.ok) return false;

            const composer = composerEl || (await focusComposer({ shouldIgnore: isInsideQuickInputOverlay }));
            if (!composer) return false;

            const btn = findSendButtonNearComposer(composer);
            let sent = false;
            if (btn) {
                if (isGeminiSendButtonDisabled(btn)) {
                    clearGeminiNotebookArmed();
                    return false;
                }
                try {
                    sent = !!TemplateUtils?.events?.simulateClick?.(btn, { nativeFallback: true });
                    clearGeminiNotebookArmed();
                    return sent;
                } catch { }
                try { btn.click(); sent = true; } catch { }
                clearGeminiNotebookArmed();
                if (sent) return true;
                return false;
            }

            try {
                sent = !!simulateKeystroke("ENTER", { target: composer });
            } catch {
                sent = false;
            }
            clearGeminiNotebookArmed();
            return sent;
        }

        return Object.freeze({
            focusComposer: focusGeminiComposer,
            setInputValue: setGeminiInputValue,
            clearComposerValue: clearGeminiInputValue,
            getComposerText: getGeminiComposerPlainText,
            getTextObservationRoots: getGeminiTextObservationRoots,
            attachImages: attachImagesToComposer,
            clearAttachments: clearGeminiAttachments,
            waitForReadyToSend: waitForGeminiReadyToSend,
            waitForNewChatReady: waitForGeminiNewChatReady,
            triggerNewChat: ({ shouldCancel = null } = {}) => triggerGeminiNewChat({ shouldCancel }),
            newChatLabel: getGeminiNewChatLabel,
            getNewChatRetryPolicy: getGeminiNewChatRetryPolicy,
            lockNewChatHotkey: true,
            lockedNewChatHotkeyDisplay: getGeminiNewChatLabel,
            sendMessage: sendGeminiMessage
        });
    }

    let quickInputController = null;

    function ensureQuickInputController(engine) {
        if (quickInputController) return quickInputController;
        const QuickInput = ShortcutTemplate?.quickInput;
        if (!QuickInput || typeof QuickInput.createController !== "function") {
            console.error("[Gemini Shortcut] Template quickInput module not found (update Template core).");
            return null;
        }
        const adapter = createGeminiQuickInputAdapter({ idPrefix: "gemini", engine });
        if (!adapter) {
            console.error("[Gemini Shortcut] Gemini quickInput adapter init failed (update Template core).");
            return null;
        }
        quickInputController = QuickInput.createController({
            engine,
            idPrefix: "gemini",
            storageKey: QUICK_INPUT_STORAGE_KEY,
            title: "Gemini - Quick Input",
            titleKey: "quickInputTitle",
            primaryColor: "#4285F4",
            themeMode: "system",
            defaults: {
                newChatHotkey: GEMINI_NATIVE_NEW_CHAT_HOTKEY
            },
            adapter
        });
        return quickInputController;
    }

    const CUSTOM_ACTIONS = {
        toolsDrawer: toolsDrawerMenuAction,
        conversationMenu: conversationMenuAction,
        modelPicker: modelPickerAction,
        quickInput: ({ engine }) => {
            ensureQuickInputController(engine)?.toggle?.();
        }
    };

    function formatMenuDataAdapter(data) {
        const raw = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
        const keys = Object.keys(raw);
        if (keys.length === 0) return "";

        const menu = raw.menu;
        if (typeof menu === "string" && menu.trim()) return menu.trim();

        if (menu && typeof menu === "object" && !Array.isArray(menu)) {
            const menuKeys = Object.keys(menu);
            const keyword = (typeof menu.keyword === "string" && menu.keyword.trim())
                ? menu.keyword.trim()
                : ((typeof menu.textMatch === "string" && menu.textMatch.trim()) ? menu.textMatch.trim() : "");
            if (keyword && menuKeys.every(k => ["keyword", "textMatch"].includes(k))) return keyword;
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
    }

    function parseMenuDataAdapter(text) {
        const trimmed = String(text ?? "").trim();
        if (!trimmed) return {};
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            const parsed = JSON.parse(trimmed);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
            return parsed;
        }
        return { menu: trimmed };
    }

    function createMenuDataAdapter({ label, placeholder } = {}) {
        return {
            label,
            placeholder,
            format: formatMenuDataAdapter,
            parse: parseMenuDataAdapter
        };
    }

    let quickInputMenuCommandId = null;
    function registerGeminiMenuCommands(engine) {
        if (quickInputMenuCommandId !== null) {
            gmUnregisterMenuCommandLocal(quickInputMenuCommandId);
            quickInputMenuCommandId = null;
        }
        quickInputMenuCommandId = gmRegisterMenuCommandLocal(engine.i18n?.t?.("quickInputTitle", {}, "Gemini - Quick Input") || "Gemini - Quick Input", () => {
            ensureQuickInputController(engine)?.open?.();
        });
        registerSidebarVisibilityMenuCommand(engine);
    }

    migrateGeminiManagedShortcuts();
    migrateGeminiExtendedModelShortcut();

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "Gemini - 设置快捷键",
        panelTitle: "Gemini - 自定义快捷键",
        storageKeys: {
            shortcuts: GEMINI_DEFAULT_SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: "gemini_icon_cache_v2::",
            userIcons: "gemini_user_icons_v2"
        },
        ui: {
            idPrefix: "gemini"
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        customActions: CUSTOM_ACTIONS,
        customActionDataAdapters: {
            toolsDrawer: createMenuDataAdapter({
                label: siteText("dataAdapters.toolsDrawer.label", "Menu keyword (or paste JSON, advanced):"),
                placeholder: siteText("dataAdapters.toolsDrawer.placeholder", 'Example: {"menu":{"id":"canvas"}} / Canvas')
            }),
            conversationMenu: createMenuDataAdapter({
                label: siteText("dataAdapters.conversationMenu.label", "Menu keyword (or paste JSON, advanced):"),
                placeholder: siteText("dataAdapters.conversationMenu.placeholder", 'Example: {"menu":{"id":"pin"}} / Delete')
            }),
            modelPicker: createMenuDataAdapter({
                label: siteText("dataAdapters.modelPicker.label", "Model keyword (or paste JSON, advanced):"),
                placeholder: siteText("dataAdapters.modelPicker.placeholder", "Example: Pro / Thinking / Extended / Fast")
            })
        },
        colors: {
            primary: "#4285F4"
        },
        consoleTag: LOG_TAG,
        shouldBypassIconCache: (url) => {
            return url && url.startsWith("https://gemini.google.com/");
        }
    });

    engine.init();
    migrateGeminiManagedShortcuts(engine, { refreshPanel: true });
    setupKeepSidebarVisible();
    registerGeminiMenuCommands(engine);
    engine.i18n?.addLocaleChangeListener?.(() => registerGeminiMenuCommands(engine));
})();
