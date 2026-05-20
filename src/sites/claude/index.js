/* -------------------------------------------------------------------------- *
 * Site Entry · [Claude] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    // 检查模版模块是否加载
    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Claude Shortcut] Template module not found.');
        return;
    }

    // Claude默认图标URL
    const defaultIconURL = "https://claude.ai/favicon.ico";

    const STORAGE_KEYS = {
        shortcuts: "claude_shortcuts_v1",
        iconCachePrefix: "claude_icon_cache_v1::",
        userIcons: "claude_user_icons_v1"
    };

    const CLAUDE_SETTINGS_URLS = Object.freeze({
        profile: "https://claude.ai/new#settings/general",
        features: "https://claude.ai/new#settings/capabilities"
    });

    const CLAUDE_SETTINGS_TARGETS = Object.freeze({
        profile: Object.freeze({
            name: "Profile",
            url: CLAUDE_SETTINGS_URLS.profile,
            hash: "#settings/general"
        }),
        features: Object.freeze({
            name: "Features",
            url: CLAUDE_SETTINGS_URLS.features,
            hash: "#settings/capabilities"
        })
    });

    const CLAUDE_NATIVE_SHORTCUTS = Object.freeze({
        newConversation: Object.freeze({
            name: "New Conversation",
            legacyNames: Object.freeze(["New chat"]),
            simulateKeys: "SHIFT+CMD+O"
        }),
        quickChatOrSearch: Object.freeze({
            name: "Quick chat or search",
            simulateKeys: "CMD+K"
        }),
        incognitoChat: Object.freeze({
            name: "Incognito Chat",
            simulateKeys: "SHIFT+CMD+I"
        }),
        toggleSidebar: Object.freeze({
            name: "Toggle Sidebar",
            simulateKeys: "CMD+."
        }),
        settings: Object.freeze({
            name: "Settings",
            simulateKeys: "SHIFT+CMD+,"
        }),
        toggleExtendedThinking: Object.freeze({
            name: "Toggle extended thinking",
            legacyNames: Object.freeze(["Extended thinking"]),
            simulateKeys: "SHIFT+CMD+E"
        }),
        stopResponse: Object.freeze({
            name: "Stop Claude's Response",
            legacyNames: Object.freeze(["Stop Claude’s response"]),
            simulateKeys: "ESC"
        })
    });

    const CLAUDE_LEGACY_SETTINGS_URL_MIGRATIONS = Object.freeze({
        "https://claude.ai/settings/profile": CLAUDE_SETTINGS_URLS.profile,
        "https://claude.ai/settings/profile/": CLAUDE_SETTINGS_URLS.profile,
        "https://claude.ai/settings/features": CLAUDE_SETTINGS_URLS.features,
        "https://claude.ai/settings/features/": CLAUDE_SETTINGS_URLS.features
    });

    function normalizeClaudeSettingsTarget(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (!token) return "";
        if (["profile", "general"].includes(token)) return "profile";
        if (["features", "feature", "capabilities", "capability"].includes(token)) return "features";
        return "";
    }

    function getClaudeSettingsTargetFromUrl(url) {
        const rawUrl = typeof url === "string" ? url.trim() : "";
        if (!rawUrl) return "";
        const migratedUrl = CLAUDE_LEGACY_SETTINGS_URL_MIGRATIONS[rawUrl] || rawUrl;
        if (migratedUrl === CLAUDE_SETTINGS_URLS.profile) return "profile";
        if (migratedUrl === CLAUDE_SETTINGS_URLS.features) return "features";

        const lowerUrl = migratedUrl.toLowerCase();
        if (lowerUrl.includes("/settings/profile") || lowerUrl.includes("#settings/general")) return "profile";
        if (lowerUrl.includes("/settings/features") || lowerUrl.includes("#settings/capabilities")) return "features";
        return "";
    }

    function getClaudeSettingsTargetFromShortcut(shortcut, { allowNameFallback = false } = {}) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const dataTarget = normalizeClaudeSettingsTarget(data.target);
        if (dataTarget) return dataTarget;

        const urlTarget = getClaudeSettingsTargetFromUrl(shortcut?.url);
        if (urlTarget) return urlTarget;

        if (allowNameFallback) {
            const nameTarget = normalizeClaudeSettingsTarget(shortcut?.name);
            if (nameTarget) return nameTarget;
        }

        return "";
    }

    function migrateClaudeSettingsShortcut(shortcut, targetKey) {
        const target = CLAUDE_SETTINGS_TARGETS[targetKey];
        if (!target) return { shortcut, changed: false };

        const rawData = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data)
            ? shortcut.data
            : {};
        const nextData = rawData.target === targetKey ? rawData : { ...rawData, target: targetKey };
        const migrated = {
            ...shortcut,
            actionType: "custom",
            customAction: "claudeSettings",
            data: nextData,
            url: target.url
        };
        const changed = migrated.actionType !== shortcut.actionType ||
            migrated.customAction !== shortcut.customAction ||
            migrated.data !== shortcut.data ||
            migrated.url !== shortcut.url;
        return { shortcut: migrated, changed };
    }

    function normalizeClaudeShortcutName(value) {
        return String(value ?? "").trim().replace(/\u2019/g, "'").toLowerCase();
    }

    function getClaudeNativeShortcutSpecByName(value) {
        const normalizedName = normalizeClaudeShortcutName(value);
        if (!normalizedName) return null;
        return Object.values(CLAUDE_NATIVE_SHORTCUTS).find((spec) => {
            if (!spec) return false;
            if (normalizeClaudeShortcutName(spec.name) === normalizedName) return true;
            const legacyNames = Array.isArray(spec.legacyNames) ? spec.legacyNames : [];
            return legacyNames.some(name => normalizeClaudeShortcutName(name) === normalizedName);
        }) || null;
    }

    function migrateClaudeNativeShortcut(shortcut, spec) {
        if (!shortcut || !spec) return { shortcut, changed: false };
        const migrated = {
            ...shortcut,
            name: spec.name,
            actionType: "simulate",
            simulateKeys: spec.simulateKeys
        };
        const changed = migrated.name !== shortcut.name ||
            migrated.actionType !== shortcut.actionType ||
            migrated.simulateKeys !== shortcut.simulateKeys;
        return { shortcut: migrated, changed };
    }

    function migrateClaudeStoredShortcuts() {
        if (typeof GM_getValue !== "function" || typeof GM_setValue !== "function") return;
        try {
            const stored = GM_getValue(STORAGE_KEYS.shortcuts, null);
            if (!Array.isArray(stored)) return;
            let changed = false;
            const next = stored.map((shortcut) => {
                if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return shortcut;
                let nextShortcut = shortcut;

                const rawUrl = typeof shortcut.url === "string" ? shortcut.url.trim() : "";
                const migratedUrl = CLAUDE_LEGACY_SETTINGS_URL_MIGRATIONS[rawUrl];
                if (migratedUrl && shortcut.url !== migratedUrl) {
                    changed = true;
                    nextShortcut = { ...nextShortcut, url: migratedUrl };
                }

                const settingsTarget = getClaudeSettingsTargetFromShortcut(nextShortcut);
                if (settingsTarget) {
                    const migratedSettings = migrateClaudeSettingsShortcut(nextShortcut, settingsTarget);
                    if (migratedSettings.changed) {
                        changed = true;
                        nextShortcut = migratedSettings.shortcut;
                    }
                }

                const nativeShortcutSpec = getClaudeNativeShortcutSpecByName(nextShortcut.name);
                if (nativeShortcutSpec) {
                    const migratedNativeShortcut = migrateClaudeNativeShortcut(nextShortcut, nativeShortcutSpec);
                    if (migratedNativeShortcut.changed) {
                        changed = true;
                        nextShortcut = migratedNativeShortcut.shortcut;
                    }
                }

                return nextShortcut;
            });
            if (changed) GM_setValue(STORAGE_KEYS.shortcuts, next);
        } catch (err) {
            console.warn("[Claude Shortcut] Stored shortcut migration failed:", err);
        }
    }

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

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "Claude - 设置快捷键",
            panelTitle: "Claude - 自定义快捷键",
            shortcuts: {
                "Quick chat or search": "快速聊天或搜索",
                "Toggle Sidebar": "切换侧边栏",
                "New Conversation": "新建对话",
                "Recent Conversations": "最近对话",
                "Incognito Chat": "无痕聊天",
                "Star Conversation": "收藏对话",
                "Delete Conversation": "删除对话",
                "Stop Claude's Response": "停止 Claude 回复",
                "Settings": "设置",
                "Toggle extended thinking": "切换扩展思考",
                "Extended thinking": "扩展思考",
                "web": "网页搜索",
                "Profile": "个人资料",
                "Features": "功能设置"
            },
            dataAdapters: {
                toolMenu: {
                    label: "菜单关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: web / Web search / 网页搜索 / 联网搜索"
                },
                conversationMenu: {
                    label: "Conversation menu 关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: Star / Rename / Add to project / Delete"
                }
            }
        },
        "en-US": {
            menuCommandLabel: "Claude - Shortcut settings",
            panelTitle: "Claude - Custom shortcuts",
            dataAdapters: {
                toolMenu: {
                    label: "Menu keyword (or paste JSON, advanced):",
                    placeholder: "Example: web / Web search / Web"
                },
                conversationMenu: {
                    label: "Conversation menu keyword (or paste JSON, advanced):",
                    placeholder: "Example: Star / Rename / Add to project / Delete"
                }
            }
        }
    });

    const siteText = (key, fallback) => ({ ctx } = {}) => ctx?.i18n?.t?.(key, {}, fallback) || fallback;

    // ===== Claude 特有功能模块开始：1step Web =====
	    const CLAUDE_MENU_ITEM_SELECTOR = [
	        "[role='menuitem']",
	        "[role='menuitemcheckbox']",
	        "[role='menuitemradio']",
	        "[role='option']",
	        "[data-radix-collection-item]",
	        "button"
	    ].join(", ");

	    const CLAUDE_WEB_TRIGGER_TEXT_MATCH = [
	        "Add files, connectors, and more",
	        "Add files",
	        "Add connectors",
	        "添加文件",
	        "添加附件",
	        "连接器",
	        "更多"
	    ];

		    const CLAUDE_WEB_SELECTORS = {
		        moreButton: [
		            {
		                selector: "button[aria-haspopup='menu'][aria-label='Add files, connectors, and more']",
		                pick: "bottommost"
		            },
		            {
		                selector: "button[aria-haspopup='menu'][aria-label='Toggle menu']",
		                pick: "preferSvgPath",
		                preferSvgPathDIncludes: ["V9.5H16.5", "H3.5"]
		            },
		            {
		                selector: "button[aria-haspopup='menu'], [role='button'][aria-haspopup='menu']",
		                textMatch: CLAUDE_WEB_TRIGGER_TEXT_MATCH,
		                pick: "bottommost"
		            }
		        ],
		        dropdownMenu: [
		            "[role='menu'][aria-label='Add files, connectors, and more']",
		            "[role='menu'][data-radix-menu-content]",
		            "div.z-dropdown [role='menu']",
		            "[role='menu']"
		        ],
		        menuItem: CLAUDE_MENU_ITEM_SELECTOR
		    };

	    const CLAUDE_CONVERSATION_MENU_SELECTORS = {
	        triggerButton: "button[data-testid='chat-menu-trigger'][aria-haspopup='menu']",
	        dropdownMenu: "[role='menu'][data-radix-menu-content]",
	        menuItem: CLAUDE_MENU_ITEM_SELECTOR,
	        starItem: "[data-testid='star-chat-trigger']",
	        deleteItem: "[data-testid='delete-chat-trigger']"
	    };

	    const TemplateUtils = ShortcutTemplate.utils;
	    if (!TemplateUtils?.menu?.createMenuController) {
	        console.error('[Claude Shortcut] Template utils.menu not found (update Template core).');
	        return;
	    }

	    const moreMenu = TemplateUtils.menu.createMenuController({
	        trigger: {
	            candidates: CLAUDE_WEB_SELECTORS.moreButton
	        },
	        root: {
	            type: "selector",
	            selector: CLAUDE_WEB_SELECTORS.dropdownMenu,
	            pick: "first"
	        }
	    });

	    const conversationMenu = TemplateUtils.menu.createMenuController({
	        trigger: {
	            selector: CLAUDE_CONVERSATION_MENU_SELECTORS.triggerButton,
	            pick: "last"
	        },
	        root: {
	            type: "ariaLabelledBy",
	            selector: CLAUDE_CONVERSATION_MENU_SELECTORS.dropdownMenu
	        }
	    });

	    const DEFAULT_WEB_TEXT_MATCH = ["web search", "web 搜索", "网页搜索", "联网搜索"];
	    const DEFAULT_WEB_FALLBACK_TO_FIRST = true;

    function normalizeMenuToken(value) {
        return String(value ?? "").trim();
    }

	    function normalizeMenuKey(value) {
	        return normalizeMenuToken(value).toLowerCase();
	    }

	    function normalizeMenuAction(value, fallback = "onestep") {
	        const token = normalizeMenuToken(value).toLowerCase();
	        return token || fallback;
	    }

    function hasValidTextMatch(textMatch) {
        if (typeof textMatch === "string") return !!textMatch.trim();
        if (textMatch instanceof RegExp) return true;
        if (typeof textMatch === "function") return true;
        if (Array.isArray(textMatch)) return textMatch.some(v => hasValidTextMatch(v));
	        return false;
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

	    function getClaudeMenuActionSpec(shortcut, {
	        actionName,
	        menuController,
	        defaultItemSelector = CLAUDE_WEB_SELECTORS.menuItem,
	        defaultTextMatch = null,
	        defaultAction = "onestep",
	        defaultFallbackToFirst = false,
	        defaultWaitForItem = true
	    } = {}) {
	        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
	        const rawMenu = data.menu;

	        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
	            ? rawMenu
	            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

	        const path = Array.isArray(menu.path) ? menu.path : null;
	        const pathParts = path ? path.map(normalizeMenuToken).filter(Boolean) : [];

	        const presetKey = normalizeMenuKey(menu.preset ?? data.preset);
	        const keywordToken = (menu.keyword !== undefined) ? menu.keyword : menu.textMatch;
	        const keywordKey = typeof keywordToken === "string" ? normalizeMenuKey(keywordToken) : "";
	        const pathLastKey = pathParts.length ? normalizeMenuKey(pathParts[pathParts.length - 1]) : "";
	        const isWebPreset = presetKey === "web" || keywordKey === "web" || pathLastKey === "web";

	        const effectiveDefaultTextMatch = isWebPreset ? DEFAULT_WEB_TEXT_MATCH : defaultTextMatch;
	        const effectiveDefaultFallbackToFirst = isWebPreset ? DEFAULT_WEB_FALLBACK_TO_FIRST : defaultFallbackToFirst;

	        const action = normalizeMenuAction(menu.action, defaultAction);

	        const fallbackToFirst = (menu.fallbackToFirst !== undefined) ? !!menu.fallbackToFirst : !!effectiveDefaultFallbackToFirst;
	        const waitForItem = (menu.waitForItem !== undefined) ? !!menu.waitForItem : !!defaultWaitForItem;
	        const allowFirstItem = !!menu.allowFirstItem;

	        let textMatch = (menu.keyword !== undefined) ? menu.keyword : menu.textMatch;
	        if ((textMatch === undefined || textMatch === null || textMatch === "") && pathParts.length) {
	            textMatch = pathParts[pathParts.length - 1];
	        }
	        if (typeof textMatch === "string" && normalizeMenuKey(textMatch) === "web" && effectiveDefaultTextMatch) {
	            textMatch = effectiveDefaultTextMatch;
	        }
	        if (textMatch === undefined || textMatch === null || textMatch === "") textMatch = effectiveDefaultTextMatch;

	        const openSubmenus = [];
	        if (Array.isArray(menu.openSubmenus)) openSubmenus.push(...menu.openSubmenus);
	        if (pathParts.length > 1) openSubmenus.push(...pathParts.slice(0, -1));
	        const normalizedOpenSubmenus = Array.from(new Set(openSubmenus.map(normalizeMenuKey).filter(Boolean)));

	        const submenuKey = normalizeMenuKey(menu.submenuKey || (normalizedOpenSubmenus[0] || ""));

	        const rawSelector = menu.selector;
	        const { provided: selectorProvided, hasLiteral: selectorHasLiteral } = describeSelectorSpec(rawSelector);

	        const selector = selectorProvided
	            ? ((typeof rawSelector === "string") ? rawSelector.trim() : rawSelector)
	            : (defaultItemSelector || "");

	        const selectorMaybeEmpty = selectorProvided && !selectorHasLiteral && action !== "open" && action !== "submenu";

	        if (action === "submenu" && !submenuKey) {
	            console.warn(`[Claude Shortcut] ${actionName || "menu"}: missing submenuKey; set data.menu.submenuKey (or set data.menu.openSubmenus/path).`);
	            return null;
	        }

	        return {
	            actionName,
	            menu: menuController,
	            defaultItemSelector,
	            action,
	            selector,
	            selectorProvided,
	            selectorMaybeEmpty,
	            textMatch: allowFirstItem ? null : textMatch,
	            fallbackToFirst,
	            waitForItem,
	            allowFirstItem,
	            openSubmenus: normalizedOpenSubmenus,
	            submenuKey
	        };
	    }

	    function ensureMenuTarget(spec) {
	        if (spec.allowFirstItem || hasValidTextMatch(spec.textMatch) || spec.selectorProvided) return true;
	        console.warn(`[Claude Shortcut] ${spec.actionName || "menu"}: missing menu target; set data.menu = "web" / "Web search" (or set data.menu.textMatch / data.menu.keyword / data.menu.path), or set data.menu.allowFirstItem=true to click the first item.`);
	        return false;
	    }

	    async function runMenuSelection(spec, engine, mode) {
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

	        console.warn(`[Claude Shortcut] ${spec.actionName || "menu"}: menu.selector resolved to empty; fallback to default item selector.`);
	        ok = await run(spec.defaultItemSelector);
	        return ok;
	    }

	    function createClaudeMenuAction({ actionName, menuController, defaultItemSelector } = {}) {
	        return async function claudeMenuAction({ shortcut, engine }) {
	            const spec = getClaudeMenuActionSpec(shortcut, { actionName, menuController, defaultItemSelector });
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
	                    if (!ensureMenuTarget(spec)) return false;
	                    return await runMenuSelection(spec, engine, "click");
	                }
	                default: {
	                    if (!ensureMenuTarget(spec)) return false;
	                    return await runMenuSelection(spec, engine, "oneStep");
	                }
	            }
	        };
	    }

	    function createClaudeMenuDataAdapter({
	        label = "菜单关键词（或粘贴 JSON，高级用法）:",
	        placeholder = ""
	    } = {}) {
	        return {
	            label,
	            placeholder,
	            format: (data) => {
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
	            },
	            parse: (text) => {
	                const trimmed = String(text ?? "").trim();
	                if (!trimmed) return {};
	                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
	                    const parsed = JSON.parse(trimmed);
	                    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
	                    return parsed;
	                }
	                return { menu: trimmed };
	            }
	        };
	    }

	    const CLAUDE_MENU_DATA_ADAPTER = createClaudeMenuDataAdapter({
	        label: siteText("dataAdapters.toolMenu.label", "Menu keyword (or paste JSON, advanced):"),
	        placeholder: siteText("dataAdapters.toolMenu.placeholder", "Example: web / Web search")
	    });

	    const CLAUDE_CONVERSATION_MENU_DATA_ADAPTER = createClaudeMenuDataAdapter({
	        label: siteText("dataAdapters.conversationMenu.label", "Conversation menu keyword (or paste JSON, advanced):"),
	        placeholder: siteText("dataAdapters.conversationMenu.placeholder", "Example: Star / Rename / Add to project / Delete")
	    });

	    const CLAUDE_SETTINGS_DIALOG_SELECTOR = [
	        "[data-radix-dialog-content]",
	        "[role='dialog'][aria-modal='true']",
	        "[role='dialog']"
	    ].join(", ");
	    const CLAUDE_SETTINGS_DIALOG_TEXT_MATCH = [
	        "settings",
	        "general",
	        "profile",
	        "capabilities",
	        "features",
	        "设置",
	        "个人",
	        "功能"
	    ];
	    const CLAUDE_SETTINGS_DIALOG_WAIT_MS = 1200;

	    function getElementTextWithLabels(element) {
	        if (!element) return "";
	        const parts = [
	            element.getAttribute?.("aria-label"),
	            element.getAttribute?.("title"),
	            element.textContent
	        ];
	        const labelledBy = element.getAttribute?.("aria-labelledby");
	        if (labelledBy && TemplateUtils?.dom?.escapeForAttributeSelector) {
	            const ids = labelledBy.split(/\s+/).map(token => token.trim()).filter(Boolean);
	            for (const id of ids) {
	                const labelEl = TemplateUtils.dom.safeQuerySelector?.(document, `[id="${TemplateUtils.dom.escapeForAttributeSelector(id)}"]`);
	                if (labelEl) parts.push(labelEl.textContent);
	            }
	        }
	        return parts.filter(Boolean).join(" ");
	    }

	    function isClaudeSettingsDialogVisible() {
	        const dom = TemplateUtils?.dom;
	        if (!dom?.safeQuerySelectorAll || !dom?.isVisible) return false;
	        const dialogs = dom.safeQuerySelectorAll(document, CLAUDE_SETTINGS_DIALOG_SELECTOR)
	            .filter(dialog => dom.isVisible(dialog));
	        return dialogs.some((dialog) => {
	            const text = getElementTextWithLabels(dialog);
	            if (dom.matchText) {
	                return dom.matchText(text, CLAUDE_SETTINGS_DIALOG_TEXT_MATCH);
	            }
	            const normalized = String(text || "").toLowerCase();
	            return CLAUDE_SETTINGS_DIALOG_TEXT_MATCH.some(token => normalized.includes(token));
	        });
	    }

	    async function waitForClaudeSettingsDialog(timeoutMs = CLAUDE_SETTINGS_DIALOG_WAIT_MS) {
	        const dom = TemplateUtils?.dom;
	        if (isClaudeSettingsDialogVisible()) return true;
	        if (!dom?.waitFor) return false;
	        return await dom.waitFor(isClaudeSettingsDialogVisible, { timeoutMs, intervalMs: 100 });
	    }

	    function getClaudeSettingsTargetUrl(target) {
	        try {
	            return new URL(target.url, window.location.href);
	        } catch {
	            return null;
	        }
	    }

	    function isCurrentClaudeSettingsRoute(targetUrl) {
	        if (!targetUrl) return false;
	        return window.location.origin === targetUrl.origin &&
	            window.location.pathname === targetUrl.pathname &&
	            window.location.search === targetUrl.search &&
	            window.location.hash === targetUrl.hash;
	    }

	    function isSameClaudeSettingsBase(targetUrl) {
	        if (!targetUrl) return false;
	        return window.location.origin === targetUrl.origin &&
	            window.location.pathname === targetUrl.pathname &&
	            window.location.search === targetUrl.search;
	    }

	    function dispatchClaudeSettingsRouteEvents(oldUrl, newUrl) {
	        try {
	            window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: oldUrl, newURL: newUrl }));
	        } catch {
	            try { window.dispatchEvent(new Event("hashchange")); } catch {}
	        }
	        try {
	            window.dispatchEvent(new PopStateEvent("popstate", { state: { url: newUrl } }));
	        } catch {
	            try { window.dispatchEvent(new Event("popstate")); } catch {}
	        }
	    }

	    function pushClaudeSettingsRoute(targetUrl) {
	        const oldUrl = window.location.href;
	        const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
	        try {
	            if (oldUrl === targetUrl.href) {
	                window.history.replaceState({ url: targetUrl.href }, document.title, nextPath);
	            } else {
	                window.history.pushState({ url: targetUrl.href }, document.title, nextPath);
	            }
	            dispatchClaudeSettingsRouteEvents(oldUrl, targetUrl.href);
	            return true;
	        } catch (err) {
	            console.warn("[Claude Shortcut] Settings route push failed, fallback to location.href:", err);
	            window.location.href = targetUrl.href;
	            return false;
	        }
	    }

	    async function openClaudeSettings({ shortcut }) {
	        const targetKey = getClaudeSettingsTargetFromShortcut(shortcut, { allowNameFallback: true }) || "profile";
	        const target = CLAUDE_SETTINGS_TARGETS[targetKey];
	        const targetUrl = target ? getClaudeSettingsTargetUrl(target) : null;
	        if (!target || !targetUrl) {
	            console.warn("[Claude Shortcut] Unknown settings target:", targetKey);
	            return false;
	        }

	        if (!isCurrentClaudeSettingsRoute(targetUrl)) {
	            if (isSameClaudeSettingsBase(targetUrl)) {
	                pushClaudeSettingsRoute(targetUrl);
	            } else {
	                window.location.href = targetUrl.href;
	                return true;
	            }
	        } else if (!isClaudeSettingsDialogVisible()) {
	            dispatchClaudeSettingsRouteEvents(window.location.href, targetUrl.href);
	        }

	        if (await waitForClaudeSettingsDialog()) return true;
	        console.warn("[Claude Shortcut] Settings dialog did not open after route change; reloading once.");
	        window.location.reload();
	        return false;
	    }

	    const CUSTOM_ACTIONS = {
	        toolMenu: createClaudeMenuAction({
	            actionName: "toolMenu",
	            menuController: moreMenu,
	            defaultItemSelector: CLAUDE_WEB_SELECTORS.menuItem
	        }),
	        conversationMenu: createClaudeMenuAction({
	            actionName: "conversationMenu",
	            menuController: conversationMenu,
	            defaultItemSelector: CLAUDE_CONVERSATION_MENU_SELECTORS.menuItem
	        }),
	        claudeSettings: openClaudeSettings
	    };

	    // ===== Claude 特有功能模块结束 =====

    // Claude默认快捷键配置
    const baseShortcut = {
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        icon: defaultIconURL
    };

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    migrateClaudeStoredShortcuts();

	    const defaultShortcuts = [
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.quickChatOrSearch.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.quickChatOrSearch.simulateKeys,
	            hotkey: "CTRL+K"
	        }),
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.toggleSidebar.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.toggleSidebar.simulateKeys,
	            hotkey: "CTRL+B"
	        }),
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.newConversation.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.newConversation.simulateKeys,
	            hotkey: "CTRL+N"
	        }),
	        createShortcut({ name: "Recent Conversations", actionType: "url", url: "https://claude.ai/recents", hotkey: "CTRL+H" }),
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.incognitoChat.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.incognitoChat.simulateKeys,
	            hotkey: "CTRL+I"
	        }),
	        createShortcut({
	            name: "Star Conversation",
	            actionType: "custom",
	            customAction: "conversationMenu",
	            data: { menu: "Star" },
	            hotkey: "CTRL+S"
	        }),
	        createShortcut({
	            name: "Delete Conversation",
	            actionType: "custom",
	            customAction: "conversationMenu",
	            data: { menu: "Delete" },
	            hotkey: "CTRL+BACKSPACE"
	        }),
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.stopResponse.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.stopResponse.simulateKeys,
	            hotkey: "CTRL+SHIFT+S"
	        }),
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.toggleExtendedThinking.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.toggleExtendedThinking.simulateKeys,
	            hotkey: "CTRL+T"
	        }),
	        createShortcut({
	            name: CLAUDE_NATIVE_SHORTCUTS.settings.name,
	            actionType: "simulate",
	            simulateKeys: CLAUDE_NATIVE_SHORTCUTS.settings.simulateKeys,
	            hotkey: "CTRL+,"
	        }),
	        createShortcut({ name: "web", actionType: "custom", customAction: "toolMenu", data: { menu: "web" }, hotkey: "CTRL+W" }),
	        createShortcut({ name: "Profile", actionType: "custom", customAction: "claudeSettings", data: { target: "profile" }, hotkey: "CTRL+SHIFT+P" }),
	        createShortcut({ name: "Features", actionType: "custom", customAction: "claudeSettings", data: { target: "features" }, hotkey: "CTRL+SHIFT+F" })
	    ];

    // 创建快捷键引擎
    const engine = ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "Claude - 设置快捷键",
        panelTitle: "Claude - 自定义快捷键",

        // 存储键配置
        storageKeys: STORAGE_KEYS,

        // UI配置
        ui: {
            idPrefix: "claude"
        },
        i18n: {
            messages: SITE_MESSAGES
        },

        // 图标配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,

        // 默认快捷键
        defaultShortcuts,

	        // 自定义动作表：将 1step/复杂点击动作纳入引擎
	        customActions: CUSTOM_ACTIONS,

		        // 自定义动作 data 编辑器适配：让用户直接输入关键词（无需 JSON）
			        customActionDataAdapters: {
			            toolMenu: CLAUDE_MENU_DATA_ADAPTER,
			            conversationMenu: CLAUDE_CONVERSATION_MENU_DATA_ADAPTER
			        },

	        // 控制台标签
	        consoleTag: "[Claude Shortcut Script]",

        // 主题色配置
        colors: {
            primary: "#5D5CDE"  // Claude的主色调
        },

        // Claude特定的图标缓存绕过规则
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://claude.ai/');
        }
    });

    // 初始化引擎
    engine.init();
})();
